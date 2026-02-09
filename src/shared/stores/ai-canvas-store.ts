/**
 * AI Canvas Bridge Store
 *
 * 桥接课程详情页与 Header AI 按钮的画布数据准备逻辑。
 * 课程详情页挂载时注册回调，Header 点击 AI 按钮时调用。
 */
import { create } from "zustand"
import type { InitialCanvasData } from "@/types/ai-assistant"

type PrepareCanvasDataFn = () => Promise<InitialCanvasData | null>

interface AiCanvasStore {
  /** 课程详情页注册的画布数据准备回调 */
  prepareCanvasData: PrepareCanvasDataFn | null
  /** 当前回调所属的数据源标识（通常为课程 ID） */
  sourceKey: string | null
  /** 已准备好的画布数据缓存 */
  preparedCanvasData: InitialCanvasData | null
  /** 正在进行中的准备任务（去重并复用） */
  preparingPromise: Promise<InitialCanvasData | null> | null
  /** 注册回调 */
  registerPrepareCanvasData: (fn: PrepareCanvasDataFn, sourceKey?: string | null) => void
  /** 注销回调 */
  unregisterPrepareCanvasData: () => void
  /** 获取画布数据（优先使用缓存，其次复用进行中任务） */
  prepareOrGetCanvasData: () => Promise<InitialCanvasData | null>
  /** 预热：后台提前准备数据 */
  prefetchCanvasData: () => void
  /** 清空缓存（切换课程时调用） */
  clearPreparedCanvasData: () => void
}

export const useAiCanvasStore = create<AiCanvasStore>()((set, get) => ({
  prepareCanvasData: null,
  sourceKey: null,
  preparedCanvasData: null,
  preparingPromise: null,
  registerPrepareCanvasData: (fn, sourceKey = null) =>
    set((state) => {
      // 数据源变化时清空旧缓存，避免跨课程复用
      const sourceChanged = state.sourceKey !== sourceKey
      return {
        prepareCanvasData: fn,
        sourceKey,
        preparedCanvasData: sourceChanged ? null : state.preparedCanvasData,
        preparingPromise: sourceChanged ? null : state.preparingPromise,
      }
    }),
  unregisterPrepareCanvasData: () =>
    set({
      prepareCanvasData: null,
      sourceKey: null,
      preparedCanvasData: null,
      preparingPromise: null,
    }),
  prepareOrGetCanvasData: async (): Promise<InitialCanvasData | null> => {
    const state = get()

    if (state.preparedCanvasData) {
      return state.preparedCanvasData
    }

    if (!state.prepareCanvasData) {
      return null
    }

    if (state.preparingPromise) {
      return state.preparingPromise
    }

    const preparingPromise = state.prepareCanvasData()
      .then((data: InitialCanvasData | null) => {
        set({
          preparedCanvasData: data,
          preparingPromise: null,
        })
        return data
      })
      .catch((error: unknown) => {
        set({ preparingPromise: null })
        throw error
      })

    set({ preparingPromise })
    return preparingPromise
  },
  prefetchCanvasData: () => {
    const state = get()
    if (state.preparedCanvasData || state.preparingPromise || !state.prepareCanvasData) {
      return
    }

    void state.prepareOrGetCanvasData().catch((error: unknown) => {
      console.error("[AiCanvasStore] 画布数据预热失败:", error)
    })
  },
  clearPreparedCanvasData: () => set({ preparedCanvasData: null, preparingPromise: null }),
}))
