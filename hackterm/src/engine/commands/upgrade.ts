import type { CommandHandler } from './index'
import { HARDWARE_UPGRADES, upgradeCost } from '../../data/upgrades'
import { formatMoney } from './index'

export const upgradeCommand: CommandHandler = {
  name: 'upgrade',
  description: 'View or purchase hardware upgrades',
  run: (args, { print, store }) => {
    const { money, upgrades } = store

    // upgrade buy <id>
    if (args[0] === 'buy' && args[1]) {
      const id = args[1].toLowerCase() as keyof typeof upgrades
      const def = HARDWARE_UPGRADES[id]
      if (!def) {
        print(`upgrade: unknown component '${args[1]}'`, 'error')
        print(`         Valid options: cpu, ram, nic`, 'info')
        return
      }

      const success = store.purchaseUpgrade(id)
      if (success) {
        const newLevel = store.upgrades[id]
        print(``, 'default')
        print(`[+] ${def.label} upgraded to Level ${newLevel}!`, 'success')
        print(`    ${def.effect}`, 'info')
      } else {
        const currentLevel = upgrades[id]
        if (currentLevel >= def.maxLevel) {
          print(`upgrade: ${def.label} is already at max level`, 'warning')
        } else {
          const cost = upgradeCost(def, currentLevel)
          print(
            `upgrade: Insufficient funds — need ${formatMoney(cost)}, have ${formatMoney(money)}`,
            'error'
          )
        }
      }
      return
    }

    // Show upgrade menu
    print('', 'default')
    print('┌─[ UPGRADES ]───────────────────────────────────┐', 'info')
    print(`│  Balance: ${formatMoney(money)}`, 'success')
    print('│', 'info')

    for (const [id, def] of Object.entries(HARDWARE_UPGRADES)) {
      const currentLevel = upgrades[id as keyof typeof upgrades]
      const atMax = currentLevel >= def.maxLevel
      const cost = atMax ? 0 : upgradeCost(def, currentLevel)
      const bar = '■'.repeat(currentLevel) + '□'.repeat(def.maxLevel - currentLevel)

      print(`│  [${id.toUpperCase()}]  Level ${currentLevel}/${def.maxLevel}  ${bar}`, 'default')
      print(`│    ${def.description}`, 'data')

      if (atMax) {
        print(`│    Status: MAXED`, 'success')
      } else {
        print(
          `│    Next: ${formatMoney(cost)}  →  upgrade buy ${id}`,
          money >= cost ? 'info' : 'warning'
        )
      }
      print('│', 'info')
    }

    print('└───────────────────────────────────────────────┘', 'info')
    print(`  Usage: upgrade buy <cpu|ram|nic>`, 'info')
  },
}
