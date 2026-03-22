import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { usePrestigeStore } from '../store/prestigeStore'
import type { PrestigeEnding } from '../types'

const ASCII_LINES = [
  { text: 'HACKTERM OS v0.1.0 — Reinitializing ...', delay: 0 },
  { text: 'Purging previous identity ... [OK]', delay: 300 },
  { text: 'Generating new world seed ... [OK]', delay: 500 },
  { text: 'Configuring anonymization layer ... [OK]', delay: 700 },
  { text: 'Loading exploit framework ... [OK]', delay: 900 },
  { text: '', delay: 1100 },
  { text: '  ██╗  ██╗ █████╗  ██████╗██╗  ██╗████████╗███████╗██████╗ ███╗  ███╗', delay: 1200 },
  { text: '  ██║  ██║██╔══██╗██╔════╝██║ ██╔╝╚══██╔══╝██╔════╝██╔══██╗████╗████║', delay: 1300 },
  { text: '  ███████║███████║██║     █████╔╝    ██║   █████╗  ██████╔╝██╔████╔██║', delay: 1400 },
  { text: '  ██╔══██║██╔══██║██║     ██╔═██╗    ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║', delay: 1500 },
  { text: '  ██║  ██║██║  ██║╚██████╗██║  ██╗   ██║   ███████╗██║  ██║██║ ╚═╝ ██║', delay: 1600 },
  { text: '  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝', delay: 1700 },
  { text: '', delay: 1800 },
]

const NARRATIVES: Record<PrestigeEnding, string[][]> = {
  fbi: [
    [
      'You signed the papers in a fluorescent-lit room at 0200.',
      'Agent Reyes called it a "professional arrangement."',
      'You call it a leash. But the machine is back, and the leash has slack.',
    ],
    [
      'Second debriefing. New handler. Same deal.',
      'They keep forgetting you know more than they do.',
      'Use it.',
    ],
    [
      'The badge sits in a drawer.',
      'You do not look at it.',
      'The terminal does not care.',
    ],
  ],
  legend: [
    [
      'Retirement did not stick.',
      'Three months of nothing, then the itch came back.',
      'One more run. You always say one more run.',
    ],
    [
      'The forums still have your old signature.',
      'Someone is impersonating you.',
      'Time to remind them what the original looks like.',
    ],
    [
      'You told yourself this was the last one.',
      'You were lying.',
      'The terminal is patient. It always waits.',
    ],
  ],
  counter_hacked: [
    [
      'New hardware. New IP range. Different city.',
      'They burned you, but they did not break you.',
      'Time to remind them why that was a mistake.',
    ],
    [
      'You traced it back. Found the signature.',
      'Interesting. They are better than you expected.',
      'Good. You need the practice.',
    ],
    [
      'Everything rebuilt from scratch.',
      'Cleaner this time. Faster.',
      'No loose ends.',
    ],
  ],
}

function getNarrative(ending: PrestigeEnding, runCount: number): string[] {
  const pool = NARRATIVES[ending]
  return pool[Math.min(runCount - 1, pool.length - 1)]
}

interface Props {
  onDismiss: () => void
}

export function RunIntroScreen({ onDismiss }: Props) {
  const lastEndingType = useGameStore((s) => s.lastEndingType)
  const seed = useGameStore((s) => s.seed)
  const totalRuns = usePrestigeStore((s) => s.totalRuns)
  const incomeMultiplier = usePrestigeStore((s) => s.incomeMultiplier)
  const retainedMoney = usePrestigeStore((s) => s.retainedMoney)
  const clearanceLevel = usePrestigeStore((s) => s.clearanceLevel)

  const [visibleLines, setVisibleLines] = useState<string[]>([])
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = []
    let maxDelay = 0

    ASCII_LINES.forEach((line) => {
      maxDelay = Math.max(maxDelay, line.delay)
      timeouts.push(setTimeout(() => {
        setVisibleLines((prev) => [...prev, line.text])
      }, line.delay))
    })

    timeouts.push(setTimeout(() => setShowContent(true), maxDelay + 300))
    return () => timeouts.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showContent && (e.key === 'Enter' || e.key === ' ')) onDismiss()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onDismiss, showContent])

  const narrative = lastEndingType
    ? getNarrative(lastEndingType, totalRuns)
    : ['Back at the terminal.', 'New world. Same game.', "Let's go."]

  const hasBonus = incomeMultiplier > 1 || retainedMoney > 0 || clearanceLevel > 0

  return (
    <div className="min-h-screen bg-terminal-bg font-mono text-terminal-green flex flex-col items-start p-8 overflow-auto">
      {/* CRT scanline overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #00ff41 0px, #00ff41 1px, transparent 1px, transparent 2px)' }}
      />

      <div className="w-full max-w-4xl space-y-0">
        {/* Animated boot lines */}
        {visibleLines.map((line, idx) => (
          <div
            key={idx}
            className={`text-sm leading-relaxed whitespace-pre ${
              line.includes('██') ? 'text-terminal-green text-[0.55rem] leading-tight' :
              line.includes('[OK]') ? 'text-terminal-green' :
              'text-terminal-white'
            }`}
          >
            {line || '\u00A0'}
          </div>
        ))}

        {/* Narrative + bonuses + CTA — appear after title finishes */}
        {showContent && (
          <div className="mt-6 space-y-6">
            <div className="text-terminal-gray text-xs tracking-widest">
              RUN {totalRuns} &nbsp;/&nbsp; SEED: {seed}
            </div>

            {/* Narrative */}
            <div className="space-y-1">
              {narrative.map((line, i) => (
                <div key={i} className="text-terminal-white text-sm leading-relaxed">
                  {line}
                </div>
              ))}
            </div>

            {/* Active bonuses */}
            {hasBonus && (
              <div className="space-y-1 text-sm">
                <div className="text-terminal-gray text-xs tracking-widest mb-1">ACTIVE BONUSES</div>
                {incomeMultiplier > 1 && (
                  <div className="text-terminal-gold">↳ Legacy income multiplier &nbsp;×{incomeMultiplier.toFixed(1)}</div>
                )}
                {clearanceLevel > 0 && (
                  <div className="text-terminal-cyan">↳ Clearance level {clearanceLevel} — hardware pre-upgraded</div>
                )}
                {retainedMoney > 0 && (
                  <div className="text-terminal-orange">↳ Retained funds &nbsp;+${retainedMoney.toFixed(2)}</div>
                )}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={onDismiss}
              className="px-4 py-2 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-colors"
            >
              [ENTER] INITIALIZE WORLD
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
