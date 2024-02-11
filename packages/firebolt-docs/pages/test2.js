import { Suspense } from 'react'
import { Link, useData, css } from 'firebolt'

export default function Page() {
  console.log('Page Test 2')
  // return <Content />
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Content />
    </Suspense>
  )
}

export function Content() {
  const data = useData('getTitle')
  const title = data.get()
  console.log('Page Test 2 Content')
  return (
    <div>
      <div
        css={css`
          font-size: 100px;
        `}
      >
        {title}
      </div>
      <div>
        <Link href='/test1'>Test 1</Link>
      </div>
    </div>
  )
}

export async function getTitle() {
  await new Promise(resolve => setTimeout(resolve, 1000))
  return 'Test 2'
}
