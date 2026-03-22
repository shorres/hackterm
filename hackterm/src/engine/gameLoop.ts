import { useGameStore } from '../store/gameStore'
import type { ActiveOperation } from '../types'
import { getClearlogMultiplier } from '../data/upgrades'

// Called every 1000ms by App
export function tick() {
  const store = useGameStore.getState()
  if (!store.started) return

  // 1. Passive income
  store.tickIncome()

  // 2. Check active operation completion
  const { completed, operation } = store.tickOperation()
  if (completed && operation) {
    handleOperationComplete(operation)
  }
}

function handleOperationComplete(op: ActiveOperation) {
  const store = useGameStore.getState()
  const { print, getNode } = store
  const node = getNode(op.targetId)
  if (!node) return

  switch (op.type) {
    case 'exploit': {
      store.compromiseNode(op.targetId)
      store.addHeat(node.heatOnBreach)
      print(``, 'default')
      print(`[+] EXPLOIT SUCCESS — shell obtained on ${node.hostname} (${node.ip})`, 'success')
      print(`[+] Root access confirmed.`, 'success')
      print(`[!] Heat increased by ${node.heatOnBreach}`, 'warning')
      print(``, 'default')
      print(`    → connect ${node.ip}  to open a shell`, 'info')
      break
    }

    case 'backdoor': {
      store.backdoorNode(op.targetId)
      const income = (node.baseIncome * node.incomeMultiplier * (1 + store.upgrades.cpu * 0.2)).toFixed(3)
      print(``, 'default')
      print(`[+] BACKDOOR INSTALLED on ${node.hostname}`, 'success')
      print(`[+] Persistent listener active — +$${income}/sec`, 'success')
      break
    }

    case 'exfiltrate': {
      // Find value from current node's filesystem (approximation — use node base value)
      // In a real implementation we'd track the specific file; here we award a random exfil reward
      const value = Math.round((node.baseIncome * 200 + Math.random() * 300) * 100) / 100
      store.addMoney(value)
      store.addHeat(node.heatOnBreach * 0.5)
      store.dirtyNodeLogs(op.targetId)
      print(``, 'default')
      print(`[+] EXFILTRATION COMPLETE`, 'success')
      print(`[+] Data received — +$${value.toFixed(2)} deposited`, 'success')
      print(`[!] Heat increased by ${(node.heatOnBreach * 0.5).toFixed(1)}`, 'warning')
      break
    }

    case 'clearlog': {
      const mult = getClearlogMultiplier(store.upgrades.logWiper)
      const heatRemoved = Math.round(node.heatOnBreach * mult * 10) / 10
      store.clearNodeLogs(op.targetId)
      store.reduceHeat(heatRemoved)
      print(``, 'default')
      print(`[+] LOGS CLEARED on ${node.hostname}`, 'success')
      print(`[+] Heat reduced by ${heatRemoved}`, 'success')
      break
    }
  }
}
