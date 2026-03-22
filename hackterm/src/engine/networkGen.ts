import seedrandom from 'seedrandom'
import type { GameNode, FSDir, FSNode } from '../types'
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
  rng: seedrandom.PRNG
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
  }
}

// ─── World generation ─────────────────────────────────────────────────────────

const TIER1_TEMPLATES = NODE_TEMPLATES.filter((t) => t.tier === 1)
const TIER2_TEMPLATES = NODE_TEMPLATES.filter((t) => t.tier === 2)

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
