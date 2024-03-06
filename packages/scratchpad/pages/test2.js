import { Suspense, useState } from 'react'
import { Link, useLoader, css, useCookie } from 'firebolt'

export default function Page() {
  // return <Content />
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Content />
    </Suspense>
  )
}

export function Content() {
  const [foo] = useCookie('foo')
  console.log('render cookie foo', cookies.get('foo'))
  const loader = useLoader(getTitle)
  const [on, setOn] = useState()
  console.log('test2 render')
  const title = loader.read()
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

export async function getTitle(ctx) {
  // const header = ctx.headers.get('Foobars')
  // ctx.expire(5, 'days')
  // ctx.cookies.get('foo')
  // ctx.cookies.set('foo', bar)
  // ctx.error('Yeah nah its wrong') // throws to boundary
  await new Promise(resolve => setTimeout(resolve, 1000))
  // ctx.redirect('/about')
  ctx.expire(5)
  console.log('loader cookie get foo', ctx.cookies.get('foo'))
  const foo = { id: ctx.uuid() }
  console.log('loader cookie set foo', foo)
  ctx.cookies.set('foo', foo)
  return 'HEYOO' + Math.random()
}
