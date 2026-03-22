import type { CommandHandler } from './index'

export const connectCommand: CommandHandler = {
  name: 'connect',
  aliases: ['ssh'],
  description: 'Open a shell on a compromised host',
  run: (args, { print, store }) => {
    if (args.length === 0) {
      print('Usage: connect <ip>  (or: ssh <ip>)', 'error')
      return
    }

    const ip = args[0]
    const node = store.nodes.find((n) => n.ip === ip)

    if (!node) {
      print(`ssh: connect to host ${ip} port 22: No route to host`, 'error')
      return
    }

    if (!store.knownNodeIds.includes(node.id)) {
      print(`ssh: ${ip} not in known hosts — run nmap to discover it`, 'error')
      return
    }

    if (!node.compromised) {
      print(`ssh: Connection refused — ${ip} not yet compromised`, 'error')
      print(`     Run 'probe ${ip}' to find vulnerabilities, then 'exploit'`, 'info')
      return
    }

    if (store.currentNodeId === node.id) {
      print(`Already connected to ${node.hostname} (${ip})`, 'warning')
      return
    }

    if (store.currentNodeId) {
      // Auto-disconnect from current
      const current = store.getCurrentNode()
      if (current) {
        print(`Closing session on ${current.hostname} ...`, 'info')
      }
    }

    store.setCurrentNode(node.id)
    store.dirtyNodeLogs(node.id)
    print(``, 'default')
    print(`SSH connection established to ${node.hostname} (${ip})`, 'success')
    print(`Last login: Mon Nov  4 03:14:22 2024 from 10.0.0.1`, 'data')
    print(`${node.os} — unauthorized access is a federal offense.`, 'data')
    print(``, 'default')
    print(`Type 'ls' to explore the filesystem, 'backdoor' to install a listener,`, 'info')
    print(`or 'disconnect' to close the session.`, 'info')
  },
}
