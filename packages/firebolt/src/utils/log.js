import * as style from './style'
import { pkg } from './pkg'

export function intro() {
  console.log(`\n  🔥 Firebolt (v${pkg.version})\n`)
}

export function info(...args) {
  console.log(style.info(' INF '), ...args)
}

export function change(...args) {
  console.log(style.change(' CHN '), ...args)
}

export function error(...args) {
  console.log(style.error(' ERR '), ...args)
}
