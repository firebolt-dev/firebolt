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
import { getBaseUrl } from '../utils/getBaseUrl'
import makeMatcher from 'wouter/matcher'

const port = 4004

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
      // filePath,
      // baseUrl: getBaseUrl(filePath),
      // fullPath: path.join(rootDir, 'pages', filePath),
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
    minify: false,
    sourcemap: true,
    outfile: libOutputPath,
    platform: 'node',
    external: ['react', 'react-dom', '@emotion/react'],
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
    minify: false,
    sourcemap: true,
    outfile: serverEntryBuildPath,
    platform: 'node',
    external: ['react', 'react-dom', '@emotion/react'],
    alias: {
      galaxy: libOutputPath,
    },
  })

  // import and map our server entry modules
  const modules = await import(serverEntryBuildPath)
  console.log('modules', modules)
  for (const route of routes) {
    route.module = modules[route.id]
    route.Component = modules[route.id].default
    route.getMetadata = modules[route.id].getMetadata || defaultGetMetadata
    route.hasMetadata = !!modules[route.id].getMetadata
  }

  // generate client main script
  // const clientMainScript = `
  //   import { hydrateRoot } from 'react-dom/client'
  //   import { Suspense, lazy, useState, useEffect, use } from 'react'
  //   import { Router, Route, Switch } from 'wouter'

  //   import { Document } from '../document.js'

  //   const ctx = window.$galaxy
  //   const { metadata, routes, registry } = window.$galaxy

  //   function Page({ id, path, file, props }) {
  //     const page = ctx.get(id)
  //     const [n, setN] = useState(0)
  //     useEffect(() => {
  //       // if (page)
  //     }, [])
  //     const Component = use(ctx.get(id))
  //     // const Component = registry[path]
  //     // const [active, setActive] = useState(!!Component)

  //     // useEffect(() => {
  //     //   if (Component) return
  //     //   console.log(file)
  //     //   import(file).then(() => {
  //     //     setActive(true)
  //     //   })
  //     // }, [])
  //     if (!Component) return null
  //     return <Component {...props} />
  //   }

  //   function App() {
  //     return (
  //       <Document {...metadata}>
  //         <Router>
  //           <Switch>
  //             {routes.map(route => (
  //               <Route path={route.path} key={route.path}>
  //                 <Page path={route.path} file={route.file} props={metadata.props} />
  //               </Route>
  //             ))}
  //           </Switch>
  //         </Router>
  //       </Document>
  //     )
  //   }

  //   const root = hydrateRoot(document, <App />)
  // `

  // copy over client main
  const mainSrc = path.join(__dirname, '../scripts/main.js')
  const mainPath = path.join(stagingDir, 'main.js')
  await fs.copyFile(mainSrc, mainPath)

  // generate client entry points (import tree shaking + register)
  for (const route of routes) {
    // TODO: retain function name?
    const script = `
      import Route from '../pages${route.fileBase}'

      window.$galaxy.registerRoute('${route.id}', Route)
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
    minify: false,
    sourcemap: true,
    outdir: clientEntryBuildDir,
    platform: 'browser',
    // external: ['react', 'react-dom', '@emotion/react'],
    alias: {
      galaxy: libOutputPath,
    },
    metafile: true,
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

  const isMatch = makeMatcher()

  // start server
  const server = express()
  server.use(cors())
  server.use(compression())
  server.use(express.json())
  server.use(express.static('public'))
  server.use(express.static('.galaxy/public'))
  server.use('*', async (req, res) => {
    const reqPath = req.baseUrl || '/'

    // handle page requests
    let route
    let params
    for (const _route of routes) {
      const [hit, _params] = isMatch(_route.path, reqPath)
      if (hit) {
        route = _route
        params = _params
        break
      }
    }
    if (route) {
      console.log('route', route)
      console.log('match params', params)
      const Document = modules.Document
      const Router = modules.galaxy.Router
      const Route = modules.galaxy.Route
      const Switch = modules.galaxy.Switch
      const RouteComponent = route.Component
      const metadata = await route.getMetadata()
      // globalThis.location = { pathname: reqPath }
      function App() {
        return (
          <Document {...metadata}>
            <Router ssrPath={reqPath}>
              <Route path={route.path}>
                <RouteComponent {...metadata.props} />
              </Route>
            </Router>
          </Document>
        )
      }
      const { pipe, abort } = renderToPipeableStream(<App />, {
        bootstrapScriptContent: `
          const routes = ${JSON.stringify(_routes)}
          const routesById = {}
          for (const route of routes) {
            routesById[route.id] = route
          }
          const ctx = {
            routes,
            routesById,
            metadata: {
              '${reqPath}': ${JSON.stringify(metadata)}
            },            
            registerRoute(id, Component) {
              const route = ctx.routesById[id]
              if (!route) return console.error('TODO: handle')
              route.Component = Component
            },
            getRoute(id) {
              return ctx.routesById[id]
            },
            getRouteComponent(id) {
              return ctx.routesById[id]?.Component
            },
            setMetadata(path, metadata) {
              if (metadata.expires) {
                metadata.expires = new Date().getTime() + metadata.expires * 1000 // seconds
              }
              ctx.metadata[path] = metadata
            },
            getProps(path) {
              return ctx.getMetadata(path)?.props
            },
            getMetadata(path) {
              let metadata = ctx.metadata[path]
              if (!metadata) {
                return {}
              }
              if (metadata.expires) {
                const hasExpired = new Date().getTime() >= metadata.expires
                if (hasExpired) return
              }
              return metadata
            },
          }
          ctx.initial = {
            metadata: ${JSON.stringify(metadata)}
          }
          window.$galaxy = ctx
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
