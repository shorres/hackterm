import type { CommandHandler } from './index'
import { formatMoney, formatHeat } from './index'

export const statusCommand: CommandHandler = {
  name: 'status',
  aliases: ['stat', 'whoami'],
  description: 'Show system status, income, and active backdoors',
  run: (_args, { print, store }) => {
    const { money, heat, upgrades, activeOperation } = store
    const backdoored = store.getBackdooredNodes()
    const income = store.getPassiveIncome()
    const maxBd = store.getMaxBackdoors()

    print('', 'default')
    print('┌─[ SYSTEM STATUS ]─────────────────────────────┐', 'info')
    print(`│  Balance       : ${formatMoney(money)}`, 'success')
    print(`│  Passive Income: ${income.toFixed(3)} $/sec`, 'success')
    print(`│  Heat Level    : ${formatHeat(heat)}`, heat > 50 ? 'error' : heat > 20 ? 'warning' : 'default')
    print(`│`, 'info')
    print(`│  CPU  Lv.${upgrades.cpu}/5   RAM  Lv.${upgrades.ram}/5   NIC  Lv.${upgrades.nic}/5`, 'default')
    print(`│`, 'info')
    print(`│  Backdoors     : ${backdoored.length} / ${maxBd} active`, 'default')

    if (backdoored.length > 0) {
      print('│', 'info')
      for (const node of backdoored) {
        const nodeIncome = (node.baseIncome * node.incomeMultiplier * (1 + upgrades.cpu * 0.2)).toFixed(3)
        print(`│    [${node.ip.padEnd(13)}] ${node.hostname.padEnd(20)} +$${nodeIncome}/s`, 'data')
      }
    }

    if (activeOperation) {
      const elapsed = Date.now() - activeOperation.startedAt
      const progress = Math.min(100, (elapsed / activeOperation.durationMs) * 100)
      const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5))
      print('│', 'info')
      print(`│  ACTIVE OP  : ${activeOperation.label}`, 'warning')
      print(`│  Progress   : [${bar}] ${progress.toFixed(0)}%`, 'warning')
    }

    print('└───────────────────────────────────────────────┘', 'info')
  },
}
