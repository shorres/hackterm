import type { CommandHandler } from './index'

export const retireCommand: CommandHandler = {
  name: 'retire',
  description: 'Go out on top — triggers the Legend ending (requires $25,000 earned)',
  run: (_args, { print, store }) => {
    if (store.prestigePhase !== 'playing') {
      print(`retire: run is already ending`, 'error')
      return
    }
    if (!store.legendUnlocked) {
      print(`retire: legend status not yet achieved`, 'error')
      print(`    Reach $25,000 to unlock early retirement.`, 'info')
      return
    }
    print(``, 'default')
    print(`[*] Initiating clean shutdown of all listeners...`, 'system')
    print(`[*] Scrubbing identity artifacts...`, 'system')
    print(`[*] You made it out clean.`, 'success')
    print(``, 'default')
    setTimeout(() => store.triggerEnding('legend'), 2000)
  },
}
