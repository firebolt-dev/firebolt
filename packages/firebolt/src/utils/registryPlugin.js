import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'

export function registryPlugin({ registry }) {
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

        // console.log('---')
        // console.log(modPath)

        // read file contents
        let contents = await fs.readFile(modPath, 'utf8')

        let matches
        const imports = {}

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

        // console.log('imports', imports)

        // transform useData calls
        contents = await transform({
          modPath,
          imports,
          contents,
          hook: 'useData',
          registry,
        })

        // transform useAction calls
        contents = await transform({
          modPath,
          imports,
          contents,
          hook: 'useAction',
          registry,
        })

        // console.log('registry', registry)

        return { contents, loader: 'jsx' }
      })
    },
  }
}

async function transform({ modPath, imports, contents, hook, registry }) {
  // check if file uses any of these hook calls
  const usesHook = contents.includes(`${hook}(`)
  if (!usesHook) return contents

  // extract all function names used in useData/useAction calls
  const dataRegex = new RegExp(`${hook}\\s*\\(\\s*([^,)]+)`, 'g')
  let dataMatches
  const fnNames = []
  while ((dataMatches = dataRegex.exec(contents)) !== null) {
    fnNames.push(dataMatches[1].trim())
  }

  // console.log('fnNames', fnNames)

  // generate info about each function
  const fnInfo = []
  for (const fnName of fnNames) {
    if (imports[fnName]) {
      const name = imports[fnName].name
      const alias = imports[fnName].alias
      const file = path.resolve(path.dirname(modPath), imports[fnName].file) // prettier-ignore
      const fullPath = `${file}${alias || name}`
      const id = 'f' + crypto.createHash('sha256').update(fullPath).digest('hex') // prettier-ignore
      fnInfo.push({ name, alias, file, id })
    } else {
      const name = fnName
      const alias = null
      const file = modPath
      const fullPath = `${file}${name}`
      const id = 'f' + crypto.createHash('sha256').update(fullPath).digest('hex') // prettier-ignore
      fnInfo.push({ name, alias, file, id })
    }
  }

  // console.log('fnInfo', fnInfo)

  // replace all the functions used in useData/useAction calls with their id string
  for (const item of fnInfo) {
    // regex pattern to find the exact function name
    const fnName = item.alias || item.name
    const oldFnRegexPattern = `${hook}\\s*\\(\\s*${fnName}\\s*([^,)]*)`
    const oldFnRegex = new RegExp(oldFnRegexPattern, 'g')

    // replace the old function name with its id string
    contents = contents.replace(oldFnRegex, `${hook}('${item.id}'$1`)
  }

  // register id to its file and function name
  if (registry) {
    for (const item of fnInfo) {
      registry.set(item.id, {
        id: item.id,
        file: item.file,
        fnName: item.name,
      })
    }
  }

  return contents
}

// async function hash(string) {
//   const strUint8 = new TextEncoder('utf-8').encode(string)
//   const hashBuffer = await crypto.subtle.digest('SHA-256', strUint8)
//   const hashArray = Array.from(new Uint8Array(hashBuffer))
//   const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
//   return hashHex
// }
