import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

const BOOT_LINES = [
  { text: 'HACKTERM OS v0.1.0 — Initializing ...', delay: 0 },
  { text: 'Loading kernel modules ... [OK]', delay: 300 },
  { text: 'Mounting filesystems ... [OK]', delay: 500 },
  { text: 'Starting network services ... [OK]', delay: 700 },
  { text: 'Configuring anonymization layer ... [OK]', delay: 1000 },
  { text: 'Loading exploit framework ... [OK]', delay: 1200 },
  { text: '', delay: 1500 },
  { text: '  ██╗  ██╗ █████╗  ██████╗██╗  ██╗████████╗███████╗██████╗ ███╗  ███╗', delay: 1600 },
  { text: '  ██║  ██║██╔══██╗██╔════╝██║ ██╔╝╚══██╔══╝██╔════╝██╔══██╗████╗████║', delay: 1700 },
  { text: '  ███████║███████║██║     █████╔╝    ██║   █████╗  ██████╔╝██╔████╔██║', delay: 1800 },
  { text: '  ██╔══██║██╔══██║██║     ██╔═██╗    ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║', delay: 1900 },
  { text: '  ██║  ██║██║  ██║╚██████╗██║  ██╗   ██║   ███████╗██║  ██║██║ ╚═╝ ██║', delay: 2000 },
  { text: '  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝', delay: 2100 },
  { text: '', delay: 2200 },
  { text: '  An incremental hacking simulator.', delay: 2300 },
  { text: '', delay: 2400 },
  { text: '  All networks are simulated. No real systems are accessed.', delay: 2400 },
  { text: '', delay: 2500 },
]

interface Props {
  onStart: (seed: string) => void
}

export function BootScreen({ onStart }: Props) {
  const [visibleLines, setVisibleLines] = useState<string[]>([])
  const [showPrompt, setShowPrompt] = useState(false)
  const [seedInput, setSeedInput] = useState('')
  const hasSave = useGameStore((s) => s.started)

  useEffect(() => {
    let maxDelay = 0
    const timeouts: ReturnType<typeof setTimeout>[] = []

    BOOT_LINES.forEach((line) => {
      maxDelay = Math.max(maxDelay, line.delay)
      const t = setTimeout(() => {
        setVisibleLines((prev) => [...prev, line.text])
      }, line.delay)
      timeouts.push(t)
    })

    const t = setTimeout(() => {
      setShowPrompt(true)
    }, maxDelay + 400)
    timeouts.push(t)

    return () => timeouts.forEach(clearTimeout)
  }, [])

  const handleStart = (resume: boolean) => {
    if (resume && hasSave) {
      // Resume existing game
      onStart('__resume__')
    } else {
      onStart(seedInput.trim() || '')
    }
  }

  return (
    <div className="min-h-screen bg-terminal-bg font-mono text-terminal-green flex flex-col items-start p-8 overflow-auto">
      {/* CRT scan line overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #00ff41 0px, #00ff41 1px, transparent 1px, transparent 2px)' }}
      />

      <div className="w-full max-w-4xl">
        {visibleLines.map((line, idx) => (
          <div key={idx} className={`text-sm leading-relaxed whitespace-pre ${
            line.includes('██') ? 'text-terminal-green text-[0.55rem] leading-tight' :
            line.includes('[OK]') ? 'text-terminal-green' :
            line.includes('///') ? 'text-terminal-cyan' :
            'text-terminal-white'
          }`}>
            {line || '\u00A0'}
          </div>
        ))}

        {showPrompt && (
          <div className="mt-6 space-y-4">
            {hasSave && (
              <div>
                <p className="text-terminal-cyan mb-2">
                  Existing session detected.
                </p>
                <button
                  onClick={() => handleStart(true)}
                  className="mr-4 px-4 py-2 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-colors"
                >
                  [R] RESUME SESSION
                </button>
                <button
                  onClick={() => handleStart(false)}
                  className="px-4 py-2 border border-terminal-gray text-terminal-gray hover:border-terminal-orange hover:text-terminal-orange transition-colors"
                >
                  [N] NEW GAME
                </button>
              </div>
            )}

            {!hasSave && (
              <div className="space-y-3">
                <p className="text-terminal-white">
                  Enter world seed (leave blank for random):
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-terminal-green-dim">seed &gt;</span>
                  <input
                    className="bg-transparent text-terminal-green outline-none border-b border-terminal-green-dim w-48"
                    value={seedInput}
                    onChange={(e) => setSeedInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleStart(false)}
                    autoFocus
                    maxLength={12}
                    spellCheck={false}
                  />
                  <span className="animate-blink">█</span>
                </div>
                <button
                  onClick={() => handleStart(false)}
                  className="px-4 py-2 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg transition-colors"
                >
                  [ENTER] INITIALIZE WORLD
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
