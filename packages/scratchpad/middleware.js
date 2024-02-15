import { nanoid } from 'nanoid'

import { db } from './db.js'

export async function middleware(req) {
  req.uuid = nanoid
  req.db = db
}
