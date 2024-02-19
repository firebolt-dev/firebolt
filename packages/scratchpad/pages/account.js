import { Suspense, useState } from 'react'
import { useData, useAction } from 'firebolt'
import Account from '../components/Account'

export default function Page() {
  const data = useData(getThing)
  const thing = data.read()

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
