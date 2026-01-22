/**
 * AI 助手消息工具函数
 *
 * 用于创建和管理聊天消息
 */

import type { ChatMessage, MessageAttachment } from "@/types/ai-assistant"

/**
 * 生成唯一消息 ID
 */
export function generateMessageId(suffix?: string): string {
  const timestamp = Date.now().toString()
  return suffix ? `${timestamp}-${suffix}` : timestamp
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
