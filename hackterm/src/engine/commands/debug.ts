import type { CommandHandler } from './index'

export const debugCommand: CommandHandler = {
  name: 'debug',
  aliases: ['dbg'],
  description: 'Toggle the debug panel (dev tool)',
  run: (_args, { print, store }) => {
    store.toggleDebug()
    print(store.debugOpen ? 'Debug panel closed.' : 'Debug panel opened.', 'system')
  },
}
