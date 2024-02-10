import _ from 'lodash'
import fs from 'fs-extra'
import path from 'path'
import chokidar from 'chokidar'
import esbuild from 'esbuild'

const cwd = process.cwd()
const env = process.env.NODE_ENV || 'development'
const prod = env === 'production'

const buildDir = path.join(cwd, 'build')

const opts = {}
opts.watch = process.argv.includes('--watch')

let firstBuild = true

async function build() {
  await fs.emptyDir(buildDir)
  console.log(
    firstBuild ? '[firebolt] building cli' : '[firebolt] rebuilding cli'
  )
  firstBuild = false
  await esbuild.build({
    entryPoints: ['cli/index.js'],
    outfile: 'build/cli.js',
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
    jsxImportSource: '@emotion/react',
  })
  const bin = path.join(cwd, 'build/cli.js')
  await fs.chmod(bin, '755')
}

async function watch() {
  if (!opts.watch) return
  const watcher = chokidar.watch(['cli'], {
    ignoreInitial: true,
  })
  const handleChanges = _.debounce(async () => {
    await build()
  })
  watcher.on('all', async () => {
    handleChanges()
  })
  console.log('[firebolt] watching for changes...')
}

await build()

if (opts.watch) {
  await watch()
}
