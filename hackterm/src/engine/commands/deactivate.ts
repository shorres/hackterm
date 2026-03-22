import type { CommandHandler } from './index'

const DEACTIVATE_HEAT = 3

export const deactivateCommand: CommandHandler = {
  name: 'deactivate',
  aliases: ['killbd', 'rmbd'],
  description: 'Deactivate a backdoor listener on a compromised host',
  run: (args, { print, store }) => {
    if (args.length === 0) {
      // No IP given — list all active backdoors
      const backdoored = store.getBackdooredNodes()
      if (backdoored.length === 0) {
        print('deactivate: no active backdoor listeners', 'info')
        return
      }
      const cpuMult = 1 + store.upgrades.cpu * 0.2
      print('', 'default')
      print('Active backdoors:', 'warning')
      for (const n of backdoored) {
        const income = (n.baseIncome * n.incomeMultiplier * cpuMult).toFixed(3)
        print(`  ${n.ip.padEnd(15)} ${n.hostname.padEnd(22)} $${income}/sec`, 'data')
      }
      print('', 'default')
      print('Usage: deactivate <ip>', 'info')
      return
    }

    const ip = args[0]
    const node = store.nodes.find((n) => n.ip === ip)

    if (!node) {
      print(`deactivate: no known host at ${ip}`, 'error')
      return
    }

    if (!node.backdoored) {
      print(`deactivate: no backdoor active on ${node.hostname} (${ip})`, 'warning')
      return
    }

    const cpuMult = 1 + store.upgrades.cpu * 0.2
    const lostIncome = (node.baseIncome * node.incomeMultiplier * cpuMult).toFixed(3)

    store.deactivateBackdoor(node.id)
    store.addHeat(DEACTIVATE_HEAT)

    print(``, 'default')
    print(`[*] Sending kill signal to listener on ${node.hostname} ...`, 'system')
    print(`[-] Backdoor deactivated — $${lostIncome}/sec removed`, 'warning')
    print(`[!] Network activity generated heat +${DEACTIVATE_HEAT}`, 'warning')
    print(`    Slot freed (${store.getBackdooredNodes().length}/${store.getMaxBackdoors()} active)`, 'info')
  },
}
