import { Suspense, useState } from 'react'
import { useLoader, useAction } from 'firebolt'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Todos />
    </Suspense>
  )
}

export function Todos() {
  const loader = useLoader(list)
  const todos = loader.read()
  const create = useAction(create)
  const [text, setText] = useState('')
  const submit = async e => {
    e.preventDefault()
    await create(text)
    setText('')
    loader.invalidate()
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

export async function list(ctx) {
  // await new Promise(resolve => setTimeout(resolve, 1000))
  // ctx.redirect('/about')
  // console.log('get foo cookie', ctx.cookies.get('foo'))
  // console.log('get foo2 cookie', ctx.cookies.get('foo2'))
  return await ctx.db('todos')
}

export async function create(ctx, text) {
  // await new Promise(resolve => setTimeout(resolve, 1000))
  // const chance = Math.random()
  // console.log({ chance })
  // if (chance < 0.5) {
  //   ctx.redirect('/about')
  // }
  ctx.cookies.set('foo', 'barrrrr')
  ctx.cookies.set('foo2', { blah: 123 })
  await ctx.db('todos').insert({ id: ctx.uuid(), text })
}
