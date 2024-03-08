import _ from 'lodash-es'
import fs from 'fs-extra'
import path from 'path'
import chokidar from 'chokidar'
import esbuild from 'esbuild'

const cwd = process.cwd()
const buildDir = path.join(cwd, 'dist')
const prod = process.argv.includes('--production')
const env = prod ? 'production' : 'development'

let firstBuild = true

async function build() {
  await fs.emptyDir(buildDir)
  log(firstBuild ? 'build' : 'rebuilt')
  firstBuild = false
  await esbuild.build({
    entryPoints: ['src/index.js'],
    outfile: 'dist/index.js',
    bundle: true,
    treeShaking: true,
    sourcemap: true,
    minify: prod,
    platform: 'node',
    format: 'esm',
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
    jsxImportSource: '@firebolt-dev/jsx',
  })
  const bin = path.join(cwd, 'dist/index.js')
  await fs.chmod(bin, '755')
}

async function watch() {
  if (prod) return
  const watcher = chokidar.watch(['src'], {
    ignoreInitial: true,
  })
  const handleChanges = _.debounce(async () => {
    await build()
  })
  watcher.on('all', async () => {
    handleChanges()
  })
  log('watching...')
}

await build()
await watch()

function log(...args) {
  console.log('[create-firebolt]', ...args)
}
