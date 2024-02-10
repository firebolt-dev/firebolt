import _path from 'path'

export function virtualModule(modules) {
  return {
    name: 'virtual-modules',
    setup(build) {
      for (const module of modules) {
        const { path, contents } = module
        const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const filter = new RegExp(`^${escapedPath}$`)
        const namespace = 'ns' + Math.random()
        build.onResolve({ filter }, args => {
          return { path, namespace }
        })
        build.onLoad({ filter: /.*/, namespace }, () => {
          return { contents, resolveDir: _path.dirname(path) }
        })
      }
    },
  }
}
