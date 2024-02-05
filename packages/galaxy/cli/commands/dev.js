import fs from 'fs-extra'
import path from 'path'
import * as esbuild from 'esbuild'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import { renderToPipeableStream } from 'react-dom/server'
import React from 'react'
import { isbot } from 'isbot'
import { cloneDeep } from 'lodash'
import { PassThrough } from 'stream'

import { getFilePaths } from '../utils/getFilePaths'
import { fileToRoutePattern } from '../utils/fileToRoutePattern'
import { matcher } from '../utils/matcher'

const port = 4004
const env = process.env.NODE_ENV || 'development'
const prod = env === 'production'

const match = matcher()

export async function dev() {
  const appDir = process.cwd()
  const buildDir = path.join(appDir, '.galaxy')
  const pagesDir = path.join(appDir, 'pages')
  const libPath = path.join(__dirname, 'lib.js')

  // ensure we have an empty build directory
  await fs.emptyDir(buildDir)

  // get list of route files (relative to pagesDir)
  const pageFiles = await getFilePaths(pagesDir)

  // generate route details
  let ids = 0
  const routes = []
  for (const pageFile of pageFiles) {
    const id = `route${++ids}`
    const srcFile = pageFile
    const buildFile = buildDir + '/' + pageFile.replace(pagesDir + '/', '').replace('/', '.') // prettier-ignore
    const pattern = fileToRoutePattern(pageFile.replace(pagesDir, ''))
    const buildToSrcPath = path.relative(path.dirname(buildFile), srcFile)
    routes.push({
      id,
      srcFile,
      buildFile,
      pattern,
      buildToSrcPath,
    })
  }

  // sort routes so that explicit routes have priority over dynamic routes
  routes.sort((a, b) => {
    const isDynamicA = a.pattern.includes(':')
    const isDynamicB = b.pattern.includes(':')
    if (isDynamicA && !isDynamicB) {
      // if 'a' is catch-all and 'b' is not, 'a' should come after 'b'
      return 1
    } else if (!isDynamicA && isDynamicB) {
      // if 'b' is catch-all and 'a' is not, 'a' should come before 'b'
      return -1
    }
    // if both are catch-all or both are not, keep original order
    return 0
  })

  // write core (an entry into the apps code for SSR)
  const coreCode = `
    ${routes.map(route => `export * as ${route.id} from '${route.buildToSrcPath}'`).join('\n')}
    export { Document } from '../document.js'
    export * as galaxy from 'galaxy'
  `
  const coreFile = path.join(buildDir, 'core.js')
  await fs.writeFile(coreFile, coreCode)

  // build core
  const coreBuildFile = path.join(buildDir, 'core.build.js')
  await esbuild.build({
    entryPoints: [coreFile],
    outfile: coreBuildFile,
    bundle: true,
    treeShaking: true,
    sourcemap: true,
    minify: prod,
    platform: 'node',
    external: ['react', 'react-dom', '@emotion/react'],
    alias: {
      galaxy: libPath,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(env),
    },
    loader: {
      '.js': 'jsx',
    },
    jsx: 'automatic',
    jsxImportSource: '@emotion/react',
  })

  // import core
  const core = await import(coreBuildFile)
  for (const route of routes) {
    route.module = core[route.id]
    route.Page = core[route.id].default
    route.Loading = core[route.id].Loading
    route.getMetadata = core[route.id].getMetadata
    route.hasMetadata = !!core[route.id].getMetadata
  }

  // copy over runtime
  const runtimeSrc = path.join(__dirname, '../runtime')
  const runtimeDir = path.join(buildDir, 'runtime')
  await fs.copy(runtimeSrc, runtimeDir)

  // generate client page bundles
  // TODO: retain page function name?
  for (const route of routes) {
    const code = `
      import Page from '${route.buildToSrcPath}'
      ${route.Loading ? `import { Loading } from '${route.buildToSrcPath}'` : ''}
      ${!route.Loading ? `globalThis.$galaxy.push('registerPage', '${route.id}', Page)` : ''}
      ${route.Loading ? `globalThis.$galaxy.push('registerPage', '${route.id}', Page, Loading)` : ''}
    `
    await fs.outputFile(route.buildFile, code)
  }

  // build client bundles (pages + runtime)
  const bundlesDir = path.join(buildDir, 'public')
  const bundleFiles = []
  for (const route of routes) {
    bundleFiles.push(route.buildFile)
  }
  bundleFiles.push(runtimeDir)
  const bundleResult = await esbuild.build({
    entryPoints: bundleFiles,
    entryNames: '/[name]-[hash]',
    outdir: bundlesDir,
    bundle: true,
    treeShaking: true,
    sourcemap: true,
    splitting: true,
    platform: 'browser',
    format: 'esm',
    minify: prod,
    metafile: true,
    alias: {
      galaxy: libPath,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(env),
    },
    loader: {
      '.js': 'jsx',
    },
    jsx: 'automatic',
    jsxImportSource: '@emotion/react',
  })
  const metafile = bundleResult.metafile
  let runtimeBuildFile
  for (const file in metafile.outputs) {
    const output = metafile.outputs[file]
    if (output.entryPoint) {
      const route = routes.find(route =>
        route.buildFile.endsWith(output.entryPoint)
      )
      if (route) {
        route.clientPath = file.replace('.galaxy/public', '')
      } else {
        runtimeBuildFile = file.replace('.galaxy/public', '')
      }
    }
  }

  // build route definitions to be sent to client
  const routesForClient = routes.map(route => {
    return {
      id: route.id,
      pattern: route.pattern,
      file: route.clientPath,
      Page: null,
      Loading: null,
      getMetadata: null,
      hasMetadata: !!core[route.id].getMetadata,
    }
  })

  // build route definitions to be used on server
  const routesForServer = routes.map(route => {
    return {
      id: route.id,
      pattern: route.pattern,
      file: route.clientPath,
      Page: core[route.id].default,
      Loading: core[route.id].Loading,
      getMetadata: core[route.id].getMetadata,
      hasMetadata: !!core[route.id].getMetadata,
    }
  })

  // utility to find a route from a url
  function resolveRoute(url) {
    for (const route of routes) {
      const [hit, params] = match(route.pattern, url)
      if (hit) return [route, params]
    }
    return []
  }

  // start server
  const server = express()
  server.use(cors())
  server.use(compression())
  server.use(express.json())
  server.use(express.static('public'))
  server.use(express.static('.galaxy/public'))

  // handle requests for page data
  server.get('/_galaxy/metadata', async (req, res) => {
    const url = req.query.url
    const [route, params] = resolveRoute(url)
    if (!route) return res.json({})
    const metadata = await route.getMetadata() // todo: pass in params? request?
    return res.json(metadata)
  })

  // handle requests for pages and api
  server.use('*', async (req, res) => {
    const url = req.originalUrl

    // handle page requests
    const [route, params] = resolveRoute(url)
    if (route) {
      const RuntimeProvider = core.galaxy.RuntimeProvider
      const Document = core.Document

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

      const runtime = {
        ssr: {
          url,
          params,
          inserts,
        },
        routes: cloneDeep(routesForServer),
      }

      const isBot = isbot(req.get('user-agent') || '')

      // crawlers need to pre-fetch metadata and inject it for both <Meta/> and <Router/> to consume
      if (isBot && route.getMetadata) {
        const r = runtime.routes.find(r => r.id === route.id)
        r.botMetadata = await r.getMetadata({ params })
      }

      function Root() {
        return (
          <RuntimeProvider data={runtime}>
            <Document />
          </RuntimeProvider>
        )
      }

      // transform stream to:
      // 1. insert suspense data
      // 2. extract and prepend inlined emotion styles
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
        }
        console.log('---')
        console.log(str)
        res.write(str)
        res.flush()
      })
      stream.on('end', () => {
        res.end()
      })

      let didError = false
      const { pipe, abort } = renderToPipeableStream(<Root />, {
        bootstrapScriptContent: `
          globalThis.$galaxy = {
            ssr: null,
            routes: ${JSON.stringify(routesForClient)},
            stack: [],
            push(action, ...args) {
              this.stack.push({ action, args })
            }
          }
        `,
        bootstrapModules: [route.clientPath, runtimeBuildFile],
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
            pipe(res)
          }
        },
      })
    }
  })
  server.listen(port, () => {
    console.log(`server running on http://localhost:${port}`)
  })
}

function getDefaultMetadata() {
  return {}
}
