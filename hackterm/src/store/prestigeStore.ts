import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PrestigeMeta, PrestigeEnding } from '../types'

// Separate store that survives game resets — it's the "career" layer
interface PrestigeStore extends PrestigeMeta {
  recordEnding: (ending: PrestigeEnding, moneyAtEnd: number) => void
  getMeta: () => PrestigeMeta
}

function initialMeta(): PrestigeMeta {
  return {
    totalRuns: 0,
    legendRuns: 0,
    moleRuns: 0,
    counterHackedRuns: 0,
    incomeMultiplier: 1,
    retainedMoney: 0,
    clearanceLevel: 0,
  }
}

const COUNTER_HACK_RETAIN_PER_RUN = 0.15
const COUNTER_HACK_RETAIN_CAP = 0.60

export const usePrestigeStore = create<PrestigeStore>()(
  persist(
    (set, get) => ({
      ...initialMeta(),

      recordEnding: (ending, moneyAtEnd) => {
        set((s) => {
          const next: Partial<PrestigeMeta> = {
            totalRuns: s.totalRuns + 1,
          }

          if (ending === 'legend') {
            next.legendRuns = s.legendRuns + 1
            next.incomeMultiplier = s.incomeMultiplier + 0.5
          }

          if (ending === 'fbi') {
            next.moleRuns = s.moleRuns + 1
            next.clearanceLevel = Math.min(5, s.clearanceLevel + 1)
          }

          if (ending === 'counter_hacked') {
            next.counterHackedRuns = s.counterHackedRuns + 1
            // Each run adds 15% of that run's final money, capped at 60% total retained
            const additionalRetain = moneyAtEnd * COUNTER_HACK_RETAIN_PER_RUN
            const rawRetain = s.retainedMoney + additionalRetain
            // Cap is 60% of current run's earnings (not cumulative cap — keeps it fair)
            next.retainedMoney = Math.min(rawRetain, moneyAtEnd * COUNTER_HACK_RETAIN_CAP)
          } else {
            // Non-counter-hacked endings reset the retained pool (you started fresh anyway)
            next.retainedMoney = 0
          }

          return next as PrestigeMeta
        })
      },

      getMeta: () => {
        const s = get()
        return {
          totalRuns: s.totalRuns,
          legendRuns: s.legendRuns,
          moleRuns: s.moleRuns,
          counterHackedRuns: s.counterHackedRuns,
          incomeMultiplier: s.incomeMultiplier,
          retainedMoney: s.retainedMoney,
          clearanceLevel: s.clearanceLevel,
        }
      },
    }),
    { name: 'hackterm-prestige' }
  )
)
