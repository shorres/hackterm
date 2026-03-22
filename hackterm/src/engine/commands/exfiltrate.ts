import type { CommandHandler } from './index'
import { getNodeAtPath, resolvePath, formatMoney } from './index'
import type { FSFile } from '../../types'

const EXFIL_DURATION_MS = 4000

export const exfiltrateCommand: CommandHandler = {
  name: 'exfiltrate',
  aliases: ['exfil'],
  description: 'Exfiltrate a valuable file for cash',
  run: (args, { print, store }) => {
    const node = store.getCurrentNode()
    if (!node) {
      print('exfiltrate: not connected to a host', 'error')
      return
    }
    if (args.length === 0) {
      print('Usage: exfiltrate <file>', 'error')
      return
    }

    if (store.activeOperation) {
      print(`Operation in progress: ${store.activeOperation.label}`, 'warning')
      return
    }

    const filePath = resolvePath(store.currentPath, args[0])
    const fsNode = getNodeAtPath(node, filePath)

    if (!fsNode) {
      print(`exfiltrate: ${args[0]}: No such file`, 'error')
      return
    }
    if (fsNode.type === 'dir') {
      print(`exfiltrate: ${args[0]}: Is a directory`, 'error')
      return
    }

    const file = fsNode as FSFile
    if (!file.value || file.value <= 0) {
      print(`exfiltrate: ${args[0]}: No market value detected`, 'warning')
      print(`            Try 'cat ${args[0]}' to inspect it first`, 'info')
      return
    }

    print(``, 'default')
    print(`[*] Exfiltrating ${args[0]} → encrypted tunnel ...`, 'system')
    print(`[*] File value: ${formatMoney(file.value)}`, 'info')

    store.startOperation({
      type: 'exfiltrate',
      targetId: node.id,
      startedAt: Date.now(),
      durationMs: EXFIL_DURATION_MS,
      label: `exfiltrate ${args[0]}`,
    })
  },
}
