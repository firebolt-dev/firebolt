import { nanoid } from 'nanoid'

import { db } from './db.js'

export default function config() {
  return {
    productionBrowserSourceMaps: true,
    req: {
      uuid: nanoid,
      db,
    },
  }
}
