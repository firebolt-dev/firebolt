import { useRef, useMemo, useState } from 'react'
import { useLoader, useRoute, css, useAction } from 'firebolt'

import { BoardProvider } from '@/components/BoardProvider'
import { Board } from '@/components/Board'

export default function BoardPage() {
  const { id } = useRoute().params

  const dataRef = useRef()
  const [pending, setPending] = useState(0)

  const data = useLoader(getBoard, id).read()
  const action = useAction(updateBoard, id)

  const board = useMemo(() => {
    if (!pending) {
      dataRef.current = data
    }
    return dataRef.current
  }, [pending, data])

  const update = async (name, ...args) => {
    setPending(n => ++n)
    try {
      await action(name, args)
    } catch (err) {
      console.error(err)
    }
    setPending(n => --n)
  }

  return (
    <BoardProvider value={{ pending, update }}>
      <Board {...board} />
    </BoardProvider>
  )
}

export async function getBoard(ctx, id) {
  const board = ctx.db.boards.find(board => board.id === id)
  return board
}

export async function updateBoard(ctx, id, action, args) {
  const board = ctx.db.boards.find(board => board.id === id)
  switch (action) {
    case 'setTitle': {
      const [title] = args
      board.title = title
    }
  }
}
