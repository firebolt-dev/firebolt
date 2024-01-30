import { fork } from 'child_process'
// import path from 'path'
// import fs from 'fs-extra'
import chokidar from 'chokidar'
import * as esbuild from 'esbuild'
import _ from 'lodash'

const options = {}
options.watch = process.argv.includes('--watch')
options.minify = process.argv.includes('--minify')

// const cwd = process.cwd()

const env = process.env.NODE_ENV || 'development'

async function build() {
  log('build...')
  await esbuild.build({
    entryPoints: ['cli/index.js'],
    bundle: true,
    minify: options.minify,
    sourcemap: true,
    treeShaking: true,
    outfile: 'build/cli.js',
    platform: 'node',
    loader: {
      '.js': 'jsx',
    },
    jsx: 'automatic',
    jsxImportSource: '@emotion/react',
    banner: {
      js: '#!/usr/bin/env node',
    },
    // packages: 'external',
    external: ['esbuild', 'react', 'react-dom', '@emotion/react'],
    // external: [
    //   // exclude all the random knex packages fml
    //   'better-sqlite3',
    //   'sqlite3',
    //   'mysql',
    //   'mysql2',
    //   'tedious',
    //   'oracledb',
    //   'pg-query-stream',
    //   'mock-aws-s3',
    //   'aws-sdk',
    //   'nock',
    // ],
    define: {
      'process.env.NODE_ENV': JSON.stringify(env),
    },
  })
  log('build complete')
}

async function watch() {
  // export const cwd = process.cwd()
  const watcher = chokidar.watch(['cli'], {
    ignoreInitial: true,
  })
  const handleChanges = _.debounce(async () => {
    await build()
  })
  watcher.on('all', async (type, path) => {
    // changes.push({ type, path });
    handleChanges()
  })
  log('watching')
}

function log(...args) {
  console.log('[build]', ...args)
}

async function start() {
  await build()
  if (options.watch) {
    await watch()
  }
}

start()
