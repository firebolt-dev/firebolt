import { Command } from 'commander'

import { exec } from './exec'

process.title = 'Firebolt'

const program = new Command()

program
  .name('firebolt')
  .description('Firebolt React Framework')
  .version('1.0.0')

program.command('dev').action(() => {
  exec({ build: true, watch: true, serve: true })
})
program.command('build').action(() => {
  exec({ build: true, production: true })
})
program.command('start').action(() => {
  exec({ serve: true })
})

program.parse()
