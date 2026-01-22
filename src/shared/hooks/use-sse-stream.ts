"use client"

import { useRef, useCallback } from "react"
import {
  isCanvasEvent,
  isStatusEvent,
  isThinkingEvent,
  isUIEvent,
  isProgressEvent,
  isModeEvent,
  isErrorEvent,
  isOpenAIChunk,
  CanvasEventMessage,
  StatusEventMessage,
  UIEventMessage,
  ProgressEventMessage,
  ModeEventMessage,
  ErrorEventMessage,
  CanvasAction,
  CanvasComponentType,
  CanvasComponentData,
} from "@/components/canvas-elements"

/**
 * SSE 流式处理选项
 */
export interface SSEStreamOptions {
  /** 处理画布事件 */
  onCanvasEvent?: (event: CanvasEventMessage) => void
  /** 处理思考内容（累积后的完整内容） */
  onThinkingChunk?: (content: string) => void
  /** 处理状态事件 */
  onStatusEvent?: (status: StatusEventMessage) => void
  /** 处理 UI 事件 */
  onUIEvent?: (event: UIEventMessage) => void
  /** 处理进度事件 */
  onProgressEvent?: (progress: ProgressEventMessage) => void
  /** 处理模式切换事件 */
  onModeEvent?: (mode: ModeEventMessage) => void
  /** 处理错误事件 */
  onErrorEvent?: (error: ErrorEventMessage) => void
  /** 处理文本内容块（累积后的完整内容） */
  onContentChunk?: (content: string) => void
  /** 流式处理完成回调 */
  onComplete?: (content: string, thinking?: string) => void
  /** 流被中止时的回调 */
  onAbort?: () => void
  /** 处理旧格式响应（兼容后端） */
  onLegacyFormat?: (data: LegacyFormatResponse) => void
}

/**
 * 旧格式响应（后端兼容）
 */
export interface LegacyFormatResponse {
  reply?: string
  canvas_update?: Record<string, unknown>
  stage?: string
}

/**
 * SSE 流式处理结果
 */
export interface SSEStreamResult {
  /** 处理响应流，可传入临时选项覆盖构造时的选项 */
  processStream: (response: Response, overrideOptions?: Partial<SSEStreamOptions>) => Promise<{ content: string; thinking?: string }>
  /** 中止当前流 */
  abort: () => void
  /** 获取 AbortController 的 signal */
  getSignal: () => AbortSignal
  /** 重置控制器（用于新请求） */
  resetController: () => AbortController
}

/**
 * SSE 流式处理 Hook
 *
 * 用于处理来自后端的 SSE 流式响应，支持多种事件类型：
 * - canvas: 画布更新事件
 * - thinking: AI 思考过程
 * - status: 工具状态
 * - ui: UI 控制事件
 * - progress: 进度事件
 * - mode: 模式切换事件
 * - error: 错误事件
 * - OpenAI chunk: 标准 OpenAI 格式的文本内容
 */
export function useSSEStream(options: SSEStreamOptions): SSEStreamResult {
  const controllerRef = useRef<AbortController | null>(null)
  const optionsRef = useRef(options)

  // 更新选项引用
  optionsRef.current = options

  /**
   * 重置 AbortController
   */
  const resetController = useCallback(() => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    return controller
  }, [])

  /**
   * 获取当前 signal
   */
  const getSignal = useCallback(() => {
    if (!controllerRef.current) {
      controllerRef.current = new AbortController()
    }
    return controllerRef.current.signal
  }, [])

  /**
   * 中止当前流
   */
  const abort = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  /**
   * 处理单行 SSE 数据
   */
  const processLine = useCallback((
    data: string,
    accumulated: { content: string; thinking: string },
    opts: SSEStreamOptions
  ): void => {
    try {
      const parsed = JSON.parse(data)

      // 处理 canvas 事件
      if (isCanvasEvent(parsed)) {
        opts.onCanvasEvent?.(parsed as CanvasEventMessage)
        return
      }

      // 处理 thinking 事件
      if (isThinkingEvent(parsed)) {
        accumulated.thinking += parsed.content
        opts.onThinkingChunk?.(accumulated.thinking)
        return
      }

      // 处理 status 事件
      if (isStatusEvent(parsed)) {
        opts.onStatusEvent?.(parsed as StatusEventMessage)
        return
      }

      // 处理 ui 事件
      if (isUIEvent(parsed)) {
        opts.onUIEvent?.(parsed as UIEventMessage)
        return
      }

      // 处理 progress 事件
      if (isProgressEvent(parsed)) {
        opts.onProgressEvent?.(parsed as ProgressEventMessage)
        return
      }

      // 处理 mode 事件
      if (isModeEvent(parsed)) {
        opts.onModeEvent?.(parsed as ModeEventMessage)
        return
      }

      // 处理 error 事件
      if (isErrorEvent(parsed)) {
        opts.onErrorEvent?.(parsed as ErrorEventMessage)
        return
      }

      // 处理标准 OpenAI 格式的内容
      if (isOpenAIChunk(parsed)) {
        const content = parsed.choices?.[0]?.delta?.content
        if (content) {
          accumulated.content += content
          opts.onContentChunk?.(accumulated.content)
        }
        return
      }

      // 处理旧格式响应（后端兼容）
      const legacyFormat = parsed as LegacyFormatResponse
      if (legacyFormat.reply !== undefined || legacyFormat.canvas_update !== undefined) {
        console.warn('[SSE] 检测到后端旧格式响应，建议后端修复为标准格式:', parsed)

        // 处理 reply 字段
        if (legacyFormat.reply) {
          accumulated.content += legacyFormat.reply
          opts.onContentChunk?.(accumulated.content)
        }

        // 处理 canvas_update 字段
        if (legacyFormat.canvas_update && opts.onCanvasEvent) {
          for (const [componentKey, componentData] of Object.entries(legacyFormat.canvas_update)) {
            const canvasEvent: CanvasEventMessage = {
              type: "canvas",
              action: "update" as CanvasAction,
              component: componentKey as CanvasComponentType,
              data: componentData as CanvasComponentData,
            }
            opts.onCanvasEvent(canvasEvent)
          }
        }

        // 调用旧格式回调
        opts.onLegacyFormat?.(legacyFormat)
      }
    } catch (parseError) {
      console.error('解析流式响应失败', parseError, data)
    }
  }, [])

  /**
   * 处理响应流
   * @param response - fetch 响应对象
   * @param overrideOptions - 可选的临时选项，用于覆盖构造时的选项
   */
  const processStream = useCallback(async (
    response: Response,
    overrideOptions?: Partial<SSEStreamOptions>
  ): Promise<{ content: string; thinking?: string }> => {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法获取响应流')
    }

    const decoder = new TextDecoder()
    const accumulated = { content: '', thinking: '' }
    let buffer = ''
    // 合并基础选项和临时选项
    const opts: SSEStreamOptions = { ...optionsRef.current, ...overrideOptions }
    const controller = controllerRef.current

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (controller?.signal.aborted) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || !trimmedLine.startsWith('data:')) continue

          const data = trimmedLine.slice(5).trim()
          if (data === '[DONE]') continue

          processLine(data, accumulated, opts)
        }
      }
    } catch (error) {
      // 流被中止时调用 onAbort 回调
      if (error instanceof Error && error.name === 'AbortError') {
        opts.onAbort?.()
        throw error
      }
      throw error
    } finally {
      reader.releaseLock()
    }

    // 调用完成回调
    opts.onComplete?.(accumulated.content, accumulated.thinking || undefined)

    return {
      content: accumulated.content,
      thinking: accumulated.thinking || undefined,
    }
  }, [processLine])

  return {
    processStream,
    abort,
    getSignal,
    resetController,
  }
}
