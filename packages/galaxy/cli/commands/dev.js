import fs from 'fs-extra'
import path from 'path'
import * as esbuild from 'esbuild'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import { renderToPipeableStream } from 'react-dom/server'
import React from 'react'

import { getFilePaths } from '../utils/getFilePaths'
import { filePathToRoutePath } from '../utils/filePathToRoutePath'
import makeMatcher from '../utils/matcher'

const port = 4004

const env = process.env.NODE_ENV || 'development'
const isProduction = env === 'production'
const isDevelopment = !isProduction

export async function dev() {
  const rootDir = process.cwd()
  const pagesDir = path.join(rootDir, 'pages')

  // ensure we have an empty .galaxy staging folder
  const stagingDir = path.join(rootDir, '.galaxy')
  await fs.emptyDir(stagingDir)

  // get route files (relative to pagesDir)
  const routeFiles = await getFilePaths(pagesDir)

  // build route info
  let ids = 0
  const routes = []
  for (const routeFile of routeFiles) {
    routes.push({
      id: `route${++ids}`,
      path: filePathToRoutePath(routeFile),
      fileBase: routeFile,
      filePath: path.join(rootDir, 'pages', routeFile),
    })
  }

  // sort routes so that explicit routes have priority over catch-alls
  routes.sort((a, b) => {
    const isACatchAll = a.path.includes(':')
    const isBCatchAll = b.path.includes(':')
    if (isACatchAll && !isBCatchAll) {
      return 1 // if 'a' is catch-all and 'b' is not, 'a' should come after 'b'
    } else if (!isACatchAll && isBCatchAll) {
      return -1 // if 'b' is catch-all and 'a' is not, 'a' should come before 'b'
    }
    return 0 // if both are catch-all or both are not, keep original order
  })

  // esbuild our lib (should this be in build.mjs???)
  const libEntryPath = path.join(__dirname, '../lib/index.js')
  const libOutputPath = path.join(__dirname, '../build/lib.js')
  await esbuild.build({
    entryPoints: [libEntryPath],
    loader: {
      '.js': 'jsx',
    },
    jsx: 'automatic',
    jsxImportSource: '@emotion/react',
    bundle: true,
    treeShaking: true,
    minify: isProduction,
    sourcemap: true,
    outfile: libOutputPath,
    platform: 'node',
    external: ['react', 'react-dom', '@emotion/react'],
    define: {
      'process.env.NODE_ENV': JSON.stringify(env),
    },
  })

  // generate server entry
  let serverEntryScript = ''
  for (const route of routes) {
    serverEntryScript += `export * as ${route.id} from '../pages${route.fileBase}'\n`
  }
  serverEntryScript += `export { Document } from '../document.js'\n`
  serverEntryScript += `export * as galaxy from 'galaxy'`
  const serverEntryPath = path.join(stagingDir, 'server-entry.js')
  await fs.writeFile(serverEntryPath, serverEntryScript)

  // esbuild server entry
  const serverEntryBuildPath = path.join(stagingDir, 'server-entry.build.js')
  await esbuild.build({
    entryPoints: [serverEntryPath],
    loader: {
      '.js': 'jsx',
    },
    jsx: 'automatic',
    jsxImportSource: '@emotion/react',
    bundle: true,
    minify: isProduction,
    treeShaking: true,
    sourcemap: true,
    outfile: serverEntryBuildPath,
    platform: 'node',
    external: ['react', 'react-dom', '@emotion/react'],
    alias: {
      galaxy: libOutputPath,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(env),
    },
  })

  // import and map our server entry modules
  const modules = await import(serverEntryBuildPath)
  console.log('modules', modules)
  for (const route of routes) {
    route.module = modules[route.id]
    route.Page = modules[route.id].default
    route.Shell = modules[route.id].Shell
    route.getMetadata = modules[route.id].getMetadata || defaultGetMetadata
    route.hasMetadata = !!modules[route.id].getMetadata
  }

  // copy over client main + deps
  const mainSrc = path.join(__dirname, '../templates/main.js')
  const mainPath = path.join(stagingDir, 'main.js')
  await fs.copyFile(mainSrc, mainPath)
  const matcherSrc = path.join(__dirname, '../templates/matcher.js')
  const matcherPath = path.join(stagingDir, 'matcher.js')
  await fs.copyFile(matcherSrc, matcherPath)

  // generate client entry points (import tree shaking + register)
  for (const route of routes) {
    // TODO: retain function name?
    const script = `
      import Page from '../pages${route.fileBase}'
      ${route.Shell && `import { Shell } from '../pages${route.fileBase}'`}

      window.$galaxy.call('registerPage', '${route.id}', Page)
      ${route.Shell && `window.$galaxy.call('registerShell', '${route.id}', Shell)`}
    `
    route.registryPath = path.join(stagingDir, route.fileBase)
    await fs.writeFile(route.registryPath, script)
  }

  // build client entry points
  const clientEntryBuildDir = path.join(stagingDir, 'public')
  const clientEntryPoints = []
  clientEntryPoints.push(mainPath)
  for (const route of routes) {
    // clientEntryPoints.push(route.fullPath)
    clientEntryPoints.push(route.registryPath)
  }
  const clientEntryResult = await esbuild.build({
    entryPoints: clientEntryPoints,
    entryNames: '/[name]-[hash]',
    loader: {
      '.js': 'jsx',
    },
    jsx: 'automatic',
    jsxImportSource: '@emotion/react',
    format: 'esm',
    splitting: true,
    treeShaking: true,
    bundle: true,
    minify: isProduction,
    sourcemap: true,
    outdir: clientEntryBuildDir,
    platform: 'browser',
    // external: ['react', 'react-dom', '@emotion/react'],
    alias: {
      galaxy: libOutputPath,
    },
    metafile: true,
    define: {
      'process.env.NODE_ENV': JSON.stringify(env),
    },
  })
  let clientMainRelPath
  for (const file in clientEntryResult.metafile.outputs) {
    const output = clientEntryResult.metafile.outputs[file]
    if (output.entryPoint) {
      const route = routes.find(route =>
        route.registryPath.endsWith(output.entryPoint)
      )
      if (route) {
        route.clientPath = file.replace('.galaxy/public', '')
      } else {
        clientMainRelPath = file.replace('.galaxy/public', '')
      }
    }
  }
  // console.log({ clientMainRelPath })
  // console.log(pages)

  const _routes = routes.map(route => {
    return {
      id: route.id,
      path: route.path,
      file: route.clientPath,
      hasMetadata: route.hasMetadata,
    }
  })

  // // initialise app render component
  // const Document = modules.Document
  // function App({ path, metadata, Page }) {
  //   return (
  //     <Document {...metadata}>
  //       <Router ssrPath={path}>
  //         <Page {...metadata.props} />
  //       </Router>
  //     </Document>
  //   )
  // }

  const match = makeMatcher()

  function resolveRoute(path) {
    for (const route of routes) {
      const [hit, params] = match(route.path, path)
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
  server.get('/_galaxy/metadata', async (req, res) => {
    const path = req.query.path
    const [route, params] = resolveRoute(path)
    if (!route) return res.json({})
    const metadata = await route.getMetadata() // todo: pass in params? request?
    return res.json(metadata)
  })
  server.use('*', async (req, res) => {
    const reqPath = req.baseUrl || '/'

    // handle page requests
    const [route, params] = resolveRoute(reqPath)
    if (route) {
      console.log('route', route)
      console.log('match params', params)
      const MetaProvider = modules.galaxy.MetaProvider
      const Document = modules.Document
      const Router = modules.galaxy.Router
      const Route = modules.galaxy.Route
      const Page = route.Page
      const metadata = await route.getMetadata()
      const props = metadata.props
      function Root() {
        return (
          <MetaProvider metadata={metadata}>
            <Document>
              {/* <Router ssrPath={reqPath}>
                <Route path={route.path}> */}
              <Page {...props} />
              {/* </Route>
              </Router> */}
            </Document>
          </MetaProvider>
        )
      }
      const { pipe, abort } = renderToPipeableStream(<Root />, {
        bootstrapScriptContent: `
          const g = {
            stack: [],
            call(action, ...args) {
              g.stack.push({ action, args })
            }
          }
          g.call('init', {
            routes: ${JSON.stringify(_routes)},
            path: '${reqPath}',
            metadata: ${JSON.stringify(metadata)}
          })
          window.$galaxy = g
        `,
        bootstrapModules: [route.clientPath, clientMainRelPath],
        onShellReady() {
          res.setHeader('Content-Type', 'text/html')
          pipe(res)
        },
      })

      // bootstrap script
      // https://github.com/reactwg/react-18/discussions/114
    }
  })
  server.listen(port, () => {
    console.log(`server running on http://localhost:${port}`)
  })
}

/**
 * Server
 *
 * 1. generate server bundle that includes all routes and api etc (this is used for data loading and rendering on server)
 * 2. generate client bundle for each route using code splitting (plus extra main and dynamic-import bundles)
 * 3. generate client routing bundle using wouter and lazy component imports pointing to bundles in #2
 * 3. start server, listen for requests
 * 4. on request, determine which route it is for (if api, do that)
 * 5. load any route data needed
 * 6. render and pipe to client (inject main and route bundle)
 */
/**
 * Client
 *
 * 1. <Link> should begin loading route bundle if it hasn't already
 * 2. <Link> clicks should fetch data for the route from the server, wait for route bundle, then go to it!
 */

/**
 * Flow:
 * 1. generate a bundle that imports all routes and esbuild it
 * 2. start server and listen for requests
 * 3. on request, determine which route is requested
 * 4. esbuild using route file as entry (cache for future use, invalidate on code change)
 * 5. render root + route and pipe to response (inject script to full bundle so client can takeover)
 */
// console.log('[galaxy] dev')

// class HTMLTransformStream extends Transform {
//   constructor(options = {}) {
//     super(options)
//     this.dataBuffer = ''
//   }

//   _transform(chunk, encoding, callback) {
//     // Buffer the chunk
//     this.dataBuffer += chunk.toString()

//     // Call the callback function to indicate processing is done for this chunk
//     callback()
//   }

//   _flush(callback) {
//     // Modify the buffered content here
//     this.dataBuffer = this.dataBuffer.replace(
//       '</head>',
//       '<!-- Your Content --></head>'
//     )

//     // Push the modified content to the next stage of the pipeline
//     this.push(this.dataBuffer)

//     // Call the callback function to indicate flushing is complete
//     callback()
//   }
// }

async function defaultGetMetadata() {
  return {}
}
