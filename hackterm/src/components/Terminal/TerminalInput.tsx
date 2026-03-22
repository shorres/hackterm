import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { useGameStore } from '../../store/gameStore'
import { parseAndRun } from '../../engine/commands'

interface Props {
  disabled?: boolean
}

export function TerminalInput({ disabled }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { getCurrentNode, currentPath, navigateHistory, pushHistory, activeOperation } = useGameStore()

  const node = getCurrentNode()
  const promptLabel = node ? `${node.hostname}:${currentPath}` : 'localhost:~'
  const isLocked = disabled || !!activeOperation

  useEffect(() => {
    if (!isLocked) inputRef.current?.focus()
  }, [isLocked])

  // Click anywhere on terminal → focus input
  useEffect(() => {
    const handler = () => {
      if (!isLocked) inputRef.current?.focus()
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [isLocked])

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (!isLocked && value.trim()) {
        pushHistory(value)
        parseAndRun(value)
        setValue('')
      }
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setValue(navigateHistory('up'))
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setValue(navigateHistory('down'))
      return
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      useGameStore.getState().clearTerminal()
      return
    }
  }

  return (
    <div className="flex items-center px-4 py-2 border-t border-terminal-border bg-terminal-surface shrink-0">
      <span className="text-terminal-green-dim font-mono text-sm mr-1">
        [{promptLabel}]$
      </span>
      {isLocked ? (
        <div className="flex-1 flex items-center">
          <ProgressBar operation={activeOperation} />
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            className="flex-1 bg-transparent text-terminal-green font-mono text-sm outline-none caret-terminal-green"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <span className="animate-blink text-terminal-green font-mono text-sm">█</span>
        </>
      )}
    </div>
  )
}

function ProgressBar({ operation }: { operation: ReturnType<typeof useGameStore.getState>['activeOperation'] }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!operation) return
    const interval = setInterval(() => {
      const elapsed = Date.now() - operation.startedAt
      setProgress(Math.min(100, (elapsed / operation.durationMs) * 100))
    }, 50)
    return () => clearInterval(interval)
  }, [operation])

  if (!operation) return null

  const filled = Math.floor(progress / 5)
  const empty = 20 - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)

  return (
    <div className="flex items-center gap-3 font-mono text-sm text-terminal-orange w-full">
      <span className="shrink-0">{operation.label}</span>
      <span className="text-terminal-green">[{bar}]</span>
      <span className="text-terminal-cyan shrink-0">{progress.toFixed(0)}%</span>
    </div>
  )
}
