import fs from 'fs-extra'
import path from 'path'
import { execSync } from 'child_process'

import * as log from './utils/log'
import * as style from './utils/style'

export async function create(projectName) {
  const cwd = process.cwd()
  const projectDir = path.join(cwd, projectName)
  const templateDir = path.join(__dirname, '../project')

  log.intro()

  const projectDirExists = await fs.exists(projectDir)
  if (projectDirExists) {
    return log.error(`a directory with the name ${style.mark(projectName)} already exists.\n`) // prettier-ignore
  }

  log.info(`creating directory ${style.mark(`./${projectName}`)}`)

  await fs.ensureDir(projectDir)

  log.info(`initializing project`)

  await fs.copy(templateDir, projectDir)

  log.info(`personalizing project`)

  await replace(
    path.join(projectDir, 'package.json'),
    '__projectName__',
    projectName
  )

  await replace(
    path.join(projectDir, 'document.js'),
    '__projectName__',
    projectName
  )

  await replace(
    path.join(projectDir, 'pages/index.js'),
    '__projectName__',
    projectName
  )

  log.info(`initializing git repository`)

  execSync(`git init`, { cwd: projectDir, stdio: 'ignore' })

  log.info(`installing dependencies...`)

  execSync('npm install', { cwd: projectDir, stdio: 'ignore' })

  console.log('\nYour project is ready!\n')
}

async function replace(file, target, value) {
  let content = await fs.readFile(file, 'utf8')
  content = content.replace(new RegExp(target, 'g'), value)
  await fs.writeFile(file, content)
}
