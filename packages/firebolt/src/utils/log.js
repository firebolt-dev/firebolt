import * as style from './style'

export function intro() {
  console.log('\n  🔥 Firebolt\n')
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
