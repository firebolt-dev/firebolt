import { Meta, useLocation, useSuspense } from 'firebolt'

/**
 * Dynamic
 */

export default function Page() {
  const { id } = useLocation().params
  console.log('Page id', id)
  const item = useSuspense(
    async id => {
      // return fetch(`/api/items/${id}`
      await new Promise(resolve => setTimeout(resolve, 1000))
      const item = { name: 'Name', description: 'Desc' }
      console.log('item resolved', item)
      return item
    },
    [id]
  )
  console.log('Page item', item)
  return (
    <>
      <Meta>
        <title>{item.name}</title>
      </Meta>
      <div>{item.name}</div>
      <div>{item.description}</div>
    </>
  )
}

/**
 * Dynamic + Loading
 */

// export default function Page() {
//   return (
//     <Suspense fallback={<Loading />}>
//       <Item />
//     </Suspense>
//   )
// }

// function Loading() {
//   return <div>Loading...</div>
// }

// function Item() {
//   const { id } = useLocation().query
//   const item = useSuspense(() => fetch(`/api/items/${id}`), [id])
//   return (
//     <>
//       <Head>
//         <title>{item.name}</title>
//       </Head>
//       <div>{item.name}</div>
//       <div>{item.description}</div>
//     </>
//   )
// }
