"use client"

import { useRef, useCallback } from "react"
import { toast } from "sonner"
import { useSSEStream, type SSEStreamOptions } from "./use-sse-stream"
import {
  createMessagePair,
  createMessageCommitter,
  canStartAIRequest,
} from "@/components/ai-assistant/message-utils"
import {
  getAIRequestUrl,
  buildAIRequest,
  type AIRequestPayload,
} from "@/components/ai-assistant/api-config"
import type { ChatMessage } from "@/types/ai-assistant"
import type {
  CanvasEventMessage,
  StatusEventMessage,
  UIEventMessage,
  ProgressEventMessage,
  ModeEventMessage,
} from "@/components/canvas-elements"

/**
 * AI 请求配置
 */
export interface AIRequestConfig {
  /** 用户消息内容 */
  userContent: string
  /** 消息后缀（用于生成消息ID） */
  messageSuffix: string
  /** 完成时的默认消息 */
  defaultCompleteMessage: string
  /** 取消时的消息 */
  cancelMessage: string
  /** 失败时的消息 */
  errorMessage: string
  /** 日志前缀 */
  logPrefix: string
  /** API 请求负载（不包含 sessionId、messages） */
  payload?: Partial<Omit<AIRequestPayload, 'sessionId' | 'messages'>>
  /** 请求前的准备操作（如清空画布数据） */
  onBeforeRequest?: () => Promise<void> | void
  /** 完成后的操作 */
  onComplete?: () => void
  /** 进度处理（可选的自定义进度回调） */
  onProgress?: (progress: ProgressEventMessage) => void
  /** 是否需要获取画布 OSS Key */
  needCanvasOssKey?: boolean
}

/**
 * AI 请求状态管理器接口
 */
export interface AIRequestStateManager {
  sessionId: string
  isInitialized: boolean
  isRegenerating: boolean
  streamingMessageId: string | null
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  setStreamingMessageId: React.Dispatch<React.SetStateAction<string | null>>
  setStreamingText: React.Dispatch<React.SetStateAction<string>>
  setStreamingThinking: React.Dispatch<React.SetStateAction<string>>
  setIsThinkingExpanded: React.Dispatch<React.SetStateAction<boolean>>
  setIsRegenerating: React.Dispatch<React.SetStateAction<boolean>>
  saveSessionToStorage: (sessionId: string, messages: ChatMessage[]) => void
  getCanvasOssKey: () => Promise<string | null>
  handleCanvasEvent: (event: CanvasEventMessage) => void
}

/**
 * SSE 事件处理器配置
 */
export interface SSEEventHandlers {
  onStatusEvent?: (status: StatusEventMessage) => void
  onUIEvent?: (event: UIEventMessage) => void
  onProgressEvent?: (progress: ProgressEventMessage) => void
  onModeEvent?: (mode: ModeEventMessage) => void
  onCanvasExpand?: () => void
}

/**
 * useAIRequest Hook
 *
 * 统一的 AI 请求处理 Hook，封装了：
 * - 请求前的状态检查
 * - 消息创建和管理
 * - SSE 流式处理
 * - 错误处理和清理
 */
export function useAIRequest(
  stateManager: AIRequestStateManager,
  eventHandlers?: SSEEventHandlers
) {
  const streamingControllerRef = useRef<AbortController | null>(null)

  // 创建 SSE 流处理器（options 将在执行时动态提供）
  useSSEStream({})

  /**
   * 执行 AI 请求
   */
  const executeRequest = useCallback(async (config: AIRequestConfig) => {
    const {
      sessionId,
      isInitialized,
      isRegenerating,
      streamingMessageId,
      setChatMessages,
      setStreamingMessageId,
      setStreamingText,
      setStreamingThinking,
      setIsThinkingExpanded,
      setIsRegenerating,
      saveSessionToStorage,
      getCanvasOssKey,
      handleCanvasEvent,
    } = stateManager

    // 检查是否可以开始请求
    const checkResult = canStartAIRequest(
      isRegenerating,
      streamingMessageId,
      isInitialized,
      sessionId
    )

    if (!checkResult.canStart) {
      toast.error(checkResult.errorMessage)
      return
    }

    console.log(`[${config.logPrefix}] 开始`)

    // 设置加载状态
    setIsRegenerating(true)

    // 创建消息对
    const { userMessage, assistantPlaceholder, aiMessageId } = createMessagePair(
      config.userContent,
      config.messageSuffix
    )

    // 更新消息列表
    setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder])
    setStreamingMessageId(aiMessageId)
    setStreamingText("")
    setStreamingThinking("")
    setIsThinkingExpanded(false)

    // 重置 AbortController
    streamingControllerRef.current?.abort()
    const controller = new AbortController()
    streamingControllerRef.current = controller

    // 创建消息提交函数
    const commitAssistantContent = createMessageCommitter(
      aiMessageId,
      sessionId,
      setChatMessages,
      saveSessionToStorage
    )

    try {
      // 执行请求前的准备操作
      if (config.onBeforeRequest) {
        await config.onBeforeRequest()
      }

      // 获取画布 OSS Key
      let ossKey: string | null = null
      if (config.needCanvasOssKey !== false) {
        ossKey = await getCanvasOssKey()
        if (!ossKey) {
          throw new Error("画布上传失败")
        }
      }

      // 构建请求负载
      const payload: AIRequestPayload = {
        sessionId,
        canvasOssKey: ossKey || undefined,
        messages: [{ role: 'user', content: config.userContent }],
        ...config.payload,
      }

      // 发送请求
      const response = await fetch(getAIRequestUrl(), buildAIRequest(payload, controller.signal))

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // 累积内容
      let accumulated = ''
      let accumulatedThinking = ''

      // 创建动态 SSE 选项
      const sseOptions: SSEStreamOptions = {
        onCanvasEvent: (event) => {
          handleCanvasEvent(event)
          eventHandlers?.onCanvasExpand?.()
        },
        onThinkingChunk: (thinking) => {
          accumulatedThinking = thinking
          setStreamingThinking(thinking)
        },
        onContentChunk: (content) => {
          accumulated = content
          setStreamingText(content)
        },
        onStatusEvent: eventHandlers?.onStatusEvent,
        onUIEvent: (event) => {
          eventHandlers?.onUIEvent?.(event)
          if (event.action === 'show_panel') {
            eventHandlers?.onCanvasExpand?.()
          }
        },
        onProgressEvent: (progress) => {
          // 将进度追加到思考区域
          const progressLine = `[${progress.current}/${progress.total}] ${progress.message}\n`
          accumulatedThinking += progressLine
          setStreamingThinking(accumulatedThinking)
          // 调用自定义进度回调
          config.onProgress?.(progress)
          eventHandlers?.onProgressEvent?.(progress)
        },
        onModeEvent: eventHandlers?.onModeEvent,
        onErrorEvent: (error) => {
          toast.error(error.message)
        },
        onAbort: () => {
          console.log(`[${config.logPrefix}] 流式请求已被用户中止`)
        },
      }

      // 处理响应流
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (controller.signal.aborted) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine || !trimmedLine.startsWith('data:')) continue

            const data = trimmedLine.slice(5).trim()
            if (data === '[DONE]') continue

            // 处理 SSE 数据行
            processSSELine(data, { content: accumulated, thinking: accumulatedThinking }, sseOptions, (newAccumulated) => {
              accumulated = newAccumulated.content
              accumulatedThinking = newAccumulated.thinking
            })
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`[${config.logPrefix}] 流式请求已被用户中止`)
          return
        }
        throw error
      } finally {
        reader.releaseLock()
      }

      // 完成
      const finalContent = accumulated.trim() || config.defaultCompleteMessage
      commitAssistantContent(finalContent, accumulatedThinking || undefined)

      if (streamingControllerRef.current === controller) {
        streamingControllerRef.current = null
      }
      setStreamingMessageId(null)
      setStreamingText('')
      setIsRegenerating(false)

      // 执行完成回调
      config.onComplete?.()

      console.log(`[${config.logPrefix}] 完成`)
    } catch (error) {
      const fallback = controller.signal.aborted
        ? config.cancelMessage
        : config.errorMessage
      commitAssistantContent(fallback)

      if (streamingControllerRef.current === controller) {
        streamingControllerRef.current = null
      }
      setStreamingMessageId(null)
      setStreamingText('')
      setIsRegenerating(false)

      console.error(`[${config.logPrefix}] 失败:`, error)
    }
  }, [stateManager, eventHandlers])

  /**
   * 中止当前请求
   */
  const abort = useCallback(() => {
    streamingControllerRef.current?.abort()
    streamingControllerRef.current = null
  }, [])

  return {
    executeRequest,
    abort,
    controllerRef: streamingControllerRef,
  }
}

/**
 * 处理单行 SSE 数据
 */
function processSSELine(
  data: string,
  accumulated: { content: string; thinking: string },
  options: SSEStreamOptions,
  updateAccumulated: (newValue: { content: string; thinking: string }) => void
): void {
  try {
    const parsed = JSON.parse(data)

    // 处理 canvas 事件
    if (parsed.type === "canvas") {
      options.onCanvasEvent?.(parsed)
      return
    }

    // 处理 thinking 事件
    if (parsed.type === "thinking") {
      const newThinking = accumulated.thinking + parsed.content
      updateAccumulated({ ...accumulated, thinking: newThinking })
      options.onThinkingChunk?.(newThinking)
      return
    }

    // 处理 status 事件
    if (parsed.type === "status") {
      options.onStatusEvent?.(parsed)
      return
    }

    // 处理 ui 事件
    if (parsed.type === "ui") {
      options.onUIEvent?.(parsed)
      return
    }

    // 处理 progress 事件
    if (parsed.type === "progress") {
      options.onProgressEvent?.(parsed)
      return
    }

    // 处理 mode 事件
    if (parsed.type === "mode") {
      options.onModeEvent?.(parsed)
      return
    }

    // 处理 error 事件
    if (parsed.type === "error") {
      options.onErrorEvent?.(parsed)
      return
    }

    // 处理标准 OpenAI 格式的内容
    if (parsed.object === "chat.completion.chunk") {
      const content = parsed.choices?.[0]?.delta?.content
      if (content) {
        const newContent = accumulated.content + content
        updateAccumulated({ ...accumulated, content: newContent })
        options.onContentChunk?.(newContent)
      }
      return
    }

    // 处理旧格式响应（后端兼容）
    if (parsed.reply !== undefined || parsed.canvas_update !== undefined) {
      console.warn('[SSE] 检测到后端旧格式响应，建议后端修复为标准格式:', parsed)

      if (parsed.reply) {
        const newContent = accumulated.content + parsed.reply
        updateAccumulated({ ...accumulated, content: newContent })
        options.onContentChunk?.(newContent)
      }

      if (parsed.canvas_update && options.onCanvasEvent) {
        for (const [componentKey, componentData] of Object.entries(parsed.canvas_update)) {
          const canvasEvent = {
            type: "canvas" as const,
            action: "update" as const,
            component: componentKey,
            data: componentData,
          }
          options.onCanvasEvent(canvasEvent as CanvasEventMessage)
        }
      }

      options.onLegacyFormat?.(parsed)
    }
  } catch (parseError) {
    console.error('解析流式响应失败', parseError, data)
  }
}
