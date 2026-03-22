import { useEffect, useRef } from 'react'
import type { TerminalLine, OutputType } from '../../types'

interface Props {
  lines: TerminalLine[]
}

function lineClass(type: OutputType): string {
  switch (type) {
    case 'success': return 'text-terminal-green'
    case 'error':   return 'text-terminal-red'
    case 'warning': return 'text-terminal-orange'
    case 'info':    return 'text-terminal-cyan'
    case 'system':  return 'text-terminal-cyan font-bold'
    case 'prompt':  return 'text-terminal-green-dim'
    case 'data':    return 'text-terminal-white opacity-80'
    default:        return 'text-terminal-white'
  }
}

export function TerminalOutput({ lines }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-2 space-y-0">
      {lines.map((line) => (
        <div
          key={line.id}
          className={`font-mono text-sm leading-relaxed whitespace-pre-wrap break-all animate-fade-in ${lineClass(line.type)}`}
        >
          {line.text || '\u00A0'}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
