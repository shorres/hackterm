import type { NodeType, Port, Vulnerability, FSDir } from '../types'

export interface NodeTemplate {
  type: NodeType
  tier: number
  osPool: string[]
  hostnamePatterns: string[]
  portPool: Port[]
  vulnPool: Vulnerability[]
  baseIncomeRange: [number, number]
  incomeMultiplierRange: [number, number]
  heatOnBreachRange: [number, number]
  filesystemFactory: (hostname: string, seed: () => number) => FSDir
}

// ─── Vulnerability Pool ───────────────────────────────────────────────────────

const VULNS = {
  ssh_weak_auth: (): Vulnerability => ({
    id: 'ssh_weak_auth',
    name: 'SSH-WeakAuth',
    description: 'SSH daemon accepts weak/default credentials',
    port: 22,
    service: 'ssh',
    difficulty: 1,
  }),
  http_default_creds: (): Vulnerability => ({
    id: 'http_default_creds',
    name: 'HTTP-DefaultCreds',
    description: 'Web interface running with factory default credentials',
    port: 80,
    service: 'http',
    difficulty: 1,
  }),
  telnet_open: (): Vulnerability => ({
    id: 'telnet_open',
    name: 'TELNET-OpenAccess',
    description: 'Telnet port open with no authentication required',
    port: 23,
    service: 'telnet',
    difficulty: 2,
  }),
  ftp_anonymous: (): Vulnerability => ({
    id: 'ftp_anonymous',
    name: 'FTP-AnonLogin',
    description: 'FTP server permits anonymous login',
    port: 21,
    service: 'ftp',
    difficulty: 2,
  }),
  upnp_overflow: (): Vulnerability => ({
    id: 'upnp_overflow',
    name: 'UPnP-BufferOverflow',
    description: 'UPnP service vulnerable to buffer overflow',
    port: 1900,
    service: 'upnp',
    difficulty: 3,
  }),
  smb_eternalblue: (): Vulnerability => ({
    id: 'smb_eternalblue',
    name: 'SMB-EternalBlue',
    description: 'SMBv1 unpatched — remote code execution via MS17-010',
    port: 445,
    service: 'smb',
    difficulty: 4,
  }),
  rtsp_noauth: (): Vulnerability => ({
    id: 'rtsp_noauth',
    name: 'RTSP-NoAuth',
    description: 'RTSP stream accessible without authentication',
    port: 554,
    service: 'rtsp',
    difficulty: 2,
  }),
  http_sqli: (): Vulnerability => ({
    id: 'http_sqli',
    name: 'HTTP-SQLi',
    description: 'Web application vulnerable to SQL injection',
    port: 80,
    service: 'http',
    difficulty: 5,
  }),
  ssh_key_exposure: (): Vulnerability => ({
    id: 'ssh_key_exposure',
    name: 'SSH-KeyExposure',
    description: 'Private SSH key stored in world-readable web directory',
    port: 22,
    service: 'ssh',
    difficulty: 3,
  }),
}

// ─── Filesystem Helpers ───────────────────────────────────────────────────────

function makeDir(name: string, children: FSDir['children'] = []): FSDir {
  return { type: 'dir', name, children }
}

function makeFile(name: string, content: string, value?: number) {
  return { type: 'file' as const, name, content, value }
}

const ROUTER_CONFIGS = [
  `# NETGEAR Advanced Settings
admin_pass=admin123
wifi_key=changeme
remote_mgmt=enabled
firmware=v2.1.4-legacy`,
  `# Router Configuration
default_gateway=192.168.0.1
admin=admin
password=password
upnp=true`,
]

const IOT_LOGS = [
  `[2024-11-03 08:12:01] Device booted
[2024-11-03 08:12:03] Connected to network
[2024-11-03 08:12:05] Cloud sync: OK
[2024-11-03 14:30:22] Motion detected
[2024-11-03 14:30:24] Snapshot saved`,
  `[2024-10-28 06:00:00] Scheduled reboot
[2024-10-28 06:00:12] Reconnected
[2024-10-28 18:44:01] Firmware check: no update`,
]

// ─── Templates ────────────────────────────────────────────────────────────────

export const NODE_TEMPLATES: NodeTemplate[] = [
  // ── Tier 1: Home devices ───────────────────────────────────────────────────
  {
    type: 'home_router',
    tier: 1,
    osPool: ['RouterOS 6.x', 'DD-WRT v3.0', 'OpenWRT 21.02', 'Firmware 2.x (vendor)'],
    hostnamePatterns: ['NETGEAR-{HEX4}', 'HomeHub-{N3}', 'ASUS-RT-{HEX4}', 'TP-LINK-{HEX4}'],
    portPool: [
      { number: 80, service: 'http', version: 'mini_httpd 1.19' },
      { number: 22, service: 'ssh', version: 'Dropbear 2019.78' },
      { number: 23, service: 'telnet', version: 'BusyBox telnetd' },
      { number: 1900, service: 'upnp', version: 'MiniUPnP 2.1' },
    ],
    vulnPool: [VULNS.http_default_creds(), VULNS.telnet_open(), VULNS.upnp_overflow()],
    baseIncomeRange: [0.05, 0.15],
    incomeMultiplierRange: [1.0, 1.2],
    heatOnBreachRange: [1, 3],
    filesystemFactory: (_hostname) =>
      makeDir('/', [
        makeDir('etc', [
          makeFile('config.cfg', ROUTER_CONFIGS[Math.floor(Math.random() * ROUTER_CONFIGS.length)]),
          makeFile('passwd', 'root:$1$xyz$fakehash123\nadmin:$1$abc$fakehash456'),
        ]),
        makeDir('var', [
          makeDir('log', [makeFile('syslog', '[boot] System started\n[dhcp] Lease assigned')]),
        ]),
        makeDir('tmp', []),
      ]),
  },

  {
    type: 'iot_camera',
    tier: 1,
    osPool: ['Linux 3.10 (ARM)', 'uClinux 2.6', 'RTOS v4.2'],
    hostnamePatterns: ['CAM-{HEX4}', 'IPCAM-{N3}', 'Hikvision-{HEX4}', 'DLink-CAM-{N3}'],
    portPool: [
      { number: 80, service: 'http', version: 'GoAhead 2.5' },
      { number: 554, service: 'rtsp', version: 'Live555 2019' },
      { number: 23, service: 'telnet', version: 'BusyBox telnetd' },
    ],
    vulnPool: [VULNS.rtsp_noauth(), VULNS.http_default_creds(), VULNS.telnet_open()],
    baseIncomeRange: [0.02, 0.08],
    incomeMultiplierRange: [1.0, 1.1],
    heatOnBreachRange: [1, 2],
    filesystemFactory: (hostname) =>
      makeDir('/', [
        makeDir('mnt', [
          makeDir('data', [
            makeFile('device.cfg', `device_id=${hostname}\nstream_pass=admin\ncloud=enabled`),
          ]),
        ]),
        makeDir('var', [
          makeDir('log', [makeFile('app.log', IOT_LOGS[0])]),
          makeDir('snap', [makeFile('thumb_latest.jpg', '[binary image data]')]),
        ]),
      ]),
  },

  {
    type: 'iot_thermostat',
    tier: 1,
    osPool: ['Linux 4.4 (ARM)', 'FreeRTOS', 'Contiki OS'],
    hostnamePatterns: ['NEST-{HEX4}', 'ECOBEE-{N3}', 'THERM-{HEX4}', 'SmartHeat-{N3}'],
    portPool: [
      { number: 80, service: 'http', version: 'lighttpd 1.4' },
      { number: 22, service: 'ssh', version: 'OpenSSH 7.2' },
    ],
    vulnPool: [VULNS.ssh_weak_auth(), VULNS.http_default_creds()],
    baseIncomeRange: [0.01, 0.05],
    incomeMultiplierRange: [1.0, 1.05],
    heatOnBreachRange: [1, 2],
    filesystemFactory: () =>
      makeDir('/', [
        makeDir('etc', [
          makeFile(
            'thermostat.conf',
            'target_temp=72\nschedule=0700-2200\napi_key=therm_k_8f3a2b1c\nowner_email=homeowner@gmail.com'
          ),
        ]),
        makeDir('log', [makeFile('events.log', IOT_LOGS[1])]),
      ]),
  },

  // ── Tier 2: Small servers / home power users ───────────────────────────────
  {
    type: 'home_pc',
    tier: 2,
    osPool: ['Windows 10 (21H2)', 'Windows 11', 'Ubuntu 22.04', 'Debian 11'],
    hostnamePatterns: [
      'DESKTOP-{HEX6}',
      '{NAME}-PC',
      'WORKSTATION-{N3}',
      'HOME-{HEX4}',
    ],
    portPool: [
      { number: 445, service: 'smb', version: 'SMBv1/2' },
      { number: 22, service: 'ssh', version: 'OpenSSH 8.4' },
      { number: 3389, service: 'rdp', version: 'Microsoft RDP' },
    ],
    vulnPool: [VULNS.smb_eternalblue(), VULNS.ssh_weak_auth()],
    baseIncomeRange: [0.1, 0.4],
    incomeMultiplierRange: [1.1, 1.4],
    heatOnBreachRange: [4, 8],
    filesystemFactory: (hostname) =>
      makeDir('/', [
        makeDir('home', [
          makeDir('user', [
            makeDir('Documents', [
              makeFile(
                'finances_2024.csv',
                'Account,Balance\nChecking,4821.33\nSavings,12450.00',
                250
              ),
              makeFile('notes.txt', 'TODO: change router password\nMeeting Mon 9am\npassword hint: dogs name + birth year'),
            ]),
            makeDir('Downloads', [
              makeFile('crack_v2.exe', '[binary]'),
            ]),
            makeDir('.ssh', [
              makeFile('id_rsa', '-----BEGIN RSA PRIVATE KEY-----\n[REDACTED]\n-----END RSA PRIVATE KEY-----', 500),
            ]),
          ]),
        ]),
        makeDir('etc', [
          makeFile('hosts', `127.0.0.1 localhost\n127.0.1.1 ${hostname}`),
        ]),
      ]),
  },

  {
    type: 'nas_device',
    tier: 2,
    osPool: ['DSM 7.1 (Synology)', 'QTS 5.0 (QNAP)', 'FreeNAS 12', 'TrueNAS Core'],
    hostnamePatterns: ['NAS-{HEX4}', 'SYNOLOGY-{N3}', 'QNAP-{HEX4}', 'STORAGE-{N3}'],
    portPool: [
      { number: 22, service: 'ssh', version: 'OpenSSH 8.0' },
      { number: 21, service: 'ftp', version: 'vsftpd 3.0' },
      { number: 445, service: 'smb', version: 'Samba 4.x' },
      { number: 80, service: 'http', version: 'nginx 1.20' },
    ],
    vulnPool: [VULNS.ftp_anonymous(), VULNS.ssh_key_exposure(), VULNS.ssh_weak_auth()],
    baseIncomeRange: [0.2, 0.6],
    incomeMultiplierRange: [1.2, 1.6],
    heatOnBreachRange: [5, 10],
    filesystemFactory: () =>
      makeDir('/', [
        makeDir('volume1', [
          makeDir('backups', [
            makeFile('wallet_backup.dat', '[encrypted wallet data]', 1200),
            makeFile('db_dump_2024-10.sql', '[mysql dump — 14MB]', 400),
          ]),
          makeDir('media', [makeFile('readme.txt', 'Plex library — do not delete')]),
          makeDir('shared', [
            makeFile(
              'credentials.txt',
              'FTP: admin / Synology2024!\nSMB share: homeuser / qwerty123',
              600
            ),
          ]),
        ]),
      ]),
  },

  {
    type: 'small_server',
    tier: 2,
    osPool: ['Ubuntu Server 20.04', 'CentOS 7', 'Debian 10', 'Windows Server 2016'],
    hostnamePatterns: ['SRV-{HEX4}', 'SERVER-{N3}', 'VPS-{HEX6}', 'PROD-{N3}'],
    portPool: [
      { number: 22, service: 'ssh', version: 'OpenSSH 7.9' },
      { number: 80, service: 'http', version: 'Apache 2.4.46' },
      { number: 443, service: 'https', version: 'Apache 2.4.46' },
      { number: 3306, service: 'mysql', version: 'MySQL 5.7' },
    ],
    vulnPool: [VULNS.http_sqli(), VULNS.ssh_weak_auth()],
    baseIncomeRange: [0.3, 0.8],
    incomeMultiplierRange: [1.3, 1.8],
    heatOnBreachRange: [8, 15],
    filesystemFactory: () =>
      makeDir('/', [
        makeDir('var', [
          makeDir('www', [
            makeDir('html', [
              makeFile('config.php', "<?php\n$db_pass = 'Sup3rS3cr3t!';\n$db_user = 'root';\n$db_host = 'localhost';", 300),
            ]),
          ]),
          makeDir('log', [makeFile('access.log', '192.168.1.1 - - [GET /admin] 200\n10.0.0.5 - - [POST /login] 200')]),
        ]),
        makeDir('root', [
          makeFile('.bash_history', 'sudo su\nmysql -u root -p\ncat /etc/shadow\nscp backup.tar.gz user@remote:/backup', 150),
          makeFile('cron_backup.sh', '#!/bin/bash\n# Daily backup\ntar -czf /tmp/backup.tar.gz /var/www\ncurl -T /tmp/backup.tar.gz ftp://backup-srv/'),
        ]),
      ]),
  },
]

// ─── PC Names for hostname generation ────────────────────────────────────────

export const PC_NAMES = [
  'MIKE', 'SARAH', 'JAMES', 'EMMA', 'ALEX',
  'DAVID', 'LISA', 'MARK', 'ANNA', 'TOM',
  'JAKE', 'OLIVIA', 'RYAN', 'SOFIA', 'BEN',
]
