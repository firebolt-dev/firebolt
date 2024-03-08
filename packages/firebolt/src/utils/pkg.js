import fs from 'fs-extra'

export const pkg = await fs.readJSON('../../package.json')
