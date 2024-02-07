import _ from 'lodash'
import fs from 'fs-extra'
import path from 'path'
import chokidar from 'chokidar'
import esbuild from 'esbuild'

const cwd = process.cwd()
const env = process.env.NODE_ENV || 'development'
const prod = env === 'production'

const buildDir = path.join(cwd, 'build')

const options = {}
options.watch = process.argv.includes('--watch')

async function cli() {
  async function build() {
    console.log('[cli] building')
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
    console.log('[cli] built')
  }
  await build()
  const bin = path.join(cwd, 'build/cli.js')
  await fs.chmod(bin, '755')
  if (!options.watch) return
  const watcher = chokidar.watch(['cli'], {
    ignoreInitial: true,
  })
  const handleChanges = _.debounce(async () => {
    await build()
  })
  watcher.on('all', async () => {
    handleChanges()
  })
  console.log('[cli] watching')
}

async function lib() {
  async function build() {
    console.log('[lib] building')
    await esbuild.build({
      entryPoints: ['lib/index.js'],
      outfile: 'build/lib.js',
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
    console.log('[lib] built')
  }
  await build()
  if (!options.watch) return
  const watcher = chokidar.watch(['lib'], {
    ignoreInitial: true,
  })
  const handleChanges = _.debounce(async () => {
    await build()
  })
  watcher.on('all', async () => {
    handleChanges()
  })
  console.log('[lib] watching')
}

await fs.emptyDir(buildDir)
await cli()
await lib()
