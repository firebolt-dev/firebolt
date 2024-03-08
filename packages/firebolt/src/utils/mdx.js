/**
 * This is a modified version of @mdx-js/esbuild
 * See: https://github.com/mdx-js/mdx/blob/main/packages/esbuild/lib/index.js
 *
 * Mainly this plugin employs better caching, with the caveat that we have to manually
 * evict them in the file watcher in exec.js
 */

import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createFormatAwareProcessors } from '@mdx-js/mdx/internal-create-format-aware-processors'
import { extnamesToRegex } from '@mdx-js/mdx/internal-extnames-to-regex'
import { VFile } from 'vfile'
import { VFileMessage } from 'vfile-message'

const eol = /\r\n|\r|\n|\u2028|\u2029/g

const name = '@mdx-js/esbuild'

export default function createMdx(options) {
  const { extnames, process } = createFormatAwareProcessors(options || {})

  const cache = {}

  return {
    plugin: {
      name,
      setup,
    },
    evict,
  }

  function setup(build) {
    build.onLoad({ filter: extnamesToRegex(extnames) }, onload)

    async function onload(data) {
      if (cache[data.path]) {
        return cache[data.path]
      }

      let document = String(
        data.pluginData &&
          data.pluginData.contents !== null &&
          data.pluginData.contents !== undefined
          ? data.pluginData.contents
          : await fs.readFile(data.path)
      )

      const head = `
import { cloneElement } from 'react'
import { useMDXComponents } from 'firebolt'

`

      const foot = `
export default function MDXWrapper({ children }) {
  const components = useMDXComponents()
  return cloneElement(children, { components })
}`

      document = head + document + foot

      const state = { doc: document, name, path: data.path }
      let file = new VFile({ path: data.path, value: document })
      let value
      let messages = []
      const errors = []
      const warnings = []

      try {
        file = await process(file)
        value = file.value
        messages = file.messages
      } catch (error_) {
        const cause = /** @type {VFileMessage | Error} */ (error_)
        const message =
          'reason' in cause
            ? cause
            : new VFileMessage('Cannot process MDX file with esbuild', {
                cause,
                ruleId: 'process-error',
                source: '@mdx-js/esbuild',
              })
        message.fatal = true
        messages.push(message)
      }

      for (const message of messages) {
        const list = message.fatal ? errors : warnings
        list.push(vfileMessageToEsbuild(state, message))
      }

      // Safety check: the file has a path, so there has to be a `dirname`.
      assert(file.dirname, 'expected `dirname` to be defined')

      const result = {
        contents: value || '',
        errors,
        resolveDir: path.resolve(file.cwd, file.dirname),
        warnings,
      }

      cache[data.path] = result

      return result
    }
  }

  function evict(path) {
    console.log('evict', path, !!cache[path])
    delete cache[path]
  }
}

function vfileMessageToEsbuild(state, message) {
  const place = message.place
  const start = place ? ('start' in place ? place.start : place) : undefined
  const end = place && 'end' in place ? place.end : undefined
  let length = 0
  let lineStart = 0
  let line = 0
  let column = 0

  if (start && start.offset !== undefined) {
    line = start.line
    column = start.column - 1
    lineStart = start.offset - column
    length = 1

    if (end && end.offset !== undefined) {
      length = end.offset - start.offset
    }
  }

  eol.lastIndex = lineStart

  const match = eol.exec(state.doc)
  const lineEnd = match ? match.index : state.doc.length

  return {
    detail: message,
    id: '',
    location: {
      column,
      file: state.path,
      length: Math.min(length, lineEnd),
      line,
      lineText: state.doc.slice(lineStart, lineEnd),
      namespace: 'file',
      suggestion: '',
    },
    notes: [],
    pluginName: state.name,
    text: message.reason,
  }
}
