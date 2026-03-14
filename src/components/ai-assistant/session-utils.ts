/**
 * 会话管理工具函数
 *
 * 处理 AI 助手会话的创建、加载和存储
 */

import type { ChatMessage } from "@/types/ai-assistant"
import { STORAGE_KEYS } from "./api-config"

/** 欢迎消息 ID 常量 */
export const WELCOME_MESSAGE_ID = "welcome"

/**
 * 创建默认欢迎消息
 */
export function createWelcomeMessage(): ChatMessage {
  return {
    id: WELCOME_MESSAGE_ID,
    role: "assistant",
    content: "你好，我是高校课程通的 AI 助手，可以帮助你快速分析课程结构、生成教学方案，或总结当前页面的信息。\n\n您可以拖拽一个文件到聊天区域内，我将以它为参考帮您完成课程设计。\n\n您也可以直接向我描述您的想法。",
    timestamp: Date.now(),
  }
}

/**
 * 生成新的会话 ID
 * 格式：毫秒时间戳 + 随机字符串
 */
export function generateSessionId(): string {
  return `${Date.now()}${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 从 localStorage 读取会话数据
 */
export function loadSessionFromStorage(): { sessionId: string; messages: ChatMessage[] } {
  if (typeof window === "undefined") {
    return { sessionId: generateSessionId(), messages: [createWelcomeMessage()] }
  }

  try {
    const storedSessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID)
    const storedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES)

    if (storedSessionId && storedMessages) {
      const messages = JSON.parse(storedMessages) as ChatMessage[]
      // 过滤掉正在流式传输的消息
      const validMessages = messages.filter(m => !m.isStreaming)
      // [MOD] 按 ID 去重，保留首次出现的消息（修复历史数据中可能存在的重复 ID 问题）
      const seenIds = new Set<string>()
      const uniqueMessages = validMessages.filter(m => {
        if (seenIds.has(m.id)) {
          console.warn("[会话加载] 检测到重复消息ID，已过滤:", m.id)
          return false
        }
        seenIds.add(m.id)
        return true
      })
      if (uniqueMessages.length > 0) {
        return { sessionId: storedSessionId, messages: uniqueMessages }
      }
    }
  } catch (error) {
    console.error("读取会话历史失败", error)
  }

  // 没有有效数据时，创建新会话
  const newSessionId = generateSessionId()
  const newMessages = [createWelcomeMessage()]
  saveSessionToStorage(newSessionId, newMessages)
  return { sessionId: newSessionId, messages: newMessages }
}

/**
 * 保存会话数据到 localStorage
 */
export function saveSessionToStorage(sessionId: string, messages: ChatMessage[]): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId)
    // 保存时过滤掉正在流式传输的消息
    const messagesToSave = messages.filter(m => !m.isStreaming)
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messagesToSave))
  } catch (error) {
    console.error("保存会话历史失败", error)
  }
}
