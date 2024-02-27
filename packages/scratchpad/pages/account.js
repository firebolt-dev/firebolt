import { Suspense, useState } from 'react'
import { useLoader, useAction } from 'firebolt'
import Account from '../components/Account'

export default function Page() {
  const loader = useLoader(getThing)
  const thing = loader.read()

  return (
    <div>
      <div>{thing}</div>
      <Account />
      <Account />
      <Account />
      <Account />
      <Account />
      <Account />
    </div>
  )
}

export async function getThing() {
  return 'THing!'
}
