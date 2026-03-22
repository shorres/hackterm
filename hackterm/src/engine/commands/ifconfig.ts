import type { CommandHandler } from './index'
import { formatMoney } from './index'

export const ifconfigCommand: CommandHandler = {
  name: 'ifconfig',
  aliases: ['ipconfig'],
  description: 'Show your network interface information',
  run: (_args, { print, store }) => {
    const { upgrades, money, seed } = store
    print('eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500', 'data')
    print('        inet 10.0.0.1  netmask 255.255.255.0  broadcast 10.0.0.255', 'data')
    print('        ether de:ad:be:ef:00:01  txqueuelen 1000', 'data')
    print('', 'default')
    print('lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536', 'data')
    print('        inet 127.0.0.1  netmask 255.0.0.0', 'data')
    print('', 'default')
    print('── System Info ──────────────────────────────────', 'info')
    print(`  Hostname    : localhost`, 'default')
    print(`  World Seed  : ${seed}`, 'default')
    print(`  Balance     : ${formatMoney(money)}`, 'success')
    print(`  CPU Level   : ${upgrades.cpu} / 5`, 'default')
    print(`  RAM Level   : ${upgrades.ram} / 5`, 'default')
    print(`  NIC Level   : ${upgrades.nic} / 5`, 'default')
  },
}
