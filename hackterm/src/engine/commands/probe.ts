import type { CommandHandler } from './index'
import { tierLabel } from './index'

export const probeCommand: CommandHandler = {
  name: 'probe',
  aliases: ['scan'],
  description: 'Deep enumerate a host — services, OS, and vulnerabilities',
  run: (args, { print, store }) => {
    if (args.length === 0) {
      print('Usage: probe <ip>', 'error')
      return
    }

    const ip = args[0]
    const node = store.nodes.find((n) => n.ip === ip)

    if (!node) {
      print(`probe: No route to host ${ip}`, 'error')
      print(`Run 'nmap' first to discover hosts.`, 'info')
      return
    }

    if (!store.knownNodeIds.includes(node.id)) {
      print(`probe: ${ip} unknown — run nmap to discover it first`, 'error')
      return
    }

    print(`Probing ${ip} (${node.hostname}) ...`, 'system')
    print('', 'default')
    print(`┌─[ TARGET ]────────────────────────────────────┐`, 'info')
    print(`│  IP        : ${ip}`, 'default')
    print(`│  Hostname  : ${node.hostname}`, 'default')
    print(`│  MAC       : ${node.mac}`, 'default')
    print(`│  OS        : ${node.os}`, 'default')
    print(`│  Type      : ${node.type.replace(/_/g, ' ').toUpperCase()}`, 'default')
    print(`│  Security  : ${tierLabel(node.tier)}`, node.tier === 1 ? 'success' : node.tier === 2 ? 'warning' : 'error')
    print(`│  Status    : ${node.compromised ? '** COMPROMISED **' : 'secure'}`, node.compromised ? 'warning' : 'default')
    print(`└───────────────────────────────────────────────┘`, 'info')
    print('', 'default')

    print('  OPEN PORTS', 'warning')
    print('  ──────────────────────────────────────────────', 'info')
    for (const port of node.openPorts) {
      print(`  ${String(port.number).padStart(5)}/${port.service.padEnd(8)}  ${port.version}`, 'data')
    }
    print('', 'default')

    print('  VULNERABILITIES DETECTED', 'warning')
    print('  ──────────────────────────────────────────────', 'info')
    if (node.vulnerabilities.length === 0) {
      print('  None detected.', 'success')
    } else {
      for (const vuln of node.vulnerabilities) {
        const diff = '█'.repeat(vuln.difficulty) + '░'.repeat(10 - vuln.difficulty)
        print(`  [${vuln.id}]`, 'error')
        print(`    Name       : ${vuln.name}`, 'default')
        print(`    Service    : ${vuln.service} (port ${vuln.port})`, 'default')
        print(`    Difficulty : ${diff} ${vuln.difficulty}/10`, 'default')
        print(`    Detail     : ${vuln.description}`, 'data')
        print('', 'default')
      }
    }

    if (!node.compromised) {
      print(`  → To exploit: exploit ${ip} -v <vuln_id>`, 'info')
    } else if (!node.backdoored) {
      print(`  → Shell accessible. Run: connect ${ip}`, 'success')
      print(`  → Then install a backdoor: backdoor`, 'info')
    } else {
      print(`  → Backdoor ACTIVE — passive income running`, 'success')
    }
  },
}
