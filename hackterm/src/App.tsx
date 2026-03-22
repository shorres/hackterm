import { useEffect, useRef } from 'react'
import { useGameStore } from './store/gameStore'
import { BootScreen } from './components/BootScreen'
import { HUD } from './components/HUD/HUD'
import { TerminalOutput } from './components/Terminal/TerminalOutput'
import { TerminalInput } from './components/Terminal/TerminalInput'
import { tick } from './engine/gameLoop'

const BOOT_MESSAGE = [
  { text: 'HACKTERM v0.1 ready. Type \'help\' to list commands.', type: 'system' as const },
  { text: '', type: 'default' as const },
  { text: 'Your node: localhost (10.0.0.1)', type: 'info' as const },
  { text: 'Starting balance: $50.00', type: 'success' as const },
  { text: '', type: 'default' as const },
  { text: 'Tip: Start with "nmap 10.0.1.0/24" to discover nearby hosts.', type: 'info' as const },
  { text: '', type: 'default' as const },
]

export default function App() {
  const started = useGameStore((s) => s.started)
  const lines = useGameStore((s) => s.lines)
  const startGame = useGameStore((s) => s.startGame)
  const printLines = useGameStore((s) => s.printLines)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Game loop
  useEffect(() => {
    if (!started) {
      if (tickRef.current) clearInterval(tickRef.current)
      return
    }
    tickRef.current = setInterval(tick, 1000)
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [started])

  const handleStart = (seed: string) => {
    if (seed === '__resume__') {
      printLines(BOOT_MESSAGE)
      useGameStore.setState({ started: true })
      return
    }
    startGame(seed || undefined)
    setTimeout(() => {
      printLines(BOOT_MESSAGE)
    }, 50)
  }

  if (!started) {
    return <BootScreen onStart={handleStart} />
  }

  return (
    <div className="h-screen bg-terminal-bg flex flex-col overflow-hidden relative">
      {/* CRT scanline overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.025]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #00ff41 0px, #00ff41 1px, transparent 1px, transparent 2px)',
        }}
      />
      <HUD />
      <TerminalOutput lines={lines} />
      <TerminalInput />
    </div>
  )
}
