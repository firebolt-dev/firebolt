import { Suspense } from 'react'
import { useData, useAction } from 'firebolt'
import { fn1 } from './fns'
import { fn2 as fnTwo } from './fns'
import { fn3, fn4 } from './fns'

export function FnTests() {
  const dataLocal = useData(fnLocal)
  const data1 = useData(fn1)
  const data2 = useData(fnTwo, 'LOL')
  const data3 = useData(fn3)
  const data4 = useData(fn4)
}

export async function fnLocal() {
  // ...
}
