/**
 * 聊天消息组件
 *
 * 渲染单条消息，支持 Markdown 和普通文本
 */

"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/shared/utils/utils"
import type { ChatMessage as ChatMessageType } from "../types"

interface ChatMessageProps {
  message: ChatMessageType
  userName?: string
}

/** 格式化相对时间 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)

  if (seconds < 60) return "刚刚"
  if (minutes < 60) return `${minutes}分钟前`
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export function ChatMessage({ message, userName = "用户" }: ChatMessageProps) {
  const isAssistant = message.role === "assistant"

  if (isAssistant) {
    return (
      <div className="space-y-2 text-left">
        {/* 时间戳 */}
        <div className="text-xs text-muted-foreground">
          AI 助手 · {formatRelativeTime(message.timestamp)}
        </div>

        {/* 消息内容 */}
        <div
          className={cn(
            "text-sm leading-relaxed",
            message.contentType === 'markdown' && "prose prose-sm dark:prose-invert max-w-none",
            message.contentType === 'markdown' && "prose-headings:text-foreground prose-p:text-foreground",
            message.contentType === 'markdown' && "prose-strong:text-foreground prose-li:text-foreground",
            message.contentType === 'markdown' && "prose-table:text-sm prose-th:px-3 prose-td:px-3"
          )}
        >
          {message.contentType === 'markdown' ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          ) : (
            <div className="whitespace-pre-wrap">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {/* 流式输出时显示闪烁光标 */}
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-primary animate-pulse" />
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 用户消息
  return (
    <div className="flex items-start justify-end text-right">
      <div className="space-y-1 max-w-[85%]">
        <div className="text-xs text-muted-foreground">
          {userName} · {formatRelativeTime(message.timestamp)}
        </div>
        <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm leading-relaxed shadow-sm">
          {message.content}
        </div>
      </div>
    </div>
  )
}
