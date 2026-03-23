import seedrandom from 'seedrandom'
import type { GameNode, FSDir, FSFile, FSNode, NodeType } from '../types'
import { NODE_TEMPLATES, PC_NAMES, type NodeTemplate } from '../data/nodeTemplates'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toHex(n: number, len: number): string {
  return n.toString(16).toUpperCase().padStart(len, '0')
}

function pickRandom<T>(arr: T[], rng: seedrandom.PRNG): T {
  return arr[Math.floor(rng() * arr.length)]
}

function randInRange(min: number, max: number, rng: seedrandom.PRNG): number {
  return min + rng() * (max - min)
}

function randInt(min: number, max: number, rng: seedrandom.PRNG): number {
  return Math.floor(randInRange(min, max + 1, rng))
}

// ─── IP / MAC generation ──────────────────────────────────────────────────────

function generateSubnet(subnetIndex: number): string {
  // Subnets: 10.0.{subnetIndex}.x
  return `10.0.${subnetIndex}`
}

function generateIp(subnet: string, hostIndex: number): string {
  return `${subnet}.${hostIndex + 2}` // .2–.254
}

function generateMac(rng: seedrandom.PRNG): string {
  const parts = Array.from({ length: 6 }, () => toHex(randInt(0, 255, rng), 2))
  return parts.join(':')
}

// ─── Hostname generation ─────────────────────────────────────────────────────

function generateHostname(pattern: string, rng: seedrandom.PRNG): string {
  return pattern
    .replace('{HEX4}', toHex(randInt(0, 65535, rng), 4))
    .replace('{HEX6}', toHex(randInt(0, 16777215, rng), 6))
    .replace('{N3}', String(randInt(100, 999, rng)))
    .replace('{NAME}', pickRandom(PC_NAMES, rng))
}

// ─── Filesystem deep-clone with rng ──────────────────────────────────────────

function cloneFS(node: FSNode): FSNode {
  if (node.type === 'file') return { ...node }
  return { ...node, children: node.children.map(cloneFS) }
}

// ─── Node builder ────────────────────────────────────────────────────────────

function buildNode(
  template: NodeTemplate,
  id: string,
  ip: string,
  rng: seedrandom.PRNG,
  ephemeral = false
): GameNode {
  const mac = generateMac(rng)
  const hostname = generateHostname(pickRandom(template.hostnamePatterns, rng), rng)
  const os = pickRandom(template.osPool, rng)

  // Pick 1–3 ports from pool
  const portCount = randInt(1, Math.min(3, template.portPool.length), rng)
  const shuffledPorts = [...template.portPool].sort(() => rng() - 0.5)
  const openPorts = shuffledPorts.slice(0, portCount)

  // Pick 1–2 vulns
  const vulnCount = randInt(1, Math.min(2, template.vulnPool.length), rng)
  const shuffledVulns = [...template.vulnPool].sort(() => rng() - 0.5)
  const vulnerabilities = shuffledVulns.slice(0, vulnCount)

  const baseIncome =
    Math.round(randInRange(...template.baseIncomeRange, rng) * 100) / 100
  const incomeMultiplier =
    Math.round(randInRange(...template.incomeMultiplierRange, rng) * 100) / 100
  const heatOnBreach = randInt(...template.heatOnBreachRange, rng)

  const filesystem = cloneFS(
    template.filesystemFactory(hostname, rng)
  ) as FSDir

  return {
    id,
    ip,
    mac,
    hostname,
    type: template.type,
    tier: template.tier,
    os,
    openPorts,
    vulnerabilities,
    filesystem,
    baseIncome,
    incomeMultiplier,
    heatOnBreach,
    compromised: false,
    backdoored: false,
    logsCleared: false,
    ephemeral: ephemeral || undefined,
  }
}

// ─── Clue file injection ──────────────────────────────────────────────────────

const CLUE_FILE_NAMES: Partial<Record<NodeType, string>> = {
  home_pc:          'homelab_notes.txt',
  nas_device:       'offsite_backup.conf',
  small_server:     'internal_hosts.conf',
  corporate_server: 'restricted_access.eml',
  database_server:  'replication.conf',
  web_server:       '.env.internal',
  gov_server:       'SIGINT-ROUTING.txt',
}

const CLUE_DIR_PATH: Partial<Record<NodeType, string[]>> = {
  home_pc:          ['home', 'user', 'Documents'],
  nas_device:       ['volume1', 'backups'],
  small_server:     ['root'],
  corporate_server: [],
  database_server:  [],
  web_server:       ['var', 'www', 'html'],
  gov_server:       [],
}

function makeClueContent(sourceType: NodeType, hiddenIp: string): string {
  switch (sourceType) {
    case 'home_pc':
      return `# homelab — do not delete\nstill haven't decommissioned the old machine\nSSH at ${hiddenIp} — creds are in .ssh/ somewhere\nrunning headless in the basement`
    case 'nas_device':
      return `# Offsite backup target\nREMOTE_HOST=${hiddenIp}\nREMOTE_PATH=/archive/\nUSER=backup_bot\n# Key auth only — no password`
    case 'small_server':
      return `# Internal network map — NOT in DNS, do not commit\n${hiddenIp}  dev-internal  # isolated, firewall exception applied`
    case 'corporate_server':
      return `FROM: infosec@corp.internal\nTO: tech-ops@corp.internal\nSUBJ: Restricted node isolation\n\nDev cluster at ${hiddenIp} has been air-gapped per compliance.\nAccess restricted to TECH-OPS only. Not in the public zone.\n\n-- Infosec`
    case 'database_server':
      return `# Secondary replication — hot standby\nREPLICA_HOST=${hiddenIp}\nREPLICA_PORT=3306\nREPLICA_USER=repl_svc\n# Credentials in /etc/mysql/repl.key`
    case 'web_server':
      return `# INTERNAL — NOT FOR PUBLIC REPO\nINTERNAL_API_BASE=http://${hiddenIp}:8080\nINTERNAL_TOKEN=a7f3c19d...\n# This endpoint is not behind the WAF`
    case 'gov_server':
      return `CLASSIFICATION: EYES ONLY\n${'─'.repeat(40)}\nOPERATIONAL RELAY: ${hiddenIp}\nDo not enumerate via standard channels.\nContact TECH-OPS for access credentials.\nNOT logged in SIEM.`
    default:
      return `# internal\nHOST=${hiddenIp}`
  }
}

function findDir(root: FSDir, path: string[]): FSDir | null {
  if (path.length === 0) return root
  const next = root.children.find((c): c is FSDir => c.type === 'dir' && c.name === path[0])
  if (!next) return null
  return findDir(next, path.slice(1))
}

function injectClueFile(node: GameNode, hiddenIp: string, hiddenId: string): void {
  const name = CLUE_FILE_NAMES[node.type]
  if (!name) return
  const dirPath = CLUE_DIR_PATH[node.type] ?? []
  const target = findDir(node.filesystem, dirPath) ?? node.filesystem
  const clueFile: FSFile = {
    type: 'file',
    name,
    content: makeClueContent(node.type, hiddenIp),
    discoveryNodeId: hiddenId,
  }
  target.children.push(clueFile)
}

// ─── World generation ─────────────────────────────────────────────────────────

const TIER1_TEMPLATES = NODE_TEMPLATES.filter((t) => t.tier === 1)
const TIER2_TEMPLATES = NODE_TEMPLATES.filter((t) => t.tier === 2)
const TIER3_TEMPLATES = NODE_TEMPLATES.filter((t) => t.tier === 3)

// Node types that can carry discovery clues
const CLUE_ELIGIBLE_TYPES: NodeType[] = [
  'home_pc', 'nas_device', 'small_server',
  'corporate_server', 'database_server', 'web_server', 'gov_server',
]

export function generateWorld(seed: string): GameNode[] {
  const rng = seedrandom(seed)
  const nodes: GameNode[] = []

  // Tier 1: ~20 nodes across 2 subnets
  for (let subnet = 0; subnet < 2; subnet++) {
    const subnetStr = generateSubnet(subnet + 1)
    const count = randInt(7, 11, rng)
    for (let i = 0; i < count; i++) {
      const template = pickRandom(TIER1_TEMPLATES, rng)
      const id = `node_${nodes.length}`
      const ip = generateIp(subnetStr, i)
      nodes.push(buildNode(template, id, ip, rng))
    }
  }

  // Tier 2: ~15 nodes across 2 subnets
  for (let subnet = 2; subnet < 4; subnet++) {
    const subnetStr = generateSubnet(subnet + 1)
    const count = randInt(5, 8, rng)
    for (let i = 0; i < count; i++) {
      const template = pickRandom(TIER2_TEMPLATES, rng)
      const id = `node_${nodes.length}`
      const ip = generateIp(subnetStr, i)
      nodes.push(buildNode(template, id, ip, rng))
    }
  }

  // Tier 3: ~8 nodes across 2 subnets
  for (let subnet = 4; subnet < 6; subnet++) {
    const subnetStr = generateSubnet(subnet + 1)
    const count = randInt(3, 5, rng)
    for (let i = 0; i < count; i++) {
      const template = pickRandom(TIER3_TEMPLATES, rng)
      const id = `node_${nodes.length}`
      const ip = generateIp(subnetStr, i)
      nodes.push(buildNode(template, id, ip, rng))
    }
  }

  // ── Ephemeral (hidden) nodes ─────────────────────────────────────────────
  // Select T2+ clue-eligible visible nodes (~35% chance each), generate a
  // corresponding hidden node in subnet 10.0.9.x, inject a clue file into
  // the visible node's filesystem pointing to the hidden one.

  const cluePool = nodes.filter((n) => CLUE_ELIGIBLE_TYPES.includes(n.type))
  const hiddenSubnet = generateSubnet(9)
  let hiddenHostIdx = 0

  for (const visibleNode of cluePool) {
    if (rng() > 0.35) continue // ~35% of eligible nodes carry a clue
    const hiddenId = `node_hidden_${hiddenHostIdx}`
    const hiddenIp = generateIp(hiddenSubnet, hiddenHostIdx)
    hiddenHostIdx++

    // Hidden nodes match the tier of their source
    const templatePool = visibleNode.tier >= 3 ? TIER3_TEMPLATES : TIER2_TEMPLATES
    const template = pickRandom(templatePool, rng)
    const hiddenNode = buildNode(template, hiddenId, hiddenIp, rng, true)

    // Slightly premium income for hidden nodes (reward for exploration)
    hiddenNode.baseIncome = Math.round(hiddenNode.baseIncome * 1.4 * 100) / 100

    nodes.push(hiddenNode)
    injectClueFile(visibleNode, hiddenIp, hiddenId)
  }

  return nodes
}

// ─── Passive income calculation ───────────────────────────────────────────────

export function calcPassiveIncome(
  nodes: GameNode[],
  backdooredIds: string[],
  cpuLevel: number
): number {
  const cpuMult = 1 + cpuLevel * 0.2
  let total = 0
  for (const node of nodes) {
    if (backdooredIds.includes(node.id)) {
      total += node.baseIncome * node.incomeMultiplier * cpuMult
    }
  }
  return Math.round(total * 100) / 100
}
