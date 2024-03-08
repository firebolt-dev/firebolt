import fs from 'fs-extra'
import path from 'path'

const pkgFile = path.join(import.meta.dirname, '../package.json')

export const pkg = await fs.readJSON(pkgFile)
