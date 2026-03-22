import { useEffect, useState } from 'react'
import { useGameStore } from '../../store/gameStore'

export function HUD() {
  const money = useGameStore((s) => s.money)
  const heat = useGameStore((s) => s.heat)
  const upgrades = useGameStore((s) => s.upgrades)
  const getPassiveIncome = useGameStore((s) => s.getPassiveIncome)
  const getBackdooredNodes = useGameStore((s) => s.getBackdooredNodes)
  const getMaxBackdoors = useGameStore((s) => s.getMaxBackdoors)
  const activeOp = useGameStore((s) => s.activeOperation)

  const [displayMoney, setDisplayMoney] = useState(money)

  // Smooth money counter
  useEffect(() => {
    const inc = getPassiveIncome() / 20 // 50ms ticks
    if (inc === 0) {
      setDisplayMoney(money)
      return
    }
    const id = setInterval(() => {
      setDisplayMoney((prev) => Math.round((prev + inc) * 100) / 100)
    }, 50)
    return () => clearInterval(id)
  }, [money, getPassiveIncome])

  // Sync when money changes from non-passive sources
  useEffect(() => {
    setDisplayMoney(money)
  }, [money])

  const backdooredCount = getBackdooredNodes().length
  const maxBd = getMaxBackdoors()
  const income = getPassiveIncome()
  
  const safeHeat = Number.isFinite(heat) ? heat : 0
  const heatColor =
    safeHeat < 20 ? 'text-terminal-green' :
    safeHeat < 50 ? 'text-terminal-orange' :
    'text-terminal-red'

  
  const heatBarFill = Math.floor(safeHeat / 5)

  return (
    <div className="bg-terminal-surface border-b border-terminal-border px-4 py-2 flex items-center gap-6 font-mono text-sm shrink-0 flex-wrap">
      {/* Money */}
      <div className="flex items-center gap-2">
        <span className="text-terminal-gray">BAL</span>
        <span className="text-terminal-gold font-bold tabular-nums">
          ${displayMoney.toFixed(2)}
        </span>
        {income > 0 && (
          <span className="text-terminal-green text-xs opacity-75">
            +${income.toFixed(3)}/s
          </span>
        )}
      </div>

      <div className="text-terminal-border">│</div>

      {/* Heat */}
      <div className="flex items-center gap-2">
        <span className="text-terminal-gray">HEAT</span>
        <span className={`font-bold tabular-nums ${heatColor}`}>
          {safeHeat.toFixed(0)}%
        </span>
        <span className="text-xs">
          <span className={heatColor}>{'█'.repeat(heatBarFill)}</span>
          <span className="text-terminal-border">{'░'.repeat(20 - heatBarFill)}</span>
        </span>
      </div>

      <div className="text-terminal-border">│</div>

      {/* Hardware */}
      <div className="flex items-center gap-3 text-xs text-terminal-gray">
        <span>CPU<span className="text-terminal-white ml-1">{upgrades.cpu}</span></span>
        <span>RAM<span className="text-terminal-white ml-1">{upgrades.ram}</span></span>
        <span>NIC<span className="text-terminal-white ml-1">{upgrades.nic}</span></span>
        {upgrades.logWiper > 0 && (
          <span>WIPE<span className="text-terminal-cyan ml-1">{upgrades.logWiper}</span></span>
        )}
      </div>

      <div className="text-terminal-border">│</div>

      {/* Backdoors */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-terminal-gray">SHELLS</span>
        <span className={backdooredCount >= maxBd ? 'text-terminal-orange' : 'text-terminal-white'}>
          {backdooredCount}/{maxBd}
        </span>
      </div>

      {/* Active op indicator */}
      {activeOp && (
        <>
          <div className="text-terminal-border">│</div>
          <div className="flex items-center gap-2 text-xs text-terminal-orange animate-pulse">
            <span>⚡</span>
            <span>{activeOp.label}</span>
          </div>
        </>
      )}
    </div>
  )
}
