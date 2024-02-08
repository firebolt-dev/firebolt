import { Suspense } from 'react'
import { Meta, useLocation, useLoader } from 'firebolt'

import { db } from '../db.js'

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Item />
    </Suspense>
  )
}

function Loading() {
  return <div>Loading...</div>
}

function Item() {
  const { id } = useLocation().params
  const item = useLoader('getItem', id)
  console.log('Page item', item)
  return (
    <>
      <Meta>
        <title>{item.name}</title>
      </Meta>
      <div>Name: {item.name}</div>
      <div>Desc: {item.desc}</div>
    </>
  )
}

// fetched on server during SSR
// fetched from server during CSR
// triggers suspense
export async function getItem(id) {
  const item = await db('users').where({ id }).first()
  return {
    data: item,
    expire: 0, // 0=now, null=never, X=seconds
  }
}
