import { useGameStore } from '../store/gameStore'
import type { ActiveOperation } from '../types'
import { getClearlogMultiplier } from '../data/upgrades'
import { CREW_BOTS } from '../data/marketItems'

// ─── Constants ────────────────────────────────────────────────────────────────

// Heat decay
const DECAY_RATE_DISCONNECTED = 0.5   // per tick when not connected and idle
const DECAY_RATE_CONNECTED    = 0.2   // per tick when connected but idle
const DECAY_DELAY_DISCONNECTED = 30_000
const DECAY_DELAY_CONNECTED    = 45_000
const DECAY_CRITICAL_MULT      = 0.5  // at 90%+ heat, decay is half as effective

// Prestige thresholds
const LEGEND_MONEY_THRESHOLD  = 25000
const FBI_CLOSING_DURATION_MS = 30000

// FBI escalation
const FBI_MONITOR_INTERVAL_MS = 75_000  // band-2 pressure message every 75s
const FBI_RAID_INTERVAL_MS    = 60_000  // band-3 action (+ disconnect) every 60s

// Counter-hack
const COUNTER_HACK_BASE_CHANCE = 0.001
const COUNTER_HACK_SLOP_MULT   = 3

// Countdown seconds to announce (module-level to avoid state overhead)
const COUNTDOWN_BEATS = new Set([25, 20, 15, 10, 5, 4, 3, 2, 1])
let lastCountdownSecond = -1

// ─── FBI message pools ────────────────────────────────────────────────────────

const FBI_MONITOR_MESSAGES: [string, string][] = [
  [`[FBI_TRX] Correlation sweep active on flagged subnet.`,
   `           Traffic signature match: ${Math.floor(55 + Math.random() * 30)}% confidence.`],
  [`[FBI_TRX] FISA warrant submitted for ISP log disclosure.`,
   `           Awaiting judicial approval. Monitoring continues.`],
  [`[FBI_TRX] Deep packet inspection enabled on egress routes.`,
   `           Behavioral pattern analysis running.`],
  [`[FBI_TRX] Subpoena issued to hosting provider.`,
   `           Historical session data requested.`],
  [`[FBI_TRX] Geo-correlation sweep in progress.`,
   `           Narrowing origin range. Stand by.`],
]

const FBI_RAID_MESSAGES = [
  [`[FBI_RAID] Physical address narrowed to a 3-block radius.`,
   `           Tactical unit on standby.`],
  [`[FBI_RAID] ISP subpoena executed. Full session logs obtained.`,
   `           You have been positively identified.`],
  [`[FBI_RAID] Remote session forcibly terminated.`,
   `           They know which node you were on.`],
  [`[FBI_RAID] Network tap installed upstream of your connection.`,
   `           All traffic now mirrored to federal servers.`],
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Main tick ────────────────────────────────────────────────────────────────

export function tick() {
  const store = useGameStore.getState()
  if (!store.started || store.prestigePhase === 'ended') return

  // 1. Passive income
  store.tickIncome()

  // 2. Heat decay
  handleHeatDecay()

  // 3. Active operation completion
  const { completed, operation } = store.tickOperation()
  if (completed && operation) {
    handleOperationComplete(operation)
  }

  // 4. Heat threshold messages + FBI escalation
  handleHeatEvents()

  // 5. Legend unlock check
  handleLegendCheck()

  // 6. Counter-hack chance
  handleCounterHack()

  // 7. Crew bot actions
  handleCrewBots()
}

// ─── Heat Decay ───────────────────────────────────────────────────────────────

function handleHeatDecay() {
  const store = useGameStore.getState()
  if (store.heat <= 0) return

  const isConnected = store.currentNodeId !== null
  const delay = isConnected ? DECAY_DELAY_CONNECTED : DECAY_DELAY_DISCONNECTED
  const baseRate = isConnected ? DECAY_RATE_CONNECTED : DECAY_RATE_DISCONNECTED

  const idle = store.lastHeatAt === 0 || (Date.now() - store.lastHeatAt) > delay
  if (!idle) return

  // Critical heat (90%+) decays at half speed — hard to cool off once it's there
  const rate = store.heat >= 90 ? baseRate * DECAY_CRITICAL_MULT : baseRate
  store.reduceHeat(rate)
}

// ─── Heat Threshold Events + FBI Escalation ───────────────────────────────────

function handleHeatEvents() {
  const store = useGameStore.getState()
  const { heat, lastHeatBand, prestigePhase, fbiClosingAt, lastFbiEventAt, print } = store

  if (prestigePhase === 'ended') return

  // Band 0=<50, 1=50+, 2=75+, 3=90+, 4=100
  const band = heat >= 100 ? 4 : heat >= 90 ? 3 : heat >= 75 ? 2 : heat >= 50 ? 1 : 0

  // ── One-time threshold messages ──────────────────────────────────────────

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
      lastCountdownSecond = -1
      useGameStore.setState({ prestigePhase: 'fbi_closing', fbiClosingAt: Date.now() })
      print(``, 'default')
      print(`████████████████████████████████████████`, 'error')
      print(`  FBI HAS YOUR ADDRESS. RAID IN 30 SECONDS.`, 'error')
      print(`  Type nothing — or type everything. Your call.`, 'error')
      print(`████████████████████████████████████████`, 'error')
      print(``, 'default')
    }
  }

  // ── Periodic FBI pressure (band 2: 75–89%) ───────────────────────────────

  if (band === 2 && prestigePhase === 'playing') {
    const sinceLast = Date.now() - lastFbiEventAt
    if (lastFbiEventAt === 0 || sinceLast > FBI_MONITOR_INTERVAL_MS) {
      useGameStore.setState({ lastFbiEventAt: Date.now() })
      const [line1, line2] = pickRandom(FBI_MONITOR_MESSAGES)
      print(``, 'default')
      print(line1, 'warning')
      print(line2, 'warning')
      print(``, 'default')
    }
  }

  // ── FBI active raids (band 3: 90–99%) ────────────────────────────────────

  if (band === 3 && prestigePhase === 'playing') {
    const sinceLast = Date.now() - lastFbiEventAt
    if (lastFbiEventAt === 0 || sinceLast > FBI_RAID_INTERVAL_MS) {
      useGameStore.setState({ lastFbiEventAt: Date.now() })
      const [line1, line2] = pickRandom(FBI_RAID_MESSAGES)
      print(``, 'default')
      print(line1, 'error')
      print(line2, 'error')

      // If player is connected, forcibly disconnect them
      const currentNode = useGameStore.getState().getCurrentNode()
      if (currentNode) {
        print(`[FBI_RAID] >> Connection to ${currentNode.hostname} terminated by remote intercept <<`, 'error')
        useGameStore.getState().setCurrentNode(null)
        if (useGameStore.getState().activeOperation) {
          useGameStore.getState().completeOperation()
          print(`[FBI_RAID] Active operation aborted.`, 'error')
        }
      }
      print(``, 'default')
    }
  }

  // ── FBI closing countdown ─────────────────────────────────────────────────

  if (prestigePhase === 'fbi_closing' && fbiClosingAt !== null) {
    const elapsed = Date.now() - fbiClosingAt
    const remaining = Math.ceil((FBI_CLOSING_DURATION_MS - elapsed) / 1000)

    if (elapsed >= FBI_CLOSING_DURATION_MS) {
      store.triggerEnding('fbi')
    } else if (COUNTDOWN_BEATS.has(remaining) && remaining !== lastCountdownSecond) {
      lastCountdownSecond = remaining
      if (remaining <= 5) {
        print(`[FBI] ${remaining}...`, 'error')
      } else {
        print(`[FBI] ${remaining} seconds remaining.`, 'error')
      }
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

  const dirtyShells = backdoored.filter((n) => !n.logsCleared)
  const dirtyRatio = dirtyShells.length / backdoored.length
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

// ─── Crew Bots ────────────────────────────────────────────────────────────────

const BOT_ACTION_COOLDOWN_MS = 45_000

function handleCrewBots() {
  const store = useGameStore.getState()
  if (store.crewBots.length === 0) return

  const now = Date.now()

  for (const bot of store.crewBots) {
    if (now - bot.lastActionAt < BOT_ACTION_COOLDOWN_MS) continue

    // Find an uncompromised node within this bot's tier range
    const target = store.nodes.find(
      (n) => !n.compromised && n.tier <= bot.maxTier && store.knownNodeIds.includes(n.id)
    )

    if (target) {
      store.compromiseNode(target.id)
      store.addHeat(bot.heatPerTick)
      store.updateBotLastAction(bot.instanceId)
      store.print(`[bot] ${bot.name} compromised ${target.hostname} (${target.ip})`, 'info')
    } else {
      // All known eligible nodes already compromised — generate passive income instead
      const def = CREW_BOTS.find((b) => b.id === bot.botId)
      const income = Math.round((def?.incomePerSec ?? 0.1) * 10 * 100) / 100
      store.addMoney(income)
      store.addHeat(bot.heatPerTick * 0.3)
      store.updateBotLastAction(bot.instanceId)
    }
  }
}
