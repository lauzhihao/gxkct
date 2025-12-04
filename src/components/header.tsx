"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, User, Palette, Bell, Sparkles, Send } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import { cn } from "@/shared/utils/utils"
import { api, getStoredAuthUser, clearAllAuthData } from "@/lib/api"
import { useActivePageTracker } from "@/shared/hooks/use-active-page-tracker"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb"

const COLOR_THEMES = {
  green: {
    name: "NaiveUI 绿色",
    primary: "#18a058",
    primaryDark: "#0c7a43",
    primaryLight: "#36ad6a",
    primaryHover: "rgba(24, 160, 88, 0.12)",
    primaryPressed: "rgba(24, 160, 88, 0.18)",
    primaryActive: "rgba(24, 160, 88, 0.1)",
    oklchPrimary: "oklch(0.58 0.15 155)",
    oklchAccent: "oklch(0.62 0.16 155)",
    hue: 155,
  },
  vercelBlue: {
    name: "Vercel 蓝色",
    primary: "#0070f3",
    primaryDark: "#0051cc",
    primaryLight: "#3291ff",
    primaryHover: "rgba(0, 112, 243, 0.12)",
    primaryPressed: "rgba(0, 112, 243, 0.18)",
    primaryActive: "rgba(0, 112, 243, 0.1)",
    oklchPrimary: "oklch(0.58 0.2 240)",
    oklchAccent: "oklch(0.62 0.21 240)",
    hue: 240,
  },
  antBlue: {
    name: "Ant Design 蓝色",
    primary: "#1890ff",
    primaryDark: "#096dd9",
    primaryLight: "#40a9ff",
    primaryHover: "rgba(24, 144, 255, 0.12)",
    primaryPressed: "rgba(24, 144, 255, 0.18)",
    primaryActive: "rgba(24, 144, 255, 0.1)",
    oklchPrimary: "oklch(0.62 0.22 245)",
    oklchAccent: "oklch(0.66 0.23 245)",
    hue: 245,
  },
  microsoftBlue: {
    name: "微软蓝色",
    primary: "#0078d4",
    primaryDark: "#005a9e",
    primaryLight: "#2b88d8",
    primaryHover: "rgba(0, 120, 212, 0.12)",
    primaryPressed: "rgba(0, 120, 212, 0.18)",
    primaryActive: "rgba(0, 120, 212, 0.1)",
    oklchPrimary: "oklch(0.56 0.18 235)",
    oklchAccent: "oklch(0.6 0.19 235)",
    hue: 235,
  },
  tailwindBlue: {
    name: "Tailwind 蓝色",
    primary: "#2563eb",
    primaryDark: "#1e40af",
    primaryLight: "#3b82f6",
    primaryHover: "rgba(37, 99, 235, 0.12)",
    primaryPressed: "rgba(37, 99, 235, 0.18)",
    primaryActive: "rgba(37, 99, 235, 0.1)",
    oklchPrimary: "oklch(0.55 0.24 250)",
    oklchAccent: "oklch(0.59 0.25 250)",
    hue: 250,
  },
  claudeOrange: {
    name: "Claude 橙色",
    primary: "#E87C3E",
    primaryDark: "#C5621F",
    primaryLight: "#FF9B5E",
    primaryHover: "rgba(232, 124, 62, 0.12)",
    primaryPressed: "rgba(232, 124, 62, 0.18)",
    primaryActive: "rgba(232, 124, 62, 0.1)",
    oklchPrimary: "oklch(0.65 0.16 45)",
    oklchAccent: "oklch(0.69 0.17 45)",
    hue: 45,
  },
  hermesOrange: {
    name: "爱马仕橙色",
    primary: "#F37021",
    primaryDark: "#D85A0D",
    primaryLight: "#FF9B5E",
    primaryHover: "rgba(243, 112, 33, 0.12)",
    primaryPressed: "rgba(243, 112, 33, 0.18)",
    primaryActive: "rgba(243, 112, 33, 0.1)",
    oklchPrimary: "oklch(0.68 0.16 35)",
    oklchAccent: "oklch(0.72 0.17 35)",
    hue: 35,
  },
  appleBlue: {
    name: "Apple 蓝色",
    primary: "#0071e3",
    primaryDark: "#0051B3",
    primaryLight: "#3A8FE8",
    primaryHover: "rgba(0, 113, 227, 0.12)",
    primaryPressed: "rgba(0, 113, 227, 0.18)",
    primaryActive: "rgba(0, 113, 227, 0.1)",
    oklchPrimary: "oklch(0.56 0.19 238)",
    oklchAccent: "oklch(0.6 0.2 238)",
    hue: 238,
  },
  notionPurple: {
    name: "Tsinghua 清华紫",
    primary: "#9B59B6",
    primaryDark: "#7D3C98",
    primaryLight: "#BB8FCE",
    primaryHover: "rgba(155, 89, 182, 0.12)",
    primaryPressed: "rgba(155, 89, 182, 0.18)",
    primaryActive: "rgba(155, 89, 182, 0.1)",
    oklchPrimary: "oklch(0.52 0.15 310)",
    oklchAccent: "oklch(0.56 0.16 310)",
    hue: 310,
  },
  slackAubergine: {
    name: "Slack 茄紫",
    primary: "#611f69",
    primaryDark: "#4A1850",
    primaryLight: "#7E3B85",
    primaryHover: "rgba(97, 31, 105, 0.12)",
    primaryPressed: "rgba(97, 31, 105, 0.18)",
    primaryActive: "rgba(97, 31, 105, 0.1)",
    oklchPrimary: "oklch(0.35 0.12 320)",
    oklchAccent: "oklch(0.39 0.13 320)",
    hue: 320,
  },
  linearPurple: {
    name: "Linear 紫色",
    primary: "#5E6AD2",
    primaryDark: "#4854B8",
    primaryLight: "#7B85E0",
    primaryHover: "rgba(94, 106, 210, 0.12)",
    primaryPressed: "rgba(94, 106, 210, 0.18)",
    primaryActive: "rgba(94, 106, 210, 0.1)",
    oklchPrimary: "oklch(0.54 0.16 270)",
    oklchAccent: "oklch(0.58 0.17 270)",
    hue: 270,
  },
}

const normalizeStreamChunk = (input: string) => {
  const lines = input.split(/\n+/)
  const parts: string[] = []
  let done = false

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    const normalized = line.startsWith('data:') ? line.slice(5).trimStart() : line
    if (!normalized) continue
    if (normalized === '[DONE]' || normalized === 'done') {
      done = true
      break
    }
    if (normalized.startsWith('done:')) {
      done = true
      const payloadText = normalized.slice(5).trimStart()
      if (payloadText) {
        parts.push(payloadText)
      }
      break
    }
    parts.push(normalized)
  }

  return { parts, done }
}

interface HeaderProps {
  onResetData?: () => void
  isTreeCollapsed?: boolean
  currentPath?: string
  selectedNodeName?: string | null
}

interface Notification {
  id: string
  title: string
  content: string
  time: string
  read: boolean
}

// Mock消息数据
const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "系统通知",
    content: "您有新的课程评分待审核",
    time: "5分钟前",
    read: false,
  },
  {
    id: "2",
    title: "资源更新",
    content: "《数据结构》课程资源已更新",
    time: "1小时前",
    read: false,
  },
  {
    id: "3",
    title: "评分提醒",
    content: "专业评分已完成，请查看",
    time: "2小时前",
    read: true,
  },
  {
    id: "4",
    title: "系统维护",
    content: "系统将于今晚22:00进行维护",
    time: "昨天",
    read: true,
  },
]

export function Header({ onResetData, isTreeCollapsed, currentPath, selectedNodeName }: HeaderProps) {
  const router = useRouter()
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [inputMessage, setInputMessage] = useState("")
  const [isInputExpanded, setIsInputExpanded] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    {
      id: "1",
      role: "assistant" as const,
      content: "你好，我是高校课程通的 AI 助手，可以帮助你快速分析课程结构、生成教学方案，或总结当前页面的信息。",
      time: "刚刚",
    },
    {
      id: "2",
      role: "user" as const,
      content: "帮我分析一下课程大纲里的关键知识点。",
      time: "1 分钟前",
    },
    {
      id: "3",
      role: "assistant" as const,
      content: "已根据课程大纲提取出 5 个重点知识点，并标记相关的教学目标与考核方式。你需要导出 Word 版本还是生成课堂提纲？",
      time: "1 分钟前",
    },
  ])
  const [currentTheme, setCurrentTheme] = useState<keyof typeof COLOR_THEMES>("vercelBlue")
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [userName, setUserName] = useState<string>("用户")
  const [thinkingIndex, setThinkingIndex] = useState(0)
  const [streamingText, setStreamingText] = useState("")
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const streamingControllerRef = useRef<AbortController | null>(null)
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const { activeTabLabel } = useActivePageTracker()
  const thinkingPrompts = useMemo(
    () => [
      "解析当前课程结构，识别关键节点",
      "匹配历史案例，抽取可复用策略",
      "评估教学目标是否与能力点一致",
      "规划输出格式，准备建议与下一步行动",
    ],
    [],
  )

  const unreadCount = notifications.filter((n) => !n.read).length

  const getTimeGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "上午好"
    if (hour < 18) return "下午好"
    return "晚上好"
  }
  const greetingText = `${getTimeGreeting()}，${userName}老师`
  const greetingForMessage = `${userName}老师：${getTimeGreeting()}。`

  // 处理退出登录
  const handleLogout = () => {
    clearAllAuthData()
    router.push('/login')
  }

  useEffect(() => {
    // 从认证系统获取用户信息
    const authUser = getStoredAuthUser()
    if (authUser && authUser.userName) {
      setUserName(authUser.userName)
    }
  }, [])

  useEffect(() => {
    const loadTheme = async () => {
      const response = await api.config.getTheme()
      if (response.data && response.data.colorTheme) {
        const savedTheme = response.data.colorTheme as keyof typeof COLOR_THEMES
        if (COLOR_THEMES[savedTheme]) {
          setCurrentTheme(savedTheme)
          applyTheme(savedTheme)
        }
      }
    }
    loadTheme()
  }, [])

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

  useEffect(() => {
    const viewport = scrollViewportRef.current
    if (!viewport) return
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' })
  }, [chatMessages, streamingMessageId, streamingText])

  const applyTheme = async (themeKey: keyof typeof COLOR_THEMES) => {
    const theme = COLOR_THEMES[themeKey]
    const root = document.documentElement

    // Update CSS custom properties
    root.style.setProperty("--naive-primary", theme.primary)
    root.style.setProperty("--naive-primary-dark", theme.primaryDark)
    root.style.setProperty("--naive-primary-light", theme.primaryLight)
    root.style.setProperty("--naive-primary-hover", theme.primaryHover)
    root.style.setProperty("--naive-primary-pressed", theme.primaryPressed)
    root.style.setProperty("--naive-primary-active", theme.primaryActive)
    root.style.setProperty("--primary", theme.oklchPrimary)
    root.style.setProperty("--accent", theme.oklchAccent)
    root.style.setProperty("--ring", theme.oklchPrimary)

    // Update chart colors with theme hue
    root.style.setProperty("--chart-1", `oklch(0.58 0.2 ${theme.hue})`)
    root.style.setProperty("--chart-2", `oklch(0.62 0.21 ${theme.hue})`)
    root.style.setProperty("--chart-3", `oklch(0.54 0.19 ${theme.hue})`)
    root.style.setProperty("--chart-4", `oklch(0.5 0.18 ${theme.hue})`)
    root.style.setProperty("--chart-5", `oklch(0.66 0.22 ${theme.hue})`)

    // Save to localStorage
    await api.config.setTheme(themeKey)
    setCurrentTheme(themeKey)
  }

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
      time: "刚刚",
    }

    const assistantPlaceholder = {
      id: aiMessageId,
      role: "assistant" as const,
      content: "",
      time: "生成中",
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
        prev.map((message) => (message.id === aiMessageId ? { ...message, content, time: "刚刚" } : message)),
      )
    }

    const requestUrl = `/api/chat/aliqwen-sse?unique=${encodeURIComponent(aiMessageId)}&message=${encodeURIComponent(trimmedContent)}`

    try {
      const eventSource = new EventSource(requestUrl)
      streamingControllerRef.current = controller
      controller.signal.addEventListener('abort', () => {
        eventSource.close()
      })

      let accumulated = ''
      let completed = false
      let lastPayload: any = null

      const extractContent = (payload: any) => {
        if (payload && typeof payload.message === 'string' && payload.message.trim()) {
          return payload.message
        }
        if (payload && Array.isArray(payload.history) && payload.history.length > 0) {
          const latest = payload.history[payload.history.length - 1]
          if (latest && typeof latest.content === 'string' && latest.content.trim()) {
            return latest.content
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
    } catch (error) {
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
    <header className="relative mb-6" data-current-path={currentPath ?? undefined}>
      <div className="flex items-center justify-between h-16 w-full px-6 rounded-2xl bg-white/40 backdrop-blur-md border border-primary/20 shadow-lg">
        {/* Left side - Welcome text */}
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold text-foreground">欢迎使用高校课程通</h1>
        </div>

        {/* Right side - User info and search */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:bg-primary/10 transition-colors">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-white/95 backdrop-blur-md border-primary/20">
              <div className="px-3 py-2 flex items-center justify-between border-b border-border">
                <div className="text-sm font-semibold text-foreground">消息通知</div>
                {unreadCount > 0 && (
                  <div className="text-xs text-muted-foreground">{unreadCount} 条未读</div>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={cn(
                        "cursor-pointer flex flex-col items-start gap-1 py-3 px-3 border-b border-border/50 last:border-0",
                        !notification.read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-primary/5",
                      )}
                      onClick={() => {
                        setNotifications((prev) =>
                          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
                        )
                      }}
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="flex items-center gap-2">
                          {!notification.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                          <span className="text-sm font-medium text-foreground">{notification.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{notification.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-4">{notification.content}</p>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">暂无消息</div>
                )}
              </div>
              {notifications.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-3 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs hover:bg-primary/10"
                      onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                    >
                      全部标记为已读
                    </Button>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Color Palette */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-primary/10 transition-colors">
                <Palette className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-md border-primary/20">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">选择主题色</div>
              <DropdownMenuSeparator />
              {Object.entries(COLOR_THEMES).map(([key, theme]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => applyTheme(key as keyof typeof COLOR_THEMES)}
                  className={cn(
                    "cursor-pointer flex items-center gap-3 py-2.5",
                    currentTheme === key ? "bg-primary/10" : "hover:bg-primary/5",
                  )}
                >
                  <div
                    className="w-6 h-6 rounded border-2 border-white shadow-sm"
                    style={{ backgroundColor: theme.primary }}
                  />
                  <span className="text-sm">{theme.name}</span>
                  {currentTheme === key && <div className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Avatar */}
          <Avatar className="h-9 w-9 border-2 border-primary/30">
            <AvatarImage src="/diverse-user-avatars.png" alt="用户头像" />
            <AvatarFallback className="bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>

          {/* User Name and Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 hover:bg-primary/10 transition-colors">
                <span className="text-sm font-medium">{userName}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white/95 backdrop-blur-md border-primary/20">
              <DropdownMenuItem className="cursor-pointer hover:bg-primary/10">个人信息</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-primary/10">系统设置</DropdownMenuItem>
              <DropdownMenuSeparator />
              {onResetData && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-primary/10 text-orange-600"
                    onClick={onResetData}
                  >
                    重置数据
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                className="cursor-pointer hover:bg-primary/10 text-red-600"
                onClick={handleLogout}
              >
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* AI 助手入口 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAiDrawerOpen(true)}
            className="hover:bg-primary/10 transition-colors group"
          >
            <img
              src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAqCAMAAAAqEZ1jAAAAAXNSR0IArs4c6QAAAAlwSFlzAAAhOAAAITgBRZYxYAAAAKJQTFRFAAAAenb/RpP/k2j/XXf7cXX6P5z7i2n8W3j7ZHP7jmn9VID7Qpf8jWn8Xnr6iWr8YHb7i2n8RJb9dWz8WXr8mWj9RpP8W3n8bW/8l2j+QJz9Q5f9ToT8fWv9ZW/8lWj9VID8YnX7Pp79QZr9pWb+RJT8m2f9k2j9SYz8jWn9hmr8UIT8fmv8VX78Xnn7d2z8ZHT7WHr7bm77Xnb7Z3D7YHH7RJOQRAAAACJ0Uk5TABAgICAwQEBAWF5gZXBwgICbn5+fo7+/vsLP39/f3urv73XwOA8AAAKfSURBVHja7dbJcuIwFIXhIzCxMTMNcdwMDoMZY4NxeP9X66srEckYQlPVvcvPBhZ8dVSIAvz03xNV/Luq4Xq9Hgo8nfDqjXq97hS1yXZNhXg2Z3o+f1KnLqx62y17Pp5smp+158EUaW6I52rkxLF3eoNpt1Ne+bR+Fd8U5Oc8Px6P5M0Evgq11ytpy0jgbk6e5cSxd2pb7yKOikpTouWyhbsNMsnpefZpOzsCI7c8brkM74/LqFSC7HkwVTu9lsB14ZJy745LlDdV5+3iQTXC7s9z3pNEggOh9s3woOFqJT2BmzUSLnMQEEeeh2+rkraiOrjZeL+XXEBwyp71Ybg+hWL+iltGt8ftKQI9QMzSlDxz9VofssIMdxitdJEvbo3jxqAGKXtt6N4OkpvgkmiFa50Ch1UU8zab/Ya4Br/IUnnewHCHg+FEh7/ExUIXdq+KG4N7z3hfzXDkaa5FmGpdMENrYWWjaoDrJtJLu4ajFFfbUduryN1ue4brb2KpjSvgvETe53R24U6Ggz+RYJnsCTMujmMJ9qELErkv9y7cyXAGtNCoI2Dqx9ymAl1bcYMLJ2NO5fZ2dmHLxiBGrJlxEAl7M1HkTFUzseeiWHOxYK+CrwLltRX3qTk7/4PbTXDdaBHLxytMdcllaaA56U1RSEyU56M0jotfYBLvynM091ni0GGtPO73nLkR7AaK6yqOKnG1g+wXrnqZz9nrw87bszdjjn/dDGffbgdX9YmT4HykaoLTp/UABGfyypx7a1yFNb0wpl7BddW8geSO5JU5TE63xhmOPb2uok8reN1Nrn4qjQNBlmfdvkB5beaoMgdP4LpFgbNuX3svtSwABoZ7WPOKa0Inxgl7DurMdfFXVV7savjK8WQ1/cz5+Q9e7A/jUZeiPQO0fwAAAABJRU5ErkJggg=="
              alt="AI 助手"
              className="h-12 w-12 object-contain transition-transform duration-200 group-hover:scale-[1.5]"
            />
          </Button>
        </div>
      </div>
      <Sheet open={aiDrawerOpen} onOpenChange={setAiDrawerOpen}>
        <SheetContent
          side="right"
          className="!w-[403px] sm:!w-[461px] lg:!w-[499px] xl:!w-[538px] 2xl:!w-[576px] sm:!max-w-none lg:!max-w-none 2xl:!max-w-none max-w-[80vw] p-0 bg-background/90 backdrop-blur-xl border-border/40"
        >
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60">
              <SheetTitle className="text-left text-xl font-semibold flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-primary" />
                AI 助手
              </SheetTitle>
              <p className="text-sm text-muted-foreground text-left">
                灵感来自 ChatGPT，实时协助你分析课程、生成摘要与行动建议。
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
            </SheetHeader>

            <ScrollArea ref={scrollViewportRef} className="flex-1 min-h-0 px-6 py-4">
              <div className="space-y-5 pr-2">
                {chatMessages.map((message) => {
                  const isAssistant = message.role === "assistant"
                  const shouldStream = streamingMessageId === message.id
                  const shouldShowThinking = isAssistant && shouldStream
                  const displayContent =
                    message.id === "1" && isAssistant
                      ? message.content.replace("你好，", `${greetingForMessage} `)
                      : message.content
                  const contentToRender = shouldStream ? streamingText || "AI 正在生成响应..." : displayContent

                  return isAssistant ? (
                    <div key={message.id} className="space-y-2 text-left">
                      <div className="text-xs text-muted-foreground">简报 · {message.time}</div>
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
                      <div className="border-t border-dashed border-border/60 pt-3 text-sm leading-relaxed whitespace-pre-line">
                        {contentToRender}
                      </div>
                    </div>
                  ) : (
                    <div key={message.id} className="flex items-start justify-end text-right">
                      <div className="space-y-1 max-w-[80%]">
                        <div className="text-xs text-muted-foreground">简报 · {message.time}</div>
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
                      AI 可能会生成不准确的内容，请在使用前进行核对。
                    </p>
                  </div>
                </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
