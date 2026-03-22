import type { CommandHandler } from './index'
import { ZERO_DAYS, CREW_BOTS, MAX_CREW_BOTS } from '../../data/marketItems'

export const marketCommand: CommandHandler = {
  name: 'market',
  description: 'Underground market. Subcommands: list, buy <id>, inv, fire <instanceId>',
  run: (args, { print, store }) => {
    const sub = args[0]?.toLowerCase()

    // ── market list ────────────────────────────────────────────────────────────
    if (!sub || sub === 'list') {
      print(``, 'default')
      print(`┌─────────────────────────────────────────────────────────────┐`, 'data')
      print(`  UNDERGROUND MARKET`, 'data')
      print(`└─────────────────────────────────────────────────────────────┘`, 'data')

      print(``, 'default')
      print(`  ── ZERO-DAYS ──────────────────────────────────────────────`, 'info')
      for (const z of ZERO_DAYS) {
        const owned = store.zerodays.some((i) => i.id === z.id)
        const status = owned ? ' [OWNED]' : ''
        print(`  ${z.id.padEnd(20)} $${z.price.toString().padStart(5)}  TIER-${z.tier}${status}`, owned ? 'success' : 'data')
        print(`    ${z.name}`, 'default')
        print(`    ${z.description}`, 'default')
      }

      print(``, 'default')
      print(`  ── CREW BOTS ──────────────────────────────────────────────`, 'info')
      const slotsFree = MAX_CREW_BOTS - store.crewBots.length
      print(`  Crew slots: ${store.crewBots.length}/${MAX_CREW_BOTS}`, 'default')
      for (const b of CREW_BOTS) {
        print(`  ${b.id.padEnd(20)} $${b.price.toString().padStart(6)}  TIER-${b.maxTier} max`, 'data')
        print(`    ${b.name} — ${b.description}`, 'default')
        print(`    efficiency ×${b.efficiency.toFixed(2)}  heat/tick +${b.heatPerTick}  passive +$${b.incomePerSec}/sec`, 'default')
      }
      if (slotsFree === 0) {
        print(``, 'default')
        print(`  [!] Crew is full. Fire a bot with "market fire <instanceId>" to make room.`, 'warning')
      }
      print(``, 'default')
      print(`  Type "market buy <id>" to purchase. "market inv" to see inventory.`, 'info')
      print(``, 'default')
      return
    }

    // ── market inv ────────────────────────────────────────────────────────────
    if (sub === 'inv' || sub === 'inventory') {
      print(``, 'default')
      print(`  ── ZERO-DAY INVENTORY (${store.zerodays.length}) ──────────────────────────────`, 'info')
      if (store.zerodays.length === 0) {
        print(`  [empty]`, 'default')
      } else {
        for (const z of store.zerodays) {
          print(`  ${z.id.padEnd(22)} TIER-${z.tier}  targets: ${z.targetService}`, 'success')
          print(`    ${z.name}`, 'default')
        }
      }

      print(``, 'default')
      print(`  ── ACTIVE CREW (${store.crewBots.length}/${MAX_CREW_BOTS}) ────────────────────────────────────`, 'info')
      if (store.crewBots.length === 0) {
        print(`  [empty]`, 'default')
      } else {
        for (const b of store.crewBots) {
          const lastAgo = b.lastActionAt === 0
            ? 'never'
            : `${Math.floor((Date.now() - b.lastActionAt) / 1000)}s ago`
          print(`  ${b.instanceId.slice(0, 8)}  ${b.name.padEnd(18)} TIER-${b.maxTier} max  last action: ${lastAgo}`, 'data')
        }
        print(``, 'default')
        print(`  Use "market fire <id>" to dismiss a crew member (first 8 chars of instanceId).`, 'info')
      }
      print(``, 'default')
      return
    }

    // ── market buy <id> ───────────────────────────────────────────────────────
    if (sub === 'buy') {
      const id = args[1]
      if (!id) {
        print(`Usage: market buy <item_id>`, 'error')
        return
      }

      // Try zero-day first
      const zdDef = ZERO_DAYS.find((z) => z.id === id)
      if (zdDef) {
        if (store.zerodays.some((z) => z.id === id)) {
          print(`[!] You already own ${zdDef.name}.`, 'warning')
          return
        }
        if (store.money < zdDef.price) {
          print(`[!] Insufficient funds. Need $${zdDef.price}, have $${store.money.toFixed(2)}.`, 'error')
          return
        }
        const ok = store.purchaseZeroDay(id)
        if (ok) {
          print(``, 'default')
          print(`[+] Acquired: ${zdDef.name}`, 'success')
          print(`    Use with: exploit <ip> -z`, 'info')
          print(``, 'default')
        }
        return
      }

      // Try crew bot
      const botDef = CREW_BOTS.find((b) => b.id === id)
      if (botDef) {
        if (store.crewBots.length >= MAX_CREW_BOTS) {
          print(`[!] Crew is full (${MAX_CREW_BOTS}/${MAX_CREW_BOTS}). Fire someone first.`, 'error')
          return
        }
        if (store.money < botDef.price) {
          print(`[!] Insufficient funds. Need $${botDef.price}, have $${store.money.toFixed(2)}.`, 'error')
          return
        }
        const ok = store.purchaseCrewBot(id)
        if (ok) {
          print(``, 'default')
          print(`[+] ${botDef.name} is now on your crew.`, 'success')
          print(`    They will autonomously hit tier-${botDef.maxTier} nodes and route funds to you.`, 'info')
          print(`    Check status with: market inv`, 'info')
          print(``, 'default')
        }
        return
      }

      print(`[!] Unknown item: ${id}. Use "market list" to browse.`, 'error')
      return
    }

    // ── market fire <instanceId prefix> ───────────────────────────────────────
    if (sub === 'fire') {
      const prefix = args[1]
      if (!prefix) {
        print(`Usage: market fire <instanceId>  (first 8 chars shown in "market inv")`, 'error')
        return
      }
      const bot = store.crewBots.find((b) => b.instanceId.startsWith(prefix))
      if (!bot) {
        print(`[!] No crew member matching "${prefix}". Check "market inv".`, 'error')
        return
      }
      store.fireCrewBot(bot.instanceId)
      print(`[-] ${bot.name} dismissed.`, 'warning')
      return
    }

    print(`Unknown subcommand: ${sub}. Try: market list | market buy <id> | market inv | market fire <id>`, 'error')
  },
}
