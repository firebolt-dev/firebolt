import fs from 'fs-extra'
import path from 'path'
import { hashString } from './hashString'

const loaderActionRegex = /(useAction|useLoader)/

export function registryPlugin({ registry, appDir }) {
  return {
    name: 'registryPlugin',
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, async args => {
        const modPath = args.path

        // skip node_modules
        if (modPath.includes('node_modules')) {
          return
        }

        // skip .firebolt build folder
        if (modPath.includes('.firebolt')) {
          return
        }

        // read file contents
        let contents = await fs.readFile(modPath, 'utf8')

        // early exit if no useLoader/useAction hooks
        if (!loaderActionRegex.test(contents)) {
          return { contents, loader: 'jsx' }
        }

        // console.log('---')
        // console.log(modPath)

        const imports = {}
        const exports = {}

        let matches

        // get all named imports
        const namedImportRegex = /import\s+{([^}]+)}\s+from\s+(['"][^'"]+['"])/g
        while ((matches = namedImportRegex.exec(contents)) !== null) {
          const file = matches[2].slice(1).slice(0, -1)
          const bits = matches[1].split(',')
          bits.forEach(bit => {
            const [name, alias] = bit.trim().split(/\s+as\s+/)
            const usedName = alias || name
            imports[usedName.trim()] = {
              name: name.trim(),
              alias: alias?.trim() || null,
              file,
            }
          })
        }

        // get all default imports
        const defaultImportRegex = /import\s+(\w+)\s+from\s+(['"][^'"]+['"])/g
        while ((matches = defaultImportRegex.exec(contents)) !== null) {
          const file = matches[2].slice(1).slice(0, -1)
          const name = matches[1].trim()
          imports[name] = {
            name,
            alias: null,
            file,
          }
        }

        // get all exports
        const exportsRegex = /export\s+(async\s+function|function|const)\s+(\w+)/g // prettier-ignore
        while ((matches = exportsRegex.exec(contents)) !== null) {
          const name = matches[2].trim()
          exports[name] = {
            name,
            alias: null,
            file: modPath,
          }
        }

        // console.log('imports', imports)
        // console.log('exports', exports)

        const getId = token => {
          if (imports[token]) {
            const name = imports[token].name
            const alias = imports[token].alias
            const file = path.resolve(path.dirname(modPath), imports[token].file) // prettier-ignore
            const relFile = path.relative(appDir, file)
            const fn = alias || name
            const id = `f_${hashString(relFile + fn)}`
            if (registry) {
              registry.set(id, {
                id,
                file,
                name,
              })
            }
            return id
            // fnInfo.push({ name, alias, file, id })
          }
          if (exports[token]) {
            const name = token
            const file = modPath
            const relFile = path.relative(appDir, file)
            const fn = name
            const id = `f_${hashString(relFile + fn)}`
            if (registry) {
              registry.set(id, {
                id,
                file,
                name,
              })
            }
            return id
          }
        }

        // transform useLoader & useAction calls
        const hookRegex = /(useLoader|useAction)\(([^,)]+)/g
        const lines = contents.split('\n')
        // let inBlockComment = false
        const result = lines.map(line => {
          // // track and skip block comments
          // if (line.includes('/*')) inBlockComment = true
          // if (line.includes('*/')) {
          //   inBlockComment = false
          //   return line
          // }
          // // ignore inline comments// Ignore lines that are within block comments or are inline comments
          // if (inBlockComment || line.trim().startsWith('//')) return line
          // find and replace hook calls outside comments
          return line.replace(hookRegex, (match, hook, fnName) => {
            // match function to import/export id
            const id = getId(fnName)
            // ignore if none
            if (!id) return match
            // replace with id
            // console.log('replace', fnName, id)
            const replacement = `${hook}('${id}'`
            if (match.trim().endsWith(')')) {
              return (
                replacement +
                match.substring(
                  match.indexOf(fnName) + fnName.length,
                  match.length - 1
                ) +
                ')'
              )
            }
            return replacement
          })
        })

        contents = result.join('\n')

        // console.log('registry', registry)

        return { contents, loader: 'jsx' }
      })
    },
  }
}
