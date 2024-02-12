import { Suspense, useState } from 'react'
import { useData, useAction } from 'firebolt'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Todos />
    </Suspense>
  )
}

export function Todos() {
  const data = useData('list')
  const create = useAction('create')
  const todos = data.get()
  const [text, setText] = useState('')
  const submit = async e => {
    e.preventDefault()
    await create(text)
    setText('')
    data.invalidate()
  }
  return (
    <main>
      <h1>Todos</h1>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
      <form>
        <input
          type='text'
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button onClick={submit}>Create</button>
      </form>
    </main>
  )
}

export async function list(req) {
  console.log('get foo cookie', req.cookies.get('foo'))
  console.log('get foo2 cookie', req.cookies.get('foo2'))
  return await req.db('todos')
}

export async function create(req, text) {
  req.cookies.set('foo', 'barrrrr')
  req.cookies.set('foo2', { blah: 123 })
  await req.db('todos').insert({ id: req.uuid(), text })
}