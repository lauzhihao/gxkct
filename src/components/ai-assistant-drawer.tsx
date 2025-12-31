"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Send } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import { buildApiUrl } from "@/lib/api"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb"

interface AiAssistantDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedNodeName?: string | null
  activeTabLabel?: string | null
  userName?: string
}

// 计算相对时间显示
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (seconds < 60) return "刚刚"
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  if (weeks < 4) return `${weeks}周前`
  if (months < 12) return `${months}月前`
  return "更早前"
}

export function AiAssistantDrawer({
  open,
  onOpenChange,
  selectedNodeName,
  activeTabLabel,
  userName = "用户",
}: AiAssistantDrawerProps) {
  const [inputMessage, setInputMessage] = useState("")
  const [isInputExpanded, setIsInputExpanded] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      role: "assistant" as const,
      content: "你好，我是高校课程通的 AI 助手，可以帮助你快速分析课程结构、生成教学方案，或总结当前页面的信息。",
      timestamp: Date.now(),
    },
  ])
  const [thinkingIndex, setThinkingIndex] = useState(0)
  const [streamingText, setStreamingText] = useState("")
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const streamingControllerRef = useRef<AbortController | null>(null)
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)

  const thinkingPrompts = useMemo(
    () => [
      "解析当前课程结构，识别关键节点",
      "匹配历史案例，抽取可复用策略",
      "评估教学目标是否与能力点一致",
      "规划输出格式，准备建议与下一步行动",
    ],
    [],
  )

  const getTimeGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "上午好"
    if (hour < 18) return "下午好"
    return "晚上好"
  }
  const greetingForMessage = `${userName}老师：${getTimeGreeting()}。`

  useEffect(() => {
    return () => {
      streamingControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setThinkingIndex((prev) => (prev + 1) % thinkingPrompts.length)
    }, 2000 + Math.random() * 1500)
    return () => clearInterval(timer)
  }, [thinkingPrompts.length])

  const prevMessageCountRef = useRef(chatMessages.length)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    const viewport = scrollViewportRef.current
    if (!viewport) return

    // 组件从关闭变为打开时，滚动到底部（仅当有历史消息时）
    const justOpened = open && !wasOpenRef.current && chatMessages.length > 1
    // 只在消息数量增加或正在流式输出时滚动到底部
    const hasNewMessage = chatMessages.length > prevMessageCountRef.current
    const isStreaming = streamingMessageId !== null

    if (justOpened || hasNewMessage || isStreaming) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' })
    }

    prevMessageCountRef.current = chatMessages.length
    wasOpenRef.current = open
  }, [open, chatMessages, streamingMessageId, streamingText])

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) {
      return
    }

    const trimmedContent = inputMessage.trim()
    const timestamp = Date.now().toString()
    const aiMessageId = `${timestamp}-ai`

    const userMessage = {
      id: timestamp,
      role: "user" as const,
      content: trimmedContent,
      timestamp: Date.now(),
    }

    const assistantPlaceholder = {
      id: aiMessageId,
      role: "assistant" as const,
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    }

    setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder])
    setInputMessage("")
    setStreamingMessageId(aiMessageId)
    setStreamingText("")

    streamingControllerRef.current?.abort()
    const controller = new AbortController()
    streamingControllerRef.current = controller

    const commitAssistantContent = (content: string) => {
      setChatMessages((prev) =>
        prev.map((message) => (message.id === aiMessageId ? { ...message, content, isStreaming: false } : message)),
      )
    }

    // 使用buildApiUrl构建SSE请求URL，确保preview环境下添加/college前缀
    const requestUrl = buildApiUrl(`/api/chat/aliqwen-sse?unique=${encodeURIComponent(aiMessageId)}&message=${encodeURIComponent(trimmedContent)}`)

    try {
      const eventSource = new EventSource(requestUrl)
      streamingControllerRef.current = controller
      controller.signal.addEventListener('abort', () => {
        eventSource.close()
      })

      let accumulated = ''
      let completed = false
      let lastPayload: unknown = null

      const extractContent = (payload: unknown) => {
        if (payload && typeof payload === 'object') {
          const p = payload as Record<string, unknown>
          if (typeof p.message === 'string' && p.message.trim()) {
            return p.message
          }
          if (Array.isArray(p.history) && p.history.length > 0) {
            const latest = p.history[p.history.length - 1]
            if (latest && typeof latest === 'object' && typeof (latest as Record<string, unknown>).content === 'string') {
              const content = (latest as Record<string, unknown>).content as string
              if (content.trim()) {
                return content
              }
            }
          }
        }
        return ''
      }

      const finalizeStream = (finalMessage?: string) => {
        if (completed || controller.signal.aborted) return
        completed = true
        // 优先保留已流式累积的内容，避免被最终事件覆盖
        const aggregatedText = accumulated.trim()
        const finalChunk = finalMessage?.trim() ?? ''
        const resultText = aggregatedText || finalChunk
        const content = resultText || 'AI 暂无新的建议，请稍后再试。'
        commitAssistantContent(content)
        eventSource.close()
        if (streamingControllerRef.current === controller) {
          streamingControllerRef.current = null
        }
        setStreamingMessageId(null)
        setStreamingText('')
      }

      eventSource.addEventListener('message', (event) => {
        if (controller.signal.aborted) return
        try {
          const payload = JSON.parse(event.data)
          lastPayload = payload
          const chunk = extractContent(payload)
          if (chunk) {
            accumulated += chunk
            setStreamingText(accumulated)
          }
        } catch (error) {
          console.error('解析流式响应失败', error, event.data)
        }
      })

      eventSource.addEventListener('done', (event) => {
        if (controller.signal.aborted) return
        try {
          const payload = JSON.parse(event.data)
          const finalText = extractContent(payload)
          if (finalText) {
            finalizeStream(finalText)
            return
          }
        } catch (error) {
          console.error('解析完成事件失败', error, event.data)
        }
        const fallbackText = extractContent(lastPayload)
        finalizeStream(fallbackText || undefined)
      })

      eventSource.onerror = (error) => {
        if (controller.signal.aborted) return
        console.error('SSE 错误', error)
        const fallbackText = extractContent(lastPayload)
        finalizeStream(fallbackText || undefined)
      }
    } catch {
      const fallback = controller.signal.aborted
        ? "已取消本次 AI 响应。"
        : "抱歉，AI 服务暂时不可用，请稍后再试。"
      commitAssistantContent(fallback)
      if (streamingControllerRef.current === controller) {
        streamingControllerRef.current = null
      }
      setStreamingMessageId(null)
      setStreamingText('')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="ai-drawer-content !w-[605px] sm:!w-[692px] lg:!w-[749px] xl:!w-[807px] 2xl:!w-[864px] sm:!max-w-none lg:!max-w-none 2xl:!max-w-none max-w-[90vw] p-0 bg-background/90 backdrop-blur-xl border-border/40"
      >
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 relative">
            <SheetTitle className="text-left text-xl font-semibold flex items-center gap-2">
              <img
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAqCAMAAAAqEZ1jAAAAAXNSR0IArs4c6QAAAAlwSFlzAAAhOAAAITgBRZYxYAAAAKJQTFRFAAAAenb/RpP/k2j/XXf7cXX6P5z7i2n8W3j7ZHP7jmn9VID7Qpf8jWn8Xnr6iWr8YHb7i2n8RJb9dWz8WXr8mWj9RpP8W3n8bW/8l2j+QJz9Q5f9ToT8fWv9ZW/8lWj9VID8YnX7Pp79QZr9pWb+RJT8m2f9k2j9SYz8jWn9hmr8UIT8fmv8VX78Xnn7d2z8ZHT7WHr7bm77Xnb7Z3D7YHH7RJOQRAAAACJ0Uk5TABAgICAwQEBAWF5gZXBwgICbn5+fo7+/vsLP39/f3urv73XwOA8AAAKfSURBVHja7dbJcuIwFIXhIzCxMTMNcdwMDoMZY4NxeP9X66srEckYQlPVvcvPBhZ8dVSIAvz03xNV/Luq4Xq9Hgo8nfDqjXq97hS1yXZNhXg2Z3o+f1KnLqx62y17Pp5smp+158EUaW6I52rkxLF3eoNpt1Ne+bR+Fd8U5Oc8Px6P5M0Evgq11ytpy0jgbk6e5cSxd2pb7yKOikpTouWyhbsNMsnpefZpOzsCI7c8brkM74/LqFSC7HkwVTu9lsB14ZJy745LlDdV5+3iQTXC7s9z3pNEggOh9s3woOFqJT2BmzUSLnMQEEeeh2+rkraiOrjZeL+XXEBwyp71Ybg+hWL+iltGt8ftKQI9QMzSlDxz9VofssIMdxitdJEvbo3jxqAGKXtt6N4OkpvgkmiFa50Ch1UU8zab/Ya4Br/IUnnewHCHg+FEh7/ExUIXdq+KG4N7z3hfzXDkaa5FmGpdMENrYWWjaoDrJtJLu4ajFFfbUduryN1ue4brb2KpjSvgvETe53R24U6Ggz+RYJnsCTMujmMJ9qELErkv9y7cyXAGtNCoI2Dqx9ymAl1bcYMLJ2NO5fZ2dmHLxiBGrJlxEAl7M1HkTFUzseeiWHOxYK+CrwLltRX3qTk7/4PbTXDdaBHLxytMdcllaaA56U1RSEyU56M0jotfYBLvynM091ni0GGtPO73nLkR7AaK6yqOKnG1g+wXrnqZz9nrw87bszdjjn/dDGffbgdX9YmT4HykaoLTp/UABGfyypx7a1yFNb0wpl7BddW8geSO5JU5TE63xhmOPb2uok8reN1Nrn4qjQNBlmfdvkB5beaoMgdP4LpFgbNuX3svtSwABoZ7WPOKa0Inxgl7DurMdfFXVV7savjK8WQ1/cz5+Q9e7A/jUZeiPQO0fwAAAABJRU5ErkJggg=="
                alt="AI 助手"
                className="h-8 w-8 object-contain"
              />
              课程开发AI助手
            </SheetTitle>
            <p className="text-sm text-muted-foreground text-left">
              灵感来自人工智能，实时协助你分析课程、生成摘要与行动建议。
            </p>
            {(selectedNodeName || activeTabLabel) && (
              <Breadcrumb className="mt-3">
                <BreadcrumbList className="text-xs text-muted-foreground text-left">
                  {selectedNodeName && (
                    <BreadcrumbItem>
                      <BreadcrumbPage>{selectedNodeName}</BreadcrumbPage>
                    </BreadcrumbItem>
                  )}
                  {selectedNodeName && activeTabLabel && <BreadcrumbSeparator />}
                  {activeTabLabel && (
                    <BreadcrumbItem>
                      <BreadcrumbPage>{activeTabLabel}</BreadcrumbPage>
                    </BreadcrumbItem>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            )}
            {/* 炫彩分割线 - AI回复时显示动画 */}
            <div
              className={`ai-header-divider ${streamingMessageId ? 'ai-header-divider-active' : ''}`}
            />
          </SheetHeader>

          <ScrollArea ref={scrollViewportRef} className="flex-1 min-h-0 px-6 py-4">
            <div className="space-y-5 pr-2">
              {chatMessages.map((message) => {
                const isAssistant = message.role === "assistant"
                const shouldStream = streamingMessageId === message.id
                const shouldShowThinking = isAssistant && shouldStream
                const displayContent =
                  message.id === "welcome" && isAssistant
                    ? message.content.replace("你好，", `${greetingForMessage} `)
                    : message.content
                const contentToRender = shouldStream ? streamingText || "AI 正在生成响应..." : displayContent
                const timeDisplay = shouldStream ? "生成中" : formatRelativeTime(message.timestamp)

                return isAssistant ? (
                  <div key={message.id} className="space-y-2 text-left">
                    <div className="text-xs text-muted-foreground">简报 · {timeDisplay}</div>
                    {shouldShowThinking && (
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2 text-primary/80">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                          <span>AI 正在思考：{thinkingPrompts[thinkingIndex]}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground/80">
                          主要思考：{thinkingPrompts[(thinkingIndex + 1) % thinkingPrompts.length]}
                        </div>
                      </div>
                    )}
                    <div className="border-t border-dashed border-border/60 pt-3 text-sm leading-relaxed prose-ai">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {contentToRender}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex items-start justify-end text-right">
                    <div className="space-y-1 max-w-[80%]">
                      <div className="text-xs text-muted-foreground">{userName}老师 · {formatRelativeTime(message.timestamp)}</div>
                      <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm leading-relaxed shadow-sm">
                        {message.content}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          <div className="border-t border-border/60 bg-background/80 p-6 flex-shrink-0">
            <div className="ai-assistant-gradient-inner p-4 shadow-inner flex-shrink-0">
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <div className="ai-assistant-border-wrapper">
                      <div className="ai-assistant-border-surface">
                      <ExpandableTextarea
                        value={inputMessage}
                        onChange={(value) => setInputMessage(value)}
                        onExpandedChange={setIsInputExpanded}
                        placeholder="描述你的需求，例如：生成本专业的课程知识图谱..."
                        className="ai-assistant-textarea bg-background/80 px-3 py-2 text-sm pr-16"
                        rows={4}
                        hideCounter
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                            event.preventDefault()
                            handleSendMessage()
                          }
                        }}
                      />
                      </div>
                    </div>
                    <Button
                      size="icon"
                      className="absolute right-3 h-7 w-7 rounded-full transition-[transform,top,bottom] duration-200 z-10"
                      style={
                        isInputExpanded
                          ? { bottom: "12px", top: "auto", transform: "translateY(0)" }
                          : { top: "50%", bottom: "auto", transform: "translateY(-50%)" }
                      }
                      disabled={!inputMessage.trim()}
                      onClick={handleSendMessage}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                    AI 可能会生成不准确的内容，请务必核对后再决定是否采纳。
                  </p>
                </div>
              </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
