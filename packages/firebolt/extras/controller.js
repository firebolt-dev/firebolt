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
import { createRuntime } from './runtime'
import { ContextError, ContextRedirect, createContext } from './context'
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
export async function handleFunction(ctx) {
  const { type, id, args } = await ctx.req.json()

  // deserialize FormData if used
  if (args[0] && args[0].$form) {
    const form = new FormData()
    for (const key in args[0]) {
      form.set(key, args[0][key])
    }
    args[0] = form
  }

  ctx.type = type
  ctx.params = {}

  let value
  let error
  try {
    value = await callFunction(ctx, id, args)
  } catch (err) {
    error = err
  }
  const data = {}
  // get changed cookies to notify client UI
  data.cookies = ctx.cookies.$getChanged()
  // handle redirect if any
  if (error instanceof ContextRedirect) {
    const { url, mode } = error
    data.redirect = { url, mode }
    const res = Response.json(data)
    return ctx.send(res)
  }
  if (error instanceof ContextError) {
    data.error = {
      name: error.name,
      message: error.message,
      code: error.code || null,
    }
    const res = Response.json(data, { status: 400 })
    return ctx.send(res)
  }
  if (error) {
    const id = muid()
    console.error(`[${id}]`, error)
    data.error = {
      name: 'Error',
      message: 'An error occurred',
      id,
    }
    const res = Response.json(data, { status: 400 })
    return ctx.send(res)
  }
  // otherwise respond with the return value
  data.value = value
  data.expire = ctx.$expire
  data.invalidations = ctx.$invalidations
  const res = Response.json(data)
  ctx.send(res)
}

export async function handleHandler(ctx, route, params) {
  const method = methodToApiFunction[ctx.req.method]
  ctx.type = 'handler'
  ctx.params = params || {}
  let result
  try {
    result = route.module[method](ctx)
    if (result instanceof Promise) {
      result = await result
    }
  } catch (err) {
    console.error('Received error from handler:')
    console.error(err)
    const res = new Response(null, {
      status: 500,
    })
    ctx.send(res)
  }
  // if result is a Response, pipe it through
  if (result instanceof Response) {
    return ctx.send(result)
  }
  // otherwise assume json
  const res = Response.json(result)
  return ctx.send(res)
}

async function handlePage(ctx, route, params) {
  let url = ctx.req.href

  if (prod) {
    console.log(`[${ctx.expReq.clientIp || 'no-ip'}] GET ${url}`)
  }

  // apply headers
  ctx.headers.forEach((value, key) => {
    ctx.expRes.setHeader(key, value)
  })

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

  const options = {
    ssr: {
      url,
      params,
      inserts,
      cookies: ctx.cookies,
      async callFunction(type, id, args) {
        // we have to use a fresh context here to capture cookies set
        // in this function
        const context = ctx.new()
        context.type = type
        context.params = params
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
        if (error instanceof ContextRedirect) {
          const redirect = error
          return redirect.applyToExpressResponse(ctx.expRes)
        }
        if (error instanceof ContextError) {
          return {
            error: {
              name: error.name,
              message: error.message,
              code: error.code || null,
            },
          }
        }
        if (error) {
          const id = muid()
          console.error(`[${id}]`, error)
          return {
            error: {
              name: 'Error',
              message: 'An error occurred',
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

  const isBot = isbot(ctx.req.headers.get('User-Agent') || '')

  const stream = new PassThrough()
  stream.on('data', chunk => {
    let str = chunk.toString()

    // append any inserts (loader data, redirects etc)
    if (str.endsWith('</script>')) {
      str += inserts.read()
    }

    // console.log('---')
    // console.log(str)
    ctx.expRes.write(str)
    ctx.expRes.flush()
  })
  stream.on('end', () => {
    ctx.expRes.end()
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
        ctx.expRes.statusCode = notFound ? 404 : didError ? 500 : 200
        ctx.expRes.setHeader('Content-Type', 'text/html')
        pipe(stream)
      }
    },
    onAllReady() {
      if (isBot) {
        ctx.expRes.statusCode = notFound ? 404 : didError ? 500 : 200
        ctx.expRes.setHeader('Content-Type', 'text/html')
        // pipe(res)
        pipe(stream)
      }
    },
    onError(error) {
      console.error(error)
    },
    onShellError(err) {
      console.error(err)
      ctx.expRes.statusCode = 500
      ctx.expRes.setHeader('content-type', 'text/html')
      ctx.expRes.send('<p>Something went wrong</p>')
    },
  })
}

export async function handle(expReq, expRes, wait, next) {
  if (wait) await wait()

  const ctx = createContext({
    expReq,
    expRes,
    defaultCookieOptions,
    base: config.context,
  })

  const url = ctx.req.href

  // middleware
  ctx.type = 'middleware'
  for (const exec of config.middleware) {
    let res = exec(ctx)
    if (res instanceof Promise) {
      res = await res
    }
    if (res instanceof Response) {
      return ctx.send(res)
    }
  }

  // public files (note: this is now handled by prior middleware)
  // if (url.startsWith('/_firebolt/')) {
  //   const dir = path.join(__dirname, '../public')
  //   const file = path.join(dir, url.substring(10))
  //   const exists = await fs.exists(file)
  //   if (exists) {
  //     return ctx.sendFile(file)
  //   } else {
  //     const res = Response.notFound()
  //     return ctx.send(res)
  //   }
  // }

  // function requests
  if (url === '/_firebolt_fn') {
    return handleFunction(ctx)
  }

  let [route, params] = resolveRouteAndParams(url)

  // console.log('handle', url)
  // console.log('route', route)
  // console.log('params', params)

  // route files
  if (!route && hasExt(url)) {
    // requests for static files that don't have a handler
    // should continue to the next middleware
    return next()
  }

  // route not found
  if (!route) {
    return handlePage(ctx, null, {})
  }

  // route page
  if (route.type === 'page') {
    return handlePage(ctx, route, params)
  }

  // route handler
  if (route.type === 'handler') {
    return handleHandler(ctx, route, params)
  }

  console.error('Unhandled fall through')
}

const extRegex = /\/[^/]+\.[^/]+$/
function hasExt(url) {
  return extRegex.test(url)
}
