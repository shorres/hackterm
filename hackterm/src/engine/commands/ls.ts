import type { CommandHandler } from './index'
import { getNodeAtPath, resolvePath } from './index'
import type { FSDir } from '../../types'

export const lsCommand: CommandHandler = {
  name: 'ls',
  aliases: ['dir'],
  description: 'List directory contents on current host',
  run: (args, { print, store }) => {
    const node = store.getCurrentNode()
    if (!node) {
      print('ls: not connected to a host — use connect <ip>', 'error')
      return
    }

    const targetPath = args[0]
      ? resolvePath(store.currentPath, args[0])
      : store.currentPath

    const fsNode = getNodeAtPath(node, targetPath)

    if (!fsNode) {
      print(`ls: cannot access '${args[0]}': No such file or directory`, 'error')
      return
    }

    if (fsNode.type === 'file') {
      print(fsNode.name, 'default')
      return
    }

    const dir = fsNode as FSDir
    if (dir.children.length === 0) {
      return
    }

    const dirs = dir.children.filter((c) => c.type === 'dir')
    const files = dir.children.filter((c) => c.type === 'file')

    // Format dirs and files with type indicator
    const dirNames = dirs.map((d) => d.name + '/')
    const fileNames = files.map((f) => {
      const fFile = f as import('../../types').FSFile
      return fFile.value ? `${f.name} *` : f.name
    })

    // Print in columns
    const maxLen = Math.max(...dirNames.map((n) => n.length), ...fileNames.map((n) => n.length))
    const colWidth = maxLen + 2
    const cols = Math.max(1, Math.floor(60 / colWidth))

    // Print dirs first, then files
    if (dirNames.length > 0) {
      const row: string[] = []
      for (const name of dirNames) {
        row.push(name.padEnd(colWidth))
        if (row.length >= cols) {
          print(row.join(''), 'info')
          row.length = 0
        }
      }
      if (row.length) print(row.join(''), 'info')
    }

    if (fileNames.length > 0) {
      const row: string[] = []
      for (const name of fileNames) {
        row.push(name.padEnd(colWidth))
        if (row.length >= cols) {
          print(row.join(''), 'default')
          row.length = 0
        }
      }
      if (row.length) print(row.join(''), 'default')
    }
  },
}
