import { Suspense } from 'react'
import { useLoader, useAction, css } from 'firebolt'

export function Profile() {
  return (
    <Suspense fallback={<div>...</div>}>
      <Content />
    </Suspense>
  )
}

function Content() {
  // const [auth, setAuth] = useCookie('auth')
  const loader = useLoader(getUser)
  const user = loader.read()
  return (
    <div
      css={css`
        color: red;
      `}
      onClick={() => loader.invalidate()}
    >
      <div>{user.name}</div>
    </div>
  )
}

export async function getUser(req) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  // const user = req.cookies.get('user')
  const user = { name: 'Jim' + Math.random() }
  return user
}
