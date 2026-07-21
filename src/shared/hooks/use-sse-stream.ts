"use client"

import { useRef, useCallback } from "react"
import {
  isCanvasEvent,
  isStatusEvent,
  isThinkingEvent,
  isUIEvent,
  isProgressEvent,
  isProcessingEvent,
  isModeEvent,
  isWarningEvent,
  isGenerationSummaryEvent,
  isErrorEvent,
  isOpenAIChunk,
  CanvasEventMessage,
  StatusEventMessage,
  UIEventMessage,
  ProgressEventMessage,
  ProcessingEventMessage,
  ModeEventMessage,
  WarningEventMessage,
  GenerationSummaryEventMessage,
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
  /** 处理 processing 事件（加载进度文案） */
  onProcessingEvent?: (event: ProcessingEventMessage) => void
  /** 处理模式切换事件 */
  onModeEvent?: (mode: ModeEventMessage) => void
  /** 处理错误事件 */
  onErrorEvent?: (error: ErrorEventMessage) => void
  /** 处理警告事件 */
  onWarningEvent?: (warning: WarningEventMessage) => void
  /** 处理批量生成结果摘要 */
  onGenerationSummary?: (summary: GenerationSummaryEventMessage) => void
  /** 处理文本内容块（累积后的完整内容） */
  onContentChunk?: (content: string) => void
  /** 流式处理完成回调 */
  onComplete?: (content: string, thinking?: string) => void
  /** 流被中止时的回调 */
  onAbort?: () => void
  /** 处理旧格式响应（兼容后端） */
  onLegacyFormat?: (data: LegacyFormatResponse) => void
  /** 当前请求必须收到 generation_summary 才能视为成功 */
  requireGenerationSummary?: boolean
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
  processStream: (response: Response, overrideOptions?: Partial<SSEStreamOptions>) => Promise<SSEStreamProcessResult>
  /** 中止当前流 */
  abort: () => void
  /** 获取 AbortController 的 signal */
  getSignal: () => AbortSignal
  /** 重置控制器（用于新请求） */
  resetController: () => AbortController
}

export interface SSEStreamProcessResult {
  content: string
  thinking?: string
  generationSummary?: GenerationSummaryEventMessage
}

/**
 * 后端通过 HTTP 200 返回的业务错误。
 *
 * SSE 接口在已经开始传输后无法再修改 HTTP 状态码，因此业务错误会以
 * `type: "error"` 事件发送。将它转换为 rejected promise，避免调用方把
 * 一条包含错误事件的流误判为成功。
 */
export class SSEStreamError extends Error {
  readonly event: ErrorEventMessage
  readonly generationSummary?: GenerationSummaryEventMessage

  constructor(event: ErrorEventMessage, generationSummary?: GenerationSummaryEventMessage | null) {
    super(event.message || "服务出现异常，请稍后重试。")
    this.name = "SSEStreamError"
    this.event = event
    this.generationSummary = generationSummary || undefined
  }
}

export class SSEProtocolError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SSEProtocolError"
  }
}

function createAbortError(): Error {
  const error = new Error("流式请求已中止")
  error.name = "AbortError"
  return error
}

function createSummaryError(summary: GenerationSummaryEventMessage): ErrorEventMessage {
  const visibleFailures = summary.failures
    .slice(0, 5)
    .map((failure) => {
      const chapterIndex = typeof failure.chapter_index === "number"
        ? `第${failure.chapter_index}章`
        : "未知章节"
      return failure.chapter_name
        ? `${chapterIndex}《${failure.chapter_name}》`
        : chapterIndex
    })
  const failureLabels = visibleFailures.length > 0
    ? `；失败章节：${visibleFailures.join("、")}`
    : ""

  if (summary.status === "partial") {
    return {
      type: "error",
      error_type: "partial_generation",
      message: `项目矩阵部分生成失败：${summary.generated}/${summary.total} 个章节成功，${summary.fallback} 个章节已创建空白模板${failureLabels}`,
    }
  }

  return {
    type: "error",
    error_type: "generation_failed",
    message: `项目矩阵生成失败：${summary.fallback} 个章节仅创建了空白模板，${summary.failed} 个章节未生成${failureLabels}`,
  }
}

interface ProcessedLineResult {
  errorEvent?: ErrorEventMessage
  generationSummary?: GenerationSummaryEventMessage
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
  ): ProcessedLineResult => {
    let parsed: unknown
    try {
      parsed = JSON.parse(data)
    } catch (parseError) {
      console.error('解析流式响应失败', parseError, data)
      throw new SSEProtocolError("服务返回了无法解析的流式数据")
    }

    // JSON 解析异常与事件回调异常必须分开；下面的回调错误会向上传播。
    if (isCanvasEvent(parsed)) {
      opts.onCanvasEvent?.(parsed as CanvasEventMessage)
      return {}
    }

    if (isThinkingEvent(parsed)) {
      accumulated.thinking += parsed.content
      opts.onThinkingChunk?.(accumulated.thinking)
      return {}
    }

    if (isStatusEvent(parsed)) {
      opts.onStatusEvent?.(parsed as StatusEventMessage)
      return {}
    }

    if (isUIEvent(parsed)) {
      opts.onUIEvent?.(parsed as UIEventMessage)
      return {}
    }

    if (isProgressEvent(parsed)) {
      opts.onProgressEvent?.(parsed as ProgressEventMessage)
      return {}
    }

    if (isProcessingEvent(parsed)) {
      opts.onProcessingEvent?.(parsed as ProcessingEventMessage)
      return {}
    }

    if (isModeEvent(parsed)) {
      opts.onModeEvent?.(parsed as ModeEventMessage)
      return {}
    }

    if (isWarningEvent(parsed)) {
      const warningEvent = parsed as WarningEventMessage
      opts.onWarningEvent?.(warningEvent)
      return {}
    }

    if (isGenerationSummaryEvent(parsed)) {
      const summary = parsed as GenerationSummaryEventMessage
      opts.onGenerationSummary?.(summary)
      return { generationSummary: summary }
    }

    if (isErrorEvent(parsed)) {
      const errorEvent = parsed as ErrorEventMessage
      opts.onErrorEvent?.(errorEvent)
      return { errorEvent }
    }

    if (isOpenAIChunk(parsed)) {
      const openAIChunk = parsed as {
        choices?: Array<{ delta?: { content?: string } }>
      }
      const content = openAIChunk.choices?.[0]?.delta?.content
      if (content) {
        accumulated.content += content
        opts.onContentChunk?.(accumulated.content)
      }
      return {}
    }

    // 处理旧格式响应（后端兼容）
    const legacyFormat = parsed as LegacyFormatResponse
    if (legacyFormat.reply !== undefined || legacyFormat.canvas_update !== undefined) {
      console.warn('[SSE] 检测到后端旧格式响应，建议后端修复为标准格式:', parsed)

      if (legacyFormat.reply) {
        accumulated.content += legacyFormat.reply
        opts.onContentChunk?.(accumulated.content)
      }

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

      opts.onLegacyFormat?.(legacyFormat)
    }

    return {}
  }, [])

  /**
   * 处理响应流
   * @param response - fetch 响应对象
   * @param overrideOptions - 可选的临时选项，用于覆盖构造时的选项
   */
  const processStream = useCallback(async (
    response: Response,
    overrideOptions?: Partial<SSEStreamOptions>
  ): Promise<SSEStreamProcessResult> => {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法获取响应流')
    }

    const decoder = new TextDecoder()
    const accumulated = { content: '', thinking: '' }
    let buffer = ''
    let streamError: ErrorEventMessage | null = null
    let generationSummary: GenerationSummaryEventMessage | null = null
    let sawDone = false
    // 合并基础选项和临时选项
    const opts: SSEStreamOptions = { ...optionsRef.current, ...overrideOptions }
    const controller = controllerRef.current

    try {
      streamLoop: while (true) {
        if (controller?.signal.aborted) {
          throw createAbortError()
        }
        const { done, value } = await reader.read()
        if (controller?.signal.aborted) {
          throw createAbortError()
        }
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || !trimmedLine.startsWith('data:')) continue

          const data = trimmedLine.slice(5).trim()
          if (data === '[DONE]') {
            sawDone = true
            break streamLoop
          }

          const processed = processLine(data, accumulated, opts)
          // 继续消费剩余事件，以保留批量任务中已生成的有效结果；
          // 致命 error 在流结束后 reject，旧版 partial error 由 summary 兼容降级。
          streamError ??= processed.errorEvent || null
          generationSummary = processed.generationSummary || generationSummary
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
      if (sawDone) {
        try {
          await reader.cancel()
        } catch (cancelError) {
          console.warn("结束 SSE reader 失败", cancelError)
        }
      }
      reader.releaseLock()
    }

    const isCompatiblePartialError = Boolean(
      streamError?.error_type === "partial_generation"
      && generationSummary?.status === "partial",
    )

    if (streamError && !isCompatiblePartialError) {
      throw new SSEStreamError(streamError, generationSummary)
    }

    if (generationSummary?.status === "failed") {
      const summaryError = createSummaryError(generationSummary)
      opts.onErrorEvent?.(summaryError)
      throw new SSEStreamError(summaryError, generationSummary)
    }

    if (opts.requireGenerationSummary && !generationSummary) {
      throw new SSEProtocolError("项目矩阵生成结果缺少 generation_summary")
    }

    if (!sawDone) {
      throw new SSEProtocolError("流式响应未收到 [DONE] 结束标记")
    }

    // partial 已保留全部有效 canvas，但不是业务成功，不能触发成功回调。
    if (generationSummary?.status !== "partial") {
      opts.onComplete?.(accumulated.content, accumulated.thinking || undefined)
    }

    return {
      content: accumulated.content,
      thinking: accumulated.thinking || undefined,
      generationSummary: generationSummary || undefined,
    }
  }, [processLine])

  return {
    processStream,
    abort,
    getSignal,
    resetController,
  }
}
