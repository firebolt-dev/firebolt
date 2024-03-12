import path from 'path'
import { PassThrough } from 'stream'
import fs from 'fs-extra'
import React from 'react'
import { fileURLToPath } from 'url'
import { renderToPipeableStream } from 'react-dom/server'
import { isbot } from 'isbot'
import { Root } from 'firebolt'

import './web'
import { matcher } from './matcher'
import { config } from './config.js'
import routes from './routes.js'
import manifest from './manifest.json'
import * as registry from './registry'
import { cookieOptionsToExpress, createCookies } from './cookies'
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

function injectSearchParams(params, url) {
  const searchParams = new URL(url, 'http://firebolt').searchParams
  searchParams.forEach((value, key) => {
    if (!params.hasOwnProperty(key)) {
      params[key] = value
    }
  })
}

// get all public env variables for client js
const envs = {}
for (const key in process.env) {
  if (key.startsWith(config.publicEnvPrefix)) {
    envs[key] = process.env[key]
  }
}
const envsCode = `
  if (!globalThis.process) globalThis.process = {}
  if (!globalThis.process.env) globalThis.process.env = {}
  const envs = ${JSON.stringify(envs)};
  for (const key in envs) {
    globalThis.process.env[key] = envs[key]
  }
`

// utility to find a route from a url
function resolveRouteAndParams(url) {
  if (!url) {
    return [null, {}]
  }
  for (const route of routes) {
    if (route.type !== 'page' && route.type !== 'handler') continue
    const [hit, params] = match(route.pattern, url)
    if (hit) {
      injectSearchParams(params, url)
      return [route, params]
    }
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
export async function handleFunction(req, expRes, cookies) {
  const { type, id, args } = await req.json()

  // deserialize FormData if used
  if (args[0] && args[0].$form) {
    const form = new FormData()
    for (const key in args[0]) {
      form.set(key, args[0][key])
    }
    args[0] = form
  }

  const context = createContext({
    type,
    cookies,
    base: config.context,
    params: {},
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
  context.cookies.$pushChangesToExpressResponse(expRes)
  // handle redirect if any
  if (error?.isContext && error.$redirect) {
    data.redirect = error.$redirect
    return expRes.status(200).json(data)
  }
  if (error?.isContext) {
    data.error = {
      name: 'OperationalError',
      message: 'An error ocurred in a handler',
      code: error.$errorCode || null,
    }
    return expRes.status(400).json(data)
  }
  if (error) {
    const id = muid()
    console.error(`[${id}]`, error)
    data.error = {
      name: 'Error',
      message: 'An error ocurred in a handler',
      id,
    }
    return expRes.status(400).json(data)
  }
  // otherwise respond with the return value
  data.value = value
  data.expire = context.$expire
  data.invalidations = context.$invalidations
  expRes.status(200).json(data)
}

export async function handleHandler(req, expRes, cookies, route, params) {
  const method = methodToApiFunction[req.method]
  // const request = expressToWebRequest(req)
  const context = createContext({
    type: 'handler',
    cookies,
    base: config.context,
    params,
  })
  let result
  try {
    result = route.module[method](req, context)
    if (result instanceof Promise) {
      result = await result
    }
  } catch (err) {
    console.error('Received error from handler:')
    console.error(err)
    return expRes.status(500).end()
  }
  // apply any cookie changes
  context.cookies.$pushChangesToExpressResponse(expRes)
  // if result is a Response, pipe it through
  if (result instanceof Response) {
    return webToExpressResponse(result, expRes)
  }
  // otherwise assume json
  return expRes.json(result)
}

async function handlePage(req, expRes, cookies, route, params) {
  let url = req.href

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

  // TODO: cookies from req

  // const cookies = {
  //   get(key) {
  //     // console.log('s.cookies.get', key, req.cookies[key])
  //     return req.cookies[key]
  //   },
  //   set(key, value, options) {
  //     // console.log('s.cookies.set', key, value, options)
  //     expRes.cookie(key, value, cookieOptionsToExpress(options))
  //   },
  //   remove(key) {
  //     // console.log('scookies.remove', key)
  //     expRes.clearCookie(key)
  //   },
  // }

  const options = {
    ssr: {
      url,
      params,
      inserts,
      cookies,
      async callFunction(type, id, args) {
        const context = createContext({
          type,
          cookies,
          base: config.context,
          params,
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
          context.$applyRedirectToExpressResponse(expRes)
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

  const runtime = createRuntime([['config', options]])

  const isBot = isbot(req.headers.get('User-Agent') || '')

  const stream = new PassThrough()
  stream.on('data', chunk => {
    let str = chunk.toString()

    // append any inserts (loader data, redirects etc)
    if (str.endsWith('</script>')) {
      str += inserts.read()
    }

    // console.log('---')
    // console.log(str)
    expRes.write(str)
    expRes.flush()
  })
  stream.on('end', () => {
    expRes.end()
  })

  let didError = false
  const { pipe, abort } = renderToPipeableStream(<Root runtime={runtime} />, {
    bootstrapScriptContent: isBot
      ? undefined
      : `
      ${envsCode}
      globalThis.$firebolt = function (...args) {
        globalThis.$firebolt.stack.push(args)
      }
      globalThis.$firebolt.stack = []
      globalThis.$firebolt('config', {
        ssr: null,
        pages: ${JSON.stringify(pagesForClient)},
        defaultCookieOptions: ${JSON.stringify(config.cookie)},
      })
    `,
    bootstrapModules: isBot ? [] : [route.file, bootstrapFile],
    onShellReady() {
      if (!isBot) {
        expRes.statusCode = notFound ? 404 : didError ? 500 : 200
        expRes.setHeader('Content-Type', 'text/html')
        pipe(stream)
      }
    },
    onAllReady() {
      if (isBot) {
        expRes.statusCode = notFound ? 404 : didError ? 500 : 200
        expRes.setHeader('Content-Type', 'text/html')
        // pipe(res)
        pipe(stream)
      }
    },
    onError(error) {
      console.error(error)
    },
    onShellError(err) {
      console.error(err)
      expRes.statusCode = 500
      expRes.setHeader('content-type', 'text/html')
      expRes.send('<p>Something went wrong</p>')
    },
  })
}

export async function handle(expReq, expRes, wait) {
  if (wait) await wait()

  const req = Request.fromExpress(expReq)
  const url = req.href
  const cookies = createCookies(req, defaultCookieOptions)

  expRes.setHeader('X-Powered-By', 'Firebolt')

  // middleware
  const context = createContext({
    type: 'middleware',
    base: config.context,
    cookies,
  })

  for (const exec of config.middleware) {
    let response = exec(req.clone(), context)
    if (response instanceof Promise) {
      response = await response
    }
    if (response instanceof Response) {
      context.headers.forEach((value, key) => {
        expRes.setHeader(key, value)
      })
      context.cookies.$pushChangesToExpressResponse(res)
      webToExpressResponse(response, res)
      return
    }
  }

  // apply headers from middleware that didn't end
  context.headers.forEach((value, key) => {
    expRes.setHeader(key, value)
  })

  // public files
  if (url.startsWith('/_firebolt/')) {
    const dir = path.join(__dirname, '../public')
    const file = path.join(dir, url.substring(10))
    const exists = await fs.exists(file)
    if (exists) {
      return expRes.sendFile(file)
    } else {
      return expRes.status(404).send('Not found')
    }
  }

  // function requests
  if (url === '/_firebolt_fn') {
    return handleFunction(req, expRes, cookies)
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
      return expRes.sendFile(file)
    } else {
      return expRes.status(404).send('Not found')
    }
  }

  // route not found
  if (!route) {
    return handlePage(req, expRes, cookies, null, {})
  }

  // route page
  if (route.type === 'page') {
    return handlePage(req, expRes, cookies, route, params)
  }

  // route handler
  if (route.type === 'handler') {
    return handleHandler(req, expRes, cookies, route, params)
  }

  console.error('unhandled fall through')
}

const extRegex = /\/[^/]+\.[^/]+$/
function hasExt(url) {
  return extRegex.test(url)
}
