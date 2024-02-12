import fs from 'fs-extra'
import { padStart } from 'lodash'
import path from 'path'

import * as s from './style'

/**
 * TODO: if esbuild throws multiple errors (eg the knex external issue) we currently only
 *       show the first but should probably show all of them!
 */

export class BundlerError extends Error {
  constructor(message) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

function getFileLine(file, line) {
  const data = fs.readFileSync(file, 'utf-8')
  return data.split('\n')[line - 1]
}

function split(str, column, length) {
  const first = str.substring(0, column)
  const second = str.substring(column, column + length)
  const third = str.substring(column + length)
  return [first, second, third]
}

export function parseEsbuildError(error) {
  error = error.errors[0]
  const name = 'BuildError'
  const message = error.text
  const file = error.location.file
  const code = error.location.lineText
  const line = error.location.line
  const column = error.location.column
  const length = error.location.length
  const suggestion = error.location.suggestion
  return {
    name,
    message,
    file,
    code,
    line,
    column,
    length,
    suggestion,
  }
}

export function parseServerError(error, appDir) {
  const name = error.name // eg Error, ReferenceError
  const message = error.message // eg foo is not defined
  const lines = error.stack.split('\n')
  let [, file, line, column] = match = lines[1].match(/\((.*):(\d+):(\d+)\)$/) // prettier-ignore
  const code = getFileLine(file, line)
  return {
    name,
    message,
    file: path.relative(appDir, file),
    code,
    line: parseInt(line),
    column: parseInt(column) - 1,
    length: 0,
    suggestion: null,
  }
}

export function logCodeError({
  name,
  message,
  file,
  code,
  line,
  column,
  length,
  suggestion,
}) {
  let line1 = `${s.bError} ${name}: ${message}\n`
  console.log(line1)

  let line2 = `    ${file}:${line}:${column}:`
  console.log(line2)

  if (length) {
    let line3 = `${padStart(line, 6)} | `
    const parts = split(code, column, length)
    parts[1] = s.mark(parts[1])
    line3 += parts.join('')
    console.log(line3)
  } else {
    let line3 = `${padStart(line, 6)} | `
    line3 += code
    console.log(line3)
  }

  if (length) {
    let line4 = `       | ${padStart('', column)}${s.mark(padStart('', length, '~'))}`
    console.log(line4)
  } else {
    let line4 = `       | ${padStart('', column)}${s.mark('^')}`
    console.log(line4)
  }

  if (suggestion) {
    let line5 = `       | ${padStart('', column)}${s.mark(suggestion)}`
    console.log(line5)
  }

  console.log('')
}

export function isEsbuildError(err) {
  return err.errors?.[0].location
}
