import './process'
import { renderToPipeableStream } from 'react-dom/server'
import React from 'react'
import { isbot } from 'isbot'
import { PassThrough } from 'stream'
import { defaultsDeep } from 'lodash-es'
import { Root } from 'firebolt'

import { matcher } from './matcher'
import { getConfig } from './config.js'
import * as core from './core.js'
import manifest from './manifest.json'
import { Request, RequestError, RequestRedirect } from './request'
import * as registry from './registry'
import { cookieOptionsToExpress } from './cookies'
import { createRuntime } from './runtime'

// suppress React warning about useLayoutEffect on server, this is nonsense because useEffect
// is similar and doesn't warn and is allowed in SSR
// see: https://gist.github.com/gaearon/e7d97cdf38a2907924ea12e4ebdf3c85
React.useLayoutEffect = React.useEffect

const match = matcher()

const prod = process.env.NODE_ENV === 'production'

// get config
export const config = getConfig()

// apply defaults
defaultsDeep(config, {
  port: 3000,
  productionBrowserSourceMaps: false,
})

// hydrate manifest
const bootstrapFile = manifest.bootstrapFile
for (const route of core.routes) {
  route.file = manifest.pageFiles[route.id]
}

// build route definitions to be used by the client
const routesForClient = core.routes.map(route => {
  return {
    id: route.id,
    pattern: route.pattern,
    file: route.file,
  }
})

// utility to find a route from a url
function resolveRouteWithParams(url) {
  for (const route of core.routes) {
    const [hit, params] = match(route.pattern, url)
    if (hit) return [route, params]
  }
  return []
}

// utility to call loader/action functions
async function callFunction(request, id, args) {
  await config.middleware(request)
  const fn = registry[id]
  if (!fn) throw new Error('Invalid function')
  let value = fn(request, ...args)
  if (value instanceof Promise) {
    value = await value
  }
  return value
}

// handle loader/action function call requests from the client
export async function handleFunction(req, res) {
  const { id, args } = req.body
  const request = new Request(req)
  let value
  let error
  try {
    value = await callFunction(request, id, args)
  } catch (err) {
    error = err
  }
  const data = {}
  // get changed cookies to notify client UI
  data.cookies = request.cookies.getChangedKeys()
  // apply cookie changes to express response
  request.cookies.pushChangesToResponse(res)
  // if RequestRedirect error, redirect the client
  if (error instanceof RequestRedirect) {
    data.redirect = error.getRedirect()
    return res.status(200).json(data)
  }
  if (error) {
    data.error = serializeFunctionError(error, prod)
    return res.status(400).json(data)
  }
  // otherwise its the return value of the function
  data.value = value
  data.expire = request._expire
  res.status(200).json(data)
}

// handle requests for pages and api
export async function handleRequest(req, res) {
  const url = req.originalUrl

  // handle page requests
  const [route, params] = resolveRouteWithParams(url)
  if (route) {
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
        // console.log('s.cookies.set', key, value)
        res.cookie(key, value, cookieOptionsToExpress(options))
      },
      remove(key) {
        // console.log('scookies.remove', key)
        res.clearCookie(key)
      },
    }

    const runtime = createRuntime({
      ssr: {
        url,
        params,
        inserts,
        cookies,
        async callFunction(...args) {
          const request = new Request(req)
          let value
          let error
          try {
            value = await callFunction(request, ...args)
          } catch (err) {
            error = err
          }
          // write out any cookies first
          request.cookies.pushChangesToStream(inserts)
          // if RequestRedirect error, write out the redirect and stop
          if (error instanceof RequestRedirect) {
            request.applyRedirectToExpressResponse(error, res)
            return
          }
          // if RequestError or generic error, return the error
          if (error) {
            return {
              error: serializeFunctionError(error, prod),
            }
          }
          // otherwise return the value
          const data = {
            value,
            expire: request._expire,
          }
          return data
        },
      },
      routes: core.routes,
    })

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
      globalThis.$firebolt = {
        ssr: null,
        routes: ${JSON.stringify(routesForClient)},
        stack: [],
        push(action, ...args) {
          this.stack.push({ action, args })
        }
      }
    `,
      bootstrapModules: isBot ? [] : [route.file, bootstrapFile],
      onShellReady() {
        if (!isBot) {
          res.statusCode = didError ? 500 : 200
          res.setHeader('Content-Type', 'text/html')
          pipe(stream)
        }
      },
      onAllReady() {
        if (isBot) {
          res.statusCode = didError ? 500 : 200
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
}

function serializeFunctionError(error, prod) {
  if (error instanceof RequestError) {
    return {
      name: error.name,
      message: error.message,
      data: error.data,
    }
  }
  if (prod) {
    return {
      name: 'Error',
      message: 'An error occurred',
      data: {},
    }
  }
  return {
    name: error.name,
    message: error.message,
    data: {},
  }
}
