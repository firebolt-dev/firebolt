import { Command } from 'commander'

import { bundler } from './bundler'

const program = new Command()

program.name('firebolt').description('A description').version('1.0.0')

program.command('dev').action(() => {
  bundler({ build: true, watch: true, serve: true })
})
program.command('build').action(() => {
  bundler({ build: true, production: true })
})
program.command('start').action(() => {
  bundler({ serve: true })
})

program.parse()
