import { Suspense, useState } from 'react'
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
  const [on, setOn] = useState()
  const title = data.get()
  console.log('Page Test 2 Content', title)
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
  // req.redirect('/not-found', 302)
  // req.expire(5, 'days')
  // req.getCookie('foo')
  // req.setCookie('foo', bar)
  // req.error('Yeah nah its wrong') // throws to boundary
  await new Promise(resolve => setTimeout(resolve, 1000))
  req.expire(5)
  return 'HEYOO' + Math.random()
}
