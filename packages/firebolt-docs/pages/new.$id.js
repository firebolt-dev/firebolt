import { Suspense } from 'react'
import { Meta, Link, useLocation, useData } from 'firebolt'

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
  const data = useData('getItem', id)
  const item = data.get()
  return (
    <>
      <Meta>
        <title>{item.name}</title>
      </Meta>
      <div>Name: {item.name}</div>
      <div>Desc: {item.desc}</div>
      <div>
        <Link href='/new/123'>Go 123</Link>
      </div>
      <div>
        <Link href='/new/456'>Go 456</Link>
      </div>
    </>
  )
}

// fetched on server during SSR
// fetched from server during CSR
// triggers suspense
export async function getItem(req, id) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  return {
    data: { name: `Foobars ${id}`, desc: 'They are good' },
    expire: null,
  }
  // const auth = req.headers.get('x-auth-token')
  // const item = await db('users').where({ id }).first()
  // return {
  //   data: item,
  //   expire: 0, // 0=now, null=never, X=seconds
  // }
}

async function examples() {
  // get a data handle
  const data = useData('getItem', '123')
  // read the data or suspend while it loads
  const item = data.get()
  // can also be used as a regular promise
  await data.load()
  // invalidate data
  data.invalidate()

  // get an action handle
  const save = useAction('saveItem')
  // call the action
  const newItem = await save({ name: 'Milk' })

  // get a handle on the cache
  const cache = useCache()
  // invalidate all getItem data
  cache.invalidate('getItem')
  // invalidate specific getItem data
  cache.invalidate('getItem', '123')
  // invalidate with a filter
  cache.invalidate(args => args[0] === 'getItem' && args[1] === '123')

  // invalidation notes:
  // 1. if data is being used it will be fetched in the background and then immediately replaced
  // 2. if data is NOT being used it will be cleared and then only fetched again when its needed
}
