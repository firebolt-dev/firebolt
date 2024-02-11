import chalk from 'chalk'
import { padStart } from 'lodash'

const $err = chalk.whiteBright.bgRed
const $highlight = chalk.greenBright
const split = (str, column, length) => {
  const first = str.substring(0, column)
  const second = str.substring(column, column + length)
  const third = str.substring(column + length)
  return [first, second, third]
}

export function logESBuildError(err) {
  for (const e of err.errors) {
    const file = e.location.file
    const text = e.text
    const line = e.location.line
    const lineText = e.location.lineText
    const column = e.location.column
    const length = e.location.length
    const suggestion = e.location.suggestion

    let line1 = `${$err(' error  ')} ${text}\n`
    console.log(line1)

    let line2 = `    ${file}:${line}:${column}:`
    console.log(line2)

    let line3 = `${padStart(line, 6)} | `
    const parts = split(lineText, column, length)
    parts[1] = $highlight(parts[1])
    line3 += parts.join('')
    console.log(line3)

    let line4 = `       | ${padStart('', column)}${$highlight(padStart('', length, '~'))}`
    console.log(line4)

    if (suggestion) {
      let line5 = `       | ${padStart('', column)}${$highlight(suggestion)}`
      console.log(line5)
    }

    console.log('')
  }
}

export function isESBuildError(err) {
  return err.errors?.[0].location
}
