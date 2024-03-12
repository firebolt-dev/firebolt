import { css } from 'firebolt'

import { Card } from './Card'

export function List({ id, title, cards, boardId }) {
  const setTitle = e => {
    // ...
  }
  return (
    <div
      className='list'
      css={css`
        // ...
      `}
    >
      <input type='text' value={title} onChange={setTitle} />
      {cards.map(card => (
        <Card key={card.id} {...card} boardId={boardId} listId={id} />
      ))}
    </div>
  )
}
