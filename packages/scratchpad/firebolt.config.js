import { nanoid } from 'nanoid'

import { db } from './db.js'

export default function config() {
  return {
    productionBrowserSourceMaps: true,
    async decorate(req) {
      req.uuid = nanoid
      req.db = db
    },
  }
}
