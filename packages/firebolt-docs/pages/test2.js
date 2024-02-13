import { Suspense, useState } from 'react'
import { Link, useData, css } from 'firebolt'

export default function Page() {
  return <Content />
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Content />
    </Suspense>
  )
}

export function Content() {
  const data = useData('getTitle')
  const [on, setOn] = useState()
  console.log('test2 render')
  const title = data.get()
  console.log('title', title)
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
      <div>Fetching: {data.fetching ? 'yes' : 'no'}</div>
      <div onClick={() => setOn(!on)}>{on ? 'Toggle Off' : 'Toggle On'}</div>
    </div>
  )
}

export async function getTitle(req) {
  // const header = req.headers.get('Foobars')
  // req.expire(5, 'days')
  // req.cookies.get('foo')
  // req.cookies.set('foo', bar)
  // req.error('Yeah nah its wrong') // throws to boundary
  await new Promise(resolve => setTimeout(resolve, 1000))
  req.redirect('/about')
  // req.expire(5)
  console.log('get foo', req.cookies.get('foo'))
  const foo = { id: req.uuid() }
  console.log('set foo', foo)
  req.cookies.set('foo', foo)
  return 'HEYOO' + Math.random()
}
