import { usePrestigeStore } from '../store/prestigeStore'
import { useGameStore } from '../store/gameStore'
import type { PrestigeEnding } from '../types'

const ENDINGS: Record<PrestigeEnding, {
  title: string
  banner: string
  color: string
  narrative: string[]
  bonusLabel: string
}> = {
  fbi: {
    title: 'CAUGHT',
    banner: '[ FBI RAID — RUN TERMINATED ]',
    color: 'text-terminal-red',
    narrative: [
      'They kicked in the door at 0347.',
      'Agent Reyes slid a folder across the table.',
      '"Work for us, or spend the next twelve years learning what prison Wi-Fi tastes like."',
      '',
      'You took the deal.',
      'You\'re a ghost now — with a badge you\'re not supposed to have.',
    ],
    bonusLabel: 'CLEARANCE BONUS: next run starts with one free hardware upgrade.',
  },
  legend: {
    title: 'LEGEND',
    banner: '[ VOLUNTARY RETIREMENT — CLEAN EXIT ]',
    color: 'text-terminal-gold',
    narrative: [
      'You pulled the plug before they ever got close.',
      'The forums lit up. No name, no face — just the work.',
      '"Whoever did the Vantage breach... respect."',
      '',
      'You\'re out. Rich, anonymous, and alive.',
      'But the terminal is still open.',
    ],
    bonusLabel: 'LEGACY BONUS: +0.5× global income multiplier on all future runs.',
  },
  counter_hacked: {
    title: 'BURNED',
    banner: '[ COUNTER-HACKED — SYSTEM COMPROMISED ]',
    color: 'text-terminal-orange',
    narrative: [
      'You got greedy. Too many shells, too loud.',
      'Someone better than you was watching.',
      'They didn\'t call the FBI. They just... took everything.',
      '',
      'The machine is theirs now.',
      'But you still remember the account numbers.',
    ],
    bonusLabel: 'STREET CREDIT: 15% of your final balance carries into next run.',
  },
}

interface Props {
  onNewRun: () => void
}

export function PrestigeScreen({ onNewRun }: Props) {
  const endingType = useGameStore((s) => s.endingType)
  const money = useGameStore((s) => s.money)
  const totalRuns = usePrestigeStore((s) => s.totalRuns)
  const legendRuns = usePrestigeStore((s) => s.legendRuns)
  const moleRuns = usePrestigeStore((s) => s.moleRuns)
  const counterHackedRuns = usePrestigeStore((s) => s.counterHackedRuns)
  const incomeMultiplier = usePrestigeStore((s) => s.incomeMultiplier)
  const retainedMoney = usePrestigeStore((s) => s.retainedMoney)
  const clearanceLevel = usePrestigeStore((s) => s.clearanceLevel)

  if (!endingType) return null
  const ending = ENDINGS[endingType]

  return (
    <div className="h-screen bg-terminal-bg flex items-center justify-center font-mono p-8">
      <div className="max-w-2xl w-full space-y-6">
        {/* Banner */}
        <div className={`text-center ${ending.color}`}>
          <div className="text-4xl font-bold tracking-widest mb-1">{ending.title}</div>
          <div className="text-sm opacity-60">{ending.banner}</div>
        </div>

        <div className="border-t border-terminal-border" />

        {/* Narrative */}
        <div className="space-y-1 text-terminal-white text-sm leading-relaxed">
          {ending.narrative.map((line, i) =>
            line === '' ? <div key={i} className="h-2" /> : <div key={i}>{line}</div>
          )}
        </div>

        <div className="border-t border-terminal-border" />

        {/* Stats */}
        <div className="space-y-1 text-sm">
          <div className="text-terminal-gray text-xs tracking-widest mb-2">RUN SUMMARY</div>
          <div className="flex justify-between">
            <span className="text-terminal-gray">Final balance</span>
            <span className="text-terminal-gold">${money.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-gray">Career runs</span>
            <span className="text-terminal-white">{totalRuns + 1}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-gray">Legend exits</span>
            <span className="text-terminal-gold">{endingType === 'legend' ? legendRuns + 1 : legendRuns}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-gray">Mole runs</span>
            <span className="text-terminal-cyan">{endingType === 'fbi' ? moleRuns + 1 : moleRuns}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-gray">Burned runs</span>
            <span className="text-terminal-orange">{endingType === 'counter_hacked' ? counterHackedRuns + 1 : counterHackedRuns}</span>
          </div>
        </div>

        <div className="border-t border-terminal-border" />

        {/* Bonus earned */}
        <div className="text-terminal-green text-sm">
          <span className="opacity-50">▶ </span>{ending.bonusLabel}
        </div>

        {/* Next run bonuses preview */}
        {(incomeMultiplier > 1 || retainedMoney > 0 || clearanceLevel > 0) && (
          <div className="text-xs text-terminal-gray space-y-1">
            <div className="tracking-widest mb-1">CARRYING INTO NEXT RUN</div>
            {incomeMultiplier > 1 && (
              <div>Income multiplier: <span className="text-terminal-gold">×{(endingType === 'legend' ? incomeMultiplier + 0.5 : incomeMultiplier).toFixed(1)}</span></div>
            )}
            {clearanceLevel > 0 && (
              <div>Clearance level: <span className="text-terminal-cyan">{endingType === 'fbi' ? clearanceLevel + 1 : clearanceLevel}</span></div>
            )}
            {endingType === 'counter_hacked' && money > 0 && (
              <div>Retained funds: <span className="text-terminal-orange">${(money * 0.15).toFixed(2)}</span></div>
            )}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onNewRun}
          className="w-full py-3 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-colors text-sm tracking-widest"
        >
          [ BEGIN NEW RUN ]
        </button>
      </div>
    </div>
  )
}
