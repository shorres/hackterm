import type { CommandHandler } from './index'
import { getScanRange } from '../../data/upgrades'

export const nmapCommand: CommandHandler = {
  name: 'nmap',
  description: 'Scan a subnet for live hosts',
  run: (args, { print, store }) => {
    if (args.length === 0) {
      print('Usage: nmap <ip/range>  e.g.  nmap 10.0.1.0/24', 'error')
      return
    }

    const target = args[0]
    const nicLevel = store.upgrades.nic
    const scanRange = getScanRange(nicLevel)

    // Determine which subnet(s) the target maps to
    const subnetMatch = target.match(/^10\.0\.(\d+)/)
    if (!subnetMatch) {
      print(`nmap: Cannot reach ${target} — host unreachable`, 'error')
      print(`Tip: Your NIC can reach subnets 10.0.1.x through 10.0.${scanRange}.x`, 'info')
      return
    }

    const requestedSubnet = parseInt(subnetMatch[1])
    if (requestedSubnet < 1 || requestedSubnet > scanRange) {
      print(
        `nmap: Subnet 10.0.${requestedSubnet}.0/24 is out of range (NIC Level: ${nicLevel})`,
        'error'
      )
      print(
        `      Upgrade your NIC to scan further. Current range: subnets 1–${scanRange}`,
        'warning'
      )
      return
    }

    // Find all nodes on this subnet — ephemeral nodes are not nmap-visible
    const subnetPrefix = `10.0.${requestedSubnet}.`
    const subnetNodes = store.nodes.filter((n) => n.ip.startsWith(subnetPrefix) && !n.ephemeral)

    if (subnetNodes.length === 0) {
      print(`nmap: No hosts found on ${target}`, 'warning')
      return
    }

    print(`Starting Nmap scan on ${target} ...`, 'system')
    print(`Nmap scan report for subnet ${subnetPrefix}0/24`, 'info')
    print(`Host is up. Discovered ${subnetNodes.length} host(s).`, 'info')
    print('', 'default')
    print(
      'IP ADDRESS       HOSTNAME                    STATUS   PORTS',
      'data'
    )
    print(
      '─────────────────────────────────────────────────────────────────',
      'info'
    )

    for (const node of subnetNodes) {
      const portStr = node.openPorts
        .map((p) => `${p.number}/${p.service}`)
        .join('  ')
      const ip = node.ip.padEnd(16)
      const hostname = node.hostname.padEnd(27)
      const status = node.compromised ? 'OWNED ' : 'open  '
      print(`${ip}  ${hostname} ${status}  ${portStr}`, 'default')
    }

    print('', 'default')
    print(
      `Nmap done: ${subnetNodes.length} host(s) up`,
      'success'
    )

    // Discover nodes
    store.discoverNodes(subnetNodes.map((n) => n.id))
  },
}
