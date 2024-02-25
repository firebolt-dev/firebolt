import { nanoid } from 'nanoid'

import { db } from './db.js'

export default function config() {
  return {
    productionBrowserSourceMaps: true,
    async middleware(req) {
      req.uuid = nanoid
      req.db = db
    },
  }
}
