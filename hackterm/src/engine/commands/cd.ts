import type { CommandHandler } from './index'
import { getNodeAtPath, resolvePath } from './index'

export const cdCommand: CommandHandler = {
  name: 'cd',
  description: 'Change directory on current host',
  run: (args, { print, store }) => {
    const node = store.getCurrentNode()
    if (!node) {
      print('cd: not connected to a host', 'error')
      return
    }

    const target = args[0] ?? '/'
    const newPath = resolvePath(store.currentPath, target)

    const fsNode = getNodeAtPath(node, newPath)
    if (!fsNode) {
      print(`cd: ${args[0]}: No such file or directory`, 'error')
      return
    }
    if (fsNode.type === 'file') {
      print(`cd: ${args[0]}: Not a directory`, 'error')
      return
    }

    store.setCurrentPath(newPath)
  },
}
