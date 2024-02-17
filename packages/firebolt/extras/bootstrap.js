import { hydrateRoot } from 'react-dom/client'
import { Root } from 'firebolt'

import { createRuntime } from './runtime.js'

globalThis.$firebolt = createRuntime(globalThis.$firebolt)

hydrateRoot(document, <Root runtime={globalThis.$firebolt} />, {
  // onRecoverableError(err) {
  //   console.log(document.documentElement.outerHTML)
  // },
})
