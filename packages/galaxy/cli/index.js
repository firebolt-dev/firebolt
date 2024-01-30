import { Command } from 'commander'

import { dev } from './commands/dev'
import { build } from './commands/build'
import { serve } from './commands/serve'

const program = new Command()

program.name('galaxy').description('A description').version('1.0.0')

program.command('dev').action(dev)
program.command('build').action(build)
program.command('serve').action(serve)

program.parse()
