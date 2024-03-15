import fs from 'fs-extra'
import path from 'path'

const modDir = new URL('.', import.meta.url).pathname
const pkgFile = path.join(modDir, '../package.json')

export const pkg = await fs.readJSON(pkgFile)
