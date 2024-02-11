import fs from 'fs-extra'
import path from 'path'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import { renderToPipeableStream, renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { isbot } from 'isbot'
import { PassThrough } from 'stream'
import { defaultsDeep } from 'lodash'

import { matcher } from './matcher'

import { getConfig } from '../config.js'
import * as core from '../core.js'
import manifest from '../manifest.json'

// suppress React warning about useLayoutEffect on server, this is nonsense because useEffect
// is similar and doesn't warn and is allowed in SSR
// see: https://gist.github.com/gaearon/e7d97cdf38a2907924ea12e4ebdf3c85
React.useLayoutEffect = React.useEffect

const match = matcher()

// get config
const config = getConfig()
defaultsDeep(config, {
  port: 3000,
  external: [],
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
async function callRouteFn(routeId, fnName, args) {
  // TODO: req needs to exist
  const req = {}
  await core.middleware(req)
  const route = core.routes.find(r => r.id === routeId)
  if (!route) throw new Error('Route not found')
  const fn = route.module[fnName]
  if (!fn) throw new Error('Invalid function')
  let result = fn(req, ...args)
  if (result instanceof Promise) {
    result = await result
  }
  return result
}

// start server
const app = express()
app.use(cors())
app.use(compression())
app.use(express.json())
app.use(express.static('public'))
app.use('/_firebolt', express.static('.firebolt/public'))

// handle route fn calls (useData and useAction)
app.post('/_firebolt_fn', async (req, res) => {
  const { routeId, fnName, args } = req.body
  let result
  try {
    result = await callRouteFn(routeId, fnName, args)
  } catch (err) {
    return res.status(400).send(err.message)
  }
  res.status(200).json(result)
})

// handle requests for pages and api
app.use('*', async (req, res) => {
  const url = req.originalUrl

  // handle page requests
  const [route, params] = resolveRouteWithParams(url)
  if (route) {
    const RuntimeProvider = core.lib.RuntimeProvider
    const Router = core.lib.Router
    const mergeHeadGroups = core.lib.mergeHeadGroups
    const Document = core.Document
    const createRuntime = core.createRuntime

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

    const runtime = createRuntime({
      ssr: {
        url,
        params,
        inserts,
        callRouteFn,
      },
      routes: core.routes,
    })

    function getHeadContent() {
      const docHead = runtime.getDocHead()
      const pageHeads = runtime.getPageHeads()
      const elem = mergeHeadGroups(docHead, ...pageHeads)
      return renderToStaticMarkup(elem) || ''
    }

    const isBot = isbot(req.get('user-agent') || '')

    function Root() {
      return (
        <RuntimeProvider data={runtime}>
          <Document>
            <Router />
          </Document>
        </RuntimeProvider>
      )
    }

    // transform stream to:
    // 1. insert head content
    // 2. insert streamed suspense resource data
    // 3. extract and prepend inlined emotion styles
    let afterHtml
    const stream = new PassThrough()
    stream.on('data', chunk => {
      let str = chunk.toString()
      // prepend any inlined emotion styles
      if (afterHtml) {
        // regex to match all style tags and their contents
        const regex = /<style[^>]*>[\s\S]*?<\/style>/gi
        // find all style tags and their contents
        const matches = str.match(regex) || []
        const styles = matches.join('')
        // extract and prepend styles
        str = styles + str.replace(regex, '')
      }
      // append any inserts (eg suspense data)
      if (afterHtml) {
        str += inserts.read()
      }
      // mark after html
      if (str.includes('</html>')) {
        afterHtml = true
        // inject head content
        str = str.replace('<head>', '<head>' + getHeadContent())
      }
      // console.log('---')
      // console.log(str)
      res.write(str)
      if (afterHtml) {
        res.flush()
      }
    })
    stream.on('end', () => {
      res.end()
    })

    let didError = false
    const { pipe, abort } = renderToPipeableStream(<Root />, {
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
      onError(err) {
        console.log('react render onError')
        console.error(err)
      },
      onShellError(err) {
        console.log('react render onShellError')
        console.error(err)
      },
    })
  }
})

function onConnected() {
  //   console.log(`server running at http://localhost:${config.port}`)
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
