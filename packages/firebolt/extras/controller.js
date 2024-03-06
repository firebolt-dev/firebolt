import path from 'path'
import { PassThrough } from 'stream'
import fs from 'fs-extra'
import React from 'react'
import { fileURLToPath } from 'url'
import { renderToPipeableStream } from 'react-dom/server'
import { isbot } from 'isbot'
import { Root } from 'firebolt'

import { matcher } from './matcher'
import { config } from './config.js'
import routes from './routes.js'
import manifest from './manifest.json'
import * as registry from './registry'
import { cookieOptionsToExpress } from './cookies'
import { createRuntime } from './runtime'
import { createContext } from './context'
import { expressToWebRequest, webToExpressResponse } from './web-api'
import { muid } from './uuid'

// suppress React warning about useLayoutEffect on server, this is nonsense because useEffect
// is similar and doesn't warn and is allowed in SSR
// see: https://gist.github.com/gaearon/e7d97cdf38a2907924ea12e4ebdf3c85
React.useLayoutEffect = React.useEffect

const match = matcher()

const cwd = process.cwd()

const prod = process.env.NODE_ENV === 'production'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export { config }

const methodToApiFunction = {
  GET: 'get',
  PUT: 'put',
  PATCH: 'patch',
  POST: 'post',
  DELETE: 'del',
  OPTIONS: 'options',
}

// hydrate manifest
const bootstrapFile = manifest.bootstrapFile
for (const route of routes) {
  route.file = manifest.pageFiles[route.id]
}

// build page definitions to be used by the client
const pagesForClient = routes
  .filter(route => route.type === 'page')
  .map(route => {
    return {
      id: route.id,
      pattern: route.pattern,
      file: route.file,
    }
  })

// build page definitions to be used by the server
const pagesForServer = routes.filter(route => route.type === 'page')

const notFoundRoute = routes.find(r => r.pattern === '/not-found')

const defaultCookieOptions = config.cookie

// utility to find a route from a url
function resolveRouteAndParams(url) {
  if (!url) {
    return [null, {}]
  }
  for (const route of routes) {
    if (route.type !== 'page' && route.type !== 'handler') continue
    const [hit, params] = match(route.pattern, url)
    if (hit) return [route, params]
  }
  return [null, {}]
}

// utility to call loader/action functions
async function callFunction(ctx, id, args) {
  const fn = registry[id]
  if (!fn) throw new Error('Invalid function')
  let value = fn(ctx, ...args)
  if (value instanceof Promise) {
    value = await value
  }
  return value
}

// handle loader/action function call requests from the client
export async function handleFunction(req, res) {
  const { id, args } = req.body

  // deserialize FormData if used
  if (args[0] && args[0].$form) {
    const form = new FormData()
    for (const key in args[0]) {
      form.set(key, args[0][key])
    }
    args[0] = form
  }

  const context = createContext({
    type: req.body.type,
    req,
    params: {},
    defaultCookieOptions,
    base: config.context,
  })
  let value
  let error
  try {
    value = await callFunction(context, id, args)
  } catch (err) {
    error = err
  }
  const data = {}
  // get changed cookies to notify client UI
  data.cookies = context.cookies.$getChanged()
  // apply cookie changes to express response
  context.cookies.$pushChangesToExpressResponse(res)
  // handle redirect if any
  if (error?.isContext && error.$redirect) {
    data.redirect = error.$redirect
    return res.status(200).json(data)
  }
  if (error?.isContext) {
    data.error = {
      name: 'OperationalError',
      message: 'An error ocurred in a handler',
      code: error.$errorCode || null,
    }
    return res.status(400).json(data)
  }
  if (error) {
    const id = muid()
    console.error(`[${id}]`, error)
    data.error = {
      name: 'Error',
      message: 'An error ocurred in a handler',
      id,
    }
    return res.status(400).json(data)
  }
  // otherwise respond with the return value
  data.value = value
  data.expire = context.$expire
  data.invalidations = context.$invalidations
  res.status(200).json(data)
}

export async function handleHandler(req, res, route, params) {
  const method = methodToApiFunction[req.method]
  const request = expressToWebRequest(req)
  const context = createContext({
    type: 'handler',
    req,
    params,
    defaultCookieOptions,
    base: config.context,
  })
  let result
  try {
    result = route.module[method](request, context)
    if (result instanceof Promise) {
      result = await result
    }
  } catch (err) {
    console.error('Received error from handler:')
    console.error(err)
    return res.status(500).end()
  }
  // apply any cookie changes
  context.cookies.$pushChangesToExpressResponse(res)
  // if result is a Response, pipe it through
  if (result instanceof Response) {
    return webToExpressResponse(result, res)
  }
  // otherwise assume json
  return res.json(result)
}

async function handlePage(req, res, route, params) {
  let url = req.originalUrl

  let notFound
  if (!route) {
    notFound = true
    route = notFoundRoute
    url = '/not-found'
  }

  const inserts = {
    value: '',
    read() {
      const str = this.value
      this.value = ''
      return str
    },
    write(str) {
      this.value += str
    },
  }

  const cookies = {
    get(key) {
      // console.log('s.cookies.get', key, req.cookies[key])
      return req.cookies[key]
    },
    set(key, value, options) {
      // console.log('s.cookies.set', key, value, options)
      res.cookie(key, value, cookieOptionsToExpress(options))
    },
    remove(key) {
      // console.log('scookies.remove', key)
      res.clearCookie(key)
    },
  }

  const options = {
    ssr: {
      url,
      params,
      inserts,
      cookies,
      async callFunction(type, id, args) {
        const context = createContext({
          type,
          req,
          params,
          defaultCookieOptions,
          base: config.context,
        })
        let value
        let error
        try {
          value = await callFunction(context, id, args)
        } catch (err) {
          error = err
        }
        // write out any cookies first
        context.cookies.$pushChangesToStream(inserts)
        // if FireboltRequest error, write out the redirect and stop
        if (error?.isContext && error.$redirect) {
          context.$applyRedirectToExpressResponse(res)
          return
        }
        if (error?.isContext) {
          return {
            error: {
              name: 'OperationalError',
              message: 'An error ocurred in a handler',
              code: error.$errorCode || null,
            },
          }
        }
        if (error) {
          const id = muid()
          console.error(`[${id}]`, error)
          return {
            error: {
              name: 'Error',
              message: 'An error ocurred in a handler',
              id,
            },
          }
        }
        // otherwise return the value
        const data = {
          value,
          expire: context.$expire,
          invalidations: context.$invalidations,
        }
        return data
      },
    },
    pages: pagesForServer,
  }

  const runtime = createRuntime([['init', options]])

  const isBot = isbot(req.get('user-agent') || '')

  const stream = new PassThrough()
  stream.on('data', chunk => {
    let str = chunk.toString()

    // append any inserts (loader data, redirects etc)
    if (str.endsWith('</script>')) {
      str += inserts.read()
    }

    // console.log('---')
    // console.log(str)
    res.write(str)
    res.flush()
  })
  stream.on('end', () => {
    res.end()
  })

  let didError = false
  const { pipe, abort } = renderToPipeableStream(<Root runtime={runtime} />, {
    bootstrapScriptContent: isBot
      ? undefined
      : `
      globalThis.$firebolt = function (...args) {
        globalThis.$firebolt.stack.push(args)
      }
      globalThis.$firebolt.stack = []
      globalThis.$firebolt('init', {
        ssr: null,
        pages: ${JSON.stringify(pagesForClient)},
        defaultCookieOptions: ${JSON.stringify(config.cookie)},
      })
    `,
    bootstrapModules: isBot ? [] : [route.file, bootstrapFile],
    onShellReady() {
      if (!isBot) {
        res.statusCode = notFound ? 404 : didError ? 500 : 200
        res.setHeader('Content-Type', 'text/html')
        pipe(stream)
      }
    },
    onAllReady() {
      if (isBot) {
        res.statusCode = notFound ? 404 : didError ? 500 : 200
        res.setHeader('Content-Type', 'text/html')
        // pipe(res)
        pipe(stream)
      }
    },
    onError(error) {
      console.error(error)
    },
    onShellError(err) {
      console.error(err)
      res.statusCode = 500
      res.setHeader('content-type', 'text/html')
      res.send('<p>Something went wrong</p>')
    },
  })
}

export async function handle(req, res, wait) {
  res.setHeader('X-Powered-By', 'Firebolt')

  if (wait) await wait()

  let url = req.originalUrl

  // middleware
  const context = createContext({
    type: 'middleware',
    req,
    defaultCookieOptions,
    base: config.context,
  })
  for (const exec of config.middleware) {
    const request = expressToWebRequest(req)
    let response = exec(request, context)
    if (response instanceof Promise) {
      response = await response
    }
    if (response instanceof Response) {
      for (const key in context.headers) {
        res.setHeader(key, context.headers[key])
      }
      context.cookies.$pushChangesToExpressResponse(res)
      webToExpressResponse(response, res)
      return
    }
  }

  // public files
  if (url.startsWith('/_firebolt/')) {
    const dir = path.join(__dirname, '../public')
    const file = path.join(dir, url.substring(10))
    const exists = await fs.exists(file)
    if (exists) {
      return res.sendFile(file)
    } else {
      return res.status(404).send('Not found')
    }
  }

  // function requests
  if (url === '/_firebolt_fn') {
    return handleFunction(req, res)
  }

  let [route, params] = resolveRouteAndParams(url)

  // console.log('handle', url)
  // console.log('route', route)
  // console.log('params', params)

  // route files
  if (!route && hasExt(url)) {
    const file = path.join(cwd, 'routes', url)
    const exists = await fs.exists(file)
    if (exists) {
      return res.sendFile(file)
    } else {
      return res.status(404).send('Not found')
    }
  }

  // route not found
  if (!route) {
    return handlePage(req, res, null, {})
  }

  // route page
  if (route.type === 'page') {
    return handlePage(req, res, route, params)
  }

  // route handler
  if (route.type === 'handler') {
    return handleHandler(req, res, route, params)
  }

  console.error('TODO: handle fall through')
}

const extRegex = /\/[^/]+\.[^/]+$/
function hasExt(url) {
  return extRegex.test(url)
}
