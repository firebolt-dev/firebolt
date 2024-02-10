import { Suspense, useState } from 'react'
import { Head, Link, useLocation, useData, useAction, useCache } from 'firebolt'

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Item id={'1'} />
      <Item id={'1'} />
      <Item id={'2'} />
      <Item id={'3'} />
    </Suspense>
  )
}

function Loading() {
  return <div>Loading...</div>
}

function Item({ id }) {
  // const { id } = useLocation().params
  const data = useData('getItem', id)
  const item = data.get()
  const update = useAction('updateItem')
  // const cache = useCache()
  const save = async () => {
    const resp = await update(item)
    console.log('saved!', resp)
    data.invalidate()
    // cache.invalidate(args => args[0] === 'getItem' && args[1] === '1')
  }
  return (
    <>
      <Head>
        <title key='title'>{item.name}</title>
      </Head>
      <div>Name</div>
      <input
        type='text'
        value={item.name}
        onChange={e => data.edit(item => (item.name = e.target.value))}
      />
      <div>Desc</div>
      <input
        type='text'
        value={item.desc}
        onChange={e => data.edit(item => (item.desc = e.target.value))}
      />
      <div>Version: {item.version}</div>
      <div>ID: {item.id}</div>
      <div>Fetching: {data.fetching ? 'Yes' : 'No'}</div>
      <div onClick={save}>Save</div>
      <div>--------</div>
      {/* <div>Name: {item.name}</div>
      <div>Desc: {item.desc}</div>
      <Test />
      <div>
        <Link href='/new/123'>Go 123</Link>
      </div>
      <div>
        <Link href='/new/456'>Go 456</Link>
      </div> */}
    </>
  )
}

export async function getItem(req, id) {
  let item = await req.db('items').where({ id }).first()
  if (!item) {
    item = {
      id,
      name: `Name ${id}`,
      desc: `Desc ${id}`,
      version: 0,
    }
    await req.db('items').insert(item)
  }
  return item
}

export async function updateItem(req, data) {
  const { id } = data
  const item = await req.db('items').where({ id }).first()
  item.name = data.name
  item.desc = data.desc
  item.version++
  await req.db('items').where({ id }).update(item)
  return item
}

async function examples() {
  // get a loader
  const loader = useData('getItem', '123')
  // read the loader or suspend while it loads
  const item = loader.get()
  // check if the loader is refetching in the background
  loader.refetching
  // invalidate loader (background refetch)
  loader.invalidate()
  // update loader manually
  loader.set({ name: 'YUP!' })

  // get an action
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
