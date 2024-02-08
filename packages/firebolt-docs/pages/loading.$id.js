import { Suspense, useState } from 'react'
import { Meta, useLocation, useSuspense, css } from 'firebolt'

/**
 * Dynamic + Loading
 */

export default function Page() {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <Item id={1} wait={5} />
      </Suspense>
      <Suspense fallback={<Loading />}>
        <Item id={2} wait={1} />
      </Suspense>
    </>
  )
}

function Loading() {
  return <div>Loading...</div>
}

function Item({ id, wait = 1 }) {
  // const { id } = useLocation().params
  const [foo, setFoo] = useState(false)
  console.log('Page id', id)
  const _item = useSuspense(
    async id => {
      // return fetch(`/api/items/${id}`
      await new Promise(resolve => setTimeout(resolve, wait * 1000))
      const item = { id, name: 'Name', description: 'Desc' }
      console.log('item resolved', item)
      return item
    },
    [id]
  )
  const [item, setItem] = useState(_item)
  console.log('Page item', item)
  return (
    <>
      {/* <Meta>
        <title>{item.name}</title>
      </Meta> */}
      <div
        onClick={() => {
          setFoo(!foo)
          setItem({ name: 'Bob' })
        }}
        css={css`
          color: ${foo ? 'red' : 'black'};
        `}
      >
        {item.name}
      </div>
      <div>{item.description}</div>
    </>
  )
}
