import type { CommandHandler } from './index'

const HELP_TEXT = [
  { text: '─────────────────────────────────────────────────', type: 'info' as const },
  { text: '  HACKTERM v0.1 — Available Commands', type: 'system' as const },
  { text: '─────────────────────────────────────────────────', type: 'info' as const },
  { text: '', type: 'default' as const },
  { text: '  RECON', type: 'warning' as const },
  { text: '  ifconfig              Show your system network info', type: 'default' as const },
  { text: '  nmap <ip/range>       Scan for hosts on a subnet', type: 'default' as const },
  { text: '  probe <ip>            Enumerate services and vulns on a host', type: 'default' as const },
  { text: '', type: 'default' as const },
  { text: '  EXPLOITATION', type: 'warning' as const },
  { text: '  exploit <ip> -v <id>  Run exploit against a vulnerability', type: 'default' as const },
  { text: '  connect <ip>          Open shell on a compromised host', type: 'default' as const },
  { text: '  disconnect            Close current shell session', type: 'default' as const },
  { text: '', type: 'default' as const },
  { text: '  POST-EXPLOITATION (inside shell)', type: 'warning' as const },
  { text: '  ls [path]             List directory contents', type: 'default' as const },
  { text: '  cd <path>             Change directory', type: 'default' as const },
  { text: '  cat <file>            Read file contents', type: 'default' as const },
  { text: '  exfiltrate <file>     Exfiltrate a valuable file for $$$', type: 'default' as const },
  { text: '  backdoor              Install persistent backdoor listener', type: 'default' as const },
  { text: '  backdoor analyze      Preview income + slot comparison (costs heat)', type: 'default' as const },
  { text: '  deactivate <ip>       Kill a backdoor listener (costs heat)', type: 'default' as const },
  { text: '  clearlog              Wipe traces from this host', type: 'default' as const },
  { text: '', type: 'default' as const },
  { text: '  SYSTEM', type: 'warning' as const },
  { text: '  status                Show income, heat, backdoors', type: 'default' as const },
  { text: '  upgrade               Open hardware upgrade menu', type: 'default' as const },
  { text: '  clear                 Clear terminal output', type: 'default' as const },
  { text: '  help                  Show this message', type: 'default' as const },
  { text: '', type: 'default' as const },
  { text: '─────────────────────────────────────────────────', type: 'info' as const },
]

export const helpCommand: CommandHandler = {
  name: 'help',
  aliases: ['?', 'man'],
  description: 'Show available commands',
  run: (_args, { print }) => {
    HELP_TEXT.forEach((l) => print(l.text, l.type))
  },
}
