import fs from 'fs-extra'
import path from 'path'

export async function getFilePaths(baseDir) {
  let filePaths = []

  async function traverse(dir) {
    const files = await fs.readdir(dir)
    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = await fs.stat(filePath)

      if (stat.isFile()) {
        filePaths.push(filePath)
      }
      if (stat.isDirectory()) {
        await traverse(filePath)
      }
    }
  }

  await traverse(baseDir)
  return filePaths
}
