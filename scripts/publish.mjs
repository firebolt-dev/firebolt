import { forEach } from 'lodash-es'
import path from 'path'
import fs from 'fs-extra'
import { execSync } from 'child_process'
import inquirer from 'inquirer'

const packagesDir = path.join('./packages')

let version

const packages = []

async function read() {
  const files = await fs.readdir(packagesDir, {
    withFileTypes: true,
  })
  const names = files.filter(file => file.isDirectory()).map(file => file.name)
  for (const name of names) {
    const packageDir = path.join(packagesDir, name)
    const packageFile = path.join(packageDir, 'package.json')
    const json = await fs.readJSON(packageFile)
    packages.push({
      name: json.name,
      root: packageDir,
      path: packageFile,
      json,
    })
  }
}

async function choose() {
  const currentVersion = packages[0].json.version
  console.log(`Current version: ${currentVersion}`)

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'version',
      message: 'New version: ',
    },
  ])
  version = answers.version

  const regex = /^(([0-9]+)\.){2}([0-9]+)$/
  const valid = regex.test(version)
  if (!valid) {
    throw new Error('Invalid version')
  }
}

async function write() {
  for (const pkg of packages) {
    const data = JSON.stringify(pkg.json, null, 2).concat('\n')
    await fs.writeFile(pkg.path, data)
  }
}

async function update() {
  const depKeys = ['dependencies', 'devDependencies']

  for (const pkg of packages) {
    pkg.json.version = version
    console.log(`version -> ${version}`)

    forEach(depKeys, depKey => {
      forEach(pkg.json[depKey], (_, key) => {
        const isOurs = packages.find(pkg => pkg.name === key)
        if (isOurs) {
          pkg.json[depKey][key] = version
          console.log(`${depKey}.${key} -> ${version}`)
        }
      })
    })
  }
}

async function build() {
  console.log(' ')
  console.log('Running production build')
  for (const pkg of packages) {
    if (pkg.json.private) continue
    try {
      execSync('npm run build', { cwd: pkg.root, stdio: 'inherit' })
    } catch (err) {
      console.error(err)
      return
    }
  }
}

async function publish() {
  console.log(' ')
  console.log('Publishing to npm')
  for (const pkg of packages) {
    if (pkg.json.private) continue
    try {
      execSync('npm publish --access=public', {
        cwd: pkg.root,
        stdio: 'inherit',
      })
    } catch (err) {
      console.error(err)
      return
    }
  }
}

async function run() {
  await read()
  await choose()
  await update()
  await write()
  await build()
  await publish()
  console.log(' ')
  console.log(
    `Packages published. Don't forget to commit and tag "v${version}"`
  )
}
run()
