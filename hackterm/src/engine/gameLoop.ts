import { useGameStore } from '../store/gameStore'
import type { ActiveOperation } from '../types'
import { getClearlogMultiplier } from '../data/upgrades'

const HEAT_DECAY_PER_TICK = 0.2
const LEGEND_MONEY_THRESHOLD = 25000
const FBI_CLOSING_DURATION_MS = 30000
const COUNTER_HACK_CHANCE = 0.003       // 0.3% per tick
const COUNTER_HACK_MIN_BACKDOORS = 3    // need this many tier-2+ shells to be at risk

// Called every 1000ms by App
export function tick() {
  const store = useGameStore.getState()
  if (!store.started || store.prestigePhase === 'ended') return

  // 1. Passive income
  store.tickIncome()

  // 2. Passive heat decay (idle play slowly cools you down)
  if (store.heat > 0) {
    store.reduceHeat(HEAT_DECAY_PER_TICK)
  }

  // 3. Check active operation completion
  const { completed, operation } = store.tickOperation()
  if (completed && operation) {
    handleOperationComplete(operation)
  }

  // 4. Heat threshold events + FBI logic
  handleHeatEvents()

  // 5. Legend unlock check
  handleLegendCheck()

  // 6. Counter-hack chance
  handleCounterHack()
}

// ─── Heat Events ─────────────────────────────────────────────────────────────

function handleHeatEvents() {
  const store = useGameStore.getState()
  const { heat, lastHeatBand, prestigePhase, fbiClosingAt, print } = store

  if (prestigePhase === 'ended') return

  // Band 0 = <50, 1 = 50+, 2 = 75+, 3 = 90+, 4 = 100
  const band = heat >= 100 ? 4 : heat >= 90 ? 3 : heat >= 75 ? 2 : heat >= 50 ? 1 : 0

  if (band > lastHeatBand) {
    useGameStore.setState({ lastHeatBand: band })

    if (band === 1) {
      print(``, 'default')
      print(`[!] WARNING: Unusual traffic patterns flagged by ISP monitoring.`, 'warning')
      print(`    Recommend clearing logs and reducing activity.`, 'warning')
      print(``, 'default')
    } else if (band === 2) {
      print(``, 'default')
      print(`[!!] ALERT: FBI Cyber Division has opened a case on your traffic signature.`, 'error')
      print(`     Active investigation underway. Wipe traces immediately.`, 'error')
      print(``, 'default')
    } else if (band === 3) {
      print(``, 'default')
      print(`[!!!] CRITICAL: FBI has identified your approximate location.`, 'error')
      print(`      Disconnect all sessions. Clear all logs. Go dark NOW.`, 'error')
      print(``, 'default')
    } else if (band === 4 && prestigePhase === 'playing') {
      // FBI closing in — start 30s countdown
      useGameStore.setState({ prestigePhase: 'fbi_closing', fbiClosingAt: Date.now() })
      print(``, 'default')
      print(`████████████████████████████████████████`, 'error')
      print(`  FBI HAS YOUR ADDRESS. RAID IN 30 SECONDS.`, 'error')
      print(`  Type nothing — or type everything. Your call.`, 'error')
      print(`████████████████████████████████████████`, 'error')
      print(``, 'default')
    }
  }

  // Tick the FBI closing countdown
  if (prestigePhase === 'fbi_closing' && fbiClosingAt !== null) {
    const elapsed = Date.now() - fbiClosingAt
    const remaining = Math.ceil((FBI_CLOSING_DURATION_MS - elapsed) / 1000)

    if (elapsed >= FBI_CLOSING_DURATION_MS) {
      store.triggerEnding('fbi')
    } else if (remaining <= 10 && remaining % 5 === 0) {
      print(`[FBI] ${remaining} seconds...`, 'error')
    }
  }
}

// ─── Legend Check ─────────────────────────────────────────────────────────────

function handleLegendCheck() {
  const store = useGameStore.getState()
  if (store.legendUnlocked || store.money < LEGEND_MONEY_THRESHOLD) return

  useGameStore.setState({ legendUnlocked: true })
  store.print(``, 'default')
  store.print(`★ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ★`, 'success')
  store.print(`  LEGEND STATUS UNLOCKED`, 'success')
  store.print(`  You've crossed $${LEGEND_MONEY_THRESHOLD.toLocaleString()}.`, 'success')
  store.print(`  Type "retire" to go out on top and earn a permanent income bonus.`, 'success')
  store.print(`★ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ★`, 'success')
  store.print(``, 'default')
}

// ─── Counter-hack ─────────────────────────────────────────────────────────────

function handleCounterHack() {
  const store = useGameStore.getState()
  if (store.prestigePhase !== 'playing') return

  const tier2Shells = store.nodes.filter((n) => n.backdoored && n.tier >= 2)
  if (tier2Shells.length < COUNTER_HACK_MIN_BACKDOORS) return

  if (!store.counterHackWarned && tier2Shells.length >= COUNTER_HACK_MIN_BACKDOORS) {
    useGameStore.setState({ counterHackWarned: true })
    store.print(``, 'default')
    store.print(`[~] NOTICE: Anomalous inbound probes on your listener ports.`, 'warning')
    store.print(`    Someone knows you're here. Watch your back.`, 'warning')
    store.print(``, 'default')
  }

  if (Math.random() < COUNTER_HACK_CHANCE) {
    store.print(``, 'default')
    store.print(`██████████████████████████████████████████████`, 'error')
    store.print(`  YOU'VE BEEN COUNTER-HACKED.`, 'error')
    store.print(`  A rival operator just owned your machine.`, 'error')
    store.print(`  Everything is gone.`, 'error')
    store.print(`██████████████████████████████████████████████`, 'error')
    store.print(``, 'default')
    // Small delay so player can read the message before screen changes
    setTimeout(() => store.triggerEnding('counter_hacked'), 3000)
  }
}

// ─── Operation Completion ─────────────────────────────────────────────────────

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
