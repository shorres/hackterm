import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type {
  GameState,
  GameNode,
  TerminalLine,
  OutputType,
  ActiveOperation,
  PrestigeEnding,
  PrestigePhase,
  PrestigeMeta,
  CrewBotInstance,
} from '../types'
import { ZERO_DAYS, CREW_BOTS, MAX_CREW_BOTS } from '../data/marketItems'
import { generateWorld, calcPassiveIncome } from '../engine/networkGen'
import {
  HARDWARE_UPGRADES,
  upgradeCost,
  getMaxBackdoors,
} from '../data/upgrades'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLine(text: string, type: OutputType = 'default'): TerminalLine {
  return { id: nanoid(), text, type, timestamp: Date.now() }
}

const MAX_LINES = 500

// ─── Store ────────────────────────────────────────────────────────────────────

interface GameActions {
  // Boot
  startGame: (seed?: string, meta?: PrestigeMeta, lastEnding?: PrestigeEnding) => void
  dismissRunIntro: () => void
  resetGame: () => void

  // Terminal output
  print: (text: string, type?: OutputType) => void
  printLines: (lines: Array<{ text: string; type?: OutputType }>) => void
  clearTerminal: () => void

  // Command history
  pushHistory: (cmd: string) => void
  navigateHistory: (dir: 'up' | 'down') => string

  // Network
  discoverNodes: (nodeIds: string[]) => void
  setCurrentNode: (nodeId: string | null) => void
  setCurrentPath: (path: string) => void
  compromiseNode: (nodeId: string) => void
  backdoorNode: (nodeId: string) => void
  clearNodeLogs: (nodeId: string) => void

  // Money & heat
  addMoney: (amount: number) => void
  addHeat: (amount: number) => void
  reduceHeat: (amount: number) => void

  // Upgrades
  purchaseUpgrade: (upgradeId: keyof GameState['upgrades']) => boolean

  // Operations (timed actions)
  startOperation: (op: ActiveOperation) => void
  completeOperation: () => void
  tickOperation: () => { completed: boolean; operation: ActiveOperation | null }

  // Passive income tick
  tickIncome: () => void

  // Backdoor management
  deactivateBackdoor: (nodeId: string) => void

  // Log state
  dirtyNodeLogs: (nodeId: string) => void

  // Debug
  toggleDebug: () => void

  // Market
  purchaseZeroDay: (id: string) => boolean
  useZeroDay: (service: string) => import('../types').ZeroDayItem | null
  purchaseCrewBot: (botId: string) => boolean
  fireCrewBot: (instanceId: string) => void
  updateBotLastAction: (instanceId: string) => void

  // Prestige
  triggerEnding: (ending: PrestigeEnding) => void
  setPrestigePhase: (phase: PrestigePhase) => void

  // Computed helpers
  getNode: (id: string) => GameNode | undefined
  getCurrentNode: () => GameNode | undefined
  getBackdooredNodes: () => GameNode[]
  getPassiveIncome: () => number
  getMaxBackdoors: () => number
}

type Store = GameState & GameActions

function initialState(): GameState {
  return {
    seed: '',
    started: false,
    money: 0,
    heat: 0,
    prestigePhase: 'playing',
    endingType: null,
    legendUnlocked: false,
    fbiClosingAt: null,
    lastHeatBand: 0,
    counterHackWarned: false,
    lastHeatAt: 0,
    lastFbiEventAt: 0,
    debugOpen: false,
    runIntroActive: false,
    lastEndingType: null,
    nodes: [],
    knownNodeIds: [],
    currentNodeId: null,
    currentPath: '/',
    upgrades: { cpu: 0, ram: 0, nic: 0, logWiper: 0 },
    activeOperation: null,
    zerodays: [],
    crewBots: [],
    lines: [],
    commandHistory: [],
    historyIndex: -1,
  }
}

export const useGameStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState(),

      // ── Boot ──────────────────────────────────────────────────────────────

      startGame: (seed, meta, lastEnding) => {
        const s = seed ?? Math.random().toString(36).slice(2, 10).toUpperCase()
        const nodes = generateWorld(s)

        // Apply prestige meta bonuses
        const startingMoney = 50 + (meta?.retainedMoney ?? 0)
        const startingUpgrades = { cpu: 0, ram: 0, nic: 0, logWiper: 0 }
        const upgradeOrder: (keyof typeof startingUpgrades)[] = ['cpu', 'ram', 'nic', 'logWiper']
        const clearance = Math.min(meta?.clearanceLevel ?? 0, upgradeOrder.length)
        for (let i = 0; i < clearance; i++) startingUpgrades[upgradeOrder[i]] = 1

        set({
          ...initialState(),
          seed: s,
          started: true,
          nodes,
          money: startingMoney,
          upgrades: startingUpgrades,
          lines: [],
          runIntroActive: lastEnding !== undefined,
          lastEndingType: lastEnding ?? null,
        })
      },

      dismissRunIntro: () => set({ runIntroActive: false }),

      resetGame: () => set(initialState()),

      // ── Terminal output ───────────────────────────────────────────────────

      print: (text, type = 'default') => {
        const line = makeLine(text, type)
        set((s) => ({
          lines:
            s.lines.length >= MAX_LINES
              ? [...s.lines.slice(-MAX_LINES + 1), line]
              : [...s.lines, line],
        }))
      },

      printLines: (lines) => {
        const newLines = lines.map((l) => makeLine(l.text, l.type ?? 'default'))
        set((s) => {
          const combined = [...s.lines, ...newLines]
          return { lines: combined.slice(-MAX_LINES) }
        })
      },

      clearTerminal: () => set({ lines: [] }),

      // ── Command history ───────────────────────────────────────────────────

      pushHistory: (cmd) => {
        if (!cmd.trim()) return
        set((s) => ({
          commandHistory:
            s.commandHistory[0] === cmd
              ? s.commandHistory
              : [cmd, ...s.commandHistory].slice(0, 100),
          historyIndex: -1,
        }))
      },

      navigateHistory: (dir) => {
        const { commandHistory, historyIndex } = get()
        if (commandHistory.length === 0) return ''
        const next =
          dir === 'up'
            ? Math.min(historyIndex + 1, commandHistory.length - 1)
            : Math.max(historyIndex - 1, -1)
        set({ historyIndex: next })
        return next === -1 ? '' : commandHistory[next]
      },

      // ── Network ───────────────────────────────────────────────────────────

      discoverNodes: (nodeIds) =>
        set((s) => ({
          knownNodeIds: [...new Set([...s.knownNodeIds, ...nodeIds])],
        })),

      setCurrentNode: (nodeId) =>
        set({ currentNodeId: nodeId, currentPath: '/' }),

      setCurrentPath: (path) => set({ currentPath: path }),

      compromiseNode: (nodeId) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === nodeId ? { ...n, compromised: true } : n
          ),
        })),

      backdoorNode: (nodeId) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === nodeId ? { ...n, backdoored: true } : n
          ),
        })),

      clearNodeLogs: (nodeId) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === nodeId ? { ...n, logsCleared: true } : n
          ),
        })),

      deactivateBackdoor: (nodeId) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === nodeId ? { ...n, backdoored: false } : n
          ),
        })),

      dirtyNodeLogs: (nodeId) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === nodeId ? { ...n, logsCleared: false } : n
          ),
        })),

      // ── Money & heat ──────────────────────────────────────────────────────

      addMoney: (amount) =>
        set((s) => ({ money: Math.round((s.money + amount) * 100) / 100 })),

      addHeat: (amount) =>
        set((s) => ({ heat: Math.min(100, s.heat + amount), lastHeatAt: Date.now() })),

      reduceHeat: (amount) =>
        set((s) => ({ heat: Math.max(0, s.heat - amount) })),

      // ── Upgrades ──────────────────────────────────────────────────────────

      purchaseUpgrade: (upgradeId) => {
        const { money, upgrades } = get()
        const def = HARDWARE_UPGRADES[upgradeId]
        if (!def) return false
        const currentLevel = upgrades[upgradeId]
        if (currentLevel >= def.maxLevel) return false
        const cost = upgradeCost(def, currentLevel)
        if (money < cost) return false
        set((s) => ({
          money: Math.round((s.money - cost) * 100) / 100,
          upgrades: { ...s.upgrades, [upgradeId]: s.upgrades[upgradeId] + 1 },
        }))
        return true
      },

      // ── Operations ────────────────────────────────────────────────────────

      startOperation: (op) => set({ activeOperation: op }),

      completeOperation: () => set({ activeOperation: null }),

      tickOperation: () => {
        const op = get().activeOperation
        if (!op) return { completed: false, operation: null }
        const elapsed = Date.now() - op.startedAt
        if (elapsed >= op.durationMs) {
          set({ activeOperation: null })
          return { completed: true, operation: op }
        }
        return { completed: false, operation: op }
      },

      // ── Passive income ────────────────────────────────────────────────────

      tickIncome: () => {
        const { nodes, upgrades } = get()
        const backdooredIds = nodes
          .filter((n) => n.backdoored)
          .map((n) => n.id)
        if (backdooredIds.length === 0) return
        const income = calcPassiveIncome(nodes, backdooredIds, upgrades.cpu)
        if (income > 0) {
          set((s) => ({
            money: Math.round((s.money + income) * 100) / 100,
          }))
        }
      },

      // ── Debug ─────────────────────────────────────────────────────────────

      toggleDebug: () => set((s) => ({ debugOpen: !s.debugOpen })),

      // ── Market ────────────────────────────────────────────────────────────

      purchaseZeroDay: (id) => {
        const { money, zerodays } = get()
        const def = ZERO_DAYS.find((z) => z.id === id)
        if (!def) return false
        if (money < def.price) return false
        if (zerodays.some((z) => z.id === id)) return false
        set((s) => ({
          money: Math.round((s.money - def.price) * 100) / 100,
          zerodays: [...s.zerodays, { ...def }],
        }))
        return true
      },

      useZeroDay: (service) => {
        const { zerodays } = get()
        const match = zerodays.find((z) => z.targetService === service)
        if (!match) return null
        set((s) => ({ zerodays: s.zerodays.filter((z) => z.id !== match.id) }))
        return match
      },

      purchaseCrewBot: (botId) => {
        const { money, crewBots } = get()
        const def = CREW_BOTS.find((b) => b.id === botId)
        if (!def) return false
        if (money < def.price) return false
        if (crewBots.length >= MAX_CREW_BOTS) return false
        const instance: CrewBotInstance = {
          instanceId: nanoid(),
          botId: def.id,
          name: def.name,
          maxTier: def.maxTier,
          efficiency: def.efficiency,
          heatPerTick: def.heatPerTick,
          lastActionAt: 0,
        }
        set((s) => ({
          money: Math.round((s.money - def.price) * 100) / 100,
          crewBots: [...s.crewBots, instance],
        }))
        return true
      },

      fireCrewBot: (instanceId) =>
        set((s) => ({ crewBots: s.crewBots.filter((b) => b.instanceId !== instanceId) })),

      updateBotLastAction: (instanceId) =>
        set((s) => ({
          crewBots: s.crewBots.map((b) =>
            b.instanceId === instanceId ? { ...b, lastActionAt: Date.now() } : b
          ),
        })),

      // ── Prestige ──────────────────────────────────────────────────────────

      triggerEnding: (ending) =>
        set({ endingType: ending, prestigePhase: 'ended', activeOperation: null }),

      setPrestigePhase: (phase) => set({ prestigePhase: phase }),

      // ── Computed helpers ──────────────────────────────────────────────────

      getNode: (id) => get().nodes.find((n) => n.id === id),

      getCurrentNode: () => {
        const { currentNodeId, nodes } = get()
        return currentNodeId ? nodes.find((n) => n.id === currentNodeId) : undefined
      },

      getBackdooredNodes: () => get().nodes.filter((n) => n.backdoored),

      getPassiveIncome: () => {
        const { nodes, upgrades } = get()
        const backdooredIds = nodes.filter((n) => n.backdoored).map((n) => n.id)
        return calcPassiveIncome(nodes, backdooredIds, upgrades.cpu)
      },

      getMaxBackdoors: () => getMaxBackdoors(get().upgrades.ram),
    }),
    {
      name: 'hackterm-save',
      partialize: (s) => ({
        seed: s.seed,
        started: s.started,
        money: s.money,
        heat: s.heat,
        prestigePhase: s.prestigePhase,
        endingType: s.endingType,
        legendUnlocked: s.legendUnlocked,
        fbiClosingAt: s.fbiClosingAt,
        lastHeatBand: s.lastHeatBand,
        counterHackWarned: s.counterHackWarned,
        lastFbiEventAt: s.lastFbiEventAt,
        nodes: s.nodes,
        knownNodeIds: s.knownNodeIds,
        currentNodeId: s.currentNodeId,
        currentPath: s.currentPath,
        upgrades: s.upgrades,
        commandHistory: s.commandHistory,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<GameState>
        return {
          ...current,
          ...p,
          // Sanitize numeric fields — corrupted saves (NaN, Infinity) fall back to initial values
          money: Number.isFinite(p.money) ? p.money! : current.money,
          heat: Number.isFinite(p.heat) ? p.heat! : current.heat,
          // Always fill in any upgrade fields added after the save was created
          upgrades: {
            ...current.upgrades,
            ...Object.fromEntries(
              Object.entries(p.upgrades ?? {}).map(([k, v]) => [k, Number.isFinite(v) ? v : 0])
            ),
          },
        }
      },
    }
  )
)

// Convenience selector hooks
export const selectNode = (id: string) => (s: Store) =>
  s.nodes.find((n) => n.id === id)
