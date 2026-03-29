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
  rdp_bluekeep: (): Vulnerability => ({
    id: 'rdp_bluekeep',
    name: 'RDP-BlueKeep',
    description: 'Unpatched Windows RDP — pre-auth remote code execution',
    port: 3389,
    service: 'rdp',
    difficulty: 6,
  }),
  mysql_weak_auth: (): Vulnerability => ({
    id: 'mysql_weak_auth',
    name: 'MySQL-WeakAuth',
    description: 'MySQL running with default or empty root password',
    port: 3306,
    service: 'mysql',
    difficulty: 4,
  }),
  ldap_anonymous: (): Vulnerability => ({
    id: 'ldap_anonymous',
    name: 'LDAP-AnonBind',
    description: 'LDAP directory permits anonymous bind — exposes user/group data',
    port: 389,
    service: 'ldap',
    difficulty: 5,
  }),
  https_tls_vuln: (): Vulnerability => ({
    id: 'https_tls_vuln',
    name: 'TLS-POODLE',
    description: 'Server falls back to SSL 3.0 — padding oracle attack possible',
    port: 443,
    service: 'https',
    difficulty: 7,
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
    filesystemFactory: () =>
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

// ─── Lore content pools ───────────────────────────────────────────────────────

const CORP_NAMES = [
  'Vantage Capital', 'Helix Dynamics', 'Orion Analytics', 'Stratum Networks',
  'Prometheus Solutions', 'Apex Data Services', 'Vector Capital', 'Nexion Systems',
  'Caldwell & Associates', 'Meridian Financial',
]

const EMPLOYEE_NAMES = [
  ['j.morrison', 'Sarah Morrison'], ['r.chen', 'Raymond Chen'],
  ['k.walsh', 'Karen Walsh'], ['d.okafor', 'David Okafor'],
  ['m.petrov', 'Mikhail Petrov'], ['a.santos', 'Ana Santos'],
  ['t.blackwood', 'Thomas Blackwood'], ['l.nakamura', 'Lisa Nakamura'],
]

const CORP_EMAILS = (corp: string, seed: () => number) => {
  const domain = corp.toLowerCase().replace(/[^a-z]/g, '') + '.com'
  const emp1 = EMPLOYEE_NAMES[Math.floor(seed() * EMPLOYEE_NAMES.length)]
  const emp2 = EMPLOYEE_NAMES[Math.floor(seed() * EMPLOYEE_NAMES.length)]
  return [
    {
      name: `inbox_${emp1[0]}.mbox`,
      content: `FROM: ${emp2[0]}@${domain}\nTO: ${emp1[0]}@${domain}\nDATE: 2025-01-14 09:47:22\nSUBJ: RE: Q4 projections\n\n${emp1[1]},\n\nNumbers look solid. Keep the Singapore transfer off the main ledger until audit clears.\nCRONUS project stays dark until board approval.\n\nDon't reply to this from your work address.\n\n-- ${emp2[1].split(' ')[0]}`,
      value: 400,
    },
    {
      name: `sent_${emp2[0]}.mbox`,
      content: `FROM: ${emp2[0]}@${domain}\nTO: legal@${domain}\nDATE: 2025-01-09 16:02:10\nSUBJ: Document destruction\n\nPer our call — the 2023 compliance files need to be handled before the 15th.\nYou know which ones. The index is on the shared drive under /archive/legacy.\n\n-- ${emp2[1]}`,
      value: 600,
    },
  ]
}

const FINANCIAL_RECORDS = (seed: () => number) => {
  const baseAmt = Math.floor(seed() * 900000 + 100000)
  return `INTERNAL TRANSFER LOG — RESTRICTED\n${'─'.repeat(60)}\nDate         Account          Amount        Status\n2025-01-03   ACC-${Math.floor(seed()*9000+1000)}-X    $${(baseAmt).toLocaleString()}    CLEARED\n2025-01-07   ACC-${Math.floor(seed()*9000+1000)}-K    $${Math.floor(seed()*50000+5000).toLocaleString()}      PENDING\n2025-01-11   ACC-${Math.floor(seed()*9000+1000)}-X    $${(baseAmt * 2.7).toLocaleString()}  CLEARED\n2025-01-14   ACC-${Math.floor(seed()*9000+1000)}-M    $${Math.floor(seed()*200000+80000).toLocaleString()}   FLAGGED`
}

const CHAT_LOGS = [
  `[10:14] sysadmin: anyone else seeing weird auth attempts on the backup server?\n[10:15] dev_lead: yeah, IT flagged it this morning\n[10:15] dev_lead: marking it as scanner noise for now\n[10:16] sysadmin: ok. last thing we need is a security audit right now\n[10:16] dev_lead: agreed. leave it`,
  `[14:32] cto: heads up — external pentest is scheduled for Q2\n[14:33] eng_mgr: do we need to pull anything offline beforehand?\n[14:33] cto: yes. you know which systems. same as last time\n[14:34] eng_mgr: understood\n[14:34] cto: and make sure the KRONOS configs are off the main cluster`,
  `[09:01] hr_dir: the package for the Morrison situation — is it handled?\n[09:02] legal: signed and sealed. NDA effective immediately\n[09:03] hr_dir: good. wipe his AD account after COB\n[09:03] legal: already done`,
]

const GOV_DOCS = [
  `CLASSIFICATION: SENSITIVE // NOT FOR PUBLIC RELEASE\nREF: OPS-2025-0047\nSUBJECT: Operational Network Segmentation Review\n\nPer directive 3.1.7, all SIGINT-adjacent subnets must be air-gapped\nby end of fiscal Q2. Interim: enforce mandatory log rotation and\nflash all non-essential storage on a 72-hour cycle.\n\nDo not route through commercial ISP backbone.\nContact: TECH-OPS internal only.`,
  `CLASSIFICATION: FOUO\nMEMO: Infrastructure Audit — Follow-up Required\n\nAnomalous outbound traffic detected on node cluster 10.44.x.x.\nSource traced to legacy backup process — flagged for review.\nAll personnel: avoid discussing audit findings on unclassified channels.\n\nAcknowledge receipt.`,
]

const CREDENTIAL_DUMPS = (seed: () => number) => {
  const users = ['admin', 'svc_backup', 'svc_deploy', 'db_user', 'ops_account']
  const hashes = () => Array.from({length: 32}, () => Math.floor(seed() * 16).toString(16)).join('')
  return users.map(u => `${u}:$2b$12$${hashes()}`).join('\n')
}

// ─── Tier 3: Corporate & government infrastructure ────────────────────────────

NODE_TEMPLATES.push(
  {
    type: 'corporate_server',
    tier: 3,
    osPool: ['Windows Server 2022', 'Red Hat Enterprise 8', 'Ubuntu Server 22.04 LTS', 'SUSE Linux Enterprise 15'],
    hostnamePatterns: [
      'CORP-SRV-{HEX6}', 'PROD-APP-{N3}', 'ENT-{HEX4}', 'INFRA-{N3}',
    ],
    portPool: [
      { number: 22, service: 'ssh', version: 'OpenSSH 8.9' },
      { number: 443, service: 'https', version: 'nginx 1.24 (corp)' },
      { number: 389, service: 'ldap', version: 'OpenLDAP 2.6' },
      { number: 445, service: 'smb', version: 'Samba 4.17' },
      { number: 3389, service: 'rdp', version: 'Microsoft RDP 10' },
    ],
    vulnPool: [VULNS.ldap_anonymous(), VULNS.rdp_bluekeep(), VULNS.ssh_key_exposure(), VULNS.smb_eternalblue()],
    baseIncomeRange: [1.0, 2.5],
    incomeMultiplierRange: [1.5, 2.5],
    heatOnBreachRange: [15, 25],
    filesystemFactory: (hostname, seed) => {
      const corp = CORP_NAMES[Math.floor(seed() * CORP_NAMES.length)]
      const emails = CORP_EMAILS(corp, seed)
      const chatIdx = Math.floor(seed() * CHAT_LOGS.length)
      return makeDir('/', [
        makeDir('home', [
          makeDir('admin', [
            makeDir('mail', emails.map(e => makeFile(e.name, e.content, e.value))),
            makeFile('.bash_history', `ssh root@10.44.2.1\nmysql -u root -pS3cret!\nscp -r /opt/kronos/ backup@192.168.100.5:/archive\ntail -f /var/log/auth.log\nexit`, 200),
          ]),
        ]),
        makeDir('var', [
          makeDir('log', [
            makeFile('auth.log', `Jan 14 03:22:11 ${hostname} sshd[1842]: Accepted publickey for admin from 10.0.0.4\nJan 14 03:22:44 ${hostname} sshd[1842]: pam_unix: session opened for user admin\nJan 14 03:31:02 ${hostname} sshd[1843]: Invalid user scanner from 45.33.32.156`),
            makeFile('app.log', CHAT_LOGS[chatIdx]),
          ]),
        ]),
        makeDir('opt', [
          makeDir('data', [
            makeFile('financial_report_Q4.csv', FINANCIAL_RECORDS(seed), 1800),
            makeFile('employee_directory.ldif', `dn: uid=admin,ou=users,dc=${corp.toLowerCase().replace(/[^a-z]/g,'')},dc=com\nuid: admin\ncn: System Administrator\nuserPassword: {SSHA}obfuscated_hash_here`, 500),
          ]),
        ]),
      ])
    },
  },
  {
    type: 'database_server',
    tier: 3,
    osPool: ['Ubuntu Server 20.04 LTS', 'CentOS Stream 9', 'Oracle Linux 8', 'Debian 12'],
    hostnamePatterns: ['DB-{HEX6}', 'SQLSRV-{N3}', 'DATASTORE-{HEX4}', 'MYSQL-{N3}'],
    portPool: [
      { number: 3306, service: 'mysql', version: 'MySQL 8.0' },
      { number: 5432, service: 'postgresql', version: 'PostgreSQL 15' },
      { number: 22, service: 'ssh', version: 'OpenSSH 8.4' },
      { number: 6379, service: 'redis', version: 'Redis 7.0' },
    ],
    vulnPool: [VULNS.mysql_weak_auth(), VULNS.ssh_weak_auth(), VULNS.ssh_key_exposure()],
    baseIncomeRange: [1.5, 3.5],
    incomeMultiplierRange: [2.0, 3.0],
    heatOnBreachRange: [20, 35],
    filesystemFactory: (hostname, seed) => {
      const corp = CORP_NAMES[Math.floor(seed() * CORP_NAMES.length)]
      return makeDir('/', [
        makeDir('var', [
          makeDir('lib', [
            makeDir('mysql', [
              makeFile('ibdata1', '[InnoDB tablespace — binary]'),
            ]),
          ]),
          makeDir('backups', [
            makeFile(`${corp.toLowerCase().replace(/[^a-z]/g,'')}_prod_dump.sql`,
              `-- MySQL dump 10.13  Distrib 8.0.32\n-- Host: ${hostname}\n-- Database: prod_customers\n\nINSERT INTO users VALUES ('admin','$2b$12$fakehashXXXXXXXXX','superadmin@${corp.toLowerCase().replace(/[^a-z]/g,'')}.com',1);\nINSERT INTO financial_txn VALUES (8847,'ACC-8847-X',450000.00,'2025-01-03','CLEARED');\nINSERT INTO financial_txn VALUES (8848,'ACC-2291-K',12500.00,'2025-01-07','PENDING');`,
              3500),
          ]),
        ]),
        makeDir('root', [
          makeFile('shadow.bak', CREDENTIAL_DUMPS(seed), 2000),
          makeFile('.mysql_history', 'SELECT * FROM users WHERE is_admin=1;\nDROP TABLE IF EXISTS audit_log;\nSHOW DATABASES;\nUSE prod_customers;'),
        ]),
        makeDir('etc', [
          makeFile('mysql', `[mysqld]\nbind-address = 0.0.0.0\nmax_connections = 500\n# TODO: restrict this before prod review`),
        ]),
      ])
    },
  },
  {
    type: 'web_server',
    tier: 3,
    osPool: ['Ubuntu Server 22.04', 'Debian 12', 'Amazon Linux 2023', 'Rocky Linux 9'],
    hostnamePatterns: ['WEB-{HEX6}', 'NGINX-{N3}', 'FRONT-{HEX4}', 'API-{N3}'],
    portPool: [
      { number: 80, service: 'http', version: 'nginx 1.24' },
      { number: 443, service: 'https', version: 'nginx 1.24 + TLS 1.2' },
      { number: 22, service: 'ssh', version: 'OpenSSH 9.0' },
      { number: 8080, service: 'http-alt', version: 'Tomcat 10.1' },
    ],
    vulnPool: [VULNS.http_sqli(), VULNS.https_tls_vuln(), VULNS.ssh_weak_auth()],
    baseIncomeRange: [0.8, 2.0],
    incomeMultiplierRange: [1.4, 2.2],
    heatOnBreachRange: [12, 22],
    filesystemFactory: (_hostname, seed) => {
      const corp = CORP_NAMES[Math.floor(seed() * CORP_NAMES.length)]
      const domain = corp.toLowerCase().replace(/[^a-z]/g, '') + '.com'
      return makeDir('/', [
        makeDir('var', [
          makeDir('www', [
            makeDir('html', [
              makeFile('.env', `APP_ENV=production\nDB_PASSWORD=Pr0d_S3cr3t_2025!\nDB_HOST=10.44.2.15\nAWS_KEY=AKIA${Array.from({length:16}, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(seed()*36)]).join('')}\nAWS_SECRET=${Array.from({length:40}, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/'[Math.floor(seed()*64)]).join('')}`, 2500),
              makeFile('config.php', `<?php\ndefine('DB_PASS', 'Pr0d_S3cr3t_2025!');\ndefine('DB_USER', 'webapp');\ndefine('ADMIN_KEY', '${Array.from({length:32}, () => Math.floor(seed()*16).toString(16)).join('')}');`, 800),
            ]),
          ]),
          makeDir('log', [
            makeFile('nginx_access.log', `10.0.0.1 - - [14/Jan/2025:03:22:11] "GET /admin/panel HTTP/1.1" 200\n192.168.1.1 - - [14/Jan/2025:03:31:04] "POST /login HTTP/1.1" 302\n45.33.32.156 - - [14/Jan/2025:04:01:22] "GET /../../../etc/passwd HTTP/1.1" 403\n45.33.32.156 - - [14/Jan/2025:04:01:23] "GET /wp-admin/ HTTP/1.1" 404`),
            makeFile('nginx_error.log', `2025/01/14 03:22:11 [warn] 1842#0: *1 upstream sent invalid header while reading response\n2025/01/14 04:01:22 [error] 1843#0: directory index forbidden: /var/www/html/backup/`),
          ]),
        ]),
        makeDir('home', [
          makeDir('deploy', [
            makeFile('deploy.key', `-----BEGIN EC PRIVATE KEY-----\n[REDACTED — rotated 2024-11-01]\n-----END EC PRIVATE KEY-----\n# NOTE: old key kept here for legacy service compat`, 1200),
            makeFile('creds.txt', `${domain} admin portal: admin / W3b@dm1n2025\nSSH jump box: deploy / d3pl0yS3cr3t!\nAWS console: see .env`, 1500),
          ]),
        ]),
      ])
    },
  },
  {
    type: 'gov_server',
    tier: 3,
    osPool: ['RHEL 9 (FIPS mode)', 'Debian 12 (hardened)', 'SELinux enforcing', 'Ubuntu 22.04 CIS-L2'],
    hostnamePatterns: [
      'SIGINT-NODE-{HEX6}', 'FEDOPS-{N3}', 'CLASSIFIED-{HEX4}', 'GOV-SRV-{N3}',
    ],
    portPool: [
      { number: 22, service: 'ssh', version: 'OpenSSH 9.0 (FIPS)' },
      { number: 443, service: 'https', version: 'Apache 2.4 (hardened)' },
      { number: 389, service: 'ldap', version: 'Active Directory LDAP' },
    ],
    vulnPool: [VULNS.ldap_anonymous(), VULNS.ssh_key_exposure(), VULNS.https_tls_vuln()],
    baseIncomeRange: [3.0, 6.0],
    incomeMultiplierRange: [2.5, 4.0],
    heatOnBreachRange: [35, 50],
    filesystemFactory: (_hostname, seed) => {
      const docIdx = Math.floor(seed() * GOV_DOCS.length)
      const chatIdx = Math.floor(seed() * CHAT_LOGS.length)
      return makeDir('/', [
        makeDir('classified', [
          makeDir('ops', [
            makeFile('OPS-2025-0047.txt', GOV_DOCS[docIdx], 5000),
            makeFile('KRONOS_manifest.txt', `PROJECT: KRONOS\nSTATUS: ACTIVE — PHASE 2\nCLASSIFICATION: TS//SCI\n\nNodes: [REDACTED]\nOperators: [REDACTED]\nNext review: 2025-Q2\n\nDo not log. Do not print. Do not discuss on unclassified nets.`, 8000),
          ]),
          makeDir('personnel', [
            makeFile('active_roster.csv', `ID,CALLSIGN,CLEARANCE,LAST_ACCESS\nOP-001,[REDACTED],TS-SCI,2025-01-14\nOP-002,[REDACTED],TS-SCI,2025-01-13\nOP-009,[REDACTED],SECRET,2025-01-10`, 3000),
          ]),
        ]),
        makeDir('var', [
          makeDir('log', [
            makeFile('auth.log', `Jan 14 01:14:00 SIGINT-NODE sshd: Accepted key for ops-user from 10.44.0.1\nJan 14 01:14:44 SIGINT-NODE su: session opened for root\nJan 14 02:01:09 SIGINT-NODE sshd: UNUSUAL: login from non-whitelisted IP 203.0.113.42`),
            makeFile('irc_ops.log', CHAT_LOGS[chatIdx]),
          ]),
        ]),
        makeDir('home', [
          makeDir('ops-user', [
            makeFile('.bash_history', `gpg --decrypt KRONOS_manifest.enc\nscp classified/ops/* archive@10.44.99.1:/cold_storage\nshred -uz /tmp/session*\nexit`, 1000),
          ]),
        ]),
      ])
    },
  },
)

// ─── PC Names for hostname generation ────────────────────────────────────────

export const PC_NAMES = [
  'MIKE', 'SARAH', 'JAMES', 'EMMA', 'ALEX',
  'DAVID', 'LISA', 'MARK', 'ANNA', 'TOM',
  'JAKE', 'OLIVIA', 'RYAN', 'SOFIA', 'BEN',
]
