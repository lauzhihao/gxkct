"use client"

import "./ai-assistant.css"
import { useState, useEffect, useMemo, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Send, Plus, ChevronDown, ChevronUp, Loader2, Copy, Check, FileText, X, ExternalLink, Square } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"
import { AiCanvasPanel } from "./ai-canvas-panel"
import {
  isCanvasEvent,
  isStatusEvent,
  isThinkingEvent,
  isUIEvent,
  isProgressEvent,
  isModeEvent,
  isErrorEvent,
  isOpenAIChunk,
  CanvasAction,
  CanvasComponentType,
  CanvasEventMessage,
  CanvasComponentData,
  StatusEventMessage,
  UIEventMessage,
  ProgressEventMessage,
  ModeEventMessage,
  ErrorEventMessage,
  CourseInfoData,
  CourseMatrixData,
  ObjectiveCardData,
  ChapterCardData,
  ProjectMatrixData,
  CoursePointCardData,
  KsaItemData,
  RegenerateTarget,
} from "./canvas-elements"
import { useCanvasElements } from "@/shared/hooks/use-canvas-elements"
import { useCanvasPersistence } from "@/shared/hooks/use-canvas-persistence"
import { canvasApi } from "@/lib/api/canvas-api"
import { toast } from "sonner"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb"

// localStorage存储key
const STORAGE_KEY_SESSION_ID = "ai-assistant-session-id"
const STORAGE_KEY_MESSAGES = "ai-assistant-messages"

// 工具名称中文映射表
const TOOL_NAME_MAP: Record<string, string> = {
  web_search: "网络搜索",
  generate_course_basic_info: "生成课程基本信息",
  generate_course_matrix: "生成课程矩阵",
  generate_project_matrix: "生成项目矩阵",
  show_stage_options: "显示阶段选项",
  analyze_document: "分析文档",
  extract_course_info: "提取课程信息",
}

// 根据工具状态生成友好的显示文本
function getToolStatusText(toolStatus: { node: string; event: string; tool?: string; args?: Record<string, unknown> }): string {
  const { node, event, tool, args } = toolStatus

  // agent节点
  if (node === "agent") {
    if (event === "start") return "正在思考..."
    if (event === "end") return "思考完成"
  }

  // tools节点（工具执行容器）
  if (node === "tools") {
    if (event === "start") return "正在执行工具..."
    if (event === "end") return "工具执行完成"
  }

  // tool节点（具体工具）
  if (node === "tool" && tool) {
    const toolName = TOOL_NAME_MAP[tool] || tool

    if (event === "call") {
      // 根据不同工具提取关键参数
      if (tool === "web_search" && args?.query) {
        const query = String(args.query)
        const shortQuery = query.length > 30 ? query.slice(0, 30) + "..." : query
        return `正在搜索：${shortQuery}`
      }
      if ((tool === "generate_course_basic_info" || tool === "generate_course_matrix") && args?.course_name) {
        return `正在${toolName}：${args.course_name}`
      }
      return `正在调用 ${toolName}...`
    }

    if (event === "result") {
      return `${toolName} 执行完成`
    }
  }

  return "处理中..."
}

// 消息附件类型
interface MessageAttachment {
  name: string
  url: string
  ossKey: string
  type: string
  size: number
}

// 消息类型定义
interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  isStreaming?: boolean
  thinking?: string // AI思考过程
  attachment?: MessageAttachment // 用户消息附件
}

// 附件文件类型定义
interface AttachedFile {
  id: string
  name: string
  type: string
  size: number
  file: File
}

// 支持的文件类型
const SUPPORTED_FILE_TYPES = [
  'text/plain',           // .txt
  'text/markdown',        // .md
  'text/csv',             // .csv
  'application/json',     // .json
  'application/pdf',      // .pdf
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
]

const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.csv', '.json']

// 默认欢迎消息
const createWelcomeMessage = (): ChatMessage => ({
  id: "welcome",
  role: "assistant",
  content: "你好，我是高校课程通的 AI 助手，可以帮助你快速分析课程结构、生成教学方案，或总结当前页面的信息。",
  timestamp: Date.now(),
})

// 生成新的sessionId
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

// 从localStorage读取会话数据
const loadSessionFromStorage = (): { sessionId: string; messages: ChatMessage[] } => {
  if (typeof window === "undefined") {
    return { sessionId: generateSessionId(), messages: [createWelcomeMessage()] }
  }

  try {
    const storedSessionId = localStorage.getItem(STORAGE_KEY_SESSION_ID)
    const storedMessages = localStorage.getItem(STORAGE_KEY_MESSAGES)

    if (storedSessionId && storedMessages) {
      const messages = JSON.parse(storedMessages) as ChatMessage[]
      // 过滤掉正在流式传输的消息
      const validMessages = messages.filter(m => !m.isStreaming)
      if (validMessages.length > 0) {
        return { sessionId: storedSessionId, messages: validMessages }
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

// 保存会话数据到localStorage
const saveSessionToStorage = (sessionId: string, messages: ChatMessage[]) => {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY_SESSION_ID, sessionId)
    // 保存时过滤掉正在流式传输的消息
    const messagesToSave = messages.filter(m => !m.isStreaming)
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messagesToSave))
  } catch (error) {
    console.error("保存会话历史失败", error)
  }
}

interface AiAssistantDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedNodeName?: string | null
  activeTabLabel?: string | null
  userName?: string
  /** 树形结构数据（用于保存向导选择专业） */
  treeData?: import("@/types").TreeNode | null
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
  treeData = null,
}: AiAssistantDrawerProps) {
  const [inputMessage, setInputMessage] = useState("")
  const [isInputExpanded, setIsInputExpanded] = useState(false)
  // 文件拖拽相关状态
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const dragCounterRef = useRef(0) // 用于处理嵌套元素的拖拽事件

  // 从localStorage初始化会话数据
  const [sessionId, setSessionId] = useState<string>("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // 客户端初始化：从localStorage读取会话数据
  useEffect(() => {
    const { sessionId: storedSessionId, messages } = loadSessionFromStorage()
    setSessionId(storedSessionId)
    setChatMessages(messages)
    setIsInitialized(true)
  }, [])
  const [streamingText, setStreamingText] = useState("")
  const [streamingThinking, setStreamingThinking] = useState("")
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false)
  // 画布展开状态：收到第一条SSE时触发展开
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false)
  const hasTriggeredExpandRef = useRef(false) // 防止重复触发

  // SSE新事件状态
  const [currentMode, setCurrentMode] = useState<"chat" | "course_building">("chat")
  const [buildingStage, setBuildingStage] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number; message: string; stage: string } | null>(null)
  const [toolStatus, setToolStatus] = useState<{ node: string; event: string; tool?: string; args?: Record<string, unknown> } | null>(null)
  // sessionId复制状态
  const [sessionIdCopied, setSessionIdCopied] = useState(false)

  // 重做功能状态
  const [regenerateTarget, setRegenerateTarget] = useState<RegenerateTarget | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)

  // 课程矩阵填充进度状态（显示在画布课程矩阵节点内）
  const [fillMatrixProgress, setFillMatrixProgress] = useState<string | null>(null)
  // 项目矩阵填充进度状态（显示在画布项目矩阵节点内）
  const [fillProjectMatrixProgress, setFillProjectMatrixProgress] = useState<string | null>(null)
  // 课点信息填充进度状态（显示在画布课点面板节点内）
  const [fillCoursePointsProgress, setFillCoursePointsProgress] = useState<string | null>(null)
  // KSA填充进度状态（显示在画布KSA面板节点内）
  const [fillKsaProgress, setFillKsaProgress] = useState<string | null>(null)

  // 画布元素管理
  const {
    elements: canvasElements,
    edges: canvasEdges,
    specialComponents: canvasSpecialComponents,
    selectedId: canvasSelectedId,
    removeElementWithConnected: removeCanvasElement,
    removeEdge: removeCanvasEdge,
    selectElement: selectCanvasElement,
    updateSelection: updateCanvasSelection,
    updateElementPosition: updateCanvasElementPosition,
    updateElementData: updateCanvasElementData,
    updatePanelChildren: updateCanvasPanelChildren,
    clearCanvas,
    loadCanvasData,
    handleCanvasEvent,
    toFlowNodes,
    toFlowEdges,
  } = useCanvasElements()

  // 画布持久化（自动保存到本地和阿里云 OSS）
  const {
    ossKey: canvasOssKey,
    isUploading: isCanvasUploading,
    hasUnsavedChanges: hasCanvasUnsavedChanges,
    updateCanvasData,
    getOssKey: getCanvasOssKey,
    loadFromLocal: loadCanvasFromLocal,
    clearPersistence: clearCanvasPersistence,
  } = useCanvasPersistence({
    sessionId,
    autoUpload: true,
    uploadInterval: 30000, // 30秒自动上传
    onUploadSuccess: (ossKey) => {
      console.log("[画布] 上传成功, ossKey:", ossKey)
    },
    onUploadError: (error) => {
      console.error("[画布] 上传失败:", error)
    },
  })

  // 记录已加载的sessionId，避免重复加载，同时用于防止加载前保存空数据
  const hasLoadedCanvasRef = useRef<string | null>(null)

  // 抽屉打开时，从本地存储加载画布数据（必须在保存逻辑之前执行）
  useEffect(() => {
    // 仅在抽屉打开、sessionId有效、且尚未加载过该session的画布时执行
    if (open && sessionId && isInitialized && hasLoadedCanvasRef.current !== sessionId) {
      console.log("[AI助手] 尝试从本地存储加载画布, sessionId:", sessionId)
      const localCanvasData = loadCanvasFromLocal()
      console.log("[AI助手] 本地存储数据:", localCanvasData ? `元素数=${localCanvasData.elements?.length || 0}, 边数=${localCanvasData.edges?.length || 0}` : "无数据")

      if (localCanvasData && (localCanvasData.elements?.length > 0 || localCanvasData.edges?.length > 0)) {
        // 加载本地画布数据（包含选中状态）
        loadCanvasData(
          localCanvasData.elements || [],
          localCanvasData.edges || [],
          localCanvasData.specialComponents,
          localCanvasData.selectedIds
        )
        // 如果有画布内容，自动展开画布
        if (localCanvasData.elements?.length > 0) {
          setIsCanvasExpanded(true)
          hasTriggeredExpandRef.current = true
        }
        console.log("[AI助手] 已从本地存储恢复画布, sessionId:", sessionId)
      }
      // 标记该 session 的画布已完成加载（无论有无数据）
      hasLoadedCanvasRef.current = sessionId
    }
  }, [open, sessionId, isInitialized, loadCanvasFromLocal, loadCanvasData])

  // 监听画布数据变化，更新持久化数据
  // 重要：必须在画布加载完成后才能保存，否则会用空数据覆盖已保存的数据
  useEffect(() => {
    // 只有当前 session 的画布已完成加载后，才允许保存
    if (sessionId && hasLoadedCanvasRef.current === sessionId) {
      // 将选中状态转换为数组传递（支持多选场景）
      const selectedIds = canvasSelectedId ? [canvasSelectedId] : []
      updateCanvasData(canvasElements, canvasEdges, canvasSpecialComponents, selectedIds)
    }
  }, [sessionId, canvasElements, canvasEdges, canvasSpecialComponents, canvasSelectedId, updateCanvasData])

  const streamingControllerRef = useRef<AbortController | null>(null)
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const thinkingScrollRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const getTimeGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "上午好"
    if (hour < 18) return "下午好"
    return "晚上好"
  }
  const greetingForMessage = `${userName}老师：${getTimeGreeting()}。`

  // 创建新会话：重置消息列表并生成新session_id，保存到localStorage
  const handleNewSession = () => {
    streamingControllerRef.current?.abort()
    const newSessionId = generateSessionId()
    const newMessages = [createWelcomeMessage()]

    setSessionId(newSessionId)
    setChatMessages(newMessages)
    setInputMessage("")
    setStreamingMessageId(null)
    setStreamingText("")
    setStreamingThinking("")
    // 重置画布展开状态
    setIsCanvasExpanded(false)
    hasTriggeredExpandRef.current = false
    // 清空画布元素
    clearCanvas()
    // 清除画布持久化数据
    clearCanvasPersistence()
    // 重置画布加载标志，允许新会话加载其画布数据
    hasLoadedCanvasRef.current = null
    // 重置SSE事件状态
    setCurrentMode("chat")
    setBuildingStage(null)
    setProgress(null)
    setToolStatus(null)
    // 重置重做状态
    setRegenerateTarget(null)
    setIsRegenerating(false)

    // 保存新会话到localStorage
    saveSessionToStorage(newSessionId, newMessages)
    // 清空附件文件
    setAttachedFiles([])
  }

  // 检查文件是否为支持的类型
  const isFileSupported = (file: File): boolean => {
    // 检查MIME类型
    if (SUPPORTED_FILE_TYPES.includes(file.type)) return true
    // 检查文件扩展名（某些浏览器可能不提供正确的MIME类型）
    const fileName = file.name.toLowerCase()
    return SUPPORTED_EXTENSIONS.some(ext => fileName.endsWith(ext))
  }

  // 拖拽进入事件
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }

  // 拖拽悬停事件
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // 拖拽离开事件
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }

  // 拖拽释放事件
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0

    const files = Array.from(e.dataTransfer.files)
    const supportedFiles = files.filter(isFileSupported)

    if (supportedFiles.length === 0 && files.length > 0) {
      toast.error('不支持的文件格式，仅支持 .md、.txt、.docx、.pdf、.xlsx、.csv、.json 文件')
      return
    }

    // 只取第一个支持的文件
    const firstFile = supportedFiles[0]
    if (!firstFile) return

    // 检查文件大小（限制10MB）
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (firstFile.size > MAX_FILE_SIZE) {
      toast.error('文件大小超过限制，最大支持 10MB')
      return
    }

    const newAttachedFile: AttachedFile = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: firstFile.name,
      type: firstFile.type,
      size: firstFile.size,
      file: firstFile,
    }

    setAttachedFiles([newAttachedFile])
  }

  // 移除附件文件
  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  // 上传文件到OSS
  const uploadFileToOss = async (file: File): Promise<{ url: string; ossKey: string } | null> => {
    try {
      // 生成文件路径：gxkct/course_ai_files/{日期}/{sessionId}_{时间戳}_{原文件名}
      const now = new Date()
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
      const timestamp = Date.now()
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._\u4e00-\u9fa5-]/g, "_")
      const fileName = `gxkct/course_ai_files/${dateStr}/${sessionId}_${timestamp}_${safeFileName}`

      // 获取上传签名
      const presignResponse = await canvasApi.getPresignUrl({
        fileName,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      })

      if (!presignResponse.data) {
        throw new Error(presignResponse.error || "获取上传签名失败")
      }

      const { uploadUrl, ossKey: returnedOssKey, headers } = presignResponse.data
      // 优先使用后端返回的ossKey，否则使用我们生成的fileName
      const finalOssKey = returnedOssKey || fileName

      // 上传文件到OSS
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          ...headers,
        },
        body: file,
      })

      if (!uploadResponse.ok) {
        throw new Error("上传文件失败")
      }

      // 构建访问URL（从uploadUrl中提取基础域名）
      const urlObj = new URL(uploadUrl)
      const accessUrl = `${urlObj.origin}/${finalOssKey}`

      return { url: accessUrl, ossKey: finalOssKey }
    } catch (error) {
      console.error("上传文件到OSS失败:", error)
      return null
    }
  }

  useEffect(() => {
    return () => {
      streamingControllerRef.current?.abort()
    }
  }, [])

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
      // 流式生成刚开始时（Loader阶段），如果不是新消息触发的，则不滚动
      // 但如果有新消息（如拖拽菜单发送指令），仍然需要滚动以显示用户消息
      if (isStreaming && !streamingText && !hasNewMessage) {
        // 即使不滚动，也要更新ref，保持状态一致
        prevMessageCountRef.current = chatMessages.length
        wasOpenRef.current = open
        return
      }
      // 使用双重requestAnimationFrame确保在DOM完全更新后执行滚动
      // 第一帧等待React渲染，第二帧确保DOM布局完成
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // 流式生成时使用instant滚动，避免多个smooth滚动动画叠加导致视觉跳动
          const behavior = isStreaming ? 'instant' : 'smooth'
          viewport.scrollTo({ top: viewport.scrollHeight, behavior })
        })
      })
    }

    prevMessageCountRef.current = chatMessages.length
    wasOpenRef.current = open
  }, [open, chatMessages, streamingMessageId, streamingText])

  // 思考区域展开时自动滚动到底部
  useEffect(() => {
    if (isThinkingExpanded && thinkingScrollRef.current) {
      thinkingScrollRef.current.scrollTop = thinkingScrollRef.current.scrollHeight
    }
  }, [isThinkingExpanded, streamingThinking])

  // 输入框展开/收起时平滑调整聊天区域滚动位置
  const prevInputExpandedRef = useRef(isInputExpanded)
  useEffect(() => {
    const viewport = scrollViewportRef.current
    if (!viewport) return

    const wasExpanded = prevInputExpandedRef.current
    const isNowExpanded = isInputExpanded

    if (wasExpanded !== isNowExpanded) {
      // 流式生成刚开始时（Loader阶段），不滚动，保持用户消息可见
      const isStreamingWithoutContent = streamingMessageId !== null && !streamingText
      if (isStreamingWithoutContent) {
        prevInputExpandedRef.current = isInputExpanded
        return
      }
      // 使用 requestAnimationFrame 确保在 DOM 更新后执行滚动
      requestAnimationFrame(() => {
        // 再延迟一帧确保高度变化完成
        requestAnimationFrame(() => {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' })
        })
      })
    }

    prevInputExpandedRef.current = isInputExpanded
  }, [isInputExpanded, streamingMessageId, streamingText])

  // 文件上传状态
  const [isUploadingFile, setIsUploadingFile] = useState(false)

  // 处理画布组件重做请求
  const handleRegenerate = async (nodeId: string, nodeType: CanvasComponentType, nodeName: string) => {
    // 检查是否已在重做中或流式生成中
    if (isRegenerating || streamingMessageId) {
      toast.error("请等待当前操作完成")
      return
    }

    if (!isInitialized || !sessionId) {
      toast.error("会话未初始化")
      return
    }

    // 章节面板重做时，使用专用填充函数
    if (nodeType === CanvasComponentType.CHAPTER_PANEL) {
      console.log("[重做] 章节面板使用专用填充函数:", nodeId)
      handleFillChapterPanel(nodeId)
      return
    }

    // 教学目标面板重做时，使用专用填充函数
    if (nodeType === CanvasComponentType.OBJECTIVE_PANEL) {
      console.log("[重做] 教学目标面板使用专用填充函数:", nodeId)
      handleFillObjectivePanel(nodeId)
      return
    }

    console.log("[重做] 开始重做组件:", nodeId, nodeType, nodeName)

    // 设置重做状态
    setIsRegenerating(true)
    setRegenerateTarget({
      component_id: nodeId,
      component_type: nodeType,
    })

    // 创建用户消息和AI响应占位
    const timestamp = Date.now().toString()
    const userMessageId = `${timestamp}-user`
    const aiMessageId = `${timestamp}-regenerate`
    const userContent = `请帮我重新设计${nodeName}`

    // 创建用户消息
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user" as const,
      content: userContent,
      timestamp: Date.now(),
    }

    // 创建 AI 响应占位
    const assistantPlaceholder: ChatMessage = {
      id: aiMessageId,
      role: "assistant" as const,
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    }

    setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder])
    setStreamingMessageId(aiMessageId)
    setStreamingText("")
    setStreamingThinking("")
    setIsThinkingExpanded(false)

    streamingControllerRef.current?.abort()
    const controller = new AbortController()
    streamingControllerRef.current = controller

    const commitAssistantContent = (content: string, thinking?: string) => {
      setChatMessages((prev) => {
        const updatedMessages = prev.map((message) =>
          message.id === aiMessageId ? { ...message, content, thinking, isStreaming: false } : message
        )
        saveSessionToStorage(sessionId, updatedMessages)
        return updatedMessages
      })
    }

    const debugMode = process.env.NEXT_PUBLIC_AI_DEBUG === 'true'
    const requestUrl = `/lang-chain/v1/chat/completions${debugMode ? '?debug=true' : ''}`

    try {
      // 清空目标节点内容（重做前必须清空，否则原有内容会传到后台）
      const PANEL_TO_CARD_TYPE: Record<string, CanvasComponentType> = {
        [CanvasComponentType.OBJECTIVE_PANEL]: CanvasComponentType.OBJECTIVE_CARD,
        [CanvasComponentType.CHAPTER_PANEL]: CanvasComponentType.CHAPTER_CARD,
        [CanvasComponentType.COURSE_POINT_PANEL]: CanvasComponentType.COURSE_POINT_CARD,
        [CanvasComponentType.KSA_PANEL]: CanvasComponentType.KSA_ITEM,
      }
      const childType = PANEL_TO_CARD_TYPE[nodeType]
      if (childType) {
        // Panel 类型：清空子节点
        console.log("[重做] 清空Panel子节点:", nodeId, nodeType)
        updateCanvasPanelChildren(nodeId, nodeType, childType, [])
      } else if (nodeType === CanvasComponentType.COURSE_MATRIX) {
        // 课程矩阵：清空 rows
        console.log("[重做] 清空课程矩阵:", nodeId)
        updateCanvasElementData(nodeId, { rows: [] })
      } else if (nodeType === CanvasComponentType.PROJECT_MATRIX) {
        // 项目矩阵：清空 rows
        console.log("[重做] 清空项目矩阵:", nodeId)
        updateCanvasElementData(nodeId, { rows: [] })
      }

      // 上传最新画布并获取 ossKey
      const ossKey = await getCanvasOssKey()
      if (!ossKey) {
        throw new Error("画布上传失败")
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'course-assistant',
          stream: true,
          session_id: sessionId,
          canvas_oss_key: ossKey,
          messages: [{ role: 'user', content: userContent }],
          // 重做目标
          regenerate: {
            component_id: nodeId,
            component_type: nodeType,
          },
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      const decoder = new TextDecoder()
      let accumulated = ''
      let accumulatedThinking = ''
      let buffer = ''

      const processStream = async () => {
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

              try {
                const parsed = JSON.parse(data)

                // 处理canvas事件 - 更新画布组件
                if (isCanvasEvent(parsed)) {
                  handleCanvasEvent(parsed as CanvasEventMessage)
                  continue
                }

                // 处理thinking事件
                if (isThinkingEvent(parsed)) {
                  accumulatedThinking += parsed.content
                  setStreamingThinking(accumulatedThinking)
                  continue
                }

                // 处理error事件
                if (isErrorEvent(parsed)) {
                  const errorEvent = parsed as ErrorEventMessage
                  toast.error(errorEvent.message)
                  continue
                }

                // 处理标准OpenAI格式的内容
                if (isOpenAIChunk(parsed)) {
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    accumulated += content
                    setStreamingText(accumulated)
                  }
                  continue
                }
              } catch (parseError) {
                console.error('解析流式响应失败', parseError, data)
              }
            }
          }
        } catch (error) {
          // 流被中止时静默返回（用户点击停止按钮）
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('[重做] 流式请求已被用户中止')
            return
          }
          throw error
        } finally {
          reader.releaseLock()
        }

        // 重做完成
        const finalContent = accumulated.trim() || '组件已重新生成'
        commitAssistantContent(finalContent, accumulatedThinking || undefined)
        if (streamingControllerRef.current === controller) {
          streamingControllerRef.current = null
        }
        setStreamingMessageId(null)
        setStreamingText('')
        // 清理重做状态
        setRegenerateTarget(null)
        setIsRegenerating(false)
        // 选中被更新的节点，使其自动获取焦点
        selectCanvasElement(nodeId)
        console.log("[重做] 重做完成:", nodeId)
      }

      processStream()
    } catch (error) {
      const fallback = controller.signal.aborted
        ? "已取消重做操作。"
        : "重做失败，请稍后再试。"
      commitAssistantContent(fallback)
      if (streamingControllerRef.current === controller) {
        streamingControllerRef.current = null
      }
      setStreamingMessageId(null)
      setStreamingText('')
      // 清理重做状态
      setRegenerateTarget(null)
      setIsRegenerating(false)
      console.error("[重做] 重做失败:", error)
    }
  }

  // 处理课程矩阵自动填充请求
  const handleFillCourseMatrix = async () => {
    // 检查是否已在重做中或流式生成中
    if (isRegenerating || streamingMessageId) {
      toast.error("请等待当前操作完成")
      return
    }

    if (!isInitialized || !sessionId) {
      toast.error("会话未初始化")
      return
    }

    console.log("[填充课程矩阵] 开始自动填充")

    // 设置重做状态（复用重做的loading效果）
    setIsRegenerating(true)

    // 创建用户消息和AI响应占位
    const timestamp = Date.now().toString()
    const userMessageId = `${timestamp}-user`
    const aiMessageId = `${timestamp}-fill-matrix`
    const userContent = "请根据画布中的教学目标、章节和课点信息，自动填充课程矩阵的支撑关系"

    // 创建用户消息
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user" as const,
      content: userContent,
      timestamp: Date.now(),
    }

    // 创建 AI 响应占位
    const assistantPlaceholder: ChatMessage = {
      id: aiMessageId,
      role: "assistant" as const,
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    }

    setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder])
    setStreamingMessageId(aiMessageId)
    setStreamingText("")
    setStreamingThinking("")
    setIsThinkingExpanded(false)

    streamingControllerRef.current?.abort()
    const controller = new AbortController()
    streamingControllerRef.current = controller

    const commitAssistantContent = (content: string, thinking?: string) => {
      setChatMessages((prev) => {
        const updatedMessages = prev.map((message) =>
          message.id === aiMessageId ? { ...message, content, thinking, isStreaming: false } : message
        )
        saveSessionToStorage(sessionId, updatedMessages)
        return updatedMessages
      })
    }

    const debugMode = process.env.NEXT_PUBLIC_AI_DEBUG === 'true'
    const requestUrl = `/lang-chain/v1/chat/completions${debugMode ? '?debug=true' : ''}`

    try {
      // 清空课程矩阵数据（填充前必须清空，否则原有内容会传到后台）
      const courseMatrix = canvasElements.find(el => el.type === CanvasComponentType.COURSE_MATRIX)
      if (courseMatrix) {
        console.log("[填充课程矩阵] 清空课程矩阵:", courseMatrix.id)
        updateCanvasElementData(courseMatrix.id, { rows: [] })
      }

      // 上传最新画布并获取 ossKey
      const ossKey = await getCanvasOssKey()
      if (!ossKey) {
        throw new Error("画布上传失败")
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'course-assistant',
          stream: true,
          session_id: sessionId,
          canvas_oss_key: ossKey,
          messages: [{ role: 'user', content: userContent }],
          // 填充课程矩阵的标记
          fill_course_matrix: true,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      const decoder = new TextDecoder()
      let accumulated = ''
      let accumulatedThinking = ''
      let buffer = ''

      const processStream = async () => {
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

              try {
                const parsed = JSON.parse(data)

                // 处理canvas事件 - 更新画布组件
                if (isCanvasEvent(parsed)) {
                  handleCanvasEvent(parsed as CanvasEventMessage)
                  continue
                }

                // 处理thinking事件
                if (isThinkingEvent(parsed)) {
                  accumulatedThinking += parsed.content
                  setStreamingThinking(accumulatedThinking)
                  continue
                }

                // 处理error事件
                if (isErrorEvent(parsed)) {
                  const errorEvent = parsed as ErrorEventMessage
                  toast.error(errorEvent.message)
                  continue
                }

                // 处理progress事件 - 显示在思考区域和画布矩阵内
                if (isProgressEvent(parsed)) {
                  const progressEvent = parsed as ProgressEventMessage
                  // 将进度消息追加到思考区域
                  const progressLine = `[${progressEvent.current}/${progressEvent.total}] ${progressEvent.message}\n`
                  accumulatedThinking += progressLine
                  setStreamingThinking(accumulatedThinking)
                  // 同时更新画布矩阵内的进度显示
                  setFillMatrixProgress(progressEvent.message)
                  continue
                }

                // 处理标准OpenAI格式的内容
                if (isOpenAIChunk(parsed)) {
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    accumulated += content
                    setStreamingText(accumulated)
                  }
                  continue
                }
              } catch (parseError) {
                console.error('解析流式响应失败', parseError, data)
              }
            }
          }
        } catch (error) {
          // 流被中止时静默返回（用户点击停止按钮）
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('[填充课程矩阵] 流式请求已被用户中止')
            return
          }
          throw error
        } finally {
          reader.releaseLock()
        }

        // 填充完成，清除进度
        setFillMatrixProgress(null)
        const finalContent = accumulated.trim() || '课程矩阵已自动填充支撑关系'
        commitAssistantContent(finalContent, accumulatedThinking || undefined)
        if (streamingControllerRef.current === controller) {
          streamingControllerRef.current = null
        }
        setStreamingMessageId(null)
        setStreamingText('')
        setIsRegenerating(false)
        console.log("[填充课程矩阵] 填充完成")
      }

      processStream()
    } catch (error) {
      const fallback = controller.signal.aborted
        ? "已取消填充操作。"
        : "课程矩阵填充失败，请稍后再试。"
      commitAssistantContent(fallback)
      if (streamingControllerRef.current === controller) {
        streamingControllerRef.current = null
      }
      setStreamingMessageId(null)
      setStreamingText('')
      setFillMatrixProgress(null)
      setIsRegenerating(false)
      console.error("[填充课程矩阵] 填充失败:", error)
    }
  }

  // 处理项目矩阵自动填充请求
  const handleFillProjectMatrix = async () => {
    // 检查是否已在重做中或流式生成中
    if (isRegenerating || streamingMessageId) {
      toast.error("请等待当前操作完成")
      return
    }

    if (!isInitialized || !sessionId) {
      toast.error("会话未初始化")
      return
    }

    console.log("[填充项目矩阵] 开始自动填充")

    // 设置重做状态（复用重做的loading效果）
    setIsRegenerating(true)

    // 创建用户消息和AI响应占位
    const timestamp = Date.now().toString()
    const userMessageId = `${timestamp}-user`
    const aiMessageId = `${timestamp}-fill-project-matrix`
    const userContent = "请根据画布中的课程矩阵和章节信息，自动填充项目矩阵的任务目标和支撑关系"

    // 创建用户消息
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user" as const,
      content: userContent,
      timestamp: Date.now(),
    }

    // 创建 AI 响应占位
    const assistantPlaceholder: ChatMessage = {
      id: aiMessageId,
      role: "assistant" as const,
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    }

    setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder])
    setStreamingMessageId(aiMessageId)
    setStreamingText("")
    setStreamingThinking("")
    setIsThinkingExpanded(false)

    streamingControllerRef.current?.abort()
    const controller = new AbortController()
    streamingControllerRef.current = controller

    const commitAssistantContent = (content: string, thinking?: string) => {
      setChatMessages((prev) => {
        const updatedMessages = prev.map((message) =>
          message.id === aiMessageId ? { ...message, content, thinking, isStreaming: false } : message
        )
        saveSessionToStorage(sessionId, updatedMessages)
        return updatedMessages
      })
    }

    const debugMode = process.env.NEXT_PUBLIC_AI_DEBUG === 'true'
    const requestUrl = `/lang-chain/v1/chat/completions${debugMode ? '?debug=true' : ''}`

    try {
      // 上传最新画布并获取 ossKey
      const ossKey = await getCanvasOssKey()
      if (!ossKey) {
        throw new Error("画布上传失败")
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'course-assistant',
          stream: true,
          session_id: sessionId,
          canvas_oss_key: ossKey,
          messages: [{ role: 'user', content: userContent }],
          // 填充项目矩阵的标记
          fill_project_matrix: true,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      const decoder = new TextDecoder()
      let accumulated = ''
      let accumulatedThinking = ''
      let buffer = ''

      const processStream = async () => {
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

              try {
                const parsed = JSON.parse(data)

                // 处理canvas事件 - 更新画布组件
                if (isCanvasEvent(parsed)) {
                  handleCanvasEvent(parsed as CanvasEventMessage)
                  continue
                }

                // 处理thinking事件
                if (isThinkingEvent(parsed)) {
                  accumulatedThinking += parsed.content
                  setStreamingThinking(accumulatedThinking)
                  continue
                }

                // 处理error事件
                if (isErrorEvent(parsed)) {
                  const errorEvent = parsed as ErrorEventMessage
                  toast.error(errorEvent.message)
                  continue
                }

                // 处理progress事件 - 显示在思考区域和画布矩阵内
                if (isProgressEvent(parsed)) {
                  const progressEvent = parsed as ProgressEventMessage
                  // 将进度消息追加到思考区域
                  const progressLine = `[${progressEvent.current}/${progressEvent.total}] ${progressEvent.message}\n`
                  accumulatedThinking += progressLine
                  setStreamingThinking(accumulatedThinking)
                  // 同时更新画布项目矩阵内的进度显示
                  setFillProjectMatrixProgress(progressEvent.message)
                  continue
                }

                // 处理标准OpenAI格式的内容
                if (isOpenAIChunk(parsed)) {
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    accumulated += content
                    setStreamingText(accumulated)
                  }
                  continue
                }
              } catch (parseError) {
                console.error('解析流式响应失败', parseError, data)
              }
            }
          }
        } catch (error) {
          // 流被中止时静默返回（用户点击停止按钮）
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('[填充项目矩阵] 流式请求已被用户中止')
            return
          }
          throw error
        } finally {
          reader.releaseLock()
        }

        // 填充完成，清除进度
        setFillProjectMatrixProgress(null)
        const finalContent = accumulated.trim() || '项目矩阵已自动填充任务目标和支撑关系'
        commitAssistantContent(finalContent, accumulatedThinking || undefined)
        if (streamingControllerRef.current === controller) {
          streamingControllerRef.current = null
        }
        setStreamingMessageId(null)
        setStreamingText('')
        setIsRegenerating(false)
        console.log("[填充项目矩阵] 填充完成")
      }

      processStream()
    } catch (error) {
      const fallback = controller.signal.aborted
        ? "已取消填充操作。"
        : "项目矩阵填充失败，请稍后再试。"
      commitAssistantContent(fallback)
      if (streamingControllerRef.current === controller) {
        streamingControllerRef.current = null
      }
      setStreamingMessageId(null)
      setStreamingText('')
      setFillProjectMatrixProgress(null)
      setIsRegenerating(false)
      console.error("[填充项目矩阵] 填充失败:", error)
    }
  }

  // 处理章节项目面板自动填充请求
  const handleFillChapterPanel = async (targetPanelId?: string) => {
    // 检查是否已在重做中或流式生成中
    if (isRegenerating || streamingMessageId) {
      toast.error("请等待当前操作完成")
      return
    }

    if (!isInitialized || !sessionId) {
      toast.error("会话未初始化")
      return
    }

    console.log("[填充章节项目] 开始自动填充", targetPanelId ? `目标面板: ${targetPanelId}` : "")

    // 设置重做状态（复用重做的loading效果）
    setIsRegenerating(true)

    // 创建用户消息和AI响应占位
    const timestamp = Date.now().toString()
    const userMessageId = `${timestamp}-user`
    const aiMessageId = `${timestamp}-fill-chapter-panel`
    const userContent = "请根据画布中的课程信息，自动填充章节项目列表"

    // 创建用户消息
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user" as const,
      content: userContent,
      timestamp: Date.now(),
    }

    // 创建 AI 响应占位
    const assistantPlaceholder: ChatMessage = {
      id: aiMessageId,
      role: "assistant" as const,
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    }

    setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder])
    setStreamingMessageId(aiMessageId)
    setStreamingText("")
    setStreamingThinking("")
    setIsThinkingExpanded(false)

    streamingControllerRef.current?.abort()
    const controller = new AbortController()
    streamingControllerRef.current = controller

    const commitAssistantContent = (content: string, thinking?: string) => {
      setChatMessages((prev) => {
        const updatedMessages = prev.map((message) =>
          message.id === aiMessageId ? { ...message, content, thinking, isStreaming: false } : message
        )
        saveSessionToStorage(sessionId, updatedMessages)
        return updatedMessages
      })
    }

    const debugMode = process.env.NEXT_PUBLIC_AI_DEBUG === 'true'
    const requestUrl = `/lang-chain/v1/chat/completions${debugMode ? '?debug=true' : ''}`

    try {
      // 清空章节面板子节点（填充前必须清空，否则原有内容会传到后台）
      const chapterPanel = targetPanelId
        ? canvasElements.find(el => el.id === targetPanelId)
        : canvasElements.find(el => el.type === CanvasComponentType.CHAPTER_PANEL)
      if (chapterPanel) {
        console.log("[填充章节项目] 清空章节面板:", chapterPanel.id)
        updateCanvasPanelChildren(chapterPanel.id, CanvasComponentType.CHAPTER_PANEL, CanvasComponentType.CHAPTER_CARD, [])
      }

      // 上传最新画布并获取 ossKey
      const ossKey = await getCanvasOssKey()
      if (!ossKey) {
        throw new Error("画布上传失败")
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'course-assistant',
          stream: true,
          session_id: sessionId,
          canvas_oss_key: ossKey,
          messages: [{ role: 'user', content: userContent }],
          // 填充章节项目面板的标记
          fill_chapter_panel: true,
          // 可选的目标面板ID
          ...(targetPanelId && { target_panel_id: targetPanelId }),
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      const decoder = new TextDecoder()
      let accumulated = ''
      let accumulatedThinking = ''
      let buffer = ''

      const processStream = async () => {
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

              try {
                const parsed = JSON.parse(data)

                // 处理canvas事件 - 更新画布组件
                if (isCanvasEvent(parsed)) {
                  handleCanvasEvent(parsed as CanvasEventMessage)
                  continue
                }

                // 处理thinking事件
                if (isThinkingEvent(parsed)) {
                  accumulatedThinking += parsed.content
                  setStreamingThinking(accumulatedThinking)
                  continue
                }

                // 处理error事件
                if (isErrorEvent(parsed)) {
                  const errorEvent = parsed as ErrorEventMessage
                  toast.error(errorEvent.message)
                  continue
                }

                // 处理标准OpenAI格式的内容
                if (isOpenAIChunk(parsed)) {
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    accumulated += content
                    setStreamingText(accumulated)
                  }
                  continue
                }
              } catch (parseError) {
                console.error('解析流式响应失败', parseError, data)
              }
            }
          }
        } catch (error) {
          // 流被中止时静默返回（用户点击停止按钮）
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('[填充章节] 流式请求已被用户中止')
            return
          }
          throw error
        } finally {
          reader.releaseLock()
        }

        // 填充完成
        const finalContent = accumulated.trim() || '章节项目已自动填充'
        commitAssistantContent(finalContent, accumulatedThinking || undefined)
        if (streamingControllerRef.current === controller) {
          streamingControllerRef.current = null
        }
        setStreamingMessageId(null)
        setStreamingText('')
        setIsRegenerating(false)
        // 如果有目标面板ID，选中该面板
        if (targetPanelId) {
          selectCanvasElement(targetPanelId)
        }
        console.log("[填充章节项目] 填充完成")
      }

      processStream()
    } catch (error) {
      const fallback = controller.signal.aborted
        ? "已取消填充操作。"
        : "章节项目填充失败，请稍后再试。"
      commitAssistantContent(fallback)
      if (streamingControllerRef.current === controller) {
        streamingControllerRef.current = null
      }
      setStreamingMessageId(null)
      setStreamingText('')
      setIsRegenerating(false)
      console.error("[填充章节项目] 填充失败:", error)
    }
  }

  // 处理教学目标面板自动填充请求
  const handleFillObjectivePanel = async (targetPanelId?: string) => {
    // 检查是否已在重做中或流式生成中
    if (isRegenerating || streamingMessageId) {
      toast.error("请等待当前操作完成")
      return
    }

    if (!isInitialized || !sessionId) {
      toast.error("会话未初始化")
      return
    }

    console.log("[填充教学目标] 开始自动填充", targetPanelId ? `目标面板: ${targetPanelId}` : "")

    // 设置重做状态（复用重做的loading效果）
    setIsRegenerating(true)

    // 创建用户消息和AI响应占位
    const timestamp = Date.now().toString()
    const userMessageId = `${timestamp}-user`
    const aiMessageId = `${timestamp}-fill-objective-panel`
    const userContent = "请根据画布中的课程信息，自动填充教学目标列表"

    // 创建用户消息
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user" as const,
      content: userContent,
      timestamp: Date.now(),
    }

    // 创建 AI 响应占位
    const assistantPlaceholder: ChatMessage = {
      id: aiMessageId,
      role: "assistant" as const,
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    }

    setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder])
    setStreamingMessageId(aiMessageId)
    setStreamingText("")
    setStreamingThinking("")
    setIsThinkingExpanded(false)

    streamingControllerRef.current?.abort()
    const controller = new AbortController()
    streamingControllerRef.current = controller

    const commitAssistantContent = (content: string, thinking?: string) => {
      setChatMessages((prev) => {
        const updatedMessages = prev.map((message) =>
          message.id === aiMessageId ? { ...message, content, thinking, isStreaming: false } : message
        )
        saveSessionToStorage(sessionId, updatedMessages)
        return updatedMessages
      })
    }

    const debugMode = process.env.NEXT_PUBLIC_AI_DEBUG === 'true'
    const requestUrl = `/lang-chain/v1/chat/completions${debugMode ? '?debug=true' : ''}`

    try {
      // 清空教学目标面板子节点（填充前必须清空，否则原有内容会传到后台）
      const objectivePanel = targetPanelId
        ? canvasElements.find(el => el.id === targetPanelId)
        : canvasElements.find(el => el.type === CanvasComponentType.OBJECTIVE_PANEL)
      if (objectivePanel) {
        console.log("[填充教学目标] 清空教学目标面板:", objectivePanel.id)
        updateCanvasPanelChildren(objectivePanel.id, CanvasComponentType.OBJECTIVE_PANEL, CanvasComponentType.OBJECTIVE_CARD, [])
      }

      // 上传最新画布并获取 ossKey
      const ossKey = await getCanvasOssKey()
      if (!ossKey) {
        throw new Error("画布上传失败")
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'course-assistant',
          stream: true,
          session_id: sessionId,
          canvas_oss_key: ossKey,
          messages: [{ role: 'user', content: userContent }],
          // 填充教学目标面板的标记
          fill_objective_panel: true,
          // 可选的目标面板ID
          ...(targetPanelId && { target_panel_id: targetPanelId }),
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      const decoder = new TextDecoder()
      let accumulated = ''
      let accumulatedThinking = ''
      let buffer = ''

      const processStream = async () => {
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

              try {
                const parsed = JSON.parse(data)

                // 处理canvas事件 - 更新画布组件
                if (isCanvasEvent(parsed)) {
                  handleCanvasEvent(parsed as CanvasEventMessage)
                  continue
                }

                // 处理thinking事件
                if (isThinkingEvent(parsed)) {
                  accumulatedThinking += parsed.content
                  setStreamingThinking(accumulatedThinking)
                  continue
                }

                // 处理error事件
                if (isErrorEvent(parsed)) {
                  const errorEvent = parsed as ErrorEventMessage
                  toast.error(errorEvent.message)
                  continue
                }

                // 处理标准OpenAI格式的内容
                if (isOpenAIChunk(parsed)) {
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    accumulated += content
                    setStreamingText(accumulated)
                  }
                  continue
                }
              } catch (parseError) {
                console.error('解析流式响应失败', parseError, data)
              }
            }
          }
        } catch (error) {
          // 流被中止时静默返回（用户点击停止按钮）
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('[填充教学目标] 流式请求已被用户中止')
            return
          }
          throw error
        } finally {
          reader.releaseLock()
        }

        // 填充完成
        const finalContent = accumulated.trim() || '教学目标已自动填充'
        commitAssistantContent(finalContent, accumulatedThinking || undefined)
        if (streamingControllerRef.current === controller) {
          streamingControllerRef.current = null
        }
        setStreamingMessageId(null)
        setStreamingText('')
        setIsRegenerating(false)
        // 如果有目标面板ID，选中该面板
        if (targetPanelId) {
          selectCanvasElement(targetPanelId)
        }
        console.log("[填充教学目标] 填充完成")
      }

      processStream()
    } catch (error) {
      const fallback = controller.signal.aborted
        ? "已取消填充操作。"
        : "教学目标填充失败，请稍后再试。"
      commitAssistantContent(fallback)
      if (streamingControllerRef.current === controller) {
        streamingControllerRef.current = null
      }
      setStreamingMessageId(null)
      setStreamingText('')
      setIsRegenerating(false)
      console.error("[填充教学目标] 填充失败:", error)
    }
  }

  // 处理课程信息自动填充请求（从源文档生成课程基本信息）
  const handleFillCourseInfo = async (courseInfoId: string) => {
    if (!sessionId) {
      console.warn("[填充课程信息] 缺少sessionId")
      return
    }

    console.log("[填充课程信息] 开始自动填充，课程信息ID:", courseInfoId)

    // 设置重做状态（复用重做的loading效果）
    setIsRegenerating(true)

    // 创建用户消息和AI响应占位
    const timestamp = Date.now().toString()
    const userMessageId = `${timestamp}-user`
    const aiMessageId = `${timestamp}-fill-course-info`
    const userContent = "请根据上传的源文档，自动生成课程基本信息"

    // 创建用户消息
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user" as const,
      content: userContent,
      timestamp: Date.now(),
    }

    // 创建 AI 响应占位
    const assistantPlaceholder: ChatMessage = {
      id: aiMessageId,
      role: "assistant" as const,
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    }

    setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder])
    setStreamingMessageId(aiMessageId)
    setStreamingText("")
    setStreamingThinking("")
    setIsThinkingExpanded(false)

    streamingControllerRef.current?.abort()
    const controller = new AbortController()
    streamingControllerRef.current = controller

    const commitAssistantContent = (content: string, thinking?: string) => {
      setChatMessages((prev) => {
        const updatedMessages = prev.map((message) =>
          message.id === aiMessageId ? { ...message, content, thinking, isStreaming: false } : message
        )
        saveSessionToStorage(sessionId, updatedMessages)
        return updatedMessages
      })
    }

    const debugMode = process.env.NEXT_PUBLIC_AI_DEBUG === 'true'
    const requestUrl = `/lang-chain/v1/chat/completions${debugMode ? '?debug=true' : ''}`

    try {
      // 上传最新画布并获取 ossKey
      const ossKey = await getCanvasOssKey()
      if (!ossKey) {
        throw new Error("画布上传失败")
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'course-assistant',
          stream: true,
          session_id: sessionId,
          canvas_oss_key: ossKey,
          messages: [{ role: 'user', content: userContent }],
          // 填充课程信息的标记
          fill_course_info: true,
          // 目标课程信息ID
          target_course_info_id: courseInfoId,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      const decoder = new TextDecoder()
      let accumulated = ''
      let accumulatedThinking = ''
      let buffer = ''

      const processStream = async () => {
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

              try {
                const parsed = JSON.parse(data)

                // 处理canvas事件 - 更新画布组件
                if (isCanvasEvent(parsed)) {
                  handleCanvasEvent(parsed as CanvasEventMessage)
                  continue
                }

                // 处理thinking事件
                if (isThinkingEvent(parsed)) {
                  accumulatedThinking += parsed.content
                  setStreamingThinking(accumulatedThinking)
                  continue
                }

                // 处理error事件
                if (isErrorEvent(parsed)) {
                  const errorEvent = parsed as ErrorEventMessage
                  toast.error(errorEvent.message)
                  continue
                }

                // 处理标准OpenAI格式的内容
                if (isOpenAIChunk(parsed)) {
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    accumulated += content
                    setStreamingText(accumulated)
                  }
                  continue
                }
              } catch (parseError) {
                console.error('解析流式响应失败', parseError, data)
              }
            }
          }
        } catch (error) {
          // 流被中止时静默返回（用户点击停止按钮）
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('[填充源文档] 流式请求已被用户中止')
            return
          }
          throw error
        } finally {
          reader.releaseLock()
        }

        // 填充完成
        const finalContent = accumulated.trim() || '课程基本信息已自动填充'
        commitAssistantContent(finalContent, accumulatedThinking || undefined)
        if (streamingControllerRef.current === controller) {
          streamingControllerRef.current = null
        }
        setStreamingMessageId(null)
        setStreamingText('')
        setIsRegenerating(false)
        // 选中课程信息卡片
        selectCanvasElement(courseInfoId)
        console.log("[填充课程信息] 填充完成")
      }

      processStream()
    } catch (error) {
      const fallback = controller.signal.aborted
        ? "已取消填充操作。"
        : "课程信息填充失败，请稍后再试。"
      commitAssistantContent(fallback)
      if (streamingControllerRef.current === controller) {
        streamingControllerRef.current = null
      }
      setStreamingMessageId(null)
      setStreamingText('')
      setIsRegenerating(false)
      console.error("[填充课程信息] 填充失败:", error)
    }
  }

  // 处理课点信息自动填充请求
  const handleFillCoursePoints = async () => {
    // 检查是否已在重做中或流式生成中
    if (isRegenerating || streamingMessageId) {
      toast.error("请等待当前操作完成")
      return
    }

    if (!isInitialized || !sessionId) {
      toast.error("会话未初始化")
      return
    }

    console.log("[填充课点信息] 开始自动填充")

    // 设置重做状态（复用重做的loading效果）
    setIsRegenerating(true)

    // 创建用户消息和AI响应占位
    const timestamp = Date.now().toString()
    const userMessageId = `${timestamp}-user`
    const aiMessageId = `${timestamp}-fill-course-points`
    const userContent = "请根据画布中的课程信息和教学目标，自动生成课点信息"

    // 创建用户消息
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user" as const,
      content: userContent,
      timestamp: Date.now(),
    }

    // 创建 AI 响应占位
    const assistantPlaceholder: ChatMessage = {
      id: aiMessageId,
      role: "assistant" as const,
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    }

    setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder])
    setStreamingMessageId(aiMessageId)
    setStreamingText("")
    setStreamingThinking("")
    setIsThinkingExpanded(false)

    streamingControllerRef.current?.abort()
    const controller = new AbortController()
    streamingControllerRef.current = controller

    const commitAssistantContent = (content: string, thinking?: string) => {
      setChatMessages((prev) => {
        const updatedMessages = prev.map((message) =>
          message.id === aiMessageId ? { ...message, content, thinking, isStreaming: false } : message
        )
        saveSessionToStorage(sessionId, updatedMessages)
        return updatedMessages
      })
    }

    const debugMode = process.env.NEXT_PUBLIC_AI_DEBUG === 'true'
    const requestUrl = `/lang-chain/v1/chat/completions${debugMode ? '?debug=true' : ''}`

    try {
      // 清空课点面板子节点（填充前必须清空，否则原有内容会传到后台）
      const coursePointPanel = canvasElements.find(el => el.type === CanvasComponentType.COURSE_POINT_PANEL)
      if (coursePointPanel) {
        console.log("[填充课点信息] 清空课点面板:", coursePointPanel.id)
        updateCanvasPanelChildren(coursePointPanel.id, CanvasComponentType.COURSE_POINT_PANEL, CanvasComponentType.COURSE_POINT_CARD, [])
      }

      // 上传最新画布并获取 ossKey
      const ossKey = await getCanvasOssKey()
      if (!ossKey) {
        throw new Error("画布上传失败")
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'course-assistant',
          stream: true,
          session_id: sessionId,
          canvas_oss_key: ossKey,
          messages: [{ role: 'user', content: userContent }],
          // 填充课点信息的标记
          fill_course_point_panel: true,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      const decoder = new TextDecoder()
      let accumulated = ''
      let accumulatedThinking = ''
      let buffer = ''

      const processStream = async () => {
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

              try {
                const parsed = JSON.parse(data)

                // 处理canvas事件 - 更新画布组件
                if (isCanvasEvent(parsed)) {
                  handleCanvasEvent(parsed as CanvasEventMessage)
                  continue
                }

                // 处理thinking事件
                if (isThinkingEvent(parsed)) {
                  accumulatedThinking += parsed.content
                  setStreamingThinking(accumulatedThinking)
                  continue
                }

                // 处理error事件
                if (isErrorEvent(parsed)) {
                  const errorEvent = parsed as ErrorEventMessage
                  toast.error(errorEvent.message)
                  continue
                }

                // 处理progress事件 - 显示在思考区域和画布课点面板内
                if (isProgressEvent(parsed)) {
                  const progressEvent = parsed as ProgressEventMessage
                  // 将进度消息追加到思考区域
                  const progressLine = `[${progressEvent.current}/${progressEvent.total}] ${progressEvent.message}\n`
                  accumulatedThinking += progressLine
                  setStreamingThinking(accumulatedThinking)
                  // 同时更新画布课点面板内的进度显示
                  setFillCoursePointsProgress(progressEvent.message)
                  continue
                }

                // 处理标准OpenAI格式的内容
                if (isOpenAIChunk(parsed)) {
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    accumulated += content
                    setStreamingText(accumulated)
                  }
                  continue
                }
              } catch (parseError) {
                console.error('解析流式响应失败', parseError, data)
              }
            }
          }
        } catch (error) {
          // 流被中止时静默返回（用户点击停止按钮）
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('[填充课点] 流式请求已被用户中止')
            return
          }
          throw error
        } finally {
          reader.releaseLock()
        }

        // 填充完成，清除进度
        setFillCoursePointsProgress(null)
        const finalContent = accumulated.trim() || '课点信息已自动生成'
        commitAssistantContent(finalContent, accumulatedThinking || undefined)
        if (streamingControllerRef.current === controller) {
          streamingControllerRef.current = null
        }
        setStreamingMessageId(null)
        setStreamingText('')
        setIsRegenerating(false)
        console.log("[填充课点信息] 填充完成")
      }

      processStream()
    } catch (error) {
      const fallback = controller.signal.aborted
        ? "已取消填充操作。"
        : "课点信息生成失败，请稍后再试。"
      commitAssistantContent(fallback)
      if (streamingControllerRef.current === controller) {
        streamingControllerRef.current = null
      }
      setStreamingMessageId(null)
      setStreamingText('')
      setFillCoursePointsProgress(null)
      setIsRegenerating(false)
      console.error("[填充课点信息] 填充失败:", error)
    }
  }

  // 处理KSA自动填充请求
  const handleFillKsa = async () => {
    // 检查是否已在重做中或流式生成中
    if (isRegenerating || streamingMessageId) {
      toast.error("请等待当前操作完成")
      return
    }

    if (!isInitialized || !sessionId) {
      toast.error("会话未初始化")
      return
    }

    console.log("[填充KSA] 开始自动填充")

    // 设置重做状态（复用重做的loading效果）
    setIsRegenerating(true)

    // 创建用户消息和AI响应占位
    const timestamp = Date.now().toString()
    const userMessageId = `${timestamp}-user`
    const aiMessageId = `${timestamp}-fill-ksa`
    const userContent = "请根据画布中的课程信息和课点信息，自动生成KSA（知识、技能、态度）三要素"

    // 创建用户消息
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user" as const,
      content: userContent,
      timestamp: Date.now(),
    }

    // 创建 AI 响应占位
    const assistantPlaceholder: ChatMessage = {
      id: aiMessageId,
      role: "assistant" as const,
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    }

    setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder])
    setStreamingMessageId(aiMessageId)
    setStreamingText("")
    setStreamingThinking("")
    setIsThinkingExpanded(false)

    streamingControllerRef.current?.abort()
    const controller = new AbortController()
    streamingControllerRef.current = controller

    const commitAssistantContent = (content: string, thinking?: string) => {
      setChatMessages((prev) => {
        const updatedMessages = prev.map((message) =>
          message.id === aiMessageId ? { ...message, content, thinking, isStreaming: false } : message
        )
        saveSessionToStorage(sessionId, updatedMessages)
        return updatedMessages
      })
    }

    const debugMode = process.env.NEXT_PUBLIC_AI_DEBUG === 'true'
    const requestUrl = `/lang-chain/v1/chat/completions${debugMode ? '?debug=true' : ''}`

    try {
      // 清空KSA面板子节点（填充前必须清空，否则原有内容会传到后台）
      const ksaPanel = canvasElements.find(el => el.type === CanvasComponentType.KSA_PANEL)
      if (ksaPanel) {
        console.log("[填充KSA] 清空KSA面板:", ksaPanel.id)
        updateCanvasPanelChildren(ksaPanel.id, CanvasComponentType.KSA_PANEL, CanvasComponentType.KSA_ITEM, [])
      }

      // 上传最新画布并获取 ossKey
      const ossKey = await getCanvasOssKey()
      if (!ossKey) {
        throw new Error("画布上传失败")
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'course-assistant',
          stream: true,
          session_id: sessionId,
          canvas_oss_key: ossKey,
          messages: [{ role: 'user', content: userContent }],
          // 填充KSA的标记
          fill_ksa_panel: true,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      const decoder = new TextDecoder()
      let accumulated = ''
      let accumulatedThinking = ''
      let buffer = ''

      const processStream = async () => {
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

              try {
                const parsed = JSON.parse(data)

                // 处理canvas事件 - 更新画布组件
                if (isCanvasEvent(parsed)) {
                  handleCanvasEvent(parsed as CanvasEventMessage)
                  continue
                }

                // 处理thinking事件
                if (isThinkingEvent(parsed)) {
                  accumulatedThinking += parsed.content
                  setStreamingThinking(accumulatedThinking)
                  continue
                }

                // 处理error事件
                if (isErrorEvent(parsed)) {
                  const errorEvent = parsed as ErrorEventMessage
                  toast.error(errorEvent.message)
                  continue
                }

                // 处理progress事件 - 显示在思考区域和画布KSA面板内
                if (isProgressEvent(parsed)) {
                  const progressEvent = parsed as ProgressEventMessage
                  // 将进度消息追加到思考区域
                  const progressLine = `[${progressEvent.current}/${progressEvent.total}] ${progressEvent.message}\n`
                  accumulatedThinking += progressLine
                  setStreamingThinking(accumulatedThinking)
                  // 同时更新画布KSA面板内的进度显示
                  setFillKsaProgress(progressEvent.message)
                  continue
                }

                // 处理标准OpenAI格式的内容
                if (isOpenAIChunk(parsed)) {
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    accumulated += content
                    setStreamingText(accumulated)
                  }
                  continue
                }
              } catch (parseError) {
                console.error('解析流式响应失败', parseError, data)
              }
            }
          }
        } catch (error) {
          // 流被中止时静默返回（用户点击停止按钮）
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('[填充KSA] 流式请求已被用户中止')
            return
          }
          throw error
        } finally {
          reader.releaseLock()
        }

        // 填充完成，清除进度
        setFillKsaProgress(null)
        const finalContent = accumulated.trim() || 'KSA三要素已自动生成'
        commitAssistantContent(finalContent, accumulatedThinking || undefined)
        if (streamingControllerRef.current === controller) {
          streamingControllerRef.current = null
        }
        setStreamingMessageId(null)
        setStreamingText('')
        setIsRegenerating(false)
        console.log("[填充KSA] 填充完成")
      }

      processStream()
    } catch (error) {
      const fallback = controller.signal.aborted
        ? "已取消填充操作。"
        : "KSA生成失败，请稍后再试。"
      commitAssistantContent(fallback)
      if (streamingControllerRef.current === controller) {
        streamingControllerRef.current = null
      }
      setStreamingMessageId(null)
      setStreamingText('')
      setFillKsaProgress(null)
      setIsRegenerating(false)
      console.error("[填充KSA] 填充失败:", error)
    }
  }

  // 停止生成处理函数
  const handleStopGeneration = async () => {
    // 取消流式请求
    streamingControllerRef.current?.abort()
    streamingControllerRef.current = null

    // 保存当前流式消息ID和已累积内容（在清除状态之前）
    const currentStreamingId = streamingMessageId
    const accumulatedContent = streamingText
    const accumulatedThinking = streamingThinking

    // 更新正在流式生成的消息，将其标记为已完成
    if (currentStreamingId) {
      const finalContent = accumulatedContent.trim() || '已停止生成'
      setChatMessages((prev) => {
        const updatedMessages = prev.map((message) =>
          message.id === currentStreamingId
            ? { ...message, content: finalContent, thinking: accumulatedThinking || undefined, isStreaming: false }
            : message
        )
        // 保存到 localStorage
        if (sessionId) {
          saveSessionToStorage(sessionId, updatedMessages)
        }
        return updatedMessages
      })
    }

    // 清除所有loading状态
    setStreamingMessageId(null)
    setStreamingText('')
    setStreamingThinking('')
    setIsRegenerating(false)
    setRegenerateTarget(null)
    setToolStatus(null)
    setProgress(null)

    // 通知后端终止生成
    if (sessionId) {
      try {
        await fetch('/lang-chain/v1/chat/cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_id: sessionId }),
        })
        console.log("[停止生成] 已通知后端终止生成")
      } catch (error) {
        console.error("[停止生成] 通知后端失败:", error)
      }
    }

    console.log("[停止生成] 用户手动停止了生成")
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !isInitialized || !sessionId) {
      return
    }

    const trimmedContent = inputMessage.trim()
    const timestamp = Date.now().toString()
    const aiMessageId = `${timestamp}-ai`

    // 处理附件上传
    let attachment: MessageAttachment | undefined
    if (attachedFiles.length > 0) {
      const fileToUpload = attachedFiles[0]
      setIsUploadingFile(true)

      try {
        const uploadResult = await uploadFileToOss(fileToUpload.file)
        if (uploadResult) {
          attachment = {
            name: fileToUpload.name,
            url: uploadResult.url,
            ossKey: uploadResult.ossKey,
            type: fileToUpload.type,
            size: fileToUpload.size,
          }
        } else {
          toast.error("文件上传失败，消息将不包含附件")
        }
      } catch (error) {
        console.error("文件上传出错:", error)
        toast.error("文件上传失败，消息将不包含附件")
      } finally {
        setIsUploadingFile(false)
      }
    }

    const userMessage: ChatMessage = {
      id: timestamp,
      role: "user" as const,
      content: trimmedContent,
      timestamp: Date.now(),
      attachment,
    }

    const assistantPlaceholder: ChatMessage = {
      id: aiMessageId,
      role: "assistant" as const,
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    }

    setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder])
    setInputMessage("")
    setAttachedFiles([]) // 清空附件
    // 发送消息后让输入框失去焦点，避免展开状态遮挡最新消息
    textareaRef.current?.blur()
    setStreamingMessageId(aiMessageId)
    setStreamingText("")
    setStreamingThinking("")
    setIsThinkingExpanded(false)

    streamingControllerRef.current?.abort()
    const controller = new AbortController()
    streamingControllerRef.current = controller

    const commitAssistantContent = (content: string, thinking?: string) => {
      setChatMessages((prev) => {
        const updatedMessages = prev.map((message) =>
          message.id === aiMessageId ? { ...message, content, thinking, isStreaming: false } : message
        )
        // 保存消息历史到localStorage
        saveSessionToStorage(sessionId, updatedMessages)
        return updatedMessages
      })
    }

    // OpenAI 标准接口（通过代理避免跨域）
    // 从环境变量读取 debug 参数，添加到 URL 查询字符串
    const debugMode = process.env.NEXT_PUBLIC_AI_DEBUG === 'true'
    const requestUrl = `/lang-chain/v1/chat/completions${debugMode ? '?debug=true' : ''}`

    try {
      // 获取画布 ossKey（如果有画布内容会先上传到阿里云 OSS）
      const ossKey = await getCanvasOssKey()

      // 构建消息数组
      const messages: Array<{ role: string; content: string; type?: string }> = []

      // 如果有文件附件，先添加文件消息
      if (attachment) {
        messages.push({
          role: 'user',
          content: attachment.ossKey,
          type: 'file',
        })
      }

      // 添加用户文本消息
      messages.push({
        role: 'user',
        content: trimmedContent,
      })

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'course-assistant',
          stream: true,
          session_id: sessionId,
          // 画布内容的阿里云 OSS Key（如果有画布内容）
          canvas_oss_key: ossKey || undefined,
          messages,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      const decoder = new TextDecoder()
      let accumulated = ''
      let accumulatedThinking = ''
      let buffer = ''

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (controller.signal.aborted) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            // 保留最后一行（可能不完整）
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmedLine = line.trim()
              if (!trimmedLine || !trimmedLine.startsWith('data:')) continue

              const data = trimmedLine.slice(5).trim()
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)

                // 处理status事件
                if (isStatusEvent(parsed)) {
                  const statusEvent = parsed as StatusEventMessage
                  setToolStatus({
                    node: statusEvent.node,
                    event: statusEvent.event,
                    tool: statusEvent.tool,
                    args: statusEvent.args,
                  })
                  // tools end时清除状态（而非agent end，因为agent end后可能还有tools执行）
                  if (statusEvent.node === 'tools' && statusEvent.event === 'end') {
                    // 延迟清除，让用户看到"工具执行完成"的状态
                    setTimeout(() => setToolStatus(null), 1000)
                  }
                  continue
                }

                // 处理canvas事件 - 触发画布展开
                if (isCanvasEvent(parsed)) {
                  handleCanvasEvent(parsed as CanvasEventMessage)
                  // canvas事件触发画布展开
                  if (!hasTriggeredExpandRef.current) {
                    hasTriggeredExpandRef.current = true
                    setIsCanvasExpanded(true)
                  }
                  continue
                }

                // 处理thinking事件
                if (isThinkingEvent(parsed)) {
                  accumulatedThinking += parsed.content
                  setStreamingThinking(accumulatedThinking)
                  continue
                }

                // 处理ui事件
                if (isUIEvent(parsed)) {
                  const uiEvent = parsed as UIEventMessage
                  // show_panel动作触发画布展开
                  if (uiEvent.action === 'show_panel') {
                    if (!hasTriggeredExpandRef.current) {
                      hasTriggeredExpandRef.current = true
                      setIsCanvasExpanded(true)
                    }
                  }
                  // hide_panel动作可选择收起画布
                  // TODO: 可根据需要扩展其他ui动作
                  console.log('[UI事件]', uiEvent.action, uiEvent)
                  continue
                }

                // 处理progress事件
                if (isProgressEvent(parsed)) {
                  const progressEvent = parsed as ProgressEventMessage
                  setProgress({
                    current: progressEvent.current,
                    total: progressEvent.total,
                    message: progressEvent.message,
                    stage: progressEvent.stage,
                  })
                  // 完成时清除进度
                  if (progressEvent.stage === 'complete') {
                    setTimeout(() => setProgress(null), 2000)
                  }
                  continue
                }

                // 处理mode事件
                if (isModeEvent(parsed)) {
                  const modeEvent = parsed as ModeEventMessage
                  setCurrentMode(modeEvent.mode)
                  if (modeEvent.stage) {
                    setBuildingStage(modeEvent.stage)
                  }
                  // 注意：mode事件本身不触发展开，后续的canvas/ui事件会触发
                  // chat模式时收起画布
                  if (modeEvent.mode === 'chat') {
                    setIsCanvasExpanded(false)
                    hasTriggeredExpandRef.current = false
                  }
                  continue
                }

                // 处理error事件
                if (isErrorEvent(parsed)) {
                  const errorEvent = parsed as ErrorEventMessage
                  toast.error(errorEvent.message)
                  continue
                }

                // 处理标准OpenAI格式的内容
                if (isOpenAIChunk(parsed)) {
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    accumulated += content
                    setStreamingText(accumulated)
                  }
                  continue
                }

                // 兼容后端旧格式：{ reply: "...", canvas_update: {...}, stage: "..." }
                // 这是后端问题，应由后端修复为标准格式，此处仅做临时兼容
                const legacyFormat = parsed as {
                  reply?: string
                  canvas_update?: Record<string, unknown>
                  stage?: string
                }
                if (legacyFormat.reply !== undefined || legacyFormat.canvas_update !== undefined) {
                  console.warn('[SSE] 检测到后端旧格式响应，建议后端修复为标准格式:', parsed)

                  // 处理 reply 字段作为消息内容
                  if (legacyFormat.reply) {
                    accumulated += legacyFormat.reply
                    setStreamingText(accumulated)
                  }

                  // 处理 canvas_update 字段，转换为标准 canvas 事件
                  if (legacyFormat.canvas_update) {
                    for (const [componentKey, componentData] of Object.entries(legacyFormat.canvas_update)) {
                      // 构造标准 canvas 事件
                      const canvasEvent: CanvasEventMessage = {
                        type: "canvas",
                        action: "update" as CanvasAction,
                        component: componentKey as CanvasComponentType,
                        data: componentData as CanvasComponentData,
                      }
                      handleCanvasEvent(canvasEvent)

                      // 触发画布展开
                      if (!hasTriggeredExpandRef.current) {
                        hasTriggeredExpandRef.current = true
                        setIsCanvasExpanded(true)
                      }
                    }
                  }
                  continue
                }
              } catch (parseError) {
                console.error('解析流式响应失败', parseError, data)
              }
            }
          }
        } catch (error) {
          // 流被中止时静默返回（用户点击停止按钮）
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('[聊天] 流式请求已被用户中止')
            return
          }
          throw error
        } finally {
          reader.releaseLock()
        }

        const finalContent = accumulated.trim() || 'AI 暂无新的建议，请稍后再试。'
        commitAssistantContent(finalContent, accumulatedThinking || undefined)
        if (streamingControllerRef.current === controller) {
          streamingControllerRef.current = null
        }
        setStreamingMessageId(null)
        setStreamingText('')
        // 不清空思考内容，保留显示"思考完毕"状态
      }

      processStream()
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
      // 不清空思考内容，保留显示
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`ai-drawer-content p-0 bg-background/90 backdrop-blur-xl border-border/40 transition-[width] duration-500 ease-out ${
          isCanvasExpanded
            ? "!w-screen !max-w-none"
            : "!w-[605px] sm:!w-[692px] lg:!w-[749px] xl:!w-[807px] 2xl:!w-[864px] sm:!max-w-none lg:!max-w-none 2xl:!max-w-none max-w-[90vw]"
        }`}
      >
        <div
          className="flex h-full min-h-0 relative"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* 全局拖拽覆盖层 */}
          {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm ai-drop-overlay-enter">
              <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-primary/5 border-2 border-dashed border-primary">
                <FileText className="h-12 w-12 text-primary animate-bounce" />
                <span className="text-lg font-medium text-primary">释放以添加文件</span>
                <span className="text-sm text-muted-foreground">支持 .md、.txt、.docx、.pdf、.xlsx、.csv、.json</span>
              </div>
            </div>
          )}
          {/* 左侧聊天区域 */}
          <div className={`flex flex-col min-h-0 transition-[width] duration-500 ease-out ${
            isCanvasExpanded ? "w-[25%] flex-shrink-0 min-w-0 overflow-hidden" : "w-full"
          }`}>
          <SheetHeader className={`relative ${isCanvasExpanded ? "px-4 pt-4 pb-3" : "px-6 pt-6 pb-4"}`}>
            <SheetTitle className="text-left text-xl font-semibold flex items-center gap-2">
              <img
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAqCAMAAAAqEZ1jAAAAAXNSR0IArs4c6QAAAAlwSFlzAAAhOAAAITgBRZYxYAAAAKJQTFRFAAAAenb/RpP/k2j/XXf7cXX6P5z7i2n8W3j7ZHP7jmn9VID7Qpf8jWn8Xnr6iWr8YHb7i2n8RJb9dWz8WXr8mWj9RpP8W3n8bW/8l2j+QJz9Q5f9ToT8fWv9ZW/8lWj9VID8YnX7Pp79QZr9pWb+RJT8m2f9k2j9SYz8jWn9hmr8UIT8fmv8VX78Xnn7d2z8ZHT7WHr7bm77Xnb7Z3D7YHH7RJOQRAAAACJ0Uk5TABAgICAwQEBAWF5gZXBwgICbn5+fo7+/vsLP39/f3urv73XwOA8AAAKfSURBVHja7dbJcuIwFIXhIzCxMTMNcdwMDoMZY4NxeP9X66srEckYQlPVvcvPBhZ8dVSIAvz03xNV/Luq4Xq9Hgo8nfDqjXq97hS1yXZNhXg2Z3o+f1KnLqx62y17Pp5smp+158EUaW6I52rkxLF3eoNpt1Ne+bR+Fd8U5Oc8Px6P5M0Evgq11ytpy0jgbk6e5cSxd2pb7yKOikpTouWyhbsNMsnpefZpOzsCI7c8brkM74/LqFSC7HkwVTu9lsB14ZJy745LlDdV5+3iQTXC7s9z3pNEggOh9s3woOFqJT2BmzUSLnMQEEeeh2+rkraiOrjZeL+XXEBwyp71Ybg+hWL+iltGt8ftKQI9QMzSlDxz9VofssIMdxitdJEvbo3jxqAGKXtt6N4OkpvgkmiFa50Ch1UU8zab/Ya4Br/IUnnewHCHg+FEh7/ExUIXdq+KG4N7z3hfzXDkaa5FmGpdMENrYWWjaoDrJtJLu4ajFFfbUduryN1ue4brb2KpjSvgvETe53R24U6Ggz+RYJnsCTMujmMJ9qELErkv9y7cyXAGtNCoI2Dqx9ymAl1bcYMLJ2NO5fZ2dmHLxiBGrJlxEAl7M1HkTFUzseeiWHOxYK+CrwLltRX3qTk7/4PbTXDdaBHLxytMdcllaaA56U1RSEyU56M0jotfYBLvynM091ni0GGtPO73nLkR7AaK6yqOKnG1g+wXrnqZz9nrw87bszdjjn/dDGffbgdX9YmT4HykaoLTp/UABGfyypx7a1yFNb0wpl7BddW8geSO5JU5TE63xhmOPb2uok8reN1Nrn4qjQNBlmfdvkB5beaoMgdP4LpFgbNuX3svtSwABoZ7WPOKa0Inxgl7DurMdfFXVV7savjK8WQ1/cz5+Q9e7A/jUZeiPQO0fwAAAABJRU5ErkJggg=="
                alt="AI 助手"
                className="h-8 w-8 object-contain"
              />
              课程开发AI助手
            </SheetTitle>
            <div className="flex items-center justify-between text-left">
              <p className="text-sm text-muted-foreground">
                灵感来自人工智能，实时协助你分析课程、生成摘要与行动建议。
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex-shrink-0"
                onClick={handleNewSession}
                title="开始新会话"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
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
            {/* SessionId调试信息 */}
            {sessionId && (
              <div className="flex items-center justify-end mt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(sessionId)
                    setSessionIdCopied(true)
                    setTimeout(() => setSessionIdCopied(false), 2000)
                  }}
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  title="点击复制SessionId"
                >
                  <span className="font-mono truncate max-w-[180px]">{sessionId}</span>
                  {sessionIdCopied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            )}
          </SheetHeader>

          {/* 进度条和状态显示 */}
          {(progress || toolStatus) && (
            <div className="px-6 py-3 border-b border-border/40 bg-muted/30">
              {/* 工具调用状态 */}
              {toolStatus && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  <span className="truncate">{getToolStatusText(toolStatus)}</span>
                </div>
              )}
              {/* 进度条 */}
              {progress && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{progress.message}</span>
                    <span className="text-primary font-medium">{progress.current}/{progress.total}</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <ScrollArea ref={scrollViewportRef} className="flex-1 min-h-0 w-full min-w-0 px-6 py-4 overflow-hidden">
            <div className="space-y-5 pr-2 w-full min-w-0 overflow-hidden">
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

                // 判断是否显示思考区域：当前消息是最后一条AI消息且有思考内容
                const isLastAssistantMessage = isAssistant && chatMessages.filter(m => m.role === "assistant").pop()?.id === message.id
                // 思考内容：流式传输时用临时状态，否则用消息中保存的内容
                const thinkingContent = shouldStream ? streamingThinking : message.thinking
                const showThinkingBlock = isLastAssistantMessage && thinkingContent

                return isAssistant ? (
                  <div key={message.id} className="space-y-2 text-left min-w-0 overflow-hidden">
                    {shouldStream ? (
                      <div className="text-xs ai-loading-text-gradient">简报 · 正在生成中</div>
                    ) : (
                      <div className="text-xs text-muted-foreground">简报 · {timeDisplay}</div>
                    )}
                    {showThinkingBlock && (
                      <div className="text-xs min-w-0 w-full overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                          className="flex items-center gap-2 text-primary/80 hover:text-primary transition-colors w-full text-left min-w-0 overflow-hidden"
                        >
                          {shouldStream ? (
                            <span className="h-2 w-2 animate-pulse rounded-full bg-primary flex-shrink-0" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-primary/50 flex-shrink-0" />
                          )}
                          <span className="flex-1 min-w-0 truncate">
                            {shouldStream ? `AI 正在思考：${thinkingContent?.replace(/\n/g, ' ').slice(0, isCanvasExpanded ? 20 : 50)}...` : 'AI思考完毕：点击此处查看完整思考过程'}
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
                    {shouldStream && !streamingText ? (
                      <div className="py-4 grid place-items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
                      </div>
                    ) : (
                      <div className="border-t border-dashed border-border/60 pt-3 text-sm leading-relaxed prose-ai min-w-0 overflow-hidden">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {contentToRender}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                ) : (
                  <div key={message.id} className="flex items-start justify-end text-right w-full min-w-0 overflow-hidden">
                    <div className="space-y-2 max-w-[80%] min-w-0">
                      <div className="text-xs text-muted-foreground">{userName}老师 · {formatRelativeTime(message.timestamp)}</div>
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
                            <div className="text-sm font-medium text-foreground truncate" title={message.attachment.name}>
                              {message.attachment.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {(message.attachment.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                        </a>
                      )}
                      <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm leading-relaxed shadow-sm text-left whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          <div className={`border-t border-border/60 bg-background/80 flex-shrink-0 flex flex-col gap-3 ${isCanvasExpanded ? "p-5" : "p-6"}`}>
                  <div className="relative">
                    <div className="ai-assistant-border-wrapper">
                      <div className="ai-assistant-border-surface">
                      <ExpandableTextarea
                        ref={textareaRef}
                        value={inputMessage}
                        onChange={(value) => setInputMessage(value)}
                        onExpandedChange={setIsInputExpanded}
                        placeholder="询问任何问题"
                        className="ai-assistant-textarea bg-background/80 px-3 py-2 text-sm pr-16"
                        rows={4}
                        hideCounter
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                            event.preventDefault()
                            // 生成中时不发送新消息
                            if (!streamingMessageId && !isRegenerating) {
                              handleSendMessage()
                            }
                          }
                        }}
                      />
                      </div>
                    </div>
                    {/* 发送/停止按钮：生成中时显示停止按钮，否则显示发送按钮 */}
                    {(streamingMessageId || isRegenerating) ? (
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute right-3 h-7 w-7 rounded-full transition-[transform,top,bottom] duration-200 z-10"
                        style={
                          isInputExpanded
                            ? { bottom: "12px", top: "auto", transform: "translateY(0)" }
                            : { top: "50%", bottom: "auto", transform: "translateY(-50%)" }
                        }
                        onClick={handleStopGeneration}
                        title="停止生成"
                      >
                        <Square className="h-3.5 w-3.5 fill-current" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        className="absolute right-3 h-7 w-7 rounded-full transition-[transform,top,bottom] duration-200 z-10"
                        style={
                          isInputExpanded
                            ? { bottom: "12px", top: "auto", transform: "translateY(0)" }
                            : { top: "50%", bottom: "auto", transform: "translateY(-50%)" }
                        }
                        disabled={!inputMessage.trim() || isUploadingFile}
                        onClick={handleSendMessage}
                      >
                        {isUploadingFile ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 min-h-[20px]">
                    {/* 文件标签区域 */}
                    {attachedFiles.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-shrink-0 overflow-x-auto max-w-[60%]">
                        {attachedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="ai-file-tag flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs group"
                          >
                            <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            <span className="truncate max-w-[120px] text-foreground/80" title={file.name}>
                              {file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(file.id)}
                              className="flex-shrink-0 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                              title="移除文件"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground truncate ml-auto">
                      AI 可能会生成不准确的内容，请务必核对后再决定是否采纳。
                    </p>
                  </div>
          </div>
          </div>

          {/* 展开时显示分割线和Canvas画布 */}
          {isCanvasExpanded && (
            <>
              {/* 垂直分割线 */}
              <div className="ai-canvas-divider w-[2px] h-full flex-shrink-0" />
              {/* 右侧Canvas画布区域 - 使用绝对定位确保有明确的宽高 */}
              <div className="flex-1 min-w-0 bg-background/50 relative">
                <div className="absolute inset-0">
                  <AiCanvasPanel
                    className="w-full h-full"
                    nodes={toFlowNodes()}
                    edges={toFlowEdges()}
                    onNodeDelete={removeCanvasElement}
                    onEdgeDelete={removeCanvasEdge}
                    onNodeClick={(nodeId) => selectCanvasElement(nodeId)}
                    onNodeDataUpdate={(nodeId, data) => updateCanvasElementData(nodeId, data)}
                    onNodePositionChange={(nodeId, position) => updateCanvasElementPosition(nodeId, position)}
                    onSelectionChange={(selectedIds) => updateCanvasSelection(selectedIds)}
                    onCoursePointsUpdate={(panelId, coursePoints) => {
                      // 将课点数据转换为画布子节点格式并更新
                      updateCanvasPanelChildren(
                        panelId,
                        CanvasComponentType.COURSE_POINT_PANEL,
                        CanvasComponentType.COURSE_POINT_CARD,
                        coursePoints.map(cp => ({
                          id: cp.id,
                          data: cp as CoursePointCardData,
                        }))
                      )
                    }}
                    onKsaItemsUpdate={(panelId, ksaItems) => {
                      // 将KSA数据转换为画布子节点格式并更新
                      updateCanvasPanelChildren(
                        panelId,
                        CanvasComponentType.KSA_PANEL,
                        CanvasComponentType.KSA_ITEM,
                        ksaItems.map(item => ({
                          id: item.id,
                          data: item as KsaItemData,
                        }))
                      )
                    }}
                    onChaptersUpdate={(panelId, chapters) => {
                      // 将章节数据转换为画布子节点格式并更新
                      updateCanvasPanelChildren(
                        panelId,
                        CanvasComponentType.CHAPTER_PANEL,
                        CanvasComponentType.CHAPTER_CARD,
                        chapters.map(chapter => ({
                          id: chapter.id,
                          data: chapter as ChapterCardData,
                        }))
                      )
                    }}
                    onObjectivesUpdate={(panelId, objectives) => {
                      // 将教学目标数据转换为画布子节点格式并更新
                      updateCanvasPanelChildren(
                        panelId,
                        CanvasComponentType.OBJECTIVE_PANEL,
                        CanvasComponentType.OBJECTIVE_CARD,
                        objectives.map(obj => ({
                          id: obj.id,
                          data: obj as ObjectiveCardData,
                        }))
                      )
                    }}
                    onProjectMatrixUpdate={(nodeId, matrixData) => {
                      // 更新项目矩阵节点数据
                      updateCanvasElementData(nodeId, matrixData)
                    }}
                    onConnectionMenuSelect={(option, _sourceNodeId, position) => {
                      // 处理课程矩阵创建
                      if (option === "courseMatrix") {
                        // 从画布元素中获取教学目标和章节数据
                        const objectiveCards = canvasElements
                          .filter(el => el.type === CanvasComponentType.OBJECTIVE_CARD)
                          .map(el => el.data as ObjectiveCardData)
                          .sort((a, b) => a.index - b.index)

                        const chapterCards = canvasElements
                          .filter(el => el.type === CanvasComponentType.CHAPTER_CARD)
                          .map(el => el.data as ChapterCardData)
                          .sort((a, b) => a.index - b.index)

                        // 构建课程矩阵数据
                        const courseMatrixData: CourseMatrixData = {
                          course_name: "",
                          objectives: objectiveCards.map(obj => ({
                            id: obj.id,
                            index: obj.index,
                            content: obj.content,
                          })),
                          rows: chapterCards.map(chapter => ({
                            chapter_id: chapter.id,
                            chapter_index: chapter.index,
                            chapter_name: chapter.name,
                            // 每个章节对应每个教学目标的支撑项，初始为空
                            supports: objectiveCards.map(obj => ({
                              objective_id: obj.id,
                              objective_index: obj.index,
                              course_points: [], // 单元格内容留空
                            })),
                          })),
                        }

                        // 创建课程矩阵
                        handleCanvasEvent({
                          type: "canvas",
                          action: CanvasAction.SET,
                          component: CanvasComponentType.COURSE_MATRIX,
                          data: courseMatrixData,
                        })

                        // 自动填充课程矩阵支撑关系（延迟执行，确保矩阵已创建并上传）
                        setTimeout(() => {
                          handleFillCourseMatrix()
                        }, 500)
                        return
                      }

                      // 处理项目矩阵创建 - 根据章节数量创建多个项目矩阵
                      if (option === "projectMatrix") {
                        // 从画布元素中获取章节数据
                        const chapterCards = canvasElements
                          .filter(el => el.type === CanvasComponentType.CHAPTER_CARD)
                          .map(el => el.data as ChapterCardData)
                          .sort((a, b) => a.index - b.index)

                        // 获取课程矩阵数据，用于筛选该章节已设置支撑关系的课点
                        const courseMatrixElement = canvasElements.find(
                          el => el.type === CanvasComponentType.COURSE_MATRIX
                        )
                        const courseMatrixData = courseMatrixElement?.data as CourseMatrixData | undefined

                        // 为每个章节创建一个项目矩阵
                        chapterCards.forEach(chapter => {
                          // 从课程矩阵中找到该章节行，收集所有已设置的课点
                          const chapterRow = courseMatrixData?.rows?.find(
                            row => row.chapter_id === chapter.id
                          )

                          // 收集该章节所有教学目标单元格中已设置的课点（去重）
                          const coursePointMap = new Map<string, { id: string; name: string; description?: string }>()
                          if (chapterRow?.supports) {
                            for (const support of chapterRow.supports) {
                              if (support.course_points) {
                                for (const cp of support.course_points) {
                                  if (!coursePointMap.has(cp.id)) {
                                    coursePointMap.set(cp.id, {
                                      id: cp.id,
                                      name: cp.name,
                                      description: undefined, // 课程矩阵中没有描述字段
                                    })
                                  }
                                }
                              }
                            }
                          }

                          // 如果该章节没有设置任何课点支撑，则跳过创建项目矩阵
                          if (coursePointMap.size === 0) {
                            return
                          }

                          const projectMatrixData: ProjectMatrixData = {
                            chapter_id: chapter.id,
                            chapter_index: chapter.index,
                            chapter_name: chapter.name,
                            task_objectives: [], // 任务目标留空
                            rows: Array.from(coursePointMap.values()).map(cp => ({
                              course_point_id: cp.id,
                              course_point_name: cp.name,
                              course_point_description: cp.description,
                              objective_supports: [], // 支撑项留空
                            })),
                          }

                          // 创建项目矩阵
                          handleCanvasEvent({
                            type: "canvas",
                            action: CanvasAction.CREATE,
                            component: CanvasComponentType.PROJECT_MATRIX,
                            data: projectMatrixData,
                          })
                        })

                        // 自动填充项目矩阵任务目标和支撑关系（延迟执行，确保矩阵已创建并上传）
                        setTimeout(() => {
                          handleFillProjectMatrix()
                        }, 500)
                        return
                      }

                      // 处理课程信息创建（从源文档卡片拖出）
                      if (option === "courseInfo") {
                        const courseInfoId = `course_info_${Date.now()}`
                        // 创建空的课程信息卡片
                        handleCanvasEvent({
                          type: "canvas",
                          action: CanvasAction.SET,
                          component: CanvasComponentType.COURSE_INFO,
                          data: {
                            id: courseInfoId,
                            name: "",
                            metadata: {},
                          },
                        })
                        // 调用AI填充课程基本信息
                        setTimeout(() => {
                          handleFillCourseInfo(courseInfoId)
                        }, 500)
                        return
                      }

                      // 处理开课报告创建
                      if (option === "courseReport") {
                        handleCanvasEvent({
                          type: "canvas",
                          action: CanvasAction.CREATE,
                          component: CanvasComponentType.COURSE_REPORT,
                          data: {
                            id: `course-report-${Date.now()}`,
                            name: "开课报告",
                            status: "draft",
                            createdAt: new Date().toLocaleDateString("zh-CN"),
                          },
                          position, // 传递菜单位置，用于手动创建时定位
                        })
                        return
                      }

                      // 菜单选项到面板类型的映射
                      const optionToPanelType: Record<string, CanvasComponentType> = {
                        objective: CanvasComponentType.OBJECTIVE_PANEL,
                        coursePoint: CanvasComponentType.COURSE_POINT_PANEL,
                        chapter: CanvasComponentType.CHAPTER_PANEL,
                        ksa: CanvasComponentType.KSA_PANEL,
                      }
                      const panelType = optionToPanelType[option]
                      if (panelType) {
                        // 生成面板ID（用于后续填充子节点）
                        const panelId = `${panelType}_${Date.now()}`

                        // 创建面板
                        handleCanvasEvent({
                          type: "canvas",
                          action: CanvasAction.CREATE,
                          component: panelType,
                          data: {
                            id: panelId,
                            title: option === "objective" ? "教学目标" : option === "coursePoint" ? "课点信息" : option === "chapter" ? "章节项目" : "KSA",
                          },
                        })

                        // 教学目标面板：创建后自动发送AI请求填充
                        if (option === "objective") {
                          setTimeout(() => {
                            handleFillObjectivePanel(panelId)
                          }, 500)
                        }

                        // 章节项目面板：创建后自动发送AI请求填充
                        if (option === "chapter") {
                          setTimeout(() => {
                            handleFillChapterPanel(panelId)
                          }, 500)
                        }

                        // 课点信息面板：创建后自动发送AI请求填充
                        if (option === "coursePoint") {
                          // 延迟触发AI请求（确保面板已创建）
                          setTimeout(() => {
                            handleFillCoursePoints()
                          }, 200)
                        }

                        // KSA面板：创建后自动发送AI请求填充
                        if (option === "ksa") {
                          // 延迟触发AI请求（确保面板已创建）
                          setTimeout(() => {
                            handleFillKsa()
                          }, 200)
                        }
                      }
                    }}
                    onNodeRegenerate={handleRegenerate}
                    isRegenerating={isRegenerating}
                    fillMatrixProgress={fillMatrixProgress}
                    fillProjectMatrixProgress={fillProjectMatrixProgress}
                    fillCoursePointsProgress={fillCoursePointsProgress}
                    fillKsaProgress={fillKsaProgress}
                    canvasElements={canvasElements}
                    canvasOssKey={canvasOssKey}
                    treeData={treeData}
                    onSaveSuccess={(majorId, courseId) => {
                      console.log("[AI助手] 课程保存成功, majorId:", majorId, "courseId:", courseId)
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

      </SheetContent>
    </Sheet>
  )
}
