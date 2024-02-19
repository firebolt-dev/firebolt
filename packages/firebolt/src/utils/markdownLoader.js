import fs from 'fs-extra'
import path from 'path'

export const markdownLoader = {
  name: 'markdownLoader',
  setup(build) {
    // Filter for .md files
    build.onResolve({ filter: /\.md$/ }, args => {
      return { path: path.resolve(args.resolveDir, args.path) }
    })

    // Load .md file content as string
    build.onLoad({ filter: /\.md$/ }, async args => {
      const contents = await fs.readFile(args.path, 'utf8')
      return {
        contents,
        loader: 'text',
      }
    })
  },
}
