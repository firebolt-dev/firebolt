import { useData } from 'firebolt'

export default function Account() {
  const data = useData(getAccount)
  const account = data.read()
  return <div onClick={() => data.invalidate()}>Name: {account.name}</div>
}

export async function getAccount(req) {
  req.expire(1000)
  await new Promise(resolve => setTimeout(resolve, 1000))
  return { name: 'Jim_' + Math.random() }
}
