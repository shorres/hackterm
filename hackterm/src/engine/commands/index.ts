import type { OutputType, GameNode, FSNode, FSDir } from '../../types'
import { useGameStore } from '../../store/gameStore'

// ─── Command Context ──────────────────────────────────────────────────────────

export interface CommandContext {
  print: (text: string, type?: OutputType) => void
  store: ReturnType<typeof useGameStore.getState>
}

export interface CommandHandler {
  name: string
  aliases?: string[]
  description: string
  run: (args: string[], ctx: CommandContext) => void | Promise<void>
}

// ─── Imports ──────────────────────────────────────────────────────────────────

import { helpCommand } from './help'
import { ifconfigCommand } from './ifconfig'
import { nmapCommand } from './nmap'
import { probeCommand } from './probe'
import { exploitCommand } from './exploit'
import { connectCommand } from './connect'
import { disconnectCommand } from './disconnect'
import { lsCommand } from './ls'
import { cdCommand } from './cd'
import { catCommand } from './cat'
import { exfiltrateCommand } from './exfiltrate'
import { backdoorCommand } from './backdoor'
import { clearlogCommand } from './clearlog'
import { statusCommand } from './status'
import { upgradeCommand } from './upgrade'
import { clearCommand } from './clear'
import { deactivateCommand } from './deactivate'
import { retireCommand } from './retire'
import { debugCommand } from './debug'

// ─── Registry ─────────────────────────────────────────────────────────────────

const ALL_COMMANDS: CommandHandler[] = [
  helpCommand,
  ifconfigCommand,
  nmapCommand,
  probeCommand,
  exploitCommand,
  connectCommand,
  disconnectCommand,
  lsCommand,
  cdCommand,
  catCommand,
  exfiltrateCommand,
  backdoorCommand,
  deactivateCommand,
  retireCommand,
  debugCommand,
  clearlogCommand,
  statusCommand,
  upgradeCommand,
  clearCommand,
]

const COMMAND_MAP = new Map<string, CommandHandler>()
for (const cmd of ALL_COMMANDS) {
  COMMAND_MAP.set(cmd.name, cmd)
  for (const alias of cmd.aliases ?? []) {
    COMMAND_MAP.set(alias, cmd)
  }
}

// ─── Parser ───────────────────────────────────────────────────────────────────

export function parseAndRun(input: string): void {
  const trimmed = input.trim()
  if (!trimmed) return

  const store = useGameStore.getState()
  const { print } = store

  const parts = trimmed.split(/\s+/)
  const name = parts[0].toLowerCase()
  const args = parts.slice(1)

  const ctx: CommandContext = { print, store }

  // Echo the command to terminal
  const node = store.getCurrentNode()
  const promptLabel = node
    ? `${node.hostname}:${store.currentPath}`
    : 'localhost:~'
  print(`[${promptLabel}]$ ${trimmed}`, 'prompt')

  const handler = COMMAND_MAP.get(name)
  if (!handler) {
    print(`bash: ${name}: command not found`, 'error')
    print(`Type 'help' for available commands.`, 'info')
    return
  }

  handler.run(args, ctx)
}

// ─── Helpers shared across commands ──────────────────────────────────────────

export function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`
}

export function formatHeat(n: number): string {
  if (n < 20) return `${n.toFixed(0)}% [COLD]`
  if (n < 50) return `${n.toFixed(0)}% [WARM]`
  if (n < 75) return `${n.toFixed(0)}% [HOT]`
  return `${n.toFixed(0)}% [CRITICAL]`
}

export function tierLabel(tier: number): string {
  switch (tier) {
    case 1: return 'TIER-1 [LOW]'
    case 2: return 'TIER-2 [MED]'
    case 3: return 'TIER-3 [HIGH]'
    default: return `TIER-${tier}`
  }
}

export function resolvePath(current: string, target: string): string {
  if (target.startsWith('/')) return normalizePath(target)
  return normalizePath(`${current}/${target}`)
}

function normalizePath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  const resolved: string[] = []
  for (const part of parts) {
    if (part === '..') resolved.pop()
    else if (part !== '.') resolved.push(part)
  }
  return '/' + resolved.join('/')
}

export function getNodeAtPath(
  node: GameNode,
  path: string
): FSNode | null {
  const parts = path.split('/').filter(Boolean)
  let current: FSNode = node.filesystem
  for (const part of parts) {
    if (current.type !== 'dir') return null
    const dir = current as FSDir
    const child = dir.children.find((c) => c.name === part)
    if (!child) return null
    current = child
  }
  return current
}
