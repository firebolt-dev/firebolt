import { db } from './db.js'

export async function middleware(req) {
  req.db = db
}
