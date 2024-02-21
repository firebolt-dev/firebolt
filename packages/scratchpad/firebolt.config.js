import { nanoid } from 'nanoid'

import { db } from './db.js'

export default function config() {
  return {
    port: 3000,
    productionBrowserSourceMaps: true,
    async middleware(req) {
      req.uuid = nanoid
      req.db = db
    },
  }
}
