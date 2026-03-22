import type { CommandHandler } from './index'

export const clearCommand: CommandHandler = {
  name: 'clear',
  aliases: ['cls'],
  description: 'Clear terminal output',
  run: (_args, { store }) => {
    store.clearTerminal()
  },
}
