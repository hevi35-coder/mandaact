import { create } from 'zustand'
import { activateAdFree, getAdFreeRemainingTime, isAdFreeActive } from '../lib/ads'

interface AdStoreState {
  isAdFree: boolean
  remainingTime: number
  isLoading: boolean
  refreshAdFree: () => Promise<void>
  activateAdFree: () => Promise<Date>
}

let remainingTimer: ReturnType<typeof setInterval> | null = null

function stopRemainingTimer() {
  if (remainingTimer) {
    clearInterval(remainingTimer)
    remainingTimer = null
  }
}

export const useAdStore = create<AdStoreState>((set, get) => ({
  isAdFree: false,
  remainingTime: 0,
  isLoading: true,

  refreshAdFree: async () => {
    try {
      const active = await isAdFreeActive()
      if (!active) {
        stopRemainingTimer()
        set({ isAdFree: false, remainingTime: 0, isLoading: false })
        return
      }

      const remainingTime = await getAdFreeRemainingTime()
      const stillActive = remainingTime > 0
      set({ isAdFree: stillActive, remainingTime, isLoading: false })

      if (!stillActive) {
        stopRemainingTimer()
        return
      }

      if (!remainingTimer) {
        remainingTimer = setInterval(async () => {
          const currentRemaining = await getAdFreeRemainingTime()
          if (currentRemaining <= 0) {
            stopRemainingTimer()
            set({ isAdFree: false, remainingTime: 0 })
            return
          }
          set({ remainingTime: currentRemaining, isAdFree: true })
        }, 60000)
      }
    } catch {
      set({ isLoading: false })
    }
  },

  activateAdFree: async () => {
    const expiryDate = await activateAdFree()
    await get().refreshAdFree()
    return expiryDate
  },
}))

