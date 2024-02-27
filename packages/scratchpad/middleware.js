import { nanoid } from 'nanoid'

import { db } from './db.js'

export async function decorate(req) {
  req.uuid = nanoid
  req.db = db
}
