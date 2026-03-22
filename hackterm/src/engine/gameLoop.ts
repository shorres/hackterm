import { useGameStore } from '../store/gameStore'
import type { ActiveOperation } from '../types'
import { getClearlogMultiplier } from '../data/upgrades'

const HEAT_DECAY_PER_TICK = 0.2
const HEAT_DECAY_DELAY_MS = 45_000  // heat won't decay until 45s after the last heat event
const LEGEND_MONEY_THRESHOLD = 25000
const FBI_CLOSING_DURATION_MS = 30000
const COUNTER_HACK_BASE_CHANCE = 0.001  // base chance per exposed tier-2+ shell per tick
const COUNTER_HACK_SLOP_MULT = 3        // dirty-log ratio multiplies chance by up to this

// Called every 1000ms by App
export function tick() {
  const store = useGameStore.getState()
  if (!store.started || store.prestigePhase === 'ended') return

  // 1. Passive income
  store.tickIncome()

  // 2. Passive heat decay — only kicks in after 45s of no heat-generating activity
  const heatIdle = store.lastHeatAt === 0 || (Date.now() - store.lastHeatAt) > HEAT_DECAY_DELAY_MS
  if (store.heat > 0 && heatIdle) {
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

  const backdoored = store.nodes.filter((n) => n.backdoored)
  const tier2Shells = backdoored.filter((n) => n.tier >= 2)
  if (tier2Shells.length === 0) return

  // Sloppiness = ratio of backdoored nodes with uncleaned logs
  const dirtyShells = backdoored.filter((n) => !n.logsCleared)
  const dirtyRatio = dirtyShells.length / backdoored.length

  // Chance scales with exposure and sloppiness
  const chance = COUNTER_HACK_BASE_CHANCE * tier2Shells.length * (1 + dirtyRatio * COUNTER_HACK_SLOP_MULT)

  if (!store.counterHackWarned) {
    useGameStore.setState({ counterHackWarned: true })
    store.print(``, 'default')
    if (dirtyRatio > 0.5) {
      store.print(`[~] NOTICE: Your traces are all over the place.`, 'warning')
      store.print(`    Dirty logs on active shells. Someone will sniff this out.`, 'warning')
    } else {
      store.print(`[~] NOTICE: Anomalous inbound probes on your listener ports.`, 'warning')
      store.print(`    You're casting a wide net. Someone may be watching.`, 'warning')
    }
    store.print(``, 'default')
  }

  if (Math.random() < chance) {
    store.print(``, 'default')
    store.print(`██████████████████████████████████████████████`, 'error')
    store.print(`  YOU'VE BEEN COUNTER-HACKED.`, 'error')
    store.print(`  A rival operator just owned your machine.`, 'error')
    store.print(`  Everything is gone.`, 'error')
    store.print(`██████████████████████████████████████████████`, 'error')
    store.print(``, 'default')
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
