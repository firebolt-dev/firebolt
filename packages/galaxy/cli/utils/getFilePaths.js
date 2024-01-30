import fs from 'fs-extra'
import path from 'path'

export async function getFilePaths(baseDir) {
  let filePaths = []

  async function traverse(dir) {
    const files = await fs.readdir(dir)
    for (const file of files) {
      const fullPath = path.join(dir, file)
      const stat = await fs.stat(fullPath)

      if (stat.isFile()) {
        const filePath = fullPath.replace(baseDir, '')
        filePaths.push(filePath)
      }
      if (stat.isDirectory()) {
        await traverse(fullPath)
      }
    }
  }

  await traverse(baseDir)
  return filePaths
}
