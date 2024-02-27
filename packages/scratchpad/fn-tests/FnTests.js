import { Suspense } from 'react'
import { userLoader, useAction } from 'firebolt'
import { fn1 } from './fns'
import { fn2 as fnTwo } from './fns'
import { fn3, fn4 } from './fns'

export function FnTests() {
  const loaderLocal = userLoader(fnLocal)
  const loader1 = userLoader(fn1)
  const loader2 = userLoader(fnTwo, 'LOL')
  const loader3 = userLoader(fn3)
  const loader4 = userLoader(fn4)
}

export async function fnLocal() {
  // ...
}
