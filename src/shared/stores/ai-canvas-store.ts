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
  /** 注册回调 */
  registerPrepareCanvasData: (fn: PrepareCanvasDataFn) => void
  /** 注销回调 */
  unregisterPrepareCanvasData: () => void
}

export const useAiCanvasStore = create<AiCanvasStore>((set) => ({
  prepareCanvasData: null,
  registerPrepareCanvasData: (fn) => set({ prepareCanvasData: fn }),
  unregisterPrepareCanvasData: () => set({ prepareCanvasData: null }),
}))
