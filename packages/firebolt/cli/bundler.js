import fs from 'fs-extra'
import path from 'path'
import * as esbuild from 'esbuild'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import { renderToPipeableStream, renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { isbot } from 'isbot'
import { PassThrough } from 'stream'
import { debounce, defaultsDeep } from 'lodash'
import { polyfillNode } from 'esbuild-plugin-polyfill-node'
import chokidar from 'chokidar'

import { getFilePaths } from './utils/getFilePaths'
import { fileToRoutePattern } from './utils/fileToRoutePattern'
import { matcher } from './utils/matcher'
import { virtualModule } from './utils/virtualModule'

const match = matcher()

// suppress React warning about useLayoutEffect on server, this is nonsense because useEffect
// is similar and doesn't warn and is allowed in SSR
// see: https://gist.github.com/gaearon/e7d97cdf38a2907924ea12e4ebdf3c85
React.useLayoutEffect = React.useEffect

export async function bundler(opts) {
  const prod = !!opts.production
  const env = prod ? 'production' : 'development'

  const appDir = process.cwd()
  const appPagesDir = path.join(appDir, 'pages')
  const appApiDir = path.join(appDir, 'api')

  const buildDir = path.join(appDir, '.firebolt')
  const buildPageShimsDir = path.join(appDir, '.firebolt/page-shims')
  const buildCoreVirtual = path.join(appDir, '.firebolt/core.virtual.js')
  const buildCoreFile = path.join(appDir, '.firebolt/core.js')
  const buildConfigVirtual = path.join(appDir, '.firebolt/config.virtual.js')
  const buildConfigFile = path.join(appDir, '.firebolt/config.js')
  const buildManifestFile = path.join(appDir, '.firebolt/manifest.json')
  const buildLibFile = path.join(appDir, '.firebolt/lib.js')

  const extrasSrcDir = path.join(__dirname, '../extras')
  const extrasDir = path.join(appDir, '.firebolt/extras')
  const extrasBoostrapFile = path.join(appDir, '.firebolt/extras/bootstrap.js')
  const extrasLibFile = path.join(appDir, '.firebolt/extras/lib.js')

  async function getConfig() {
    const configMod = await reimport(buildConfigFile)
    const config = configMod.config()
    defaultsDeep(config, {
      port: 3000,
      external: [],
    })
    return config
  }

  let firstBuild = true

  async function build() {
    console.log(firstBuild ? 'building' : 'rebuilding')
    firstBuild = false

    // ensure we have an empty build directory
    await fs.emptyDir(buildDir)

    // build and import config
    await esbuild.build({
      entryPoints: [buildConfigVirtual],
      outfile: buildConfigFile,
      bundle: true,
      treeShaking: false,
      sourcemap: false,
      minify: false,
      platform: 'node',
      packages: 'external',
      define: {
        'process.env.NODE_ENV': JSON.stringify(env),
      },
      loader: {
        '.js': 'jsx',
      },
      jsx: 'automatic',
      jsxImportSource: '@emotion/react',
      plugins: [
        virtualModule([
          {
            path: buildConfigVirtual,
            contents: `
              export { default as config } from '../firebolt.config.js'
            `,
          },
        ]),
      ],
    })
    const config = await getConfig()

    // initialize manifest
    const manifest = {
      pageFiles: {},
      bootstrapFile: null,
    }

    // get a list of page files
    const pageFiles = await getFilePaths(appPagesDir)

    // generate route info
    let ids = 0
    const routes = []
    for (const pageFile of pageFiles) {
      const id = `route${++ids}`
      const pageFileBase = path.relative(appPagesDir, pageFile)
      const shimFile = path.join(buildPageShimsDir, pageFileBase.replace('/', '.')) // prettier-ignore
      const shimFileName = path.relative(path.dirname(shimFile), shimFile) // prettier-ignore
      const pattern = fileToRoutePattern('/' + pageFileBase)
      const relBuildToPageFile = path.relative(buildDir, pageFile)
      const relShimToPageFile = path.relative(path.dirname(shimFile), pageFile) // prettier-ignore
      routes.push({
        id,
        pattern,
        shimFile,
        shimFileName,
        relBuildToPageFile,
        relShimToPageFile,
      })
    }

    // sort routes so that explicit routes have priority over dynamic routes
    routes.sort((a, b) => {
      const isDynamicA = a.pattern.includes(':')
      const isDynamicB = b.pattern.includes(':')
      if (isDynamicA && !isDynamicB) {
        return 1
      } else if (!isDynamicA && isDynamicB) {
        return -1
      }
      return 0
    })

    // copy over extras
    await fs.copy(extrasSrcDir, extrasDir)

    // build lib (firebolt)
    await esbuild.build({
      entryPoints: [extrasLibFile],
      outfile: buildLibFile,
      bundle: true,
      treeShaking: true,
      sourcemap: true,
      minify: prod,
      platform: 'node', // remove? this is on client too
      external: ['react', 'react-dom', '@emotion/react'],
      define: {
        'process.env.NODE_ENV': JSON.stringify(env),
      },
      loader: {
        '.js': 'jsx',
      },
      jsx: 'automatic',
      jsxImportSource: '@emotion/react',
    })

    // build core
    await esbuild.build({
      entryPoints: [buildCoreVirtual],
      outfile: buildCoreFile,
      bundle: true,
      treeShaking: true,
      sourcemap: true,
      minify: prod,
      platform: 'node',
      packages: 'external',
      // external: ['react', 'react-dom', '@emotion/react', ...config.external],
      alias: {
        firebolt: buildLibFile,
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify(env),
      },
      loader: {
        '.js': 'jsx',
      },
      jsx: 'automatic',
      jsxImportSource: '@emotion/react',
      plugins: [
        virtualModule([
          {
            path: path.join(appDir, '.firebolt/runtime.js'),
          },
          {
            path: buildCoreVirtual,
            contents: `
              ${routes.map(route => `import * as ${route.id} from '${route.relBuildToPageFile}'`).join('\n')}
              export const routes = [
                ${routes
                  .map(route => {
                    return `
                    {
                      module: ${route.id},
                      id: '${route.id}',
                      pattern: '${route.pattern}',
                      shimFile: '${route.shimFile}',
                      shimFileName: '${route.shimFileName}',
                      relBuildToPageFile: '${route.relBuildToPageFile}',
                      relShimToPageFile: '${route.relShimToPageFile}',
                      Page: ${route.id}.default,
                    },
                  `
                  })
                  .join('\n')}
              ]
              export { Document } from '../document.js'
              export { middleware } from '../middleware.js'
              export { createRuntime } from './extras/runtime.js'
              export * as lib from 'firebolt'
            `,
          },
        ]),
      ],
    })

    // import core
    const core = await reimport(buildCoreFile)

    // generate client page shims
    for (const route of core.routes) {
      const code = `
        import Page from '${route.relShimToPageFile}'
        globalThis.$firebolt.push('registerPage', '${route.id}', Page)
      `
      await fs.outputFile(route.shimFile, code)
    }

    // build client bundles (pages + bootstrap)
    const publicDir = path.join(buildDir, 'public')
    const publicFiles = []
    for (const route of core.routes) {
      publicFiles.push(route.shimFile)
    }
    publicFiles.push(extrasBoostrapFile)
    const bundleResult = await esbuild.build({
      entryPoints: publicFiles,
      entryNames: '/[name]-[hash]',
      outdir: publicDir,
      bundle: true,
      treeShaking: true,
      sourcemap: true,
      splitting: true,
      platform: 'browser',
      // mainFields: ["browser", "module", "main"],
      // external: ['fs', 'path', 'util', /*...config.external*/],
      format: 'esm',
      minify: prod,
      metafile: true,
      alias: {
        firebolt: buildLibFile,
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify(env),
      },
      loader: {
        '.js': 'jsx',
      },
      jsx: 'automatic',
      jsxImportSource: '@emotion/react',
      plugins: [
        // polyfill fs, path etc for browser environment
        // polyfillNode({}),
        // ensure pages are marked side-effect free for tree shaking
        // {
        //   name: 'no-side-effects',
        //   setup(build) {
        //     build.onResolve({ filter: /.*/ }, async args => {
        //       // ignore this if we called ourselves
        //       if (args.pluginData) return
        //       console.log(args.path)
        //       const { path, ...rest } = args
        //       // avoid infinite recursion
        //       rest.pluginData = true
        //       const result = await build.resolve(path, rest)
        //       result.sideEffects = false
        //       return result
        //     })
        //   },
        // },
      ],
    })
    const metafile = bundleResult.metafile
    for (const file in metafile.outputs) {
      const output = metafile.outputs[file]
      if (output.entryPoint) {
        // page wrappers
        if (output.entryPoint.startsWith('.firebolt/page-shims/')) {
          const shimFileName = output.entryPoint.replace('.firebolt/page-shims/', '') // prettier-ignore
          const route = core.routes.find(route => {
            return route.shimFileName === shimFileName
          })
          manifest.pageFiles[route.id] = file.replace(
            '.firebolt/public',
            '/_firebolt'
          )
        }
        if (output.entryPoint === '.firebolt/extras/bootstrap.js') {
          manifest.bootstrapFile = file.replace('.firebolt/public', '/_firebolt') // prettier-ignore
        }
      }
    }
    await fs.outputFile(buildManifestFile, JSON.stringify(manifest, null, 2))
  }

  let server

  async function serve() {
    // close any running server
    if (server) {
      await new Promise(resolve => server.close(resolve))
      server = null
    }

    // import config
    const config = await getConfig()

    // import server core
    const core = await reimport(buildCoreFile)

    // import manifest
    const manifest = await fs.readJSON(buildManifestFile)

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
        })
      }
    })

    server = app.listen(config.port, () => {
      console.log(`server running at http://localhost:${config.port}`)
    })

    server.on('error', error => {
      if (error.code === 'EADDRINUSE') {
        console.log(`port '${config.port}' is already in use`)
        process.exit()
      } else {
        console.error(`failed to start server: ${error.message}`)
      }
    })
  }

  if (opts.build) {
    await build()
  }

  if (opts.serve) {
    await serve()
  }

  if (opts.watch) {
    const watchOptions = {
      ignoreInitial: true,
      ignored: ['**/.firebolt/**'],
    }
    const watcher = chokidar.watch([appDir], watchOptions)
    const onChange = async (type, path) => {
      console.log('file change:', path)
      if (opts.build) {
        await build()
      }
      if (opts.serve) {
        await serve()
      }
    }
    watcher.on('all', debounce(onChange))
  }

  // todo: something is preventing the process from self-exiting
  if (!opts.serve && !opts.watch) {
    process.exit()
  }
}

function reimport(module) {
  delete require.cache[module]
  return import(`${module}?v=${Date.now()}`)
}
