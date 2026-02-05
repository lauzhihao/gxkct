/**
 * Global Loading State Store
 *
 * 全局 Loading 状态管理，基于 Zustand 实现响应式订阅
 * 使用引用计数机制，支持多个异步操作同时进行
 */
import { create } from 'zustand'

interface LoadingState {
  // 引用计数，支持多个并发 loading 操作
  loadingCount: number
  // 派生状态: count > 0 即为 loading
  isLoading: boolean
  // 开始 loading (count++)
  startLoading: () => void
  // 结束 loading (count--, 最小为 0)
  stopLoading: () => void
}

/**
 * 全局 Loading Store (引用计数机制)
 *
 * 使用示例:
 * ```tsx
 * import { useStartLoading, useStopLoading } from '@/shared/stores/loading-store'
 *
 * const startLoading = useStartLoading()
 * const stopLoading = useStopLoading()
 *
 * async function fetchData() {
 *   startLoading()
 *   try {
 *     await api.getData()
 *   } finally {
 *     stopLoading()  // 确保始终调用，即使出错
 *   }
 * }
 * ```
 *
 * 引用计数优势:
 * - 组件 A: startLoading() -> count: 1
 * - 组件 B: startLoading() -> count: 2
 * - 组件 A: stopLoading()  -> count: 1 (仍在 loading)
 * - 组件 B: stopLoading()  -> count: 0 (loading 结束)
 */
export const useLoadingStore = create<LoadingState>((set) => ({
  loadingCount: 0,
  isLoading: false,
  startLoading: () =>
    set((state) => ({
      loadingCount: state.loadingCount + 1,
      isLoading: true,
    })),
  stopLoading: () =>
    set((state) => {
      const newCount = Math.max(0, state.loadingCount - 1)
      return {
        loadingCount: newCount,
        isLoading: newCount > 0,
      }
    }),
}))

/**
 * 便捷 hook: 仅获取 isLoading 状态
 * 性能优化: 仅在 isLoading 变化时触发重渲染
 */
export const useIsLoading = () => useLoadingStore((state) => state.isLoading)

/**
 * 便捷 hook: 获取 startLoading 方法
 */
export const useStartLoading = () => useLoadingStore((state) => state.startLoading)

/**
 * 便捷 hook: 获取 stopLoading 方法
 */
export const useStopLoading = () => useLoadingStore((state) => state.stopLoading)
