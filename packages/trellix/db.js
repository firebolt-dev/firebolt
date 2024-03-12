import { uuid } from './uuid'

export const db = {
  boards: [
    {
      id: 'foo', //uuid(),
      title: 'My Board',
      lists: [
        {
          id: uuid(),
          title: 'Todo',
          cards: [
            {
              id: uuid(),
              title: 'Get Milk',
            },
          ],
        },
        {
          id: uuid(),
          title: 'Doing',
          cards: [],
        },
        {
          id: uuid(),
          title: 'Done',
          cards: [],
        },
      ],
    },
  ],
}

console.log(db)
