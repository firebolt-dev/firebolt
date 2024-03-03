import path from 'path'
import prompts from 'prompts'
import { fileURLToPath } from 'url'
import validateNPMName from 'validate-npm-package-name'
import fs from 'fs-extra'
import chalk from 'chalk'
import { execSync } from 'child_process'

const cwd = process.cwd()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const green = chalk.green

const run = async () => {
  // intro

  console.log('\n  🔥 Firebolt\n')

  // prompt for a project name

  const { projectName } = await prompts({
    type: 'text',
    initial: 'my-app',
    name: 'projectName',
    message: 'What is your project name?',
    validate: projectName => {
      const result = validateNPMName(projectName)
      if (result.validForNewPackages) {
        return true
      }
      const problems = [...(result.errors || []), ...(result.warnings || [])]
      return `Invalid project name: ${problems[0]}`
    },
    // onRender(color) {
    //   this.no = this.no || 1
    //   this.msg = `Enter a number (e.g. ${color.cyan(this.no)})`
    //   //   if (!interval)
    //   //     interval = setInterval(() => {
    //   //       this.no += 1
    //   //       this.render()
    //   //     }, 1000)
    // },
    // format(v) {
    //   console.log('v', v)
    //   return v
    // },
    // onRender(kleur) {
    //   console.log('FOO', this)
    // },
  })

  console.log('')

  // ensure the directory doesn't exist

  const projectDir = path.join(cwd, projectName)
  const projectDirExists = await fs.exists(projectDir)
  if (projectDirExists) {
    console.log(`The directory ${green(projectName)} already exists`)
    return
  }

  // create our project directory

  console.log('Creating project directory')
  await fs.ensureDir(projectDir)

  // copy template files to new project directory

  const templateDir = path.join(__dirname, '../template')
  console.log('Initializing project')
  await fs.copy(templateDir, projectDir)

  // personalize their project

  console.log('Personalizing project')
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
    path.join(projectDir, 'routes/index.js'),
    '__projectName__',
    projectName
  )

  // initialize git repo

  console.log('Initializing git repository')
  execSync(`git init`, { cwd: projectDir, stdio: 'ignore' })

  // run npm install

  console.log('Installing dependencies...')
  execSync('npm install', { cwd: projectDir, stdio: 'ignore' })

  console.log(`\nSuccess!\n`)
  console.log(
    `Run the follow commands in your project directory to get started:\n`
  )
  console.log(`${green('npm run dev')}    start the development server`)
  console.log(`${green('npm run build')}  build the app for production`)
  console.log(`${green('npm run dev')}    run the built production app`)
  console.log('')
}

run()

async function replace(file, target, value) {
  let content = await fs.readFile(file, 'utf8')
  content = content.replace(new RegExp(target, 'g'), value)
  await fs.writeFile(file, content)
}
