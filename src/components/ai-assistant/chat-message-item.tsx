"use client"

/**
 * 聊天消息项组件
 *
 * 渲染单条聊天消息，支持助理消息和用户消息两种类型
 */

import { useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ChevronDown, ChevronUp, Loader2, FileText, ExternalLink } from "lucide-react"
import type { ChatMessage } from "@/types/ai-assistant"
import { formatRelativeTime } from "@/shared/utils/date-utils"

/**
 * 聊天消息项 Props
 */
export interface ChatMessageItemProps {
  /** 消息对象 */
  message: ChatMessage
  /** 是否正在流式传输 */
  isStreaming: boolean
  /** 流式传输中的文本内容 */
  streamingText?: string
  /** 流式传输中的思考内容 */
  streamingThinking?: string
  /** 思考区域是否展开 */
  isThinkingExpanded: boolean
  /** 切换思考区域展开状态 */
  onThinkingToggle: () => void
  /** 问候语（用于欢迎消息） */
  greetingForMessage: string
  /** 用户名 */
  userName: string
  /** 画布是否展开（影响显示宽度） */
  isCanvasExpanded: boolean
  /** 是否是最后一条助理消息 */
  isLastAssistantMessage: boolean
}

/**
 * 助理消息组件
 */
function AssistantMessage({
  message,
  isStreaming,
  streamingText,
  streamingThinking,
  isThinkingExpanded,
  onThinkingToggle,
  greetingForMessage,
  isCanvasExpanded,
  isLastAssistantMessage,
  thinkingScrollRef,
}: ChatMessageItemProps & {
  thinkingScrollRef: React.RefObject<HTMLDivElement | null>
}) {
  // 显示内容处理
  const displayContent =
    message.id === "welcome"
      ? message.content.replace("你好，", `${greetingForMessage} `)
      : message.content
  const contentToRender = isStreaming ? streamingText || "AI 正在生成响应..." : displayContent
  const timeDisplay = isStreaming ? "生成中" : formatRelativeTime(message.timestamp)

  // 思考内容：流式传输时用临时状态，否则用消息中保存的内容
  const thinkingContent = isStreaming ? streamingThinking : message.thinking
  const showThinkingBlock = isLastAssistantMessage && thinkingContent

  return (
    <div className="space-y-2 text-left min-w-0 overflow-hidden">
      {/* 时间标签 */}
      {isStreaming ? (
        <div className="text-xs ai-loading-text-gradient">简报 · 正在生成中</div>
      ) : (
        <div className="text-xs text-muted-foreground">简报 · {timeDisplay}</div>
      )}

      {/* 思考区域 */}
      {showThinkingBlock && (
        <div className="text-xs min-w-0 w-full overflow-hidden">
          <button
            type="button"
            onClick={onThinkingToggle}
            className="flex items-center gap-2 text-primary/80 hover:text-primary transition-colors w-full text-left min-w-0 overflow-hidden"
          >
            {isStreaming ? (
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary flex-shrink-0" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-primary/50 flex-shrink-0" />
            )}
            <span className="flex-1 min-w-0 truncate">
              {isStreaming
                ? `AI 正在思考：${thinkingContent?.replace(/\n/g, " ").slice(0, isCanvasExpanded ? 20 : 50)}...`
                : "AI思考完毕：点击此处查看完整思考过程"}
            </span>
            {isThinkingExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
            )}
          </button>
          {isThinkingExpanded && (
            <div
              ref={thinkingScrollRef}
              className="mt-2 pl-4 border-l-2 border-primary/30 text-muted-foreground/80 text-[11px] leading-relaxed max-h-32 min-w-0 max-w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words"
            >
              {thinkingContent}
            </div>
          )}
        </div>
      )}

      {/* 消息内容 */}
      {isStreaming && !streamingText ? (
        <div className="py-4 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
        </div>
      ) : (
        <div className="border-t border-dashed border-border/60 pt-3 text-sm leading-relaxed prose-ai min-w-0 overflow-hidden">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentToRender}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

/**
 * 用户消息组件
 */
function UserMessage({
  message,
  userName,
}: Pick<ChatMessageItemProps, "message" | "userName">) {
  return (
    <div className="flex items-start justify-end text-right w-full min-w-0 overflow-hidden">
      <div className="space-y-2 max-w-[80%] min-w-0">
        <div className="text-xs text-muted-foreground">
          {userName}老师 · {formatRelativeTime(message.timestamp)}
        </div>

        {/* 文件附件卡片 */}
        {message.attachment && (
          <a
            href={message.attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ai-message-file-card flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors group"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div
                className="text-sm font-medium text-foreground truncate"
                title={message.attachment.name}
              >
                {message.attachment.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {(message.attachment.size / 1024).toFixed(1)} KB
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </a>
        )}

        {/* 消息内容 */}
        <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm leading-relaxed shadow-sm text-left whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    </div>
  )
}

/**
 * 聊天消息项组件
 */
export function ChatMessageItem(props: ChatMessageItemProps) {
  const thinkingScrollRef = useRef<HTMLDivElement>(null)
  const isAssistant = props.message.role === "assistant"

  if (isAssistant) {
    return (
      <AssistantMessage
        {...props}
        thinkingScrollRef={thinkingScrollRef}
      />
    )
  }

  return <UserMessage message={props.message} userName={props.userName} />
}
