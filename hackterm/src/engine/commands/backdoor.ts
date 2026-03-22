import type { CommandHandler } from './index'

const BACKDOOR_DURATION_MS = 5000
const ANALYZE_HEAT_COST = 2

export const backdoorCommand: CommandHandler = {
  name: 'backdoor',
  description: 'Install a backdoor listener, or analyze a host\'s income potential',
  run: (args, { print, store }) => {
    // ── backdoor analyze ────────────────────────────────────────────────────
    if (args[0] === 'analyze') {
      const node = store.getCurrentNode()
      if (!node) {
        print('backdoor analyze: must be connected to a host first', 'error')
        return
      }

      if (node.backdoored) {
        print(`backdoor analyze: listener already active on ${node.hostname}`, 'warning')
        return
      }

      const cpuMult = 1 + store.upgrades.cpu * 0.2
      const thisIncome = Math.round(node.baseIncome * node.incomeMultiplier * cpuMult * 1000) / 1000

      const existing = store.getBackdooredNodes()
        .map((n) => ({
          node: n,
          income: Math.round(n.baseIncome * n.incomeMultiplier * cpuMult * 1000) / 1000,
        }))
        .sort((a, b) => a.income - b.income) // ascending — weakest first

      const maxBd = store.getMaxBackdoors()
      const atCapacity = existing.length >= maxBd
      const weakest = existing[0]
      const worthReplacing = atCapacity && weakest && thisIncome > weakest.income

      print(``, 'default')
      print(`[*] Analyzing ${node.hostname} (${node.ip}) ...`, 'system')
      print(`[!] Trace generated — heat +${ANALYZE_HEAT_COST}`, 'warning')
      print(``, 'default')
      print(`┌─[ BACKDOOR ANALYSIS ]─────────────────────────┐`, 'info')
      print(`│  Target    : ${node.hostname}`, 'default')
      print(`│  Type      : ${node.type.replace(/_/g, ' ').toUpperCase()}`, 'default')
      print(`│  Tier      : ${node.tier}`, 'default')
      print(`│  Base Rate : $${node.baseIncome.toFixed(3)}/sec`, 'default')
      print(`│  Mult      : ×${node.incomeMultiplier.toFixed(2)} (node) ×${cpuMult.toFixed(2)} (CPU)`, 'default')
      print(`│  ─────────────────────────────────────────────`, 'info')
      print(`│  NET YIELD : $${thisIncome.toFixed(3)}/sec`, 'success')
      print(`│`, 'info')

      if (existing.length === 0) {
        print(`│  Slots     : ${existing.length}/${maxBd} — slot available`, 'success')
      } else if (!atCapacity) {
        print(`│  Slots     : ${existing.length}/${maxBd} — ${maxBd - existing.length} slot(s) free`, 'success')
      } else {
        print(`│  Slots     : ${existing.length}/${maxBd} — AT CAPACITY`, 'warning')
        print(`│`, 'info')
        print(`│  ACTIVE BACKDOORS (weakest first)`, 'warning')
        for (const { node: n, income } of existing) {
          const marker = n === weakest.node ? ' ◄ weakest' : ''
          print(`│    ${n.ip.padEnd(15)} ${n.hostname.padEnd(20)} $${income.toFixed(3)}/s${marker}`, 'data')
        }
        print(`│`, 'info')
        if (worthReplacing) {
          print(`│  VERDICT: WORTH REPLACING ${weakest.node.hostname}`, 'success')
          print(`│    Gain: +$${(thisIncome - weakest.income).toFixed(3)}/sec`, 'success')
          print(`│    Run: deactivate ${weakest.node.ip}  then: backdoor`, 'info')
        } else if (atCapacity) {
          print(`│  VERDICT: NOT WORTH REPLACING`, 'warning')
          print(`│    This node ($${thisIncome.toFixed(3)}/s) ≤ weakest slot ($${weakest.income.toFixed(3)}/s)`, 'data')
          print(`│    Upgrade RAM to add more slots`, 'info')
        }
      }

      print(`└───────────────────────────────────────────────┘`, 'info')

      store.addHeat(ANALYZE_HEAT_COST)
      store.dirtyNodeLogs(node.id)
      return
    }

    // ── backdoor install (default) ──────────────────────────────────────────
    const node = store.getCurrentNode()
    if (!node) {
      print('backdoor: not connected to a host — use connect <ip>', 'error')
      print('          Subcommands: backdoor analyze', 'info')
      return
    }

    if (node.backdoored) {
      print(`backdoor: listener already installed on ${node.hostname}`, 'warning')
      print(`          Generating $${(node.baseIncome * node.incomeMultiplier).toFixed(3)}/sec`, 'info')
      print(`          Use 'backdoor analyze' to compare against other slots`, 'info')
      return
    }

    const maxBackdoors = store.getMaxBackdoors()
    const currentCount = store.getBackdooredNodes().length

    if (currentCount >= maxBackdoors) {
      print(`backdoor: max listeners reached (${currentCount}/${maxBackdoors})`, 'error')
      print(`          Upgrade RAM to support more, or deactivate a weaker shell`, 'warning')
      print(`          Tip: run 'backdoor analyze' to see if this node is worth a slot`, 'info')
      return
    }

    if (store.activeOperation) {
      print(`Operation in progress: ${store.activeOperation.label}`, 'warning')
      return
    }

    print(``, 'default')
    print(`[*] Deploying persistence payload on ${node.hostname} ...`, 'system')
    print(`[*] Installing: cron hook, rc.local entry, systemd service`, 'info')
    print(`[*] Estimated value: $${(node.baseIncome * node.incomeMultiplier).toFixed(3)}/sec`, 'info')

    store.startOperation({
      type: 'backdoor',
      targetId: node.id,
      startedAt: Date.now(),
      durationMs: BACKDOOR_DURATION_MS,
      label: `backdoor on ${node.hostname}`,
    })
  },
}
