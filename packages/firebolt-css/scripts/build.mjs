import _ from 'lodash'
import fs from 'fs-extra'
import path from 'path'
import chokidar from 'chokidar'
import esbuild from 'esbuild'

const cwd = process.cwd()
const env = process.env.NODE_ENV || 'development'
const prod = env === 'production'

const buildDir = path.join(cwd, 'dist')

const opts = {}
opts.watch = process.argv.includes('--watch')

let firstBuild = true

async function build() {
  await fs.emptyDir(buildDir)
  console.log(firstBuild ? '[firebolt-css] build' : '[firebolt-css] rebuild')
  firstBuild = false
  await esbuild.build({
    entryPoints: ['src/index.js', 'src/jsx-runtime.js'],
    // outfile: 'dist/index.js',
    outdir: 'dist',
    bundle: true,
    treeShaking: true,
    sourcemap: true,
    minify: prod,
    platform: 'node',
    packages: 'external',
    define: {
      'process.env.NODE_ENV': JSON.stringify(env),
    },
    banner: {
      js: '#!/usr/bin/env node',
    },
    loader: {
      '.js': 'jsx',
    },
    jsx: 'automatic',
    // jsxImportSource: 'firebolt-css',
  })
}

async function watch() {
  if (!opts.watch) return
  const watcher = chokidar.watch(['src'], {
    ignoreInitial: true,
  })
  const handleChanges = _.debounce(async () => {
    await build()
  })
  watcher.on('all', async () => {
    handleChanges()
  })
  console.log('[firebolt-css] watching for changes...')
}

await build()

if (opts.watch) {
  await watch()
}
