import { css } from 'firebolt'

import { List } from './List'
import { useBoard } from './BoardProvider'

export function Board({ id, title, lists }) {
  const { update } = useBoard()
  return (
    <div
      className='board'
      css={css`
        // ...
      `}
    >
      <input
        type='text'
        value={title}
        onChange={e => update('setTitle', e.target.value)}
      />
      {lists.map(list => (
        <List key={list.id} {...list} boardId={id} />
      ))}
    </div>
  )
}
