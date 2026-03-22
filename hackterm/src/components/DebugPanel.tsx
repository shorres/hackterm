import { useGameStore } from '../store/gameStore'
import { usePrestigeStore } from '../store/prestigeStore'

export function DebugPanel() {
  const debugOpen = useGameStore((s) => s.debugOpen)
  const toggleDebug = useGameStore((s) => s.toggleDebug)
  const addHeat = useGameStore((s) => s.addHeat)
  const reduceHeat = useGameStore((s) => s.reduceHeat)
  const addMoney = useGameStore((s) => s.addMoney)
  const triggerEnding = useGameStore((s) => s.triggerEnding)
  const heat = useGameStore((s) => s.heat)
  const money = useGameStore((s) => s.money)
  const legendUnlocked = useGameStore((s) => s.legendUnlocked)

  if (!debugOpen) return null

  const setHeat = (target: number) => {
    const diff = target - heat
    if (diff > 0) addHeat(diff)
    else reduceHeat(-diff)
  }

  const hardReset = () => {
    if (!confirm('Wipe ALL save data including prestige meta? This cannot be undone.')) return
    localStorage.removeItem('hackterm-save')
    localStorage.removeItem('hackterm-prestige')
    window.location.reload()
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-terminal-surface border border-terminal-orange text-terminal-white font-mono text-xs p-4 w-72 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-terminal-orange tracking-widest">[ DEBUG PANEL ]</span>
        <button onClick={toggleDebug} className="text-terminal-gray hover:text-terminal-white">✕</button>
      </div>

      <div className="text-terminal-gray">
        Heat: <span className="text-terminal-orange">{heat.toFixed(1)}%</span>
        &nbsp;|&nbsp;
        Money: <span className="text-terminal-gold">${money.toFixed(0)}</span>
        &nbsp;|&nbsp;
        Legend: <span className={legendUnlocked ? 'text-terminal-gold' : 'text-terminal-gray'}>{legendUnlocked ? 'YES' : 'no'}</span>
      </div>

      <div className="space-y-1">
        <div className="text-terminal-gray tracking-widest text-[10px] mb-1">HEAT</div>
        <div className="flex gap-1 flex-wrap">
          {[0, 50, 75, 90, 100].map((v) => (
            <button
              key={v}
              onClick={() => setHeat(v)}
              className="px-2 py-1 border border-terminal-border hover:border-terminal-orange hover:text-terminal-orange transition-colors"
            >
              {v}%
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-terminal-gray tracking-widest text-[10px] mb-1">MONEY</div>
        <div className="flex gap-1 flex-wrap">
          {[1000, 10000, 25001].map((v) => (
            <button
              key={v}
              onClick={() => addMoney(v)}
              className="px-2 py-1 border border-terminal-border hover:border-terminal-gold hover:text-terminal-gold transition-colors"
            >
              +${v.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-terminal-gray tracking-widest text-[10px] mb-1">FORCE ENDING</div>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => triggerEnding('fbi')}
            className="px-2 py-1 border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-terminal-bg transition-colors"
          >
            FBI
          </button>
          <button
            onClick={() => {
              useGameStore.setState({ legendUnlocked: true })
              triggerEnding('legend')
            }}
            className="px-2 py-1 border border-terminal-gold text-terminal-gold hover:bg-terminal-gold hover:text-terminal-bg transition-colors"
          >
            LEGEND
          </button>
          <button
            onClick={() => triggerEnding('counter_hacked')}
            className="px-2 py-1 border border-terminal-orange text-terminal-orange hover:bg-terminal-orange hover:text-terminal-bg transition-colors"
          >
            COUNTER-HACK
          </button>
        </div>
      </div>

      <div className="border-t border-terminal-border pt-2 space-y-1">
        <div className="text-terminal-gray tracking-widest text-[10px] mb-1">META</div>
        <MetaStats />
        <button
          onClick={hardReset}
          className="w-full py-1 border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-terminal-bg transition-colors mt-1"
        >
          HARD RESET (wipe all)
        </button>
      </div>
    </div>
  )
}

function MetaStats() {
  const totalRuns = usePrestigeStore((s) => s.totalRuns)
  const legendRuns = usePrestigeStore((s) => s.legendRuns)
  const moleRuns = usePrestigeStore((s) => s.moleRuns)
  const counterHackedRuns = usePrestigeStore((s) => s.counterHackedRuns)
  const incomeMultiplier = usePrestigeStore((s) => s.incomeMultiplier)
  const clearanceLevel = usePrestigeStore((s) => s.clearanceLevel)
  const retainedMoney = usePrestigeStore((s) => s.retainedMoney)
  return (
    <div className="text-terminal-gray space-y-0.5">
      <div>Runs: <span className="text-terminal-white">{totalRuns}</span> | Legend: <span className="text-terminal-gold">{legendRuns}</span> | Mole: <span className="text-terminal-cyan">{moleRuns}</span> | Burned: <span className="text-terminal-orange">{counterHackedRuns}</span></div>
      <div>Income ×<span className="text-terminal-gold">{incomeMultiplier.toFixed(1)}</span> | Clearance <span className="text-terminal-cyan">{clearanceLevel}</span> | Retained <span className="text-terminal-orange">${retainedMoney.toFixed(0)}</span></div>
    </div>
  )
}
