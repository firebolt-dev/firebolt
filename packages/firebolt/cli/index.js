import { Command } from 'commander'

import { dev } from './commands/dev'
import { build } from './commands/build'
import { start } from './commands/start'

const program = new Command()

program.name('firebolt').description('A description').version('1.0.0')

program.command('dev').action(dev)
program.command('build').action(build)
program.command('start').action(start)

program.parse()
