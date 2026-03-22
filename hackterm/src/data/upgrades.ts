export interface UpgradeDef {
  id: string
  label: string
  description: string
  maxLevel: number
  baseCost: number
  costMultiplier: number
  effect: string
}

export const HARDWARE_UPGRADES: Record<string, UpgradeDef> = {
  logWiper: {
    id: 'logWiper',
    label: 'Log Wiper',
    description: 'Advanced trace-removal toolkit — clearlog reduces more heat per use',
    maxLevel: 5,
    baseCost: 350,
    costMultiplier: 2.8,
    effect: '+25% heat removed by clearlog per level',
  },
  cpu: {
    id: 'cpu',
    label: 'CPU',
    description: 'Faster processor speeds up exploit timers and increases passive income multiplier',
    maxLevel: 5,
    baseCost: 500,
    costMultiplier: 3,
    effect: '+30% exploit speed, +20% passive income per level',
  },
  ram: {
    id: 'ram',
    label: 'RAM',
    description: 'More memory allows running more concurrent backdoor listeners',
    maxLevel: 5,
    baseCost: 400,
    costMultiplier: 2.5,
    effect: '+2 max backdoors per level',
  },
  nic: {
    id: 'nic',
    label: 'NIC',
    description: 'Better network interface card increases nmap scan range',
    maxLevel: 5,
    baseCost: 300,
    costMultiplier: 2,
    effect: '+1 subnet scan range per level',
  },
}

export function upgradeCost(def: UpgradeDef, currentLevel: number): number {
  return Math.floor(def.baseCost * Math.pow(def.costMultiplier, currentLevel))
}

// Derived stats from upgrade levels
export function getMaxBackdoors(ramLevel: number): number {
  return 2 + ramLevel * 2
}

export function getIncomeMultiplier(cpuLevel: number): number {
  return 1 + cpuLevel * 0.2
}

export function getExploitSpeedMultiplier(cpuLevel: number): number {
  return 1 + cpuLevel * 0.3
}

export function getScanRange(nicLevel: number): number {
  // Each NIC level adds one extra /24 subnet to scan range
  return 1 + nicLevel
}

export function getClearlogMultiplier(logWiperLevel: number): number {
  return 1 + (logWiperLevel || 0) * 0.25
}
