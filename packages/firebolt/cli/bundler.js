import fs from 'fs-extra'
import path from 'path'
import * as esbuild from 'esbuild'
import { debounce, defaultsDeep } from 'lodash'
import { polyfillNode } from 'esbuild-plugin-polyfill-node'
import chokidar from 'chokidar'
import { fork } from 'child_process'
import chalk from 'chalk'
import { performance } from 'perf_hooks'

import { getFilePaths } from './utils/getFilePaths'
import { fileToRoutePattern } from './utils/fileToRoutePattern'
import { virtualModule } from './utils/virtualModule'

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
  const buildServerFile = path.join(appDir, '.firebolt/server.js')

  const extrasSrcDir = path.join(__dirname, '../extras')
  const extrasDir = path.join(appDir, '.firebolt/extras')
  const extrasBoostrapFile = path.join(appDir, '.firebolt/extras/bootstrap.js')
  const extrasLibFile = path.join(appDir, '.firebolt/extras/lib.js')
  const extrasServerFile = path.join(appDir, '.firebolt/extras/server.js')

  const $info = chalk.black.bgWhiteBright('  info  ')
  const $watch = chalk.black.bgWhiteBright(' change ')

  let initialBuild = true
  let config

  console.log(' ')
  console.log('  🔥 Firebolt')
  console.log(' ')

  async function build() {
    const startAt = performance.now()
    console.log(
      initialBuild ? `${$info} building...` : `${$info} rebuilding...`
    )

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
              export { default as getConfig } from '../firebolt.config.js'
            `,
          },
        ]),
      ],
    })
    const { getConfig } = await reimport(buildConfigFile)
    config = getConfig()
    defaultsDeep(config, {
      port: 3000,
      external: [],
    })

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

    // build the server
    await esbuild.build({
      entryPoints: [extrasServerFile],
      outfile: buildServerFile,
      bundle: true,
      treeShaking: true,
      sourcemap: true,
      minify: prod,
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

    const elapsed = (performance.now() - startAt).toFixed(0)
    console.log(
      `${$info} ${initialBuild ? 'built' : 'rebuilt'} ${chalk.dim(`(${elapsed}ms)`)}\n`
    )
    initialBuild = false
  }

  let server
  let controller
  let initialServe = true

  async function serve() {
    // close any running server
    if (server) {
      await new Promise(resolve => {
        server.once('exit', resolve)
        controller.abort()
      })
      controller = null
      server = null
    }
    controller = new AbortController()
    const { signal } = controller
    server = fork(buildServerFile, { signal })
    server.on('error', err => {
      if (err.code === 'ABORT_ERR') {
        // we aborted
        return
      }
      console.log('server error')
      console.error(err)
    })
    await new Promise(resolve => {
      server.once('message', msg => {
        if (msg === 'ready') {
          resolve()
        }
      })
    })
    if (initialServe) {
      console.log(`server running at http://localhost:${config.port}\n`)
      initialServe = false
    }
  }

  let runInProgress = false
  let runPending = false
  const run = async () => {
    // if run is called while another run is running, queue it up to re-run at the end
    if (runInProgress) {
      runPending = true
      return
    }
    runInProgress = true
    if (opts.build) {
      await build()
    }
    if (opts.serve && !runPending) {
      await serve()
    }
    runInProgress = false
    if (runPending) {
      runPending = false
      run()
    }
  }

  if (opts.watch) {
    const watchOptions = {
      ignoreInitial: true,
      ignored: ['**/.firebolt/**'],
    }
    const watcher = chokidar.watch([appDir], watchOptions)
    const onChange = async (type, file) => {
      console.log(`${$watch} ~/${path.relative(appDir, file)}`)
      run()
    }
    watcher.on('all', debounce(onChange))
  }

  run()

  // todo: something is preventing the process from self-exiting
  if (!opts.serve && !opts.watch) {
    process.exit()
  }
}

function reimport(module) {
  delete require.cache[module]
  return import(`${module}?v=${Date.now()}`)
}
