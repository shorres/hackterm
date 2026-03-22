// ─── Filesystem ──────────────────────────────────────────────────────────────

export interface FSFile {
  type: 'file'
  name: string
  content: string
  value?: number // if exfiltrable, how much $$ it's worth
  hidden?: boolean
}

export interface FSDir {
  type: 'dir'
  name: string
  children: FSNode[]
  hidden?: boolean
}

export type FSNode = FSFile | FSDir

// ─── Network ─────────────────────────────────────────────────────────────────

export interface Port {
  number: number
  service: string
  version: string
}

export interface Vulnerability {
  id: string
  name: string
  description: string
  port: number
  service: string
  difficulty: number // 1–10, affects exploit time
  requiresTool?: string // optional: needs a specific upgrade
}

export type NodeType =
  | 'home_router'
  | 'iot_camera'
  | 'iot_thermostat'
  | 'smart_tv'
  | 'home_pc'
  | 'small_server'
  | 'nas_device'
  | 'corporate_server'
  | 'database_server'
  | 'web_server'
  | 'gov_server'

export interface GameNode {
  id: string
  ip: string
  mac: string
  hostname: string
  type: NodeType
  tier: number // 1–3 for v0
  os: string
  openPorts: Port[]
  vulnerabilities: Vulnerability[]
  filesystem: FSDir
  baseIncome: number // $/sec when backdoored
  incomeMultiplier: number
  heatOnBreach: number // heat added when first exploited
  compromised: boolean
  backdoored: boolean
  logsCleared: boolean
}

// ─── Player ──────────────────────────────────────────────────────────────────

export interface HardwareUpgrades {
  cpu: number        // 1–5, multiplies passive income & speeds exploits
  ram: number        // 1–5, max concurrent backdoors
  nic: number        // 1–5, nmap scan range
  logWiper: number   // 0–5, multiplies heat reduction from clearlog (software upgrade)
}

// ─── Terminal Output ──────────────────────────────────────────────────────────

export type OutputType =
  | 'default'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'system'
  | 'prompt'
  | 'data'
  | 'progress'

export interface TerminalLine {
  id: string
  text: string
  type: OutputType
  timestamp: number
}

// ─── Active Operation ────────────────────────────────────────────────────────

export interface ActiveOperation {
  type: 'exploit' | 'backdoor' | 'exfiltrate' | 'clearlog'
  targetId: string
  vulnId?: string
  startedAt: number
  durationMs: number
  label: string
}

// ─── Prestige ─────────────────────────────────────────────────────────────────

export type PrestigeEnding = 'fbi' | 'legend' | 'counter_hacked'
export type PrestigePhase = 'playing' | 'fbi_closing' | 'ended'

export interface PrestigeMeta {
  totalRuns: number
  legendRuns: number
  moleRuns: number
  counterHackedRuns: number
  // Stacked bonuses applied at the start of each new run
  incomeMultiplier: number  // starts 1.0, +0.5 per legend run
  retainedMoney: number     // flat $ carried over from counter-hacked runs
  clearanceLevel: number    // mole run count (cap 5), grants free starting upgrades
}

// ─── Market Items ─────────────────────────────────────────────────────────────

export interface ZeroDayItem {
  id: string
  name: string
  description: string
  targetService: string  // matches port.service on nodes
  tier: number
  price: number
}

export interface CrewBotInstance {
  instanceId: string  // nanoid, unique per purchase
  botId: string       // references the market item id
  name: string
  maxTier: number
  efficiency: number  // 0.5–0.75, multiplier on income contribution
  heatPerTick: number
  lastActionAt: number // timestamp of last auto-exploit
}

// ─── Game State ───────────────────────────────────────────────────────────────

export interface GameState {
  // Meta
  seed: string
  started: boolean

  // Resources
  money: number
  heat: number // 0–100

  // Prestige phase for this run
  prestigePhase: PrestigePhase
  endingType: PrestigeEnding | null
  legendUnlocked: boolean       // true once money >= $25k
  fbiClosingAt: number | null   // timestamp FBI countdown started
  lastHeatBand: number          // 0–4, tracks which threshold messages were printed
  counterHackWarned: boolean    // true once counter-hack warning was shown
  lastHeatAt: number            // timestamp of last addHeat call; decay only starts after delay
  lastFbiEventAt: number        // timestamp of last periodic FBI pressure/action event
  debugOpen: boolean            // transient UI toggle, not persisted
  runIntroActive: boolean       // true after prestige restart until player dismisses intro
  lastEndingType: PrestigeEnding | null  // the ending that triggered this run (not persisted)

  // Network
  nodes: GameNode[]
  knownNodeIds: string[] // discovered via nmap
  currentNodeId: string | null // shell is open here
  currentPath: string // path within currentNode's filesystem

  // Player hardware
  upgrades: HardwareUpgrades

  // Market inventory
  zerodays: ZeroDayItem[]      // zero-days in inventory
  crewBots: CrewBotInstance[]  // hired bots

  // Active operations (timed events)
  activeOperation: ActiveOperation | null

  // Terminal
  lines: TerminalLine[]
  commandHistory: string[]
  historyIndex: number
}
