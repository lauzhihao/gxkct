"use client"

/**
 * 聊天消息项组件
 *
 * 渲染单条聊天消息，支持助理消息和用户消息两种类型
 */

import { useRef, useEffect, useMemo } from "react"
import Image from "next/image"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ChevronDown, ChevronUp, FileText, LayoutGrid, MousePointerClick } from "lucide-react"
import type { ChatMessage, LinkedElementInfo } from "@/types/ai-assistant"
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
  /** [MOD] 点击关联卡片时选中画布元素的回调 */
  onSelectCanvasElement?: (elementId: string) => void
  /** [MOD] 画布元素加载状态 Map（elementId -> isLoading） */
  elementLoadingStates?: Map<string, boolean>
  /** [MOD] 已删除的画布元素ID集合 */
  deletedElementIds?: Set<string>
  /** [MOD] 单指示器是否显示（首个正文 chunk 前） */
  preContentIndicatorVisible?: boolean
  /** [MOD] 单指示器短语 */
  streamingIndicatorText?: string
}

/**
 * 关联画布元素卡片组件
 * [MOD] 用于在聊天区显示与画布元素联动的小卡片
 */
interface LinkedElementCardProps {
  linkedElement: LinkedElementInfo
  isLoading: boolean
  isDeleted: boolean
  onSelect: (elementId: string) => void
}

function LinkedElementCard({ linkedElement, isLoading, isDeleted, onSelect }: LinkedElementCardProps) {
  const handleSelectLinkedElement = () => {
    onSelect(linkedElement.elementId)
  }

  // [MOD] 已删除状态：禁用点击，显示灰色样式
  if (isDeleted) {
    return (
      <div className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border border-muted/40 bg-muted/20 text-left opacity-60 cursor-not-allowed">
        {/* 图标区域 */}
        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted/30 flex items-center justify-center">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
        </div>
        {/* 内容区域 */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-muted-foreground truncate line-through">
            {linkedElement.title}
          </div>
          <div className="text-xs text-muted-foreground/70">
            元素已删除
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleSelectLinkedElement}
      className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all text-left"
    >
      {/* 图标区域 */}
      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
        <LayoutGrid className="h-4 w-4 text-primary" />
      </div>
      {/* 内容区域 */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {linkedElement.title}
        </div>
        <div className="text-xs text-muted-foreground">
          {isLoading ? "生成中..." : "点击查看画布元素"}
        </div>
      </div>
      {/* 右侧指示图标 */}
      <MousePointerClick className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
    </button>
  )
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
  onSelectCanvasElement,
  elementLoadingStates,
  deletedElementIds,
  preContentIndicatorVisible,
  streamingIndicatorText,
}: ChatMessageItemProps & {
  thinkingScrollRef: React.RefObject<HTMLDivElement | null>
}) {
  // 思考内容：流式传输时用临时状态，否则用消息中保存的内容
  const thinkingContent = isStreaming ? streamingThinking : message.thinking

  // [MOD] 流式输出时自动滚动思考区域到底部，使用 interval 避免每个 chunk 触发 effect
  useEffect(() => {
    // 仅在流式输出且思考区域展开时启动 interval
    if (!isStreaming || !isThinkingExpanded) return

    const scrollToBottom = () => {
      const scrollRef = thinkingScrollRef.current
      if (scrollRef) {
        scrollRef.scrollTop = scrollRef.scrollHeight
      }
    }

    // 使用 requestAnimationFrame 确保 DOM 已更新后再滚动
    requestAnimationFrame(scrollToBottom)

    // 每 150ms 滚动一次
    const intervalId = setInterval(scrollToBottom, 150)

    return () => clearInterval(intervalId)
  }, [isStreaming, isThinkingExpanded, thinkingScrollRef])

  // 显示内容处理
  const displayContent =
    message.id === "welcome"
      ? message.content.replace("你好，", `${greetingForMessage} `)
      : message.content
  const contentToRender = isStreaming ? streamingText || "" : displayContent
  const timeDisplay = isStreaming ? "生成中" : formatRelativeTime(message.timestamp)
  const resultLabel = message.generationStatus === "failed"
    ? "生成失败"
    : message.generationStatus === "partial"
      ? "部分完成"
      : message.generationStatus === "cancelled"
        ? "已取消"
        : timeDisplay
  const resultLabelClass = message.generationStatus === "failed"
    ? "text-destructive"
    : message.generationStatus === "partial"
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted-foreground"
  const showThinkingBlock = isLastAssistantMessage && !isStreaming && !!thinkingContent
  const shouldShowSingleIndicator = isStreaming && preContentIndicatorVisible

  // [MOD] 缓存思考预览文本，避免每次渲染都执行字符串操作
  const thinkingPreviewLength = isCanvasExpanded ? 20 : 50
  const thinkingPreview = useMemo(() => {
    if (!isStreaming || !thinkingContent) return ""
    return thinkingContent.replace(/\n/g, " ").slice(0, thinkingPreviewLength)
  }, [isStreaming, thinkingContent, thinkingPreviewLength])

  const handleToggleThinking = () => {
    onThinkingToggle()
  }

  const handleSelectCanvasElement = (elementId: string) => {
    onSelectCanvasElement?.(elementId)
  }

  return (
    <div className="space-y-2 text-left min-w-0 overflow-hidden">
      {/* 时间标签 */}
      {isStreaming ? (
        <div className="text-xs ai-loading-text-gradient">简报 · 处理中</div>
      ) : (
        <div className={`text-xs ${resultLabelClass}`}>简报 · {resultLabel}</div>
      )}

      {/* 思考区域 */}
      {showThinkingBlock && (
        <div className="text-xs min-w-0 w-full overflow-hidden">
          <button
            type="button"
            onClick={handleToggleThinking}
            className="flex items-center gap-2 text-primary/80 hover:text-primary transition-colors w-full text-left min-w-0 overflow-hidden"
          >
            {isStreaming ? (
              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-primary/50 flex-shrink-0" />
            )}
            <span className="flex-1 min-w-0 truncate">
              {isStreaming
                ? `AI 正在思考：${thinkingPreview}...`
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

      {/* [MOD] 关联画布元素卡片 */}
      {message.linkedElement && onSelectCanvasElement && (
        <LinkedElementCard
          linkedElement={message.linkedElement}
          isLoading={elementLoadingStates?.get(message.linkedElement.elementId) ?? false}
          isDeleted={deletedElementIds?.has(message.linkedElement.elementId) ?? false}
          onSelect={handleSelectCanvasElement}
        />
      )}

      {/* 消息内容 */}
      {shouldShowSingleIndicator ? (
        <div className="ai-single-indicator" role="status" aria-live="polite">
          <Image
            src="/assets/ai/gemini-sparkle.svg"
            alt=""
            width={18}
            height={18}
            className="ai-single-indicator-sparkle"
            aria-hidden="true"
            unoptimized
          />
          <div className="ai-single-indicator-text">
            {streamingIndicatorText || "正在准备响应..."}
          </div>
        </div>
      ) : (
        <div className="border-t border-dashed border-border/60 pt-3 text-sm leading-relaxed prose-ai min-w-0 overflow-hidden">
          {/* [MOD] 流式输出时跳过 Markdown 解析，使用纯文本渲染以降低 CPU 开销 */}
          {isStreaming ? (
            <div className="whitespace-pre-wrap">
              {contentToRender}
              {streamingText ? <span className="ai-streaming-caret" aria-hidden="true" /> : null}
            </div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentToRender}</ReactMarkdown>
          )}
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
  onSelectCanvasElement,
}: Pick<ChatMessageItemProps, "message" | "userName" | "onSelectCanvasElement">) {
  const attachment = message.attachment
  const hasLinkedElement = attachment?.linkedElementId

  const handleSelectAttachment = () => {
    if (!hasLinkedElement) return
    onSelectCanvasElement?.(attachment.linkedElementId!)
  }

  return (
    <div className="flex items-start justify-end text-right w-full min-w-0 overflow-hidden">
      <div className="space-y-2 max-w-[80%] min-w-0">
        <div className="text-xs text-muted-foreground">
          {userName} · {formatRelativeTime(message.timestamp)}
        </div>

        {/* 文件附件卡片 - [MOD] 点击选中画布元素，移除下载功能 */}
        {attachment && (
          <button
            type="button"
            onClick={handleSelectAttachment}
            disabled={!hasLinkedElement}
            className={`ai-message-file-card flex items-center gap-3 px-4 py-3 rounded-xl border w-full text-left transition-all ${
              hasLinkedElement
                ? "border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 cursor-pointer group"
                : "border-border/50 bg-muted/30 cursor-default"
            }`}
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
              hasLinkedElement ? "bg-primary/10" : "bg-muted/50"
            }`}>
              {hasLinkedElement ? (
                <FileText className="h-5 w-5 text-primary" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div
                className="text-sm font-medium text-foreground truncate"
                title={attachment.name}
              >
                {attachment.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {hasLinkedElement ? "点击查看画布元素" : "处理中..."}
              </div>
            </div>
            {hasLinkedElement && (
              <MousePointerClick className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            )}
          </button>
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

  return <UserMessage message={props.message} userName={props.userName} onSelectCanvasElement={props.onSelectCanvasElement} />
}
