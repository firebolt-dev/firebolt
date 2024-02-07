import { fork } from 'child_process'
// import path from 'path'
// import fs from 'fs-extra'
import chokidar from 'chokidar'
import * as esbuild from 'esbuild'
import _ from 'lodash'

const options = {
  watch: process.argv.includes('--watch'),
  run: process.argv.includes('--run'),
}

// const cwd = process.cwd()

let server

console.log("=============== DELETE THIS IF YOU DONT SEE IT ===============")

async function build() {
  log('build...')
  await esbuild.build({
    entryPoints: ['src/index.js'],
    loader: {
      '.html': 'text', // knex @mapbox/node-pre-gyp bullshit
    },
    bundle: true,
    minify: false,
    sourcemap: true,
    outfile: 'build/index.js',
    platform: 'node',
    // packages: 'external',
    external: [
      // exclude all the random knex packages fml
      'better-sqlite3',
      'sqlite3',
      'mysql',
      'mysql2',
      'tedious',
      'oracledb',
      'pg-query-stream',
      'mock-aws-s3',
      'aws-sdk',
      'nock',
    ],
  })
  log('build complete')
}

async function run() {
  log('run...')
  server = fork('build/index.js', {
    // env: {
    //   // PATH: process.env.PATH,
    // },
  })
  await signal(server, 'hyp_ready')
  log('run complete')
}

async function watch() {
  // export const cwd = process.cwd()
  const watcher = chokidar.watch(['src'], {
    ignoreInitial: true,
  })
  const handleChanges = _.debounce(async () => {
    server.kill('SIGTERM')
    await build()
    if (options.run) {
      await run()
    }
  })
  watcher.on('all', async (type, path) => {
    // changes.push({ type, path });
    handleChanges()
  })
  log('watching')
}

function signal(proc, signal) {
  return new Promise(resolve => {
    function onMessage(m) {
      if (m === signal) {
        proc.off('message', onMessage)
        resolve()
      }
    }
    proc.on('message', onMessage)
  })
}

process.on('exit', () => {
  server?.kill('SIGTERM')
})

async function start() {
  await build()
  if (options.run) {
    await run()
  }
  if (options.watch) {
    await watch()
  }
}

function log(...args) {
  console.log('[build]', ...args)
}

start()
