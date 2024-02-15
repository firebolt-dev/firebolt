import { Suspense, useState } from 'react'
import { useData, useAction } from 'firebolt'
import { Profile } from '../components/Profile'
import * as Foo from '../components/Profile'
import { FnTests } from '../fn-tests/FnTests'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Content />
    </Suspense>
  )
}

export function Content() {
  return (
    <div>
      <div>Components that use loaders</div>
      <Profile />
      {/* <FnTests /> */}
    </div>
  )
}

// console.log({ Foo })

// for (const key in Foo) {

//   console.log('key', key)
//   // export { key }
//   // export const [${key} + '2'] = true
// }
