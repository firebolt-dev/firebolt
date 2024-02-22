import _path from 'path'

export function virtualModule(virtuals) {
  return {
    name: 'virtual-module',
    setup(build) {
      build.onLoad({ filter: /.*/ }, args => {
        const contents = virtuals[args.path]
        if (contents) {
          return {
            contents,
            resolveDir: _path.dirname(args.path),
          }
        }
      })
    },
  }
}
