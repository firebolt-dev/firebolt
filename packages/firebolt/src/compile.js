import fs from 'fs-extra'
import path from 'path'
import { fork } from 'child_process'
import { performance } from 'perf_hooks'
import chokidar from 'chokidar'
import * as esbuild from 'esbuild'
import { debounce, defaultsDeep } from 'lodash'
import { polyfillNode } from 'esbuild-plugin-polyfill-node'

import * as style from './utils/style'
import * as log from './utils/log'
import { reimport } from './utils/reimport'
import { getFilePaths } from './utils/getFilePaths'
import { fileToRoutePattern } from './utils/fileToRoutePattern'
import {
  BundlerError,
  isEsbuildError,
  logCodeError,
  parseEsbuildError,
  parseServerError,
} from './utils/errors'
import { virtualModule } from './utils/virtualModule'
import { registryPlugin } from './utils/registryPlugin'

export async function compile(opts) {
  const prod = !!opts.production
  const env = prod ? 'production' : 'development'

  const dir = __dirname
  const appDir = process.cwd()
  const appPagesDir = path.join(appDir, 'pages')
  const appApiDir = path.join(appDir, 'api')
  const appConfigFile = path.join(appDir, 'firebolt.config.js')

  const buildDir = path.join(appDir, '.firebolt')
  const buildPageShimsDir = path.join(appDir, '.firebolt/page-shims')
  const buildCoreFile = path.join(appDir, '.firebolt/core.js')
  const buildConfigFile = path.join(appDir, '.firebolt/config.js')
  const buildManifestFile = path.join(appDir, '.firebolt/manifest.json')
  const buildLibFile = path.join(appDir, '.firebolt/lib.js')
  const buildBoostrapFile = path.join(appDir, '.firebolt/bootstrap.js')
  const buildRegistryFile = path.join(appDir, '.firebolt/registry.js')
  const buildServerFile = path.join(appDir, '.firebolt/server.js')

  const extrasDir = path.join(dir, '../extras')

  const serverServerFile = path.join(appDir, '.firebolt/server/index.js')

  const tmpConfigFile = path.join(appDir, '.firebolt/tmp/config.js')
  const tmpCoreFile = path.join(appDir, '.firebolt/tmp/core.js')

  let firstBuild = true
  let config

  log.intro()

  async function build() {
    // start tracking build time
    const startAt = performance.now()
    log.info(`${firstBuild ? 'building...' : 'rebuilding...'}`)

    // ensure empty build directory
    await fs.emptyDir(buildDir)

    // check for config
    if (!(await fs.exists(appConfigFile))) {
      throw new BundlerError(`missing ${$mark('firebolt.config.js')} file`)
    }

    // create config entry
    const configCode = `
      export { default as getConfig } from '../firebolt.config.js'
    `
    await fs.writeFile(buildConfigFile, configCode)

    // temporarily build, import and validate config
    await esbuild.build({
      entryPoints: [buildConfigFile],
      outfile: tmpConfigFile,
      bundle: true,
      treeShaking: true,
      sourcemap: true,
      minify: false,
      platform: 'node',
      packages: 'external',
      logLevel: 'silent',
      define: {
        'process.env.NODE_ENV': JSON.stringify(env),
        FIREBOLT_NODE_ENV: JSON.stringify(env),
      },
      loader: {
        '.js': 'jsx',
      },
      jsx: 'automatic',
      jsxImportSource: '@emotion/react',
      plugins: [],
    })
    const { getConfig } = await reimport(tmpConfigFile)
    config = getConfig()
    defaultsDeep(config, {
      port: 3000,
      external: [],
      productionBrowserSourceMaps: false,
    })

    // initialize manifest
    const manifest = {
      pageFiles: {},
      bootstrapFile: null,
    }

    // get a list of page files
    const pageFiles = await getFilePaths(appPagesDir)

    // generate route details
    let ids = 0
    const routes = []
    for (const pageFile of pageFiles) {
      const id = `route${++ids}`
      const prettyFileBase = path.relative(appDir, pageFile)
      const pageFileBase = path.relative(appPagesDir, pageFile)
      const shimFile = path.join(buildPageShimsDir, pageFileBase.replace('/', '.')) // prettier-ignore
      const shimFileName = path.relative(path.dirname(shimFile), shimFile) // prettier-ignore
      const pattern = fileToRoutePattern('/' + pageFileBase)
      const relBuildToPageFile = path.relative(buildDir, pageFile)
      const relShimToPageFile = path.relative(path.dirname(shimFile), pageFile) // prettier-ignore
      routes.push({
        id,
        prettyFileBase,
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
    await fs.copy(extrasDir, buildDir)

    // create core
    const coreCode = `
      ${routes.map(route => `import * as ${route.id} from '${route.relBuildToPageFile}'`).join('\n')}
      export const routes = [
        ${routes
          .map(route => {
            return `
            {
              module: ${route.id},
              id: '${route.id}',
              prettyFileBase: '${route.prettyFileBase}',
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
      export { createRuntime } from './runtime.js'
      export * as lib from 'firebolt'
    `
    await fs.outputFile(buildCoreFile, coreCode)

    // temporarily build core for validation
    await esbuild.build({
      entryPoints: [buildCoreFile],
      outfile: tmpCoreFile,
      bundle: true,
      treeShaking: true,
      sourcemap: true,
      minify: false,
      platform: 'node',
      // format: 'esm',
      packages: 'external',
      // external: ['react', 'react-dom', '@emotion/react', ...config.external],
      // external: [...config.external],
      logLevel: 'silent',
      alias: {
        firebolt: buildLibFile,
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify(env),
        FIREBOLT_NODE_ENV: JSON.stringify(env),
      },
      loader: {
        '.js': 'jsx',
      },
      jsx: 'automatic',
      jsxImportSource: '@emotion/react',
      plugins: [],
    })

    // import and validate core page exports etc
    const core = await reimport(tmpCoreFile)
    for (const route of core.routes) {
      if (!route.Page) {
        throw new BundlerError(
          `missing default export for ${$mark(route.prettyFileBase)}`
        )
      }
    }

    // generate page shims for client (tree shaking)
    for (const route of routes) {
      const code = `
        import Page from '${route.relShimToPageFile}'
        globalThis.$firebolt.push('registerPage', '${route.id}', Page)
      `
      await fs.outputFile(route.shimFile, code)
    }

    const registry = {} // [id]: { file, fnName }

    // build client bundles (pages + chunks + bootstrap)
    const publicDir = path.join(buildDir, 'public')
    const publicFiles = []
    for (const route of routes) {
      publicFiles.push(route.shimFile)
    }
    publicFiles.push(buildBoostrapFile)
    const bundleResult = await esbuild.build({
      entryPoints: publicFiles,
      entryNames: '/[name]-[hash]',
      outdir: publicDir,
      bundle: true,
      treeShaking: true,
      sourcemap: prod ? config.productionBrowserSourceMaps : true,
      splitting: true,
      platform: 'browser',
      // mainFields: ["browser", "module", "main"],
      // external: ['fs', 'path', 'util', /*...config.external*/],
      format: 'esm',
      minify: prod,
      metafile: true,
      logLevel: 'silent',
      alias: {
        firebolt: buildLibFile,
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify(env),
        FIREBOLT_NODE_ENV: JSON.stringify(env),
      },
      loader: {
        '.js': 'jsx',
      },
      jsx: 'automatic',
      jsxImportSource: '@emotion/react',
      keepNames: !prod,
      plugins: [
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

    // reconcile hashed build files with their source
    const metafile = bundleResult.metafile
    for (const file in metafile.outputs) {
      const output = metafile.outputs[file]
      if (output.entryPoint) {
        // page wrappers
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
        if (output.entryPoint === '.firebolt/bootstrap.js') {
          manifest.bootstrapFile = file.replace('.firebolt/public', '/_firebolt') // prettier-ignore
        }
      }
    }
    await fs.outputFile(buildManifestFile, JSON.stringify(manifest, null, 2))

    // generate our registry file
    const getRegistryRelPath = file => path.relative(buildDir, file)
    const registryCode = `
      ${Object.keys(registry)
        .map(
          id =>
            `export { ${registry[id].fnName} as ${id} } from '${getRegistryRelPath(registry[id].file)}'`
        )
        .join('\n')}      
    `
    await fs.outputFile(buildRegistryFile, registryCode)

    // build server entry
    await esbuild.build({
      entryPoints: [buildServerFile],
      outfile: serverServerFile,
      bundle: true,
      treeShaking: true,
      sourcemap: true,
      minify: prod,
      platform: 'node',
      // format: 'esm',
      packages: 'external',
      logLevel: 'silent',
      alias: {
        firebolt: buildLibFile,
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify(env),
        FIREBOLT_NODE_ENV: JSON.stringify(env),
      },
      loader: {
        '.js': 'jsx',
      },
      jsx: 'automatic',
      jsxImportSource: '@emotion/react',
      keepNames: !prod,
      plugins: [
        registryPlugin({ registry: null }), // dont write to registry, we already have it from the client
      ],
    })

    const elapsed = (performance.now() - startAt).toFixed(0)
    log.info(`${firstBuild ? 'built' : 'rebuilt'} ${style.dim(`(${elapsed}ms)`)}\n`) // prettier-ignore
    firstBuild = false
  }

  let server
  let controller

  async function serve() {
    let SILENT_STARTUP
    if (server) {
      SILENT_STARTUP = config && config.port === server.port ? 'yes' : undefined
    }
    // destroy previous server if any
    if (server) {
      await new Promise(resolve => {
        server.once('exit', resolve)
        controller.abort()
      })
      controller = null
      server = null
    }
    // spawn server
    controller = new AbortController()
    server = fork(serverServerFile, {
      signal: controller.signal,
      env: { SILENT_STARTUP },
    })
    server.port = config?.port
    server.on('error', err => {
      // ignore abort signals
      if (err.code === 'ABORT_ERR') return
      // log other errors
      console.log('server error')
      console.error(err)
    })
    await new Promise(resolve => {
      server.once('message', msg => {
        if (msg === 'ready') resolve()
      })
    })
    server.on('message', msg => {
      if (msg.type === 'error') {
        logCodeError(parseServerError(msg.error, appDir))
      }
    })
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
        return
      }
    }
    // only serve if there isn't anothe run pending
    if (opts.serve && !runPending) {
      await serve()
    }
    runInProgress = false
    // if another run was queued, lets run it again!
    if (runPending) {
      runPending = false
      run()
    }
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
      log.change(`~/${path.relative(appDir, file)}`)
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
