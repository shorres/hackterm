import { useEffect, useRef } from 'react'
import { useGameStore } from './store/gameStore'
import { usePrestigeStore } from './store/prestigeStore'
import { BootScreen } from './components/BootScreen'
import { HUD } from './components/HUD/HUD'
import { TerminalOutput } from './components/Terminal/TerminalOutput'
import { TerminalInput } from './components/Terminal/TerminalInput'
import { PrestigeScreen } from './components/PrestigeScreen'
import { DebugPanel } from './components/DebugPanel'
import { tick } from './engine/gameLoop'

function buildBootMessage(
  clearanceLevel: number,
  incomeMultiplier: number,
  retainedMoney: number,
  isFirstRun: boolean,
) {
  const lines: Array<{ text: string; type: 'system' | 'info' | 'success' | 'warning' | 'default' | 'cyan' }> = [
    { text: 'HACKTERM v0.1 ready. Type \'help\' to list commands.', type: 'system' },
    { text: '', type: 'default' },
    { text: 'Your node: localhost (10.0.0.1)', type: 'info' },
  ]

  if (isFirstRun) {
    lines.push({ text: 'Starting balance: $50.00', type: 'success' })
  } else {
    const startingMoney = 50 + retainedMoney
    lines.push({ text: `Starting balance: $${startingMoney.toFixed(2)}`, type: 'success' })
    if (retainedMoney > 0) {
      lines.push({ text: `  ↳ Retained from last run: $${retainedMoney.toFixed(2)}`, type: 'warning' })
    }
    if (incomeMultiplier > 1) {
      lines.push({ text: `  ↳ Legacy income multiplier: ×${incomeMultiplier.toFixed(1)}`, type: 'success' })
    }
    if (clearanceLevel > 0) {
      lines.push({ text: `  ↳ Clearance level ${clearanceLevel}: hardware pre-upgraded`, type: 'info' })
    }
  }

  lines.push({ text: '', type: 'default' })
  lines.push({ text: 'Tip: Start with "nmap 10.0.1.0/24" to discover nearby hosts.', type: 'info' })
  lines.push({ text: '', type: 'default' })
  return lines
}


export default function App() {
  const started = useGameStore((s) => s.started)
  const prestigePhase = useGameStore((s) => s.prestigePhase)
  const endingType = useGameStore((s) => s.endingType)
  const lines = useGameStore((s) => s.lines)
  const startGame = useGameStore((s) => s.startGame)
  const printLines = useGameStore((s) => s.printLines)
  const recordEnding = usePrestigeStore((s) => s.recordEnding)
  const getMeta = usePrestigeStore((s) => s.getMeta)
  const money = useGameStore((s) => s.money)
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
    const meta = getMeta()
    const isFirstRun = meta.totalRuns === 0

    if (seed === '__resume__') {
      printLines(buildBootMessage(meta.clearanceLevel, meta.incomeMultiplier, meta.retainedMoney, false))
      useGameStore.setState({ started: true })
      return
    }
    startGame(seed || undefined, meta)
    setTimeout(() => {
      printLines(buildBootMessage(meta.clearanceLevel, meta.incomeMultiplier, meta.retainedMoney, isFirstRun))
    }, 50)
  }

  const handleNewRun = () => {
    if (endingType) recordEnding(endingType, money)
    const meta = getMeta()
    // recordEnding mutates, so re-read
    const updatedMeta = usePrestigeStore.getState().getMeta()
    startGame(undefined, updatedMeta)
    setTimeout(() => {
      printLines(buildBootMessage(updatedMeta.clearanceLevel, updatedMeta.incomeMultiplier, updatedMeta.retainedMoney, false))
    }, 50)
  }

  if (!started) {
    return <BootScreen onStart={handleStart} />
  }

  if (prestigePhase === 'ended') {
    return <PrestigeScreen onNewRun={handleNewRun} />
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
      <DebugPanel />
    </div>
  )
}
