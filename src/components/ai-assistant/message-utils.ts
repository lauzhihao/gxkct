/**
 * AI 助手消息工具函数
 *
 * 用于创建和管理聊天消息
 */

import type { ChatMessage, MessageAttachment, LinkedElementInfo } from "@/types/ai-assistant"
import { CanvasComponentType } from "@/components/canvas-elements/types"

/**
 * 生成唯一消息 ID
 * [MOD] 添加随机字符串，解决同一毫秒内创建多个消息时 ID 重复的问题
 */
export function generateMessageId(suffix?: string): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).slice(2, 6) // 4位随机字符
  const base = `${timestamp}${random}`
  return suffix ? `${base}-${suffix}` : base
}

/**
 * 创建用户消息
 */
export function createUserMessage(
  content: string,
  attachment?: MessageAttachment,
  id?: string
): ChatMessage {
  return {
    id: id || generateMessageId("user"),
    role: "user" as const,
    content,
    timestamp: Date.now(),
    attachment,
  }
}

/**
 * 创建 AI 响应占位消息
 */
export function createAssistantPlaceholder(id?: string): ChatMessage {
  return {
    id: id || generateMessageId("ai"),
    role: "assistant" as const,
    content: "",
    timestamp: Date.now(),
    isStreaming: true,
  }
}

/**
 * 创建消息提交函数
 *
 * 用于在流式传输完成后更新 AI 消息内容
 */
export function createMessageCommitter(
  aiMessageId: string,
  sessionId: string,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  saveToStorage: (sessionId: string, messages: ChatMessage[]) => void
): (content: string, thinking?: string) => void {
  return (content: string, thinking?: string) => {
    setChatMessages((prev) => {
      const updatedMessages = prev.map((message) =>
        message.id === aiMessageId
          ? { ...message, content, thinking, isStreaming: false }
          : message
      )
      saveToStorage(sessionId, updatedMessages)
      return updatedMessages
    })
  }
}

/**
 * 检查是否可以开始 AI 请求
 */
export interface CanStartRequestResult {
  canStart: boolean
  errorMessage?: string
}

export function canStartAIRequest(
  isRegenerating: boolean,
  streamingMessageId: string | null,
  isInitialized: boolean,
  sessionId: string
): CanStartRequestResult {
  if (isRegenerating || streamingMessageId) {
    return {
      canStart: false,
      errorMessage: "请等待当前操作完成",
    }
  }

  if (!isInitialized || !sessionId) {
    return {
      canStart: false,
      errorMessage: "会话未初始化",
    }
  }

  return { canStart: true }
}

/**
 * 创建消息对（用户消息 + AI 占位消息）
 */
export interface MessagePair {
  userMessage: ChatMessage
  assistantPlaceholder: ChatMessage
  aiMessageId: string
}

export function createMessagePair(
  userContent: string,
  messageSuffix: string,
  attachment?: MessageAttachment
): MessagePair {
  const timestamp = Date.now().toString()
  const userMessageId = `${timestamp}-user`
  const aiMessageId = `${timestamp}-${messageSuffix}`

  const userMessage = createUserMessage(userContent, attachment, userMessageId)
  const assistantPlaceholder = createAssistantPlaceholder(aiMessageId)

  return {
    userMessage,
    assistantPlaceholder,
    aiMessageId,
  }
}

/**
 * [MOD] 画布元素类型到显示标题的映射（默认标题，当无法从数据中提取时使用）
 */
export const ELEMENT_TYPE_TITLES: Partial<Record<CanvasComponentType, string>> = {
  [CanvasComponentType.COURSE_INFO]: "课程信息",
  [CanvasComponentType.GRADUATION_SUPPORT]: "专业矩阵",
  [CanvasComponentType.OBJECTIVE_PANEL]: "教学目标",
  [CanvasComponentType.CHAPTER_PANEL]: "章节项目",
  [CanvasComponentType.COURSE_POINT_PANEL]: "课点信息",
  [CanvasComponentType.KSA_PANEL]: "KSA三要素",
  [CanvasComponentType.COURSE_MATRIX]: "课程矩阵",
  [CanvasComponentType.PROJECT_MATRIX]: "项目矩阵",
  [CanvasComponentType.COURSE_REPORT]: "开课报告",
}

/**
 * [MOD] 元素类型到标题字段的 O(1) 映射表
 * field: 从 event.data 中提取标题的字段名
 * suffix: 可选后缀，用于组合显示（如 "第一章 · 项目矩阵"）
 */
const ELEMENT_TITLE_FIELDS: Partial<Record<CanvasComponentType, { field: string; suffix?: string }>> = {
  [CanvasComponentType.COURSE_INFO]: { field: "name" },
  [CanvasComponentType.COURSE_MATRIX]: { field: "course_name", suffix: "课程矩阵" },
  [CanvasComponentType.PROJECT_MATRIX]: { field: "chapter_name", suffix: "项目矩阵" },
  [CanvasComponentType.COURSE_REPORT]: { field: "course_name", suffix: "开课报告" },
}

/**
 * [MOD] 从元素数据中提取显示标题（O(1) 复杂度）
 * @param elementType 元素类型
 * @param data 元素数据（来自 SSE event.data）
 * @returns 显示标题
 */
export function getElementDisplayTitle(
  elementType: CanvasComponentType,
  data: unknown
): string {
  const config = ELEMENT_TITLE_FIELDS[elementType]

  // 无映射配置，使用默认标题
  if (!config) {
    return ELEMENT_TYPE_TITLES[elementType] || "画布元素"
  }

  // 从数据中提取字段值
  const value = (data as Record<string, unknown>)?.[config.field]

  // 无有效值，使用默认标题
  if (!value || typeof value !== "string") {
    return ELEMENT_TYPE_TITLES[elementType] || "画布元素"
  }

  // 有后缀时组合显示，否则直接返回值
  return config.suffix ? `${value} · ${config.suffix}` : value
}

/**
 * [MOD] 创建关联画布元素的消息
 * 用于在聊天区显示与画布元素联动的小卡片
 */
export function createLinkedElementMessage(
  elementId: string,
  elementType: CanvasComponentType,
  customTitle?: string
): ChatMessage {
  const title = customTitle || ELEMENT_TYPE_TITLES[elementType] || "画布元素"

  const linkedElement: LinkedElementInfo = {
    elementId,
    elementType,
    title,
  }

  return {
    id: generateMessageId(`linked-${elementType}`),
    role: "assistant" as const,
    content: "", // 关联卡片消息不需要文本内容
    timestamp: Date.now(),
    linkedElement,
  }
}
