import type { CommandHandler } from './index'

export const disconnectCommand: CommandHandler = {
  name: 'disconnect',
  aliases: ['exit', 'logout'],
  description: 'Close the current shell session',
  run: (_args, { print, store }) => {
    const node = store.getCurrentNode()
    if (!node) {
      print('Not connected to any host.', 'warning')
      return
    }
    print(`Connection to ${node.hostname} (${node.ip}) closed.`, 'info')
    if (!node.logsCleared) {
      print(`[!] Warning: logs not cleared — traces remain on ${node.hostname}`, 'warning')
    }
    store.setCurrentNode(null)
  },
}
