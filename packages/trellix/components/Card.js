import { css } from 'firebolt'

import { Trash2 } from 'lucide-react'

export function Card({ id, title, boardId, listId }) {
  const setTitle = e => {
    // ...
  }
  const remove = () => {
    // ...
  }
  return (
    <div
      className='card'
      css={css`
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 10px;
        padding: 20px;
        display: flex;
        align-items: center;
      `}
    >
      <input type='text' value={title} onChange={setTitle} />
      <Trash2 onClick={remove} />
    </div>
  )
}
