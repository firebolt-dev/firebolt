import { nanoid } from 'nanoid'

import { db } from './db.js'

export const config = {
  productionBrowserSourceMaps: true,
  context: {
    uuid: nanoid,
    db,
  },
}
