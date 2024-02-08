import { Suspense, useState } from 'react'
import { Meta, useLocation, useSuspense } from 'firebolt'

/**
 * Basic + Meta
 */

export default function Page() {
  const [foo, setFoo] = useState(false)
  return (
    <>
      <Meta>
        <title>Page</title>
      </Meta>
      <div>Page</div>
    </>
  )
}

// /**
//  * Dynamic
//  */

// export default function Page() {
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

// /**
//  * Dynamic + Loading
//  */

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
