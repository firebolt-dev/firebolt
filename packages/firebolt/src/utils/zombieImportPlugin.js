export const zombieImportPlugin = {
  name: 'zombie-import',
  setup(build) {
    // this plugin intercepts all imports that are NOT the entry point
    // and forces them to be empty modules.
    // this is used primarily to pre-build and cache our MDX files.
    // the cached MDX files are then used as virtual modules in follow-up builds
    // which maintains esbuilds great speed!
    build.onResolve({ filter: /.*/ }, args => {
      if (build.initialOptions.entryPoints.includes(args.path)) {
        return
      }
      return { path: args.path, namespace: 'zombie-import' }
    })
    build.onLoad({ filter: /.*/, namespace: 'zombie-import' }, () => {
      return {
        contents: '',
      }
    })
  },
}
