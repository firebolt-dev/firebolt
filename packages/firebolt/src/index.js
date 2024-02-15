import { Command } from 'commander'

import { create } from './create'
import { compile } from './compile'

const program = new Command()

program.name('firebolt').description('A description').version('1.0.0')

program
  .command('create')
  .argument('<name>', 'the project name')
  .action(name => {
    create(name)
  })
program.command('dev').action(() => {
  compile({ build: true, watch: true, serve: true })
})
program.command('build').action(() => {
  compile({ build: true, production: true })
})
program.command('start').action(() => {
  compile({ serve: true })
})

program.parse()
