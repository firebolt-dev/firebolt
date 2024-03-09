import { hydrateRoot } from 'react-dom/client'
import { Root } from 'firebolt'

import { createRuntime } from './runtime.js'

const runtime = createRuntime(globalThis.$firebolt.stack)

globalThis.$firebolt = (...args) => runtime.call(...args)

runtime.ready().then(() => {
  hydrateRoot(document, <Root runtime={runtime} />, {
    // onRecoverableError(err) {
    //   console.log(document.documentElement.outerHTML)
    // },
  })
})
