// utility to re-import a module
export function reimport(module) {
  delete require.cache[module]
  return import(`${module}?v=${Date.now()}`)
}
