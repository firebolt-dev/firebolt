import fs from 'fs-extra'
import path from 'path'
import * as esbuild from 'esbuild'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import { renderToPipeableStream } from 'react-dom/server'
import React from 'react'

import { getFilePaths } from '../utils/getFilePaths'
import { fileToRoutePath } from '../utils/fileToRoutePath'
import { matcher } from '../utils/matcher'

const port = 4004
const env = process.env.NODE_ENV || 'development'
const prod = env === 'production'

const match = matcher()

export async function dev() {
  const appDir = process.cwd()
  const pagesDir = path.join(appDir, 'pages')
  const workDir = path.join(appDir, '.galaxy')
  const libPath = path.join(__dirname, 'lib.js')

  // ensure we have an empty work directory
  await fs.emptyDir(workDir)

  // get list of route files (relative to pagesDir)
  const pageFiles = await getFilePaths(pagesDir)

  // generate route details
  let ids = 0
  const routes = []
  for (const pageFile of pageFiles) {
    routes.push({
      id: `route${++ids}`,
      path: fileToRoutePath(pageFile),
      fileBase: pageFile,
      filePath: path.join(appDir, 'pages', pageFile),
    })
  }

  // sort routes so that explicit routes have priority over catch-all routes
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

  // write core (an entry into the apps code for SSR)
  const coreCode = `
    ${routes.map(route => `export * as ${route.id} from '../pages${route.fileBase}'`).join('\n')}
    export { Document } from '../document.js'
    export * as galaxy from 'galaxy'
  `
  const coreFile = path.join(workDir, 'core.js')
  await fs.writeFile(coreFile, coreCode)

  // build core
  const coreBuildFile = path.join(workDir, 'core.build.js')
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
    route.Shell = core[route.id].Shell
    route.getMetadata = core[route.id].getMetadata || defaultGetMetadata
    route.hasMetadata = !!core[route.id].getMetadata
  }

  // copy over runtime
  const runtimeSrc = path.join(__dirname, '../runtime')
  const runtimeDir = path.join(workDir, 'runtime')
  await fs.copy(runtimeSrc, runtimeDir)

  // generate client page bundles
  // TODO: retain page function name?
  for (const route of routes) {
    const code = `
      import Page from '../pages${route.fileBase}'
      ${route.Shell && `import { Shell } from '../pages${route.fileBase}'`}
      ${!route.Shell && `globalThis.$galaxy.call('registerPage', '${route.id}', Page)`}
      ${route.Shell && `globalThis.$galaxy.call('registerPage', '${route.id}', Page, Shell)`}
    `
    route.registryPath = path.join(workDir, route.fileBase)
    await fs.writeFile(route.registryPath, code)
  }

  // build client bundles (pages + runtime)
  const bundlesDir = path.join(workDir, 'public')
  const bundleFiles = []
  for (const route of routes) {
    bundleFiles.push(route.registryPath)
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
        route.registryPath.endsWith(output.entryPoint)
      )
      if (route) {
        route.clientPath = file.replace('.galaxy/public', '')
      } else {
        runtimeBuildFile = file.replace('.galaxy/public', '')
      }
    }
  }

  // build route definitions to be sent to client
  const routesForClient = JSON.stringify(
    routes.map(route => {
      return {
        id: route.id,
        path: route.path,
        file: route.clientPath,
        hasMetadata: route.hasMetadata,
      }
    })
  )

  // utility to find a route from a path
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
      const SSRProvider = core.galaxy.SSRProvider
      const Document = core.Document
      const Page = route.Page
      const metadata = await route.getMetadata()
      const ssr = {
        Page,
        metadata,
        props: metadata.props,
        location: {
          pathname: reqPath,
          params,
        },
      }
      function Root() {
        return (
          <SSRProvider value={ssr}>
            <Document />
          </SSRProvider>
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
            routes: ${routesForClient},
            path: '${reqPath}',
            metadata: ${JSON.stringify(metadata)}
          })
          globalThis.$galaxy = g
        `,
        bootstrapModules: [route.clientPath, runtimeBuildFile],
        onShellReady() {
          res.setHeader('Content-Type', 'text/html')
          pipe(res)
        },
      })
    }
  })
  server.listen(port, () => {
    console.log(`server running on http://localhost:${port}`)
  })
}

async function defaultGetMetadata() {
  return {}
}
