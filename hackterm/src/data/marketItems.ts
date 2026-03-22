import type { ZeroDayItem } from '../types'

export interface CrewBotDef {
  id: string
  name: string
  description: string
  maxTier: number
  efficiency: number
  heatPerTick: number
  incomePerSec: number  // flat passive income this bot generates per second
  price: number
}

export const ZERO_DAYS: ZeroDayItem[] = [
  {
    id: 'zd_openssh_rce',
    name: 'SSHDaemon Pre-Auth Heap Overflow',
    description: 'Heap corruption in SSH daemon authentication path. Instant shell — no credentials needed.',
    targetService: 'ssh',
    tier: 2,
    price: 2500,
  },
  {
    id: 'zd_log4shell',
    name: 'JavaLog JNDI Injection',
    description: 'JNDI lookup injection via logging framework. Triggers on any HTTP server with a Java backend.',
    targetService: 'http',
    tier: 2,
    price: 3000,
  },
  {
    id: 'zd_smbghost',
    name: 'SMBv3 Compression RCE',
    description: 'Unauthenticated remote code execution via malformed SMBv3 compression header. No credentials required.',
    targetService: 'smb',
    tier: 3,
    price: 5500,
  },
  {
    id: 'zd_bluekeep',
    name: 'RDP Pre-Auth Memory Corruption',
    description: 'Pre-authentication RCE against unpatched Remote Desktop services. Self-propagating in LAN environments.',
    targetService: 'rdp',
    tier: 3,
    price: 4500,
  },
  {
    id: 'zd_mysql_udf',
    name: 'DB Engine UDF Escalation',
    description: 'Root shell via malicious user-defined function loaded into a misconfigured database process.',
    targetService: 'mysql',
    tier: 2,
    price: 2000,
  },
  {
    id: 'zd_rtsp_overflow',
    name: 'RTSP Daemon Stack Overflow',
    description: 'Pre-auth stack smash in RTSP streaming daemons. Reliable against IoT camera firmware.',
    targetService: 'rtsp',
    tier: 1,
    price: 800,
  },
]

export const CREW_BOTS: CrewBotDef[] = [
  {
    id: 'bot_skiddie',
    name: 'Script Kiddie',
    description: 'Runs canned tier-1 exploits from a GitHub repo. Sloppy, cheap, gets the job done.',
    maxTier: 1,
    efficiency: 0.50,
    heatPerTick: 0.4,
    incomePerSec: 0.08,
    price: 750,
  },
  {
    id: 'bot_hired_hand',
    name: 'Hired Hand',
    description: 'Freelance operator. Handles tier-1 and tier-2 reliably. Asks no questions.',
    maxTier: 2,
    efficiency: 0.65,
    heatPerTick: 0.6,
    incomePerSec: 0.25,
    price: 3500,
  },
  {
    id: 'bot_operator',
    name: 'Operator',
    description: 'Professional. Works up to tier-3. Minimal traces. You never meet them.',
    maxTier: 3,
    efficiency: 0.75,
    heatPerTick: 0.2,
    incomePerSec: 0.60,
    price: 12000,
  },
]

export const MAX_CREW_BOTS = 5
