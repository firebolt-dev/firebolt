import './source-map-support'
import './process'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { renderToPipeableStream, renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { isbot } from 'isbot'
import { PassThrough } from 'stream'
import { defaultsDeep } from 'lodash-es'
import { Root } from 'firebolt'

import { matcher } from './matcher'
import { getConfig } from './config.js'
import * as core from './core.js'
import manifest from './manifest.json'
import { Request } from './request'
import * as registry from './registry'
import { cookieOptionsToExpress } from './cookies'
import { createRuntime } from './runtime'

// suppress React warning about useLayoutEffect on server, this is nonsense because useEffect
// is similar and doesn't warn and is allowed in SSR
// see: https://gist.github.com/gaearon/e7d97cdf38a2907924ea12e4ebdf3c85
React.useLayoutEffect = React.useEffect

const match = matcher()

// get config
const config = getConfig()
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

// utility to call route functions (data and actions)
async function callRegistry(request, id, args) {
  await config.middleware(request)
  const fn = registry[id]
  if (!fn) throw new Error('Invalid function')
  let value = fn(request, ...args)
  if (value instanceof Promise) {
    value = await value
  }
  return value
}

// start server
const app = express()
app.use(cors())
app.use(compression())
app.use(express.json())
app.use(cookieParser())
app.use(express.static('public'))
app.use('/_firebolt', express.static('.firebolt/public'))

// handle route fn calls (useData & useAction)
app.post('/_firebolt_fn', async (req, res) => {
  const { id, args } = req.body
  const request = new Request(req)
  let value
  let err
  try {
    value = await callRegistry(request, id, args)
  } catch (_err) {
    err = _err
  }
  const data = {}
  // notify client to invalidate changed cookies
  data.cookies = request.cookies.getChangedKeys()
  // apply changed cookies to the express response
  request.cookies.pushChangesToResponse(res)

  // if err is a request then function called req.redirect() or req.error()
  if (err instanceof Request) {
    // handle any redirect
    if (request._redirect) {
      data.redirect = request._redirect
      res.status(200).json(data)
      return
    }
    // handle any error
    if (request._error) {
      console.log('TODO: handle req.error() from POST /_firebolt_fn')
      return
    }
  } else if (err) {
    console.log('TODO: handle fn err')
    res.status(400).send(err.message)
  } else {
    data.value = value
    data.expire = request._expire
    res.status(200).json(data)
  }
})

// handle requests for pages and api
app.use('*', async (req, res) => {
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
        async callRegistry(...args) {
          const request = new Request(req)
          let value
          try {
            value = await callRegistry(request, ...args)
          } catch (err) {
            if (err === request) {
              value = request
            }
          }
          // write out any cookies first
          request.cookies.pushChangesToStream(inserts)
          // write out any redirects
          const didRedirect = request.applyRedirectToExpressResponse(res)
          if (didRedirect) return
          // todo: error if any
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
      str += inserts.read()

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
        console.log('onError', error)
        if (error instanceof Request) {
          console.log(
            'TODO: request.redirect or request.error was thrown! handle it!'
          )
        }
        if (process.send) {
          // todo: instead of piping to bundler for pretty logs, use a shared module for logging
          process.send({
            type: 'error',
            error: {
              name: error.constructor.name,
              message: error.message,
              stack: error.stack,
            },
          })
        } else {
          console.error(error)
        }
      },
      onShellError(err) {
        console.log('onShellError', err)
        // console.error(err)
      },
    })
  }
})

function onConnected() {
  if (!process.env.SILENT_STARTUP) {
    console.log(`server running at http://localhost:${config.port}`)
  }
  if (process.send) {
    process.send('ready') // notify any parent process
  }
}

function onError(err) {
  if (err.code === 'EADDRINUSE') {
    console.log(`port '${config.port}' is already in use`)
    process.exit()
  } else {
    console.error(`failed to start server: ${err.message}`)
  }
}

app.listen(config.port, onConnected).on('error', onError)
