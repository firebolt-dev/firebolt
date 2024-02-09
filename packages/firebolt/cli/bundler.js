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

const match = matcher()

// suppress React warning about useLayoutEffect on server, this is nonsense because useEffect
// is similar and doesn't warn and is allowed in SSR
// see: https://gist.github.com/gaearon/e7d97cdf38a2907924ea12e4ebdf3c85
React.useLayoutEffect = React.useEffect

export async function bundler(opts) {
  const port = opts.port || 4004
  const prod = !!opts.production
  const env = prod ? 'production' : 'development'

  const appDir = process.cwd()
  const pagesDir = path.join(appDir, 'pages')
  const apiDir = path.join(appDir, 'api')

  const buildDir = path.join(appDir, '.firebolt')
  const wrapperBuildDir = path.join(appDir, '.firebolt', 'tmp', 'wrappers')
  const configSrcFile = path.join(appDir, '.firebolt', 'tmp', 'config.js') // prettier-ignore
  const configBuildFile = path.join(appDir, '.firebolt', 'tmp', 'config.build.js') // prettier-ignore
  const libFile = path.join(__dirname, 'lib.js')
  const coreBuildFile = path.join(buildDir, 'core.js')
  const manifestFile = path.join(buildDir, 'manifest.json')

  async function build() {
    console.log('building...')

    // ensure we have an empty build directory
    await fs.emptyDir(buildDir)

    // build and import config
    const configScript = `
      export { default as config } from '../../firebolt.config.js'
    `
    await fs.outputFile(configSrcFile, configScript)
    await esbuild.build({
      entryPoints: [configSrcFile],
      outfile: configBuildFile,
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
    })
    const configModule = await import(`${configBuildFile}?v=${Date.now()}`)
    const config = configModule.config()
    defaultsDeep(config, {
      external: [],
    })

    // initialize manifest
    const manifest = {
      clientPaths: {},
      bootstrapFile: null,
    }

    // get a list of page files
    const pageFiles = await getFilePaths(pagesDir)

    // generate route info
    let ids = 0
    const routes = []
    for (const pageFile of pageFiles) {
      const id = `route${++ids}`
      const srcFile = pageFile
      const srcFileBase = path.relative(pagesDir, pageFile)
      const wrapperFile = path.join(wrapperBuildDir, srcFileBase.replace('/', '.')) // prettier-ignore
      const wrapperFileName = path.relative(path.dirname(wrapperFile), wrapperFile) // prettier-ignore
      const pattern = fileToRoutePattern(pageFile.replace(pagesDir, ''))
      const relBuildToPageFile = path.relative(buildDir, srcFile)
      const relWrapperToPageFile = path.relative(path.dirname(wrapperFile), srcFile) // prettier-ignore
      routes.push({
        id,
        pattern,
        wrapperFile,
        wrapperFileName,
        relBuildToPageFile,
        relWrapperToPageFile,
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

    // copy over templates
    const templatesSrc = path.join(__dirname, '../templates')
    const templatesDir = path.join(buildDir, 'tmp', 'templates')
    await fs.copy(templatesSrc, templatesDir)

    // write core (an entry into the apps code for SSR)
    const coreCode = `
      ${routes.map(route => `import * as ${route.id} from '${route.relBuildToPageFile}'`).join('\n')}
      export const routes = [
        ${routes
          .map(route => {
            return `
            {
              module: ${route.id},
              id: '${route.id}',
              pattern: '${route.pattern}',
              wrapperFile: '${route.wrapperFile}',
              wrapperFileName: '${route.wrapperFileName}',
              relBuildToPageFile: '${route.relBuildToPageFile}',
              relWrapperToPageFile: '${route.relWrapperToPageFile}',
              Page: ${route.id}.default,
            },
          `
          })
          .join('\n')}
      ]
      export { Document } from '../document.js'
      export { middleware } from '../middleware.js'
      export { createRuntime } from './tmp/templates/runtime.js'
      export * as lib from 'firebolt'
    `
    const coreFile = path.join(buildDir, 'core.raw.js')
    await fs.writeFile(coreFile, coreCode)

    // build core
    await esbuild.build({
      entryPoints: [coreFile],
      outfile: coreBuildFile,
      bundle: true,
      treeShaking: true,
      sourcemap: true,
      minify: prod,
      platform: 'node',
      packages: 'external',
      // external: ['react', 'react-dom', '@emotion/react', ...config.external],
      alias: {
        firebolt: libFile,
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
    const core = await reimport(coreBuildFile)

    // generate client page bundles
    for (const route of core.routes) {
      const code = `
        import Page from '${route.relWrapperToPageFile}'
        globalThis.$firebolt.push('registerPage', '${route.id}', Page)
      `
      await fs.outputFile(route.wrapperFile, code)
    }

    // build client bundles (pages + runtime)
    const publicDir = path.join(buildDir, 'public')
    const publicFiles = []
    for (const route of core.routes) {
      publicFiles.push(route.wrapperFile)
    }
    publicFiles.push(path.join(templatesDir, 'bootstrap.js'))
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
        firebolt: libFile,
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
        if (output.entryPoint.startsWith('.firebolt/tmp/wrappers/')) {
          const wrapperFileName = output.entryPoint.replace('.firebolt/tmp/wrappers/', '') // prettier-ignore
          const route = core.routes.find(route => {
            return route.wrapperFileName === wrapperFileName
          })
          manifest.clientPaths[route.id] = file.replace(
            '.firebolt/public',
            '/_firebolt'
          )
        }
        if (output.entryPoint === '.firebolt/tmp/templates/bootstrap.js') {
          manifest.bootstrapFile = file.replace('.firebolt/public', '/_firebolt') // prettier-ignore
        }
      }
    }
    await fs.outputFile(manifestFile, JSON.stringify(manifest, null, 2))

    console.log('build complete')
  }

  let server

  async function serve() {
    // close any running server
    if (server) {
      await new Promise(resolve => server.close(resolve))
      server = null
    }

    // import server core
    const core = await reimport(coreBuildFile)

    // import manifest
    const manifest = await fs.readJSON(manifestFile)

    // hydrate manifest
    const bootstrapFile = manifest.bootstrapFile
    for (const route of core.routes) {
      route.file = manifest.clientPaths[route.id]
    }

    // build route definitions to be sent to client
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
          const headTags = runtime.getHeadTags()
          const headMain = runtime.getHeadMain()
          const elems = mergeHeadGroups(headMain, ...headTags)
          return renderToStaticMarkup(elems) || ''
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

    server = app.listen(port, () => {
      console.log(`server running on http://localhost:${port}`)
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
      console.log('file change')
      console.log({ type, path })
      if (opts.build) {
        await build()
      }
      if (opts.serve) {
        await serve()
      }
    }
    watcher.on('all', debounce(onChange))
  }
}

function reimport(module) {
  delete require.cache[module]
  return import(`${module}?v=${Date.now()}`)
}
