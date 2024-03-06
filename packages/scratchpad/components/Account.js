import { useLoader } from 'firebolt'

export default function Account() {
  const loader = useLoader(getAccount)
  const account = loader.read()
  return <div onClick={() => loader.invalidate()}>Name: {account.name}</div>
}

export async function getAccount(ctx) {
  ctx.expire(1000)
  await new Promise(resolve => setTimeout(resolve, 1000))
  return { name: 'Jim_' + Math.random() }
}
