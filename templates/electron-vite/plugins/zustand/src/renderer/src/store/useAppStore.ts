import { create } from 'zustand'

interface AppState {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

/**
 * 应用全局状态 Store 示例
 */
export const useAppStore = create<AppState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 })
}))
