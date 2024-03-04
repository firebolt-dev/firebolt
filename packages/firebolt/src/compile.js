import 'dotenv/config'

import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { performance } from 'perf_hooks'
import chokidar from 'chokidar'
import * as esbuild from 'esbuild'
import { isEqual, debounce } from 'lodash-es'
import mdx from '@mdx-js/esbuild'

import express from 'express'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'

import * as style from './utils/style'
import * as log from './utils/log'
import { reimport } from './utils/reimport'
import { getFilePaths } from './utils/getFilePaths'
import { createRoutePattern } from './utils/createRoutePattern'
import {
  BundlerError,
  isEsbuildError,
  logCodeError,
  parseEsbuildError,
  parseServerError,
} from './utils/errors'
import { registryPlugin } from './utils/registryPlugin'
import { zombieImportPlugin } from './utils/zombieImportPlugin'
import { virtualModule } from './utils/virtualModule'
import { Pending } from './utils/Pending'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function compile(opts) {
  const prod = !!opts.production
  const env = prod ? 'production' : 'development'

  const dir = __dirname
  const appDir = process.cwd()
  const appRoutesDir = path.join(appDir, 'routes')
  const appConfigFile = path.join(appDir, 'firebolt.config.js')

  const buildDir = path.join(appDir, '.firebolt')
  const buildPageShimsDir = path.join(appDir, '.firebolt/page-shims')
  const buildRoutesFile = path.join(appDir, '.firebolt/routes.js')
  const buildConfigFile = path.join(appDir, '.firebolt/config.js')
  const buildManifestFile = path.join(appDir, '.firebolt/manifest.json')
  const buildLibFile = path.join(appDir, '.firebolt/lib.js')
  const buildBoostrapFile = path.join(appDir, '.firebolt/bootstrap.js')
  const buildRegistryFile = path.join(appDir, '.firebolt/registry.js')
  const buildServerFile = path.join(appDir, '.firebolt/server.js')
  const buildInspectionFile = path.join(appDir, '.firebolt/inspection.js')

  const extrasDir = path.join(dir, '../extras')

  const serverServerFile = path.join(appDir, '.firebolt/server/index.js')

  const tmpConfigFile = path.join(appDir, '.firebolt/tmp/config.js')
  const tmpInspectionFile = path.join(appDir, '.firebolt/tmp/inspection.js')

  let freshBuild = true
  let freshConfig = true
  let mdxPlugin
  const mdxCache = {} // pageFile -> js
  const ctx = {
    configValidator: null,
    pageInspector: null,
    clientBundles: null,
    serverEntry: null,
  }
  let clientEntryPoints = []

  const registry = new Map() // id -> { file, fnName }

  log.intro()

  async function build() {
    // start tracking build time
    const startAt = performance.now()
    log.info(`${freshBuild ? 'building...' : 'rebuilding...'}`)

    // ensure empty build directory + copy over extras
    if (freshBuild) {
      await fs.emptyDir(buildDir)
      await fs.copy(extrasDir, buildDir)
    }

    // ensure app has config file
    if (!(await fs.exists(appConfigFile))) {
      throw new BundlerError(`missing ${style.mark('firebolt.config.js')} file`)
    }

    // temporarily build, import and validate config
    if (!ctx.configValidator) {
      ctx.configValidator = await esbuild.context({
        entryPoints: [buildConfigFile],
        outfile: tmpConfigFile,
        bundle: true,
        treeShaking: true,
        sourcemap: true,
        minify: false,
        platform: 'node',
        format: 'esm',
        packages: 'external',
        logLevel: 'silent',
        define: {
          'process.env.NODE_ENV': JSON.stringify(env),
        },
        loader: {
          '.js': 'jsx',
        },
        jsx: 'automatic',
        jsxImportSource: '@firebolt-dev/jsx',
        plugins: [
          // mdxPlugin,
        ],
      })
    }
    // console.time('configValidator')
    await ctx.configValidator.rebuild()
    // console.timeEnd('configValidator')

    const config = (await reimport(tmpConfigFile)).config

    // get all public env variables for client bundles
    const publicDefineEnvs = {}
    for (const key in process.env) {
      if (key.startsWith(config.publicEnvPrefix)) {
        publicDefineEnvs[`process.env.${key}`] = `"${process.env[key]}"`
      }
    }

    // create mdx plugin
    // we try to re-use the same mdx plugin across builds for performance
    // but if our config changes then our mdx options might have changed, so we re-create it!
    if (freshConfig) {
      mdxPlugin = mdx({
        jsx: false,
        jsxRuntime: 'automatic',
        jsxImportSource: '@firebolt-dev/jsx',
        remarkPlugins: config.mdx.remarkPlugins,
        rehypePlugins: config.mdx.rehypePlugins,
      })
    }

    // initialize manifest, which stores all the output page and bootstrap
    // file hashes as urls  that the client can load
    const manifest = {
      pageFiles: {},
      bootstrapFile: null,
    }

    // get list of route files
    const routeFiles = await getFilePaths(appRoutesDir)

    // generate route details
    let routeIds = 0
    const routes = []
    for (const file of routeFiles) {
      const route = {}
      route.id = `route${++routeIds}`
      route.file = file
      route.fileBase = path.relative(appRoutesDir, file)
      route.fileBaseNoExt = route.fileBase.split('.').slice(0, -1).join('.')
      route.fileExt = route.fileBase.split('.').pop()
      // figure out route type
      if (
        route.fileBase === '_layout.js' ||
        route.fileBase.endsWith('/_layout.js')
      ) {
        route.type = 'layout'
      } else if (route.fileExt === 'js') {
        route.type = 'pageOrHandler' // intermediary, replaced with 'handler' or 'page' during inspection
      } else if (route.fileExt === 'mdx') {
        route.type = 'page'
        route.mdx = true
      } else {
        route.type = 'static'
      }
      // patterns for addressable urls
      if (route.type === 'pageOrHandler' || route.type === 'page') {
        route.pattern = createRoutePattern(route.fileBaseNoExt)
      } else if (route.type === 'static') {
        route.pattern = createRoutePattern(route.fileBase)
      } else {
        route.pattern = ''
      }
      route.relAppToFile = path.relative(appDir, route.file)
      route.shimFile = path.join(buildPageShimsDir, route.fileBase.replace(/\//g, '_')) // prettier-ignore
      if (route.mdx) route.shimFile = route.shimFile.replace('.mdx', '.js') // prettier-ignore
      route.shimFileName = path.relative(path.dirname(route.shimFile), route.shimFile) // prettier-ignore
      route.relBuildToFile = path.relative(buildDir, route.file)
      route.relShimToFile = path.relative(path.dirname(route.shimFile), route.file) // prettier-ignore
      routes.push(route)
    }
    for (const route of routes) {
      route.parents = []
      if (route.type === 'pageOrHandler' || route.type === 'page') {
        // populate parent layouts for each page
        const segments = route.fileBaseNoExt.split('/')
        for (let i = 0; i < segments.length; i++) {
          const sub = [...segments].slice(0, i).join('/')
          if (!sub) continue
          const layout = routes.find(r => {
            return r.type === 'layout' && r.fileBaseNoExt === sub + '/_layout' // ignore root layout!
          })
          if (layout) {
            route.parents.push(layout)
          }
        }
      }
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

    // build any mdx pages missing from our cache.
    // building mdx pages is really slow so we build them once and use their output in future builds (and rebuilds) as a virtual module.
    // our file watcher will evict mdx pages from the cache so they get rebuilt.
    const routesNeedingMDXBuild = routes.filter(route => {
      if (!route.mdx) return false
      // if config changed then all mdx pages need building
      if (freshConfig) return true
      // otherwise only include mdx pages not cached
      return !mdxCache[route.file]
    })
    if (routesNeedingMDXBuild.length) {
      // console.log(
      //   'building mdx',
      //   routesNeedingMDXBuild.map(r => r.relAppToFile)
      // )
      // console.time('mdx')
      const result = await esbuild.build({
        entryPoints: routesNeedingMDXBuild.map(r => r.file),
        outdir: 'out',
        write: false,
        // bundle: true,
        // treeShaking: true,
        // sourcemap: true,
        // minify: false,
        platform: 'neutral',
        format: 'esm',
        packages: 'external',
        // external: ['react', 'react-dom', '@firebolt-dev/jsx'],
        // external: [],
        logLevel: 'silent',
        // alias: {
        //   firebolt: buildLibFile,
        // },
        define: {
          'process.env.NODE_ENV': JSON.stringify(env),
          ...publicDefineEnvs,
        },
        // loader: {
        //   '.js': 'jsx',
        // },
        // jsx: 'automatic',
        // jsxImportSource: '@firebolt-dev/jsx',
        plugins: [mdxPlugin, zombieImportPlugin],
      })
      // todo: this doesn't feel like a robust way to match output files
      // back to routes but it seems to work :sweat:
      let i = 0
      for (let out of result.outputFiles) {
        const route = routesNeedingMDXBuild[i]
        mdxCache[route.file] = out.text
        i++
      }
      // console.timeEnd('mdx')
    }

    // build, inspect and resolve pages and handlers
    let inspectionCode = ''
    for (const route of routes) {
      if (route.type === 'pageOrHandler' || route.type === 'page') {
        inspectionCode += `export * as ${route.id} from '${route.relBuildToFile}'\n`
      }
    }
    await fs.outputFile(buildInspectionFile, inspectionCode)
    if (!ctx.pageInspector) {
      ctx.pageInspector = await esbuild.context({
        entryPoints: [buildInspectionFile],
        outfile: tmpInspectionFile,
        bundle: true,
        treeShaking: true,
        sourcemap: true,
        minify: false,
        platform: 'node',
        format: 'esm',
        packages: 'external',
        // external: ['react', 'react-dom', '@firebolt-dev/jsx'],
        // external: [],
        logLevel: 'silent',
        alias: {
          firebolt: buildLibFile,
        },
        define: {
          'process.env.NODE_ENV': JSON.stringify(env),
          ...publicDefineEnvs,
        },
        loader: {
          '.js': 'jsx',
        },
        jsx: 'automatic',
        jsxImportSource: '@firebolt-dev/jsx',
        plugins: [
          // mdxPlugin,
          virtualModule(mdxCache),
        ],
      })
    }
    // console.time('pageInspector')
    await ctx.pageInspector.rebuild()
    // console.timeEnd('pageInspector')
    const inspection = await reimport(tmpInspectionFile)
    // console.log('inspection', inspection)
    for (const route of routes) {
      const module = inspection[route.id]
      if (route.type === 'pageOrHandler') {
        // finally determine if this route is a 'page' or a 'handler'
        route.type = module.default ? 'page' : 'handler'
      }
    }

    // function that generates JSX for each page, nested inside their layouts
    const generateNestedJSX = route => {
      if (route.type !== 'page') return null
      let open = ''
      let close = ''
      for (const parent of route.parents) {
        open += `<${parent.id}.default>`
        close = `</${parent.id}.default>` + close
      }
      if (route.mdx) {
        return `key => ${open}<MDXWrapper key={key} component={${route.id}.default} />${close}`
      } else {
        return `key => ${open}<${route.id}.default key={key}/>${close}`
      }
    }

    // create routes file
    const routesCode = `
      import { MDXWrapper } from 'firebolt'
      ${routes
        .filter(route => isType(route, 'layout', 'page', 'handler'))
        .map(route => `import * as ${route.id} from '${route.relBuildToFile}'`)
        .join('\n')}
      const routes = [
        ${routes
          .map(route => {
            return `
            {
              module: ${isType(route, 'page', 'handler') ? route.id : 'null'},
              id: '${route.id}',
              type: '${route.type}',
              relAppToFile: '${route.relAppToFile}',
              pattern: '${route.pattern}',
              shimFile: '${route.shimFile}',
              shimFileName: '${route.shimFileName}',
              relBuildToFile: '${route.relBuildToFile}',
              relShimToFile: '${route.relShimToFile}',
              content: ${generateNestedJSX(route)}
            },
          `
          })
          .join('\n')}
      ]
      export default routes
    `
    await fs.outputFile(buildRoutesFile, routesCode)

    // generate page shims for client
    for (const route of routes) {
      if (route.type !== 'page') continue
      const code = `
        import { MDXWrapper } from 'firebolt'
        import * as ${route.id} from '${route.relShimToFile}'
        ${route.parents.map(parent => `import * as ${parent.id} from '${parent.relShimToFile}'`).join('\n')}
        const content = ${generateNestedJSX(route)}
        globalThis.$firebolt('registerPage', '${route.id}', content)
      `
      await fs.outputFile(route.shimFile, code)
    }

    // clear the registry for rebuilds, keeping the reference for registryPlugin.
    registry.clear()

    // build client bundles (pages + chunks + bootstrap)
    const publicDir = path.join(buildDir, 'public')
    const newClientEntryPoints = []
    for (const route of routes) {
      if (route.type === 'page') {
        newClientEntryPoints.push(route.shimFile)
      }
    }
    newClientEntryPoints.push(buildBoostrapFile)
    const clientEntryPointsChanged = !isEqual(
      clientEntryPoints,
      newClientEntryPoints
    )
    if (clientEntryPointsChanged) {
      clientEntryPoints = newClientEntryPoints
    }
    if (!ctx.clientBundles || freshConfig || clientEntryPointsChanged) {
      // config changes require new mdxPlugin + productionBrowserSourceMaps value
      ctx.clientBundles = await esbuild.context({
        entryPoints: clientEntryPoints,
        entryNames: '/[name]-[hash]',
        outdir: publicDir,
        bundle: true,
        treeShaking: true,
        sourcemap: prod ? config.productionBrowserSourceMaps : true,
        splitting: true,
        platform: 'browser',
        // mainFields: ["browser", "module", "main"],
        // external: ['fs', 'path', 'util'],
        format: 'esm',
        minify: prod,
        metafile: true,
        logLevel: 'silent',
        alias: {
          firebolt: buildLibFile,
        },
        define: {
          'process.env.NODE_ENV': JSON.stringify(env),
          ...publicDefineEnvs,
        },
        loader: {
          '.js': 'jsx',
        },
        jsx: 'automatic',
        jsxImportSource: '@firebolt-dev/jsx',
        plugins: [
          // mdxPlugin,
          virtualModule(mdxCache),
          registryPlugin({ registry }),
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
    }
    // console.time('clientBundles')
    const bundleResult = await ctx.clientBundles.rebuild()
    // console.timeEnd('clientBundles')
    // reconcile hashed build files with their source

    const metafile = bundleResult.metafile
    for (const file in metafile.outputs) {
      const output = metafile.outputs[file]
      if (output.entryPoint) {
        // page shims
        if (output.entryPoint.startsWith('.firebolt/page-shims/')) {
          const shimFileName = output.entryPoint.replace('.firebolt/page-shims/', '') // prettier-ignore
          const route = routes.find(route => {
            return route.shimFileName === shimFileName
          })
          manifest.pageFiles[route.id] = file.replace(
            '.firebolt/public',
            '/_firebolt'
          )
        }
        // bootstrap file
        if (output.entryPoint === '.firebolt/bootstrap.js') {
          manifest.bootstrapFile = file.replace('.firebolt/public', '/_firebolt') // prettier-ignore
        }
      }
    }
    await fs.outputFile(buildManifestFile, JSON.stringify(manifest, null, 2))

    // generate our registry file
    const getRegistryRelPath = file => path.relative(buildDir, file)
    let registryCode = ''
    registry.forEach(item => {
      registryCode += `export { ${item.fnName} as ${item.id} } from '${getRegistryRelPath(item.file)}'\n`
    })
    await fs.outputFile(buildRegistryFile, registryCode)

    // build server entry
    if (!ctx.serverEntry || freshConfig) {
      // config changes require new mdxPlugin
      ctx.serverEntry = await esbuild.context({
        entryPoints: [buildServerFile],
        outfile: serverServerFile,
        bundle: true,
        treeShaking: true,
        sourcemap: true,
        minify: prod,
        platform: 'node',
        format: 'esm',
        packages: 'external',
        logLevel: 'silent',
        alias: {
          firebolt: buildLibFile,
        },
        define: {
          'process.env.NODE_ENV': JSON.stringify(env),
          ...publicDefineEnvs,
        },
        loader: {
          '.js': 'jsx',
        },
        jsx: 'automatic',
        jsxImportSource: '@firebolt-dev/jsx',
        plugins: [
          mdxPlugin,
          registryPlugin({ registry: null }), // dont write to registry, we already have it from the client bundles
        ],
      })
    }
    // console.time('serverEntry')
    await ctx.serverEntry.rebuild()
    // console.timeEnd('serverEntry')
    const elapsed = (performance.now() - startAt).toFixed(0)
    log.info(`${freshBuild ? 'built' : 'rebuilt'} ${style.dim(`(${elapsed}ms)`)}\n`) // prettier-ignore
    freshBuild = false
    freshConfig = false
  }

  let runProgress = new Pending()

  let appServer
  let server
  let port

  async function serve() {
    server = await reimport(serverServerFile)
    if (appServer && server.config.port !== port) {
      appServer.close()
      appServer = null
    }
    if (!appServer) {
      const app = express()
      app.use(cors())
      app.use(compression())
      app.use(express.json())
      app.use(cookieParser())
      app.use(async (req, res, next) => {
        res.setHeader('X-Powered-By', 'Firebolt')
        if (!prod) await runProgress.wait() // during development pause requests while builds are in progress
        next()
      })
      // app.use(express.static('public'))
      app.use('/_firebolt', express.static('.firebolt/public'))
      app.post('/_firebolt_fn', async (req, res) => {
        // todo: try/catch
        server.handleFunction(req, res)
      })
      app.use('*', async (req, res) => {
        try {
          await server.handleRequest(req, res)
        } catch (err) {
          console.error(err)
          // console.log('server.handleRequest catch')
          // if (err instanceof server.Request) {
          //   logCodeError(parseServerError(err, appDir))
          // } else {
          //   console.error(err)
          // }
        }
      })
      port = server.config.port
      function onConnected() {
        console.log(`server running at http://localhost:${port}\n`)
      }
      function onError(err) {
        if (err.code === 'EADDRINUSE') {
          log.error(`port ${port} is already in use\n`)
          process.exit()
        } else {
          log.error(`failed to start server: ${err.message}`)
        }
      }
      appServer = app.listen(port, onConnected).on('error', onError)
    }
  }

  let runInProgress = false
  let runPending = false

  // handle bundler runs/re-runs safely
  const run = async () => {
    // if run is called while another run is in progress we
    // queue it up to re-run again after
    if (runInProgress) {
      runPending = true
      return
    }
    runProgress.begin()
    runInProgress = true
    // build
    if (opts.build) {
      try {
        await build()
      } catch (err) {
        if (err instanceof BundlerError) {
          log.error(err.message)
        } else if (isEsbuildError(err)) {
          logCodeError(parseEsbuildError(err))
        } else {
          log.error('\n')
          console.error(err)
        }
        runInProgress = false
        runPending = false
        runProgress.end()
        return
      }
    }
    // only serve if there isn't another run pending
    if (opts.serve && !runPending) {
      await serve()
    }
    runInProgress = false
    // if another run was queued, lets run it again!
    if (runPending) {
      runPending = false
      await run()
    }
    runProgress.end()
  }

  // execute our initial run
  await run()

  // watch for file changes and then re-run the bundler
  if (opts.watch) {
    const watchOptions = {
      ignoreInitial: true,
      ignored: ['**/.firebolt/**'],
    }
    const watcher = chokidar.watch([appDir], watchOptions)
    const onChange = async (type, file) => {
      const relFile = path.relative(appDir, file)
      log.change(`~/${relFile}`)

      // track config file changes
      if (relFile === 'firebolt.config.js') {
        freshConfig = true
      }

      // track mdx pages and evict from cache
      if (relFile.endsWith('.mdx')) {
        delete mdxCache[file]
      }

      run()
    }
    watcher.on('all', debounce(onChange))
  }

  // todo: isolated builds don't exit the process automatically so
  // for now we just force exit.
  if (!opts.serve && !opts.watch) {
    process.exit()
  }
}

function isType(route, ...types) {
  return types.includes(route.type)
}
