import type { CommandHandler } from './index'
import { getClearlogMultiplier } from '../../data/upgrades'

const CLEARLOG_DURATION_MS = 3000

export const clearlogCommand: CommandHandler = {
  name: 'clearlog',
  aliases: ['clearlogs'],
  description: 'Wipe access logs on the current host to reduce heat',
  run: (_args, { print, store }) => {
    const node = store.getCurrentNode()
    if (!node) {
      print('clearlog: not connected to a host', 'error')
      return
    }

    if (node.logsCleared) {
      print(`clearlog: logs already wiped on ${node.hostname}`, 'info')
      return
    }

    if (store.activeOperation) {
      print(`Operation in progress: ${store.activeOperation.label}`, 'warning')
      return
    }

    const wiperLevel = store.upgrades.logWiper
    const mult = getClearlogMultiplier(wiperLevel)
    const heatRemoved = Math.round(node.heatOnBreach * mult * 10) / 10

    print(``, 'default')
    print(`[*] Locating log files on ${node.hostname} ...`, 'system')
    print(`[*] Targets: /var/log/auth.log, /var/log/syslog, ~/.bash_history`, 'info')
    print(
      `[*] Heat reduction: -${heatRemoved}${wiperLevel > 0 ? ` (Log Wiper Lv.${wiperLevel} ×${mult.toFixed(2)})` : ''}`,
      'info'
    )

    store.startOperation({
      type: 'clearlog',
      targetId: node.id,
      startedAt: Date.now(),
      durationMs: CLEARLOG_DURATION_MS,
      label: `clearlog on ${node.hostname}`,
    })
  },
}
