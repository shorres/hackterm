import type { CommandHandler } from './index'
import { getNodeAtPath, resolvePath } from './index'

export const catCommand: CommandHandler = {
  name: 'cat',
  description: 'Print file contents',
  run: (args, { print, store }) => {
    const node = store.getCurrentNode()
    if (!node) {
      print('cat: not connected to a host', 'error')
      return
    }
    if (args.length === 0) {
      print('Usage: cat <file>', 'error')
      return
    }

    const filePath = resolvePath(store.currentPath, args[0])
    const fsNode = getNodeAtPath(node, filePath)

    if (!fsNode) {
      print(`cat: ${args[0]}: No such file or directory`, 'error')
      return
    }
    if (fsNode.type === 'dir') {
      print(`cat: ${args[0]}: Is a directory`, 'error')
      return
    }

    const content = fsNode.content
    if (fsNode.value) {
      print(`[*] This file appears to have exfiltration value ($${fsNode.value})`, 'warning')
      print(`    Use 'exfiltrate ${args[0]}' to extract it for cash`, 'info')
      print(``, 'default')
    }
    for (const line of content.split('\n')) {
      print(line, 'data')
    }

    if (fsNode.discoveryNodeId) {
      store.revealEphemeralNode(fsNode.discoveryNodeId)
    }
  },
}
