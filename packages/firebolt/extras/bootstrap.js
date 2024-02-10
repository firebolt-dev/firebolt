import { hydrateRoot } from 'react-dom/client'
import { RuntimeProvider, Router } from 'firebolt'

import { Document } from '../../document.js'

import { createRuntime } from './runtime.js'

globalThis.$firebolt = createRuntime(globalThis.$firebolt)

hydrateRoot(
  document,
  <RuntimeProvider data={globalThis.$firebolt}>
    <Document>
      <Router />
    </Document>
  </RuntimeProvider>,
  {
    // onRecoverableError(err) {
    //   console.log(document.documentElement.outerHTML)
    // },
  }
)
