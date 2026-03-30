"use client"

import "./ai-assistant.css"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Image from "next/image"
import { Plus, Copy, Check, FileText } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"
import { AiCanvasPanel } from "./ai-canvas-panel"
import {
  CanvasAction,
  CanvasComponentType,
  ProcessingEventMessage,
  StatusEventMessage,
  ObjectiveCardData,
  ChapterCardData,
  CoursePointCardData,
  KsaItemData,
  RegenerateTag,
  CourseInfoData,
} from "./canvas-elements"
import { FlowNodeType, getNodeColorConfig } from "./flow/utils/types"
import type { CanvasLayoutMode } from "./flow/utils/canvas-layout"
import { useCanvasElements } from "@/shared/hooks/use-canvas-elements"
import { useCanvasPersistence } from "@/shared/hooks/use-canvas-persistence"
import { useSSEStream } from "@/shared/hooks/use-sse-stream"
import { useFileDrag } from "@/shared/hooks/use-file-drag"
import { canvasApi } from "@/lib/api/canvas-api"
import { toast } from "sonner"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb"
import type { ChatMessage, MessageAttachment, AiAssistantDrawerProps, FillProgress, FillProgressType } from "@/types/ai-assistant"
import {
  AI_API_CONFIG,
  getAIRequestUrl,
  buildAIRequest,
  type AIRequestPayload,
} from "./ai-assistant/api-config"
import {
  createMessagePair,
  createMessageCommitter,
  canStartAIRequest,
  createLinkedElementMessage,
  ELEMENT_TYPE_TITLES,
  getElementDisplayTitle,
} from "./ai-assistant/message-utils"
import {
  createWelcomeMessage,
  generateSessionId,
  loadSessionFromStorage,
  saveSessionToStorage,
} from "./ai-assistant/session-utils"
import { ChatMessageItem } from "./ai-assistant/chat-message-item"
import { ChatInputArea } from "./ai-assistant/chat-input-area"
import { createConnectionMenuHandler } from "./ai-assistant/connection-menu-handlers"
import { GeminiDemoDrawer } from "./ai-assistant/gemini-demo-drawer"
import { useDebugMode } from "@/shared/hooks/use-debug-mode"

// CanvasComponentType 到 FlowNodeType 的映射（用于获取颜色配置）
const CANVAS_TO_FLOW_TYPE: Record<CanvasComponentType, string> = {
  [CanvasComponentType.SOURCE_DOCUMENT_PANEL]: "sourceDocumentPanel",
  [CanvasComponentType.SOURCE_DOCUMENT_CARD]: "sourceDocument",
  [CanvasComponentType.COURSE_INFO]: "courseInfo",
  [CanvasComponentType.OBJECTIVE_PANEL]: "objectivePanel",
  [CanvasComponentType.OBJECTIVE_CARD]: "objective",
  [CanvasComponentType.COURSE_POINT_PANEL]: "coursePointPanel",
  [CanvasComponentType.COURSE_POINT_CARD]: "coursePoint",
  [CanvasComponentType.CHAPTER_PANEL]: "chapterPanel",
  [CanvasComponentType.CHAPTER_CARD]: "chapter",
  [CanvasComponentType.KSA_PANEL]: "ksaPanel",
  [CanvasComponentType.KSA_ITEM]: "ksa",
  [CanvasComponentType.GRADUATION_SUPPORT]: "graduationSupportPanel",
  [CanvasComponentType.COURSE_MATRIX]: "courseMatrix",
  [CanvasComponentType.PROJECT_MATRIX_PANEL]: "projectMatrix",
  [CanvasComponentType.PROJECT_MATRIX]: "projectMatrix",
  [CanvasComponentType.COURSE_REPORT]: "courseReport",
}

const INDICATOR_DEFAULT_TEXT = "正在准备响应..."
const INDICATOR_UPDATE_THROTTLE_MS = 220

type IndicatorSource = "processing" | "status" | "thinking"
type ThinkingDisplayMode = "accumulate" | "latest"

const INDICATOR_SOURCE_PRIORITY: Record<IndicatorSource, number> = {
  processing: 3,
  status: 2,
  thinking: 1,
}

function normalizeIndicatorText(rawText: string | undefined): string {
  if (!rawText) return ""
  const normalized = rawText.replace(/\s+/g, " ").trim()
  if (!normalized) return ""
  return normalized.length > 34 ? `${normalized.slice(0, 34)}...` : normalized
}

function formatStatusIndicator(status: StatusEventMessage): string {
  const event = String(status.event ?? "")
  const node = String(status.node ?? "")
  const tool = status.tool?.trim()

  if (event === "call") {
    return tool ? `正在调用工具 ${tool}...` : "正在调用工具..."
  }
  if (event === "result") {
    return tool ? `工具 ${tool} 执行完成` : "工具执行完成"
  }
  if (node === "tools" && event === "start") {
    return "正在执行工具链..."
  }
  if (node === "tools" && event === "end") {
    return "工具链执行完成"
  }
  if (event === "start") {
    return node ? `正在执行 ${node}...` : "正在执行任务..."
  }
  if (event === "end") {
    return node ? `${node} 执行完成` : "任务执行完成"
  }

  return "正在处理中..."
}

function formatProcessingIndicator(event: ProcessingEventMessage): string {
  const message = normalizeIndicatorText(event.message)
  if (message) return message

  if (event.stage === "preparing") return "正在准备课程生成..."
  if (event.stage === "generating") return "正在生成课程内容..."
  if (event.stage === "classified") return "正在分析画布内容..."

  return "正在处理中..."
}

export function AiAssistantDrawer({
  open,
  onOpenChange,
  selectedNodeName,
  activeTabLabel,
  userName = "用户",
  treeData = null,
  initialCanvasData = null,
}: AiAssistantDrawerProps) {
  const showGeminiEntry = useDebugMode()
  const isCourseDetailCanvas = initialCanvasData !== null
  const [isGeminiDemoOpen, setIsGeminiDemoOpen] = useState(false)
  const [inputMessage, setInputMessage] = useState("")
  const [isInputExpanded, setIsInputExpanded] = useState(false)

  // 文件拖拽 Hook
  const {
    attachedFiles,
    isDragging,
    dragHandlers,
    removeFile: handleRemoveFile,
    clearFiles: clearAttachedFiles,
  } = useFileDrag({
    onError: (message) => toast.error(message),
  })

  // 从localStorage初始化会话数据
  const [sessionId, setSessionId] = useState<string>("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [isCanvasHydrating, setIsCanvasHydrating] = useState(false)
  const [isCanvasInteractionLocked, setIsCanvasInteractionLocked] = useState(false)
  const [canvasBuildProgress, setCanvasBuildProgress] = useState<{ loaded: number; total: number; stage: string; etaSeconds?: number | null } | null>(null)
  const [layoutMode, setLayoutMode] = useState<CanvasLayoutMode>("horizontal")

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
  const [streamingIndicatorText, setStreamingIndicatorText] = useState(INDICATOR_DEFAULT_TEXT)
  const [isPreContentIndicatorVisible, setIsPreContentIndicatorVisible] = useState(false)
  const hasReceivedContentChunkRef = useRef(false)
  const indicatorMetaRef = useRef<{ source: IndicatorSource; text: string; updatedAt: number }>({
    source: "thinking",
    text: "",
    updatedAt: 0,
  })

  const resetStreamingIndicator = useCallback(() => {
    hasReceivedContentChunkRef.current = false
    setIsPreContentIndicatorVisible(false)
    setStreamingIndicatorText(INDICATOR_DEFAULT_TEXT)
    indicatorMetaRef.current = {
      source: "thinking",
      text: "",
      updatedAt: 0,
    }
  }, [])

  const beginStreamingIndicator = useCallback((initialText: string = INDICATOR_DEFAULT_TEXT) => {
    hasReceivedContentChunkRef.current = false
    setIsPreContentIndicatorVisible(true)
    setStreamingIndicatorText(initialText)
    indicatorMetaRef.current = {
      source: "thinking",
      text: initialText,
      updatedAt: Date.now(),
    }
  }, [])

  const markStreamingContentStarted = useCallback(() => {
    if (hasReceivedContentChunkRef.current) return
    hasReceivedContentChunkRef.current = true
    setIsPreContentIndicatorVisible(false)
  }, [])

  const updateStreamingIndicator = useCallback((source: IndicatorSource, rawText: string) => {
    if (hasReceivedContentChunkRef.current) return

    const nextText = normalizeIndicatorText(rawText)
    if (!nextText) return

    const now = Date.now()
    const previous = indicatorMetaRef.current
    const prevPriority = INDICATOR_SOURCE_PRIORITY[previous.source] ?? 0
    const nextPriority = INDICATOR_SOURCE_PRIORITY[source]
    const withinThrottleWindow = now - previous.updatedAt < INDICATOR_UPDATE_THROTTLE_MS

    if (nextText === previous.text) return
    if (withinThrottleWindow && nextPriority <= prevPriority) return

    setIsPreContentIndicatorVisible(true)
    setStreamingIndicatorText(nextText)
    indicatorMetaRef.current = {
      source,
      text: nextText,
      updatedAt: now,
    }
  }, [])

  // [MOD] 流式输出时自动展开思考区域，完成后自动收起
  const prevStreamingMessageIdRef = useRef<string | null>(null)
  useEffect(() => {
    const wasStreaming = prevStreamingMessageIdRef.current !== null
    const isStreaming = streamingMessageId !== null

    if (!wasStreaming && isStreaming) {
      // 开始流式输出时展开
      setIsThinkingExpanded(true)
      beginStreamingIndicator()
    } else if (wasStreaming && !isStreaming) {
      // 流式输出完成时收起
      setIsThinkingExpanded(false)
      resetStreamingIndicator()
    }

    prevStreamingMessageIdRef.current = streamingMessageId
  }, [streamingMessageId, beginStreamingIndicator, resetStreamingIndicator])
  // 画布展开状态：收到第一条SSE时触发展开
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false)
  const hasTriggeredExpandRef = useRef(false) // 防止重复触发

  // sessionId复制状态
  const [sessionIdCopied, setSessionIdCopied] = useState(false)

  // 重做功能状态
  const [isRegenerating, setIsRegenerating] = useState(false)
  // 重做标签状态（用于 UI 显示）
  const [regenerateTag, setRegenerateTag] = useState<RegenerateTag | null>(null)

  // 填充进度状态（合并课程矩阵、项目矩阵、课点、KSA 四种进度）
  const [fillProgress, setFillProgress] = useState<FillProgress>({})

  // [MOD] 画布元素加载状态（用于聊天区关联卡片状态同步）
  const [elementLoadingStates, setElementLoadingStates] = useState<Map<string, boolean>>(new Map())

  // [MOD] 已删除的画布元素ID集合（用于禁用聊天区关联卡片）
  const [deletedElementIds, setDeletedElementIds] = useState<Set<string>>(new Set())

  // 更新特定类型的填充进度
  const updateFillProgress = useCallback((type: FillProgressType, message: string | null) => {
    setFillProgress(prev => ({ ...prev, [type]: message }))
  }, [])

  // 画布元素管理
  const {
    elements: canvasElements,
    edges: canvasEdges,
    specialComponents: canvasSpecialComponents,
    selectedId: canvasSelectedId,
    removeElementWithConnected: removeCanvasElement,
    removeEdge: removeCanvasEdge,
    selectElement: selectCanvasElement,
    setSelectedIdOnly,
    updateElementPosition: updateCanvasElementPosition,
    updateElementData: updateCanvasElementData,
    updatePanelChildren: updateCanvasPanelChildren,
    clearCanvas,
    clearSpecialComponents,
    loadCanvasData,
    handleCanvasEvent,
    relayoutElements,
    flowNodes,
    toFlowEdges,
  } = useCanvasElements(layoutMode)

  // [FIX] 使用 useCallback 创建稳定的回调引用，避免 useCanvasPersistence 内部依赖变化导致无限循环
  const handleCanvasUploadSuccess = useCallback((ossKey: string) => {
    console.log("[画布] 上传成功, ossKey:", ossKey)
  }, [])

  const handleCanvasUploadError = useCallback((error: Error) => {
    console.error("[画布] 上传失败:", error)
  }, [])

  // 画布持久化（自动保存到本地和阿里云 OSS）
  const {
    ossKey: canvasOssKey,
    isUploading: isCanvasUploading,
    updateCanvasData,
    forceUpload: forceCanvasUpload,
    loadFromLocal: loadCanvasFromLocal,
    clearPersistence: clearCanvasPersistence,
  } = useCanvasPersistence({
    sessionId,
    autoUpload: true,
    uploadInterval: 30000, // 30秒自动上传
    suspendAutoUpload: isCanvasHydrating,
    onUploadSuccess: handleCanvasUploadSuccess,
    onUploadError: handleCanvasUploadError,
  })

  // 记录已加载的sessionId，避免重复加载，同时用于防止加载前保存空数据
  const hasLoadedCanvasRef = useRef<string | null>(null)

  // [MOD] 追踪初始画布数据是否已处理，避免重复加载
  const initialCanvasDataProcessedRef = useRef<boolean>(false)
  const canvasBuildStartAtRef = useRef<number | null>(null)

  // [MOD] 使用 ref 保存最新的 canvasElements，解决 SSE 回调中闭包捕获旧值的问题
  const canvasElementsRef = useRef(canvasElements)
  useEffect(() => {
    canvasElementsRef.current = canvasElements
  }, [canvasElements])

  const canvasEdgesRef = useRef(canvasEdges)
  useEffect(() => {
    canvasEdgesRef.current = canvasEdges
  }, [canvasEdges])

  const canvasSpecialComponentsRef = useRef(canvasSpecialComponents)
  useEffect(() => {
    canvasSpecialComponentsRef.current = canvasSpecialComponents
  }, [canvasSpecialComponents])

  const canvasSelectedIdRef = useRef(canvasSelectedId)
  useEffect(() => {
    canvasSelectedIdRef.current = canvasSelectedId
  }, [canvasSelectedId])

  const waitForCanvasStateFlush = useCallback(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })
  }, [])

  const ensureLatestCanvasOssKey = useCallback(async (): Promise<string | null> => {
    await waitForCanvasStateFlush()

    const selectedIds = canvasSelectedIdRef.current ? [canvasSelectedIdRef.current] : []
    updateCanvasData(
      canvasElementsRef.current,
      canvasEdgesRef.current,
      canvasSpecialComponentsRef.current,
      selectedIds,
      { skipAutoUpload: true }
    )

    return forceCanvasUpload()
  }, [forceCanvasUpload, updateCanvasData, waitForCanvasStateFlush])

  // 统一计算画布构建进度 ETA，避免两个加载入口出现重复逻辑
  const updateCanvasBuildProgressWithEta = useCallback((progress: { loaded: number; total: number; stage: string }) => {
    const startAt = canvasBuildStartAtRef.current
    const elapsedSeconds = startAt ? Math.max((Date.now() - startAt) / 1000, 0.1) : 0
    const speed = progress.loaded > 0 ? progress.loaded / elapsedSeconds : 0
    const remaining = Math.max(progress.total - progress.loaded, 0)
    const etaSeconds = speed > 0 ? Math.ceil(remaining / speed) : null
    setCanvasBuildProgress({ ...progress, etaSeconds })
  }, [])

  // 抽屉打开时，从本地存储加载画布数据（必须在保存逻辑之前执行）
  // [MOD] 增加 !initialCanvasData 条件：当有外部初始数据时，跳过本地存储加载，避免数据合并
  useEffect(() => {
    // 仅在抽屉打开、sessionId有效、且尚未加载过该session的画布时执行
    // 重要：如果有 initialCanvasData，说明是从课程详情页进入，应由另一个 useEffect 处理
    if (open && sessionId && isInitialized && hasLoadedCanvasRef.current !== sessionId && !initialCanvasData) {
      console.log("[AI助手] 尝试从本地存储加载画布, sessionId:", sessionId)
      const localCanvasData = loadCanvasFromLocal()
      console.log("[AI助手] 本地存储数据:", localCanvasData ? `元素数=${localCanvasData.elements?.length || 0}, 边数=${localCanvasData.edges?.length || 0}` : "无数据")

      if (localCanvasData && (localCanvasData.elements?.length > 0 || localCanvasData.edges?.length > 0)) {
        setIsCanvasHydrating(true)
        setIsCanvasInteractionLocked(true)
        canvasBuildStartAtRef.current = Date.now()
        setCanvasBuildProgress(null)
        // 加载本地画布数据（包含选中状态）
        // 类型断言：本地存储的数据结构与画布元素类型一致
        loadCanvasData(
          (localCanvasData.elements || []) as Parameters<typeof loadCanvasData>[0],
          (localCanvasData.edges || []) as Parameters<typeof loadCanvasData>[1],
          localCanvasData.specialComponents as Parameters<typeof loadCanvasData>[2],
          localCanvasData.selectedIds,
          {
            onBaseReady: () => {
              // 基础骨架就绪后立即解锁交互，重元素继续后台分批挂载
              setIsCanvasInteractionLocked(false)
            },
            onComplete: () => {
              setIsCanvasHydrating(false)
              setIsCanvasInteractionLocked(false)
              canvasBuildStartAtRef.current = null
              setCanvasBuildProgress(null)
            },
            onProgress: updateCanvasBuildProgressWithEta,
          }
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
  }, [open, sessionId, isInitialized, initialCanvasData, loadCanvasFromLocal, loadCanvasData, updateCanvasBuildProgressWithEta])

  // [MOD] 处理从外部传入的初始画布数据（如从课程详情页加载已有课程）
  useEffect(() => {
    // 条件：抽屉打开、有初始数据、尚未处理过
    if (
      open &&
      initialCanvasData &&
      initialCanvasData.elements.length > 0 &&
      !initialCanvasDataProcessedRef.current
    ) {
      console.log("[AI助手] 检测到初始画布数据，创建新会话并加载")

      // 标记为已处理，防止重复执行
      initialCanvasDataProcessedRef.current = true

      // 1. 生成新的会话ID
      const newSessionId = generateSessionId()

      // 2. 清空旧数据
      streamingControllerRef.current?.abort()
      clearCanvas()
      clearCanvasPersistence()

      // 3. 重置聊天消息为课程专用欢迎消息
      // 从课程详情页进入时，使用定制的欢迎语
      const courseWelcomeMessage: ChatMessage = {
        id: `welcome_${Date.now()}`,
        role: "assistant",
        content: "你好，我是高校课程通的 AI 助手，可以帮助你分析课程结构，优化课程信息，更新三级矩阵。",
        timestamp: Date.now(),
      }
      const newMessages = [courseWelcomeMessage]

      // 4. 更新状态
      setSessionId(newSessionId)
      setChatMessages(newMessages)
      setInputMessage("")
      setStreamingMessageId(null)
      setStreamingText("")
      setStreamingThinking("")

      // 5. 重置其他状态
      setIsRegenerating(false)
      setRegenerateTag(null)
      setFillProgress({})
      setDeletedElementIds(new Set())
      setElementLoadingStates(new Map())

      // 6. 加载画布数据
      // [MOD] 在初始画布完成首帧渲染前暂停持久化上传，避免批量挂载触发上传风暴
      setIsCanvasHydrating(true)
      setIsCanvasInteractionLocked(true)
      canvasBuildStartAtRef.current = Date.now()
      setCanvasBuildProgress(null)
      const canvasRenderStart = performance.now()
      loadCanvasData(
        initialCanvasData.elements,
        initialCanvasData.edges,
        initialCanvasData.specialComponents,
        undefined,
        {
          onBaseReady: () => {
            // 先释放交互锁，允许用户拖拽/缩放/查看，剩余节点后台继续追加
            setIsCanvasInteractionLocked(false)
          },
          onComplete: () => {
            const renderDurationMs = performance.now() - canvasRenderStart
            console.log("[AI助手] 初始画布首帧渲染完成:", {
              renderDurationMs: Number(renderDurationMs.toFixed(1)),
              elementsCount: initialCanvasData.elements.length,
              edgesCount: initialCanvasData.edges.length,
            })
            setIsCanvasHydrating(false)
            setIsCanvasInteractionLocked(false)
            canvasBuildStartAtRef.current = null
            setCanvasBuildProgress(null)
          },
          onProgress: updateCanvasBuildProgressWithEta,
        }
      )

      // 7. 展开画布
      setIsCanvasExpanded(true)
      hasTriggeredExpandRef.current = true

      // 8. 标记画布已加载（防止本地存储覆盖）
      hasLoadedCanvasRef.current = newSessionId

      // 9. 保存新会话到 localStorage
      saveSessionToStorage(newSessionId, newMessages)

      console.log("[AI助手] 初始画布数据加载完成，新会话ID:", newSessionId, "元素数:", initialCanvasData.elements.length)
    }
  }, [
    open,
    initialCanvasData,
    clearCanvas,
    clearCanvasPersistence,
    loadCanvasData,
    updateCanvasBuildProgressWithEta,
  ])

  // [MOD] 当抽屉关闭时，重置初始数据处理标记
  useEffect(() => {
    if (!open) {
      initialCanvasDataProcessedRef.current = false
      setIsCanvasInteractionLocked(false)
    }
  }, [open])

  // 监听画布数据变化，更新持久化数据
  // 重要：必须在画布加载完成后才能保存，否则会用空数据覆盖已保存的数据
  useEffect(() => {
    // 只有当前 session 的画布已完成加载后，才允许保存
    if (sessionId && hasLoadedCanvasRef.current === sessionId && !isCanvasHydrating) {
      // 将选中状态转换为数组传递（支持多选场景）
      const selectedIds = canvasSelectedId ? [canvasSelectedId] : []
      updateCanvasData(canvasElements, canvasEdges, canvasSpecialComponents, selectedIds)
    }
  }, [sessionId, canvasElements, canvasEdges, canvasSpecialComponents, canvasSelectedId, isCanvasHydrating, updateCanvasData])

  // SSE 流式处理 Hook（提供统一的流处理能力）
  const {
    processStream,
    resetController: resetSSEController,
      } = useSSEStream({})

  const streamingControllerRef = useRef<AbortController | null>(null)
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const getTimeGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "上午好"
    if (hour < 18) return "下午好"
    return "晚上好"
  }
  const greetingForMessage = `${userName}老师：${getTimeGreeting()}。`

  // 创建新会话：重置消息列表并生成新session_id，保存到localStorage
  const handleNewSession = useCallback(() => {
    // 保存旧的 sessionId，用于通知后端清除
    const oldSessionId = sessionId

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
    setIsCanvasHydrating(false)
    setIsCanvasInteractionLocked(false)
    canvasBuildStartAtRef.current = null
    setCanvasBuildProgress(null)
    // 清空画布元素
    clearCanvas()
    // 清除画布持久化数据
    clearCanvasPersistence()
    // 重置画布加载标志，允许新会话加载其画布数据
    hasLoadedCanvasRef.current = null
    // 重置SSE事件状态
    // 重置重做状态
    setIsRegenerating(false)
    setRegenerateTag(null)

    // 保存新会话到localStorage
    saveSessionToStorage(newSessionId, newMessages)
    // 清空附件文件
    clearAttachedFiles()

    // 异步通知后端清除旧会话（不等待响应）
    if (oldSessionId) {
      fetch(`${AI_API_CONFIG.SESSION_BASE_PATH}/${oldSessionId}`, {
        method: 'DELETE',
      }).catch(() => {})
    }
  }, [sessionId, clearCanvas, clearCanvasPersistence, clearAttachedFiles])

  // 上传文件到OSS
  const uploadFileToOss = useCallback(async (file: File): Promise<{ url: string; ossKey: string } | null> => {
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
        console.error("上传文件到OSS失败:", presignResponse.error || "获取上传签名失败")
        return null
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
        console.error("上传文件到OSS失败:", `上传文件失败，HTTP ${uploadResponse.status}`)
        return null
      }

      // 构建访问URL（从uploadUrl中提取基础域名）
      const urlObj = new URL(uploadUrl)
      const accessUrl = `${urlObj.origin}/${finalOssKey}`

      return { url: accessUrl, ossKey: finalOssKey }
    } catch (error) {
      console.error("上传文件到OSS失败:", error)
      return null
    }
  }, [sessionId])

  useEffect(() => {
    return () => {
      streamingControllerRef.current?.abort()
    }
  }, [])

  const prevMessageCountRef = useRef(chatMessages.length)
  const wasOpenRef = useRef(false)

  // [MOD] 非流式时的滚动效果：仅在新消息到达或抽屉打开时触发
  useEffect(() => {
    // 组件从关闭变为打开时，滚动到底部（仅当有历史消息时）
    const justOpened = open && !wasOpenRef.current && chatMessages.length > 1
    // 只在消息数量增加时滚动到底部
    const hasNewMessage = chatMessages.length > prevMessageCountRef.current

    if (justOpened || hasNewMessage) {
      // [FIX] 延迟执行滚动：
      // - 打开抽屉时延迟 450ms 等待 Sheet 动画完成 + DOM 渲染
      // - 新消息时延迟 50ms
      // - 在 setTimeout 内部获取 ref，确保此时 DOM 已挂载
      const delay = justOpened ? 450 : 50
      setTimeout(() => {
        const viewport = scrollViewportRef.current
        if (viewport) {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' })
        }
      }, delay)
    }

    prevMessageCountRef.current = chatMessages.length
    wasOpenRef.current = open
  }, [open, chatMessages])

  // 流式输出时的滚动效果
  useEffect(() => {
    if (!streamingMessageId) return

    const viewport = scrollViewportRef.current
    if (!viewport) return

    // [MOD] ScrollArea Viewport 内部有一个 div 包装器，需要获取其 scrollHeight
    const scrollToBottom = () => {
      const innerContent = viewport.firstElementChild as HTMLElement | null
      const scrollHeight = innerContent?.scrollHeight ?? viewport.scrollHeight
      viewport.scrollTop = scrollHeight
    }

    scrollToBottom()

    const intervalId = setInterval(scrollToBottom, 200)

    return () => clearInterval(intervalId)
  }, [streamingMessageId])

  // 输入框展开/收起时平滑调整聊天区域滚动位置
  // [MOD] 移除 streamingText 依赖，流式输出时的滚动由上方的 interval effect 处理
  const prevInputExpandedRef = useRef(isInputExpanded)
  useEffect(() => {
    const viewport = scrollViewportRef.current
    if (!viewport) return

    const wasExpanded = prevInputExpandedRef.current
    const isNowExpanded = isInputExpanded

    if (wasExpanded !== isNowExpanded) {
      // 流式生成时不滚动，由流式滚动 effect 处理
      if (streamingMessageId !== null) {
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
  }, [isInputExpanded, streamingMessageId])

  // 文件上传状态
  const [isUploadingFile, setIsUploadingFile] = useState(false)

  /**
   * 通用 SSE 请求执行函数
   * 封装了所有 AI 填充请求的公共逻辑
   */
  interface SSERequestConfig {
    userContent: string
    displayUserContent?: string
    messageSuffix: string
    logPrefix: string
    defaultCompleteMessage: string
    cancelMessage: string
    errorMessage: string
    payload: Partial<Omit<AIRequestPayload, 'sessionId' | 'messages' | 'canvasOssKey'>>
    onBeforeRequest?: () => Promise<void> | void
    onComplete?: () => void
    /** 指定当前请求对应的面板类型，processing 事件将直接路由到该面板 */
    fillProgressType?: FillProgressType
    skipInitCheck?: boolean
  }

  const executeSSERequest = useCallback(async (config: SSERequestConfig) => {
    // 检查是否可以开始请求
    if (!config.skipInitCheck) {
      const checkResult = canStartAIRequest(isRegenerating, streamingMessageId, isInitialized, sessionId)
      if (!checkResult.canStart) {
        toast.error(checkResult.errorMessage)
        return
      }
    }

    console.log(`[${config.logPrefix}] 开始`)

    // 设置加载状态
    setIsRegenerating(true)

    // 创建消息对
    const { userMessage, assistantPlaceholder, aiMessageId } = createMessagePair(
      config.displayUserContent ?? config.userContent,
      config.messageSuffix
    )

    // 更新消息列表
    setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder])
    setStreamingMessageId(aiMessageId)
    setStreamingText("")
    setStreamingThinking("")
    setIsThinkingExpanded(false)

    // 重置 AbortController（使用 useSSEStream 提供的方法）
    streamingControllerRef.current?.abort()
    const controller = resetSSEController()
    streamingControllerRef.current = controller

    // 创建消息提交函数
    const commitAssistantContent = createMessageCommitter(
      aiMessageId,
      sessionId,
      setChatMessages,
      saveSessionToStorage
    )

    // 思考区展示模式：闲聊模式累积，agent/internal 进度模式仅显示最新一条
    const thinkingState = {
      mode: "accumulate" as ThinkingDisplayMode,
      accumulated: '',
      latest: '',
    }
    // 用于追踪 SSE 错误消息
    let sseErrorMessage = ''
    // [MOD] 用于追踪已创建关联消息的元素ID，避免重复创建（移到 try 外以便 catch 可访问）
    const linkedElementIds = new Set<string>()

    const clearLinkedElementLoading = () => {
      if (linkedElementIds.size > 0) {
        setElementLoadingStates(prev => {
          const newMap = new Map(prev)
          linkedElementIds.forEach(id => newMap.set(id, false))
          return newMap
        })
      }
    }

    try {
      // 执行请求前的准备操作
      if (config.onBeforeRequest) {
        await config.onBeforeRequest()
      }

      // 等待清空/更新操作对应的 React 状态提交，避免上传旧画布快照
      await waitForCanvasStateFlush()

      // 显式同步持久化快照，确保接下来 forceUpload 上传的是最新数据
      const selectedIds = canvasSelectedIdRef.current ? [canvasSelectedIdRef.current] : []
      updateCanvasData(
        canvasElementsRef.current,
        canvasEdgesRef.current,
        canvasSpecialComponentsRef.current,
        selectedIds,
        { skipAutoUpload: true }
      )

      const canvasElementTypeCounts = canvasElementsRef.current.reduce<Record<string, number>>((accumulator, element) => {
        accumulator[element.type] = (accumulator[element.type] || 0) + 1
        return accumulator
      }, {})
      console.log(`[${config.logPrefix}] 画布快照检查`, {
        elementTypeCounts: canvasElementTypeCounts,
        hasProjectMatrix: Boolean(canvasElementTypeCounts[CanvasComponentType.PROJECT_MATRIX]),
        hasCourseReport: Boolean(canvasElementTypeCounts[CanvasComponentType.COURSE_REPORT]),
        specialComponentKeys: Object.keys(canvasSpecialComponentsRef.current || {}),
        selectedIds,
      })

      // [MOD] 强制上传最新画布数据，确保后端获取到最新状态
      const ossKey = await forceCanvasUpload()
      if (!ossKey) {
        commitAssistantContent(config.errorMessage)
        if (streamingControllerRef.current === controller) {
          streamingControllerRef.current = null
        }
        setStreamingMessageId(null)
        setStreamingText('')
        setIsRegenerating(false)
        clearLinkedElementLoading()
        console.error(`[${config.logPrefix}] 失败: 画布上传失败`)
        return
      }

      // 构建请求负载
      const payload: AIRequestPayload = {
        sessionId,
        canvasOssKey: ossKey,
        messages: [{ role: 'user', content: config.userContent }],
        ...config.payload,
      }

      // 发送请求
      const response = await fetch(getAIRequestUrl(), buildAIRequest(payload, controller.signal))

      if (!response.ok) {
        commitAssistantContent(config.errorMessage)
        if (streamingControllerRef.current === controller) {
          streamingControllerRef.current = null
        }
        setStreamingMessageId(null)
        setStreamingText('')
        setIsRegenerating(false)
        clearLinkedElementLoading()
        console.error(`[${config.logPrefix}] 失败: HTTP ${response.status}`)
        return
      }

      // 使用 useSSEStream 的 processStream 处理响应
      const result = await processStream(response, {
        onCanvasEvent: (event) => {
          // [MOD] 统一生成元素 ID（在 handleCanvasEvent 之前），确保聊天关联卡片与画布元素使用相同 ID
          // 支持所有在 ELEMENT_TYPE_TITLES 中定义的元素类型
          // [FIX] 始终修正 ID，因为后端返回的 ID 格式可能与画布不一致（如 panel_ksa vs ksa_panel）
          if (
            (event.action === 'create' || event.action === 'set') &&
            event.component &&
            ELEMENT_TYPE_TITLES[event.component] &&
            event.data
          ) {
            // [MOD] 检查画布中是否已存在该类型的元素，如果存在则使用已有 ID（避免 ID 不匹配）
            // [MOD] 使用 canvasElementsRef.current 获取最新的画布元素状态，解决闭包捕获旧值问题
            const currentElements = canvasElementsRef.current
            let existingElement: typeof currentElements[number] | undefined
            if (event.component === CanvasComponentType.PROJECT_MATRIX) {
              // 项目矩阵需要根据 chapter_id 匹配（支持多个实例）
              const chapterId = (event.data as { chapter_id?: string }).chapter_id
              existingElement = currentElements.find(el =>
                el.type === event.component &&
                (el.data as { chapter_id?: string }).chapter_id === chapterId
              )
            } else {
              // 其他元素根据类型匹配（单例）
              existingElement = currentElements.find(el => el.type === event.component)
            }
            // [FIX] 始终覆盖 ID，确保格式为 ${component}_${timestamp}，与画布创建逻辑一致
            (event.data as { id?: string }).id = existingElement?.id || `${event.component}_${Date.now()}`
          }

          handleCanvasEvent(event)

          // [MOD] 检测创建画布元素时，同步插入聊天关联卡片（支持所有在 ELEMENT_TYPE_TITLES 中定义的类型）
          if (
            (event.action === 'create' || event.action === 'set') &&
            event.component &&
            ELEMENT_TYPE_TITLES[event.component] &&
            event.data
          ) {
            const elementId = (event.data as { id: string }).id
            // 避免重复创建关联消息
            if (elementId && !linkedElementIds.has(elementId)) {
              linkedElementIds.add(elementId)
              // [MOD] 从 event.data 提取具体标题（O(1) 复杂度）
              const displayTitle = getElementDisplayTitle(event.component, event.data)
              // 创建关联消息
              const linkedMessage = createLinkedElementMessage(elementId, event.component, displayTitle)
              setChatMessages(prev => [...prev, linkedMessage])
              // 设置元素 loading 状态
              setElementLoadingStates(prev => new Map(prev).set(elementId, true))
            }
          }

          // [MOD] 检测源文档事件，关联用户消息的附件与画布元素
          if (event.action === CanvasAction.SET_SOURCE_DOCUMENTS && event.data) {
            const sourceDocsData = event.data as { documents?: Array<{ id: string; ossKey: string; originalFileOssKey: string }> }
            const documents = sourceDocsData.documents || []
            if (documents.length > 0) {
              // 根据 originalFileOssKey 匹配用户消息的附件，更新 linkedElementId
              setChatMessages(prev => prev.map(msg => {
                if (msg.role === 'user' && msg.attachment) {
                  // 使用 originalFileOssKey 匹配用户上传时的 ossKey
                  const matchedDoc = documents.find(doc => doc.originalFileOssKey === msg.attachment?.ossKey)
                  if (matchedDoc && !msg.attachment.linkedElementId) {
                    return {
                      ...msg,
                      attachment: { ...msg.attachment, linkedElementId: matchedDoc.id }
                    }
                  }
                }
                return msg
              }))
            }
          }
        },
        onThinkingChunk: (content) => {
          if (thinkingState.mode === "latest") {
            thinkingState.latest = content
            setStreamingThinking(content)
            updateStreamingIndicator("thinking", content)
            return
          }

          thinkingState.accumulated = content
          setStreamingThinking(content)
          updateStreamingIndicator("thinking", content)
        },
        onStatusEvent: (status) => {
          updateStreamingIndicator("status", formatStatusIndicator(status))
        },
        onErrorEvent: (error) => {
          // 保存错误信息，用于最终消息内容
          sseErrorMessage = error.message || '服务出现异常，请稍后重试。'
          // 将错误信息显示在聊天区域
          markStreamingContentStarted()
          setStreamingText(sseErrorMessage)
        },
        onProgressEvent: (progress) => {
          thinkingState.mode = "latest"
          const progressLine = `[${progress.current}/${progress.total}] ${progress.message}`
          thinkingState.latest = progressLine
          setStreamingThinking(progressLine)
        },
        onProcessingEvent: (event) => {
          thinkingState.mode = "latest"
          thinkingState.latest = event.message
          setStreamingThinking(event.message)
          updateStreamingIndicator("processing", formatProcessingIndicator(event))
          // 直接将 processing 消息路由到指定面板，保持与聊天区文字同步
          if (event.stage === 'generating' && event.message && config.fillProgressType) {
            updateFillProgress(config.fillProgressType, event.message)
          }
        },
        onModeEvent: (modeEvent) => {
          if (modeEvent.mode === 'course_building') {
            thinkingState.mode = "latest"
          }
        },
        onContentChunk: (content) => {
          if (content.trim()) {
            markStreamingContentStarted()
          }
          setStreamingText(content)
        },
        onAbort: () => {
          console.log(`[${config.logPrefix}] 流式请求已被用户中止`)
        },
      })

      // 完成：优先使用 SSE 错误消息，其次使用返回内容，最后使用默认完成消息
      const finalContent = sseErrorMessage || result.content.trim() || config.defaultCompleteMessage
      const finalThinking = thinkingState.mode === "latest"
        ? (thinkingState.latest || result.thinking || '')
        : (thinkingState.accumulated || result.thinking || '')
      commitAssistantContent(finalContent, finalThinking || undefined)

      if (streamingControllerRef.current === controller) {
        streamingControllerRef.current = null
      }
      setStreamingMessageId(null)
      setStreamingText('')
      setIsRegenerating(false)

      // [MOD] 清除本次 SSE 创建的元素 loading 状态
      clearLinkedElementLoading()

      // SSE 结束后统一重定位画布元素（项目矩阵在流式阶段不做居中，此处统一重排）
      relayoutElements()

      // 执行完成回调
      config.onComplete?.()

      console.log(`[${config.logPrefix}] 完成`)
    } catch (error) {
      // AbortError 已在 processStream 内部处理并抛出，这里需要捕获
      if (error instanceof Error && error.name === 'AbortError') {
        // 中止时不提交错误消息，保持当前状态
        if (streamingControllerRef.current === controller) {
          streamingControllerRef.current = null
        }
        setStreamingMessageId(null)
        setStreamingText('')
        setIsRegenerating(false)
        setIsPreContentIndicatorVisible(false)
        // [MOD] 中止时也清除 loading 状态
        clearLinkedElementLoading()
        return
      }

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
      setIsPreContentIndicatorVisible(false)
      // [MOD] 错误时也清除 loading 状态
      clearLinkedElementLoading()

      console.error(`[${config.logPrefix}] 失败:`, error)
    }
  }, [isRegenerating, streamingMessageId, isInitialized, sessionId, handleCanvasEvent, processStream, resetSSEController, forceCanvasUpload, waitForCanvasStateFlush, updateCanvasData, updateFillProgress, updateStreamingIndicator, markStreamingContentStarted, relayoutElements])

  const restoreRegenerateTargetSelection = useCallback((targetId?: string | null) => {
    if (typeof targetId !== "string" || targetId.length === 0) {
      return
    }

    // [MOD] 重做完成后保持原目标组件为选中态
    selectCanvasElement(targetId)
  }, [selectCanvasElement])

  // 处理章节项目面板自动填充请求
  // [MOD] 增加 userPrompt 参数，支持重做时传入用户提示词
  const handleFillChapterPanel = useCallback(async (targetPanelId?: string, userPrompt?: string, displayUserContent?: string) => {
    // 判断面板是否有内容（子节点）
    const chapterPanel = targetPanelId
      ? canvasElements.find(el => el.id === targetPanelId)
      : canvasElements.find(el => el.type === CanvasComponentType.CHAPTER_PANEL)
    const hasContent = chapterPanel
      ? canvasElements.some(el => el.parentId === chapterPanel.id)
      : false
    const promptPrefix = hasContent ? "请帮我重新完善" : "请帮我完善"
    // 优先使用用户提示词，否则使用默认提示词
    const finalPrompt = userPrompt || `${promptPrefix}${ELEMENT_TYPE_TITLES[CanvasComponentType.CHAPTER_PANEL]}的内容`

    await executeSSERequest({
      userContent: finalPrompt,
      displayUserContent,
      messageSuffix: "fill-chapter-panel",
      logPrefix: `填充章节项目${targetPanelId ? ` 目标面板: ${targetPanelId}` : ""}`,
      defaultCompleteMessage: "章节项目已自动填充",
      cancelMessage: "已取消填充操作。",
      errorMessage: "章节项目填充失败，请稍后再试。",
      payload: {
        fill_chapter_panel: true,
        ...(targetPanelId && { target_panel_id: targetPanelId }),
      },
      fillProgressType: 'chapters',
      onBeforeRequest: () => {
        restoreRegenerateTargetSelection(targetPanelId)
        // 清空章节面板子节点（填充前必须清空，否则原有内容会传到后台）
        if (chapterPanel) {
          console.log("[填充章节项目] 清空章节面板:", chapterPanel.id)
          updateCanvasPanelChildren(chapterPanel.id, CanvasComponentType.CHAPTER_PANEL, CanvasComponentType.CHAPTER_CARD, [])
        }
      },
      onComplete: () => {
        updateFillProgress('chapters', null)
        restoreRegenerateTargetSelection(targetPanelId)
      },
    })
    updateFillProgress('chapters', null)
  }, [executeSSERequest, canvasElements, updateCanvasPanelChildren, updateFillProgress, restoreRegenerateTargetSelection])

  // 处理教学目标面板自动填充请求
  // [MOD] 增加 userPrompt 参数，支持重做时传入用户提示词
  const handleFillObjectivePanel = useCallback(async (targetPanelId?: string, userPrompt?: string, displayUserContent?: string) => {
    // 判断面板是否有内容（子节点）
    const objectivePanel = targetPanelId
      ? canvasElements.find(el => el.id === targetPanelId)
      : canvasElements.find(el => el.type === CanvasComponentType.OBJECTIVE_PANEL)
    const hasContent = objectivePanel
      ? canvasElements.some(el => el.parentId === objectivePanel.id)
      : false
    const promptPrefix = hasContent ? "请帮我重新完善" : "请帮我完善"
    // 优先使用用户提示词，否则使用默认提示词
    const finalPrompt = userPrompt || `${promptPrefix}${ELEMENT_TYPE_TITLES[CanvasComponentType.OBJECTIVE_PANEL]}的内容`

    await executeSSERequest({
      userContent: finalPrompt,
      displayUserContent,
      messageSuffix: "fill-objective-panel",
      logPrefix: `填充教学目标${targetPanelId ? ` 目标面板: ${targetPanelId}` : ""}`,
      defaultCompleteMessage: "教学目标已自动填充",
      cancelMessage: "已取消填充操作。",
      errorMessage: "教学目标填充失败，请稍后再试。",
      payload: {
        fill_objective_panel: true,
        ...(targetPanelId && { target_panel_id: targetPanelId }),
      },
      fillProgressType: 'objectives',
      onBeforeRequest: () => {
        restoreRegenerateTargetSelection(targetPanelId)
        // 清空教学目标面板子节点（填充前必须清空，否则原有内容会传到后台）
        if (objectivePanel) {
          console.log("[填充教学目标] 清空教学目标面板:", objectivePanel.id)
          updateCanvasPanelChildren(objectivePanel.id, CanvasComponentType.OBJECTIVE_PANEL, CanvasComponentType.OBJECTIVE_CARD, [])
        }
      },
      onComplete: () => {
        updateFillProgress('objectives', null)
        restoreRegenerateTargetSelection(targetPanelId)
      },
    })
    updateFillProgress('objectives', null)
  }, [executeSSERequest, canvasElements, updateCanvasPanelChildren, updateFillProgress, restoreRegenerateTargetSelection])

  // 处理画布组件重做请求
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRegenerate = useCallback(async (nodeId: string, nodeType: CanvasComponentType, _nodeName: string) => {
    // 获取颜色配置
    const flowNodeType = CANVAS_TO_FLOW_TYPE[nodeType] as Parameters<typeof getNodeColorConfig>[0]
    const colorConfig = getNodeColorConfig(flowNodeType)

    // 获取组件类型的中文名称
    const elementTypeName = ELEMENT_TYPE_TITLES[nodeType] || nodeType

    // 设置重做标签，聚焦输入框
    setRegenerateTag({
      component_id: nodeId,
      component_type: nodeType,
      node_name: elementTypeName,
      color_config: colorConfig,
    })

    // 选中重做目标组件
    selectCanvasElement(nodeId)

    // 聚焦输入框
    textareaRef.current?.focus()
  }, [selectCanvasElement])

  // 处理课程矩阵自动填充请求
  // [MOD] 添加可选参数 targetMatrixId，支持重做时指定目标矩阵
  const handleFillCourseMatrix = useCallback(async (targetMatrixId?: string, userPrompt?: string, displayUserContent?: string) => {
    // 判断课程矩阵是否有内容
    const courseMatrix = targetMatrixId
      ? canvasElements.find(el => el.id === targetMatrixId)
      : canvasElements.find(el => el.type === CanvasComponentType.COURSE_MATRIX)
    const matrixData = courseMatrix?.data as { rows?: unknown[] } | undefined
    const hasContent = matrixData?.rows && matrixData.rows.length > 0
    const promptPrefix = hasContent ? "请帮我重新完善" : "请帮我完善"
    const finalPrompt = userPrompt || `${promptPrefix}${ELEMENT_TYPE_TITLES[CanvasComponentType.COURSE_MATRIX]}的内容`

    await executeSSERequest({
      userContent: finalPrompt,
      displayUserContent,
      messageSuffix: "fill-matrix",
      logPrefix: `填充课程矩阵${targetMatrixId ? ` 目标矩阵: ${targetMatrixId}` : ""}`,
      defaultCompleteMessage: "课程矩阵已自动填充支撑关系",
      cancelMessage: "已取消填充操作。",
      errorMessage: "课程矩阵填充失败，请稍后再试。",
      payload: {
        fill_course_matrix: true,
        ...(targetMatrixId && { target_matrix_id: targetMatrixId }),
      },
      fillProgressType: 'matrix',
      onBeforeRequest: () => {
        restoreRegenerateTargetSelection(targetMatrixId)
        // 清空课程矩阵数据（填充前必须清空，否则原有内容会传到后台）
        if (courseMatrix) {
          console.log("[填充课程矩阵] 清空课程矩阵:", courseMatrix.id)
          updateCanvasElementData(courseMatrix.id, { rows: [] })
        }

        // 课程矩阵重生成时，清空 specialComponents，避免上传旧矩阵快照
        if (targetMatrixId) {
          console.log("[填充课程矩阵] 重生成模式，清空 specialComponents")
          clearSpecialComponents()
        }
      },
      onComplete: () => {
        updateFillProgress('matrix', null)
        restoreRegenerateTargetSelection(targetMatrixId)
      },
    })
    // 确保进度在任何情况下都被清除
    updateFillProgress('matrix', null)
  }, [executeSSERequest, canvasElements, updateCanvasElementData, clearSpecialComponents, updateFillProgress, restoreRegenerateTargetSelection])

  // 处理项目矩阵自动填充请求
  // [MOD] 添加可选参数 targetMatrixId，支持重做时指定目标矩阵
  const handleFillProjectMatrix = useCallback(async (targetMatrixId?: string, userPrompt?: string, displayUserContent?: string) => {
    // 判断项目矩阵是否有内容
    const projectMatrix = targetMatrixId
      ? canvasElements.find(el => el.id === targetMatrixId)
      : canvasElements.find(el => el.type === CanvasComponentType.PROJECT_MATRIX)
    const matrixData = projectMatrix?.data as { rows?: unknown[]; chapter_id?: string } | undefined
    const hasContent = matrixData?.rows && matrixData.rows.length > 0
    const targetChapterId = matrixData?.chapter_id
    if (targetMatrixId && !targetChapterId) {
      console.warn("[填充项目矩阵] 缺少目标章节ID，已取消重做:", {
        targetMatrixId,
        projectMatrix,
      })
      toast.error("未找到当前项目矩阵对应的章节标识，无法单独重做。")
      return
    }
    const promptPrefix = hasContent ? "请帮我重新完善" : "请帮我完善"
    const finalPrompt = userPrompt || `${promptPrefix}${ELEMENT_TYPE_TITLES[CanvasComponentType.PROJECT_MATRIX]}的内容`

    await executeSSERequest({
      userContent: finalPrompt,
      displayUserContent,
      messageSuffix: "fill-project-matrix",
      logPrefix: `填充项目矩阵${targetChapterId ? ` 目标章节: ${targetChapterId}` : targetMatrixId ? ` 目标矩阵: ${targetMatrixId}` : ""}`,
      defaultCompleteMessage: "项目矩阵已自动填充任务目标和支撑关系",
      cancelMessage: "已取消填充操作。",
      errorMessage: "项目矩阵填充失败，请稍后再试。",
      payload: {
        fill_project_matrix: true,
        ...(targetChapterId && { target_chapter_id: targetChapterId }),
      },
      fillProgressType: 'projectMatrix',
      onBeforeRequest: () => {
        restoreRegenerateTargetSelection(targetMatrixId)
        // 清空项目矩阵数据（填充前必须清空，否则原有内容会传到后台）
        if (projectMatrix) {
          console.log("[填充项目矩阵] 清空项目矩阵:", projectMatrix.id)
          updateCanvasElementData(projectMatrix.id, { rows: [] })
        }
      },
      onComplete: () => {
        updateFillProgress('projectMatrix', null)
        restoreRegenerateTargetSelection(targetMatrixId)
      },
    })
    updateFillProgress('projectMatrix', null)
  }, [executeSSERequest, canvasElements, updateCanvasElementData, updateFillProgress, restoreRegenerateTargetSelection])

  // 处理课程信息自动填充请求（从源文档生成课程基本信息）
  const handleFillCourseInfo = useCallback(async (courseInfoId: string, userPrompt?: string, displayUserContent?: string) => {
    if (!sessionId) {
      console.warn("[填充课程信息] 缺少sessionId")
      return
    }

    // 判断课程信息是否有内容
    const courseInfo = canvasElements.find(el => el.id === courseInfoId || el.type === CanvasComponentType.COURSE_INFO)
    const courseData = courseInfo?.data as { name?: string; metadata?: Record<string, unknown> } | undefined
    const hasContent = !!(courseData?.name || (courseData?.metadata && Object.keys(courseData.metadata).length > 0))
    const promptPrefix = hasContent ? "请帮我重新完善" : "请帮我完善"
    const finalPrompt = userPrompt || `${promptPrefix}${ELEMENT_TYPE_TITLES[CanvasComponentType.COURSE_INFO]}的内容`

    await executeSSERequest({
      userContent: finalPrompt,
      displayUserContent,
      messageSuffix: "fill-course-info",
      logPrefix: `填充课程信息 课程信息ID: ${courseInfoId}`,
      defaultCompleteMessage: "课程基本信息已自动填充",
      cancelMessage: "已取消填充操作。",
      errorMessage: "课程信息填充失败，请稍后再试。",
      payload: {
        fill_course_info: true,
        target_course_info_id: courseInfoId,
      },
      fillProgressType: 'courseInfo',
      skipInitCheck: true,
      onBeforeRequest: () => {
        restoreRegenerateTargetSelection(courseInfoId)
      },
      onComplete: () => {
        updateFillProgress('courseInfo', null)
        restoreRegenerateTargetSelection(courseInfoId)
      },
    })
    updateFillProgress('courseInfo', null)
  }, [sessionId, canvasElements, executeSSERequest, updateFillProgress, restoreRegenerateTargetSelection])

  // 处理课点信息自动填充请求
  // [MOD] 增加 userPrompt 参数，支持重做时传入用户提示词
  const handleFillCoursePoints = useCallback(async (targetPanelId?: string, userPrompt?: string, displayUserContent?: string) => {
    // 判断课点面板是否有内容（子节点）
    const coursePointPanel = targetPanelId
      ? canvasElements.find(el => el.id === targetPanelId)
      : canvasElements.find(el => el.type === CanvasComponentType.COURSE_POINT_PANEL)
    const hasContent = coursePointPanel
      ? canvasElements.some(el => el.parentId === coursePointPanel.id)
      : false
    const promptPrefix = hasContent ? "请帮我重新完善" : "请帮我完善"
    // 优先使用用户提示词，否则使用默认提示词
    const finalPrompt = userPrompt || `${promptPrefix}${ELEMENT_TYPE_TITLES[CanvasComponentType.COURSE_POINT_PANEL]}的内容`

    await executeSSERequest({
      userContent: finalPrompt,
      displayUserContent,
      messageSuffix: "fill-course-points",
      logPrefix: `填充课点信息${targetPanelId ? ` 目标面板: ${targetPanelId}` : ""}`,
      defaultCompleteMessage: "课点信息已自动生成",
      cancelMessage: "已取消填充操作。",
      errorMessage: "课点信息生成失败，请稍后再试。",
      payload: {
        fill_course_point_panel: true,
        ...(targetPanelId && { target_panel_id: targetPanelId }),
      },
      fillProgressType: 'coursePoints',
      onBeforeRequest: () => {
        restoreRegenerateTargetSelection(targetPanelId)
        // 清空课点面板子节点（填充前必须清空，否则原有内容会传到后台）
        if (coursePointPanel) {
          console.log("[填充课点信息] 清空课点面板:", coursePointPanel.id)
          updateCanvasPanelChildren(coursePointPanel.id, CanvasComponentType.COURSE_POINT_PANEL, CanvasComponentType.COURSE_POINT_CARD, [])
        }
      },
      onComplete: () => {
        updateFillProgress('coursePoints', null)
        restoreRegenerateTargetSelection(targetPanelId)
      },
    })
    updateFillProgress('coursePoints', null)
  }, [executeSSERequest, canvasElements, updateCanvasPanelChildren, updateFillProgress, restoreRegenerateTargetSelection])

  // 处理 KSA 面板自动填充请求
  // [MOD] 增加 userPrompt 参数，支持重做时传入用户提示词
  const handleFillKsa = useCallback(async (targetPanelId?: string, userPrompt?: string, displayUserContent?: string) => {
    // 判断 KSA 面板是否有内容（子节点）
    const ksaPanel = targetPanelId
      ? canvasElements.find(el => el.id === targetPanelId)
      : canvasElements.find(el => el.type === CanvasComponentType.KSA_PANEL)
    const hasContent = ksaPanel
      ? canvasElements.some(el => el.parentId === ksaPanel.id)
      : false
    const promptPrefix = hasContent ? "请帮我重新完善" : "请帮我完善"
    // 优先使用用户提示词，否则使用默认提示词
    const finalPrompt = userPrompt || `${promptPrefix}${ELEMENT_TYPE_TITLES[CanvasComponentType.KSA_PANEL]}的内容`

    await executeSSERequest({
      userContent: finalPrompt,
      displayUserContent,
      messageSuffix: "fill-ksa",
      logPrefix: `填充KSA${targetPanelId ? ` 目标面板: ${targetPanelId}` : ""}`,
      defaultCompleteMessage: "KSA三要素已自动生成",
      cancelMessage: "已取消填充操作。",
      errorMessage: "KSA生成失败，请稍后再试。",
      payload: {
        fill_ksa_panel: true,
        ...(targetPanelId && { target_panel_id: targetPanelId }),
      },
      fillProgressType: 'ksa',
      onBeforeRequest: () => {
        restoreRegenerateTargetSelection(targetPanelId)
        // 清空KSA面板子节点（填充前必须清空，否则原有内容会传到后台）
        if (ksaPanel) {
          console.log("[填充KSA] 清空KSA面板:", ksaPanel.id)
          updateCanvasPanelChildren(ksaPanel.id, CanvasComponentType.KSA_PANEL, CanvasComponentType.KSA_ITEM, [])
        }
      },
      onComplete: () => {
        updateFillProgress('ksa', null)
        restoreRegenerateTargetSelection(targetPanelId)
      },
    })
    // 确保进度被清除（包括错误情况）
    updateFillProgress('ksa', null)
  }, [executeSSERequest, canvasElements, updateCanvasPanelChildren, updateFillProgress, restoreRegenerateTargetSelection])

  // 停止生成处理函数
  const handleStopGeneration = useCallback(async () => {
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
    setRegenerateTag(null)

    // 通知后端终止生成
    if (sessionId) {
      try {
        await fetch(AI_API_CONFIG.CANCEL_PATH, {
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
  }, [streamingMessageId, streamingText, streamingThinking, sessionId])

  // 处理发送聊天消息
  const handleSendMessage = useCallback(async () => {
    if ((!inputMessage.trim() && !regenerateTag) || !isInitialized || !sessionId) {
      return
    }

    // [MOD] 检测是否有重做标签，调用对应的 fill_xxx 函数
    if (regenerateTag) {
      const userPrompt = inputMessage.trim()
      const regenerateInstruction = `请帮我重新设计${regenerateTag.node_name}`
      const finalRegeneratePrompt = userPrompt
        ? `${regenerateInstruction}：${userPrompt}`
        : regenerateInstruction
      const displayRegeneratePrompt = userPrompt || regenerateInstruction
      const targetId = regenerateTag.component_id
      const componentType = regenerateTag.component_type

      selectCanvasElement(targetId)

      // 清空标签和输入框
      setRegenerateTag(null)
      setInputMessage("")
      textareaRef.current?.blur()

      // 根据组件类型调用对应的 fill 函数
      switch (componentType) {
        case CanvasComponentType.COURSE_POINT_PANEL:
          await handleFillCoursePoints(targetId, finalRegeneratePrompt, displayRegeneratePrompt)
          break
        case CanvasComponentType.KSA_PANEL:
          await handleFillKsa(targetId, finalRegeneratePrompt, displayRegeneratePrompt)
          break
        case CanvasComponentType.CHAPTER_PANEL:
          await handleFillChapterPanel(targetId, finalRegeneratePrompt, displayRegeneratePrompt)
          break
        case CanvasComponentType.OBJECTIVE_PANEL:
          await handleFillObjectivePanel(targetId, finalRegeneratePrompt, displayRegeneratePrompt)
          break
        case CanvasComponentType.COURSE_MATRIX:
          await handleFillCourseMatrix(targetId, finalRegeneratePrompt, displayRegeneratePrompt)
          break
        case CanvasComponentType.PROJECT_MATRIX:
          await handleFillProjectMatrix(targetId, finalRegeneratePrompt, displayRegeneratePrompt)
          break
        case CanvasComponentType.COURSE_INFO:
          await handleFillCourseInfo(targetId, finalRegeneratePrompt, displayRegeneratePrompt)
          break
        default:
          console.warn("[重做] 不支持的组件类型:", componentType)
      }
      return
    }

    const trimmedContent = inputMessage.trim()

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

    // 使用工具函数创建消息对
    const { userMessage, assistantPlaceholder, aiMessageId } = createMessagePair(
      trimmedContent,
      "ai",
      attachment
    )

    setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder])
    setInputMessage("")
    clearAttachedFiles()
    textareaRef.current?.blur()
    setStreamingMessageId(aiMessageId)
    setStreamingText("")
    setStreamingThinking("")
    setIsThinkingExpanded(false)

    // 重置 AbortController（使用 useSSEStream 提供的方法）
    streamingControllerRef.current?.abort()
    const controller = resetSSEController()
    streamingControllerRef.current = controller

    // 使用工具函数创建消息提交器
    const commitAssistantContent = createMessageCommitter(
      aiMessageId,
      sessionId,
      setChatMessages,
      saveSessionToStorage
    )

    // 用于追踪 SSE 错误消息
    let sseErrorMessage = ''
    // 思考区展示模式：闲聊模式累积，agent/internal 进度模式仅显示最新一条
    const thinkingState = {
      mode: "accumulate" as ThinkingDisplayMode,
      accumulated: '',
      latest: '',
    }
    // [MOD] 用于追踪已创建关联消息的元素ID，避免重复创建（移到 try 外以便 catch 可访问）
    const linkedElementIds = new Set<string>()

    const clearLinkedElementLoading = () => {
      if (linkedElementIds.size > 0) {
        setElementLoadingStates(prev => {
          const newMap = new Map(prev)
          linkedElementIds.forEach(id => newMap.set(id, false))
          return newMap
        })
      }
    }

    try {
      // 等待画布状态稳定，并显式同步快照到持久化层
      await waitForCanvasStateFlush()
      const selectedIds = canvasSelectedIdRef.current ? [canvasSelectedIdRef.current] : []
      updateCanvasData(
        canvasElementsRef.current,
        canvasEdgesRef.current,
        canvasSpecialComponentsRef.current,
        selectedIds,
        { skipAutoUpload: true }
      )

      // [MOD] 强制上传最新画布数据，确保后端获取到最新状态
      const ossKey = await forceCanvasUpload()

      // 构建消息数组（包含文件附件）
      const messages: Array<{ role: string; content: string; type?: string }> = []
      if (attachment) {
        messages.push({ role: 'user', content: attachment.ossKey, type: 'file' })
      }
      messages.push({ role: 'user', content: trimmedContent })

      // 构建请求负载
      const payload: AIRequestPayload = {
        sessionId,
        canvasOssKey: ossKey || undefined,
        messages,
      }

      const response = await fetch(getAIRequestUrl(), buildAIRequest(payload, controller.signal))

      if (!response.ok) {
        const fallback = controller.signal.aborted
          ? "已取消本次 AI 响应。"
          : "抱歉，AI 服务暂时不可用，请稍后再试。"
        commitAssistantContent(fallback)
        if (streamingControllerRef.current === controller) {
          streamingControllerRef.current = null
        }
        setStreamingMessageId(null)
        setStreamingText('')
        clearLinkedElementLoading()
        console.error(`[聊天] 请求失败: HTTP ${response.status}`)
        return
      }

      // 使用 useSSEStream 的 processStream 处理响应
      const result = await processStream(response, {
        onCanvasEvent: (event) => {
          // [MOD] 统一生成元素 ID（在 handleCanvasEvent 之前），确保聊天关联卡片与画布元素使用相同 ID
          // 支持所有在 ELEMENT_TYPE_TITLES 中定义的元素类型
          // [FIX] 始终修正 ID，因为后端返回的 ID 格式可能与画布不一致（如 panel_ksa vs ksa_panel）
          if (
            (event.action === 'create' || event.action === 'set') &&
            event.component &&
            ELEMENT_TYPE_TITLES[event.component] &&
            event.data
          ) {
            // [MOD] 检查画布中是否已存在该类型的元素，如果存在则使用已有 ID（避免 ID 不匹配）
            // [MOD] 使用 canvasElementsRef.current 获取最新的画布元素状态，解决闭包捕获旧值问题
            const currentElements = canvasElementsRef.current
            let existingElement: typeof currentElements[number] | undefined
            if (event.component === CanvasComponentType.PROJECT_MATRIX) {
              // 项目矩阵需要根据 chapter_id 匹配（支持多个实例）
              const chapterId = (event.data as { chapter_id?: string }).chapter_id
              existingElement = currentElements.find(el =>
                el.type === event.component &&
                (el.data as { chapter_id?: string }).chapter_id === chapterId
              )
            } else {
              // 其他元素根据类型匹配（单例）
              existingElement = currentElements.find(el => el.type === event.component)
            }
            // [FIX] 始终覆盖 ID，确保格式为 ${component}_${timestamp}，与画布创建逻辑一致
            (event.data as { id?: string }).id = existingElement?.id || `${event.component}_${Date.now()}`
          }

          handleCanvasEvent(event)
          // canvas 事件触发画布展开
          if (!hasTriggeredExpandRef.current) {
            hasTriggeredExpandRef.current = true
            setIsCanvasExpanded(true)
          }

          // [MOD] 检测创建画布元素时，同步插入聊天关联卡片（支持所有在 ELEMENT_TYPE_TITLES 中定义的类型）
          if (
            (event.action === 'create' || event.action === 'set') &&
            event.component &&
            ELEMENT_TYPE_TITLES[event.component] &&
            event.data
          ) {
            const elementId = (event.data as { id: string }).id
            // 避免重复创建关联消息
            if (elementId && !linkedElementIds.has(elementId)) {
              linkedElementIds.add(elementId)
              // [MOD] 从 event.data 提取具体标题（O(1) 复杂度）
              const displayTitle = getElementDisplayTitle(event.component, event.data)
              // 创建关联消息
              const linkedMessage = createLinkedElementMessage(elementId, event.component, displayTitle)
              setChatMessages(prev => [...prev, linkedMessage])
              // 设置元素 loading 状态
              setElementLoadingStates(prev => new Map(prev).set(elementId, true))
            }
          }

          // [MOD] 检测源文档事件，关联用户消息的附件与画布元素
          if (event.action === CanvasAction.SET_SOURCE_DOCUMENTS && event.data) {
            const sourceDocsData = event.data as { documents?: Array<{ id: string; ossKey: string; originalFileOssKey: string }> }
            const documents = sourceDocsData.documents || []
            if (documents.length > 0) {
              // 根据 originalFileOssKey 匹配用户消息的附件，更新 linkedElementId
              setChatMessages(prev => prev.map(msg => {
                if (msg.role === 'user' && msg.attachment) {
                  // 使用 originalFileOssKey 匹配用户上传时的 ossKey
                  const matchedDoc = documents.find(doc => doc.originalFileOssKey === msg.attachment?.ossKey)
                  if (matchedDoc && !msg.attachment.linkedElementId) {
                    return {
                      ...msg,
                      attachment: { ...msg.attachment, linkedElementId: matchedDoc.id }
                    }
                  }
                }
                return msg
              }))
            }
          }
        },
        onThinkingChunk: (content) => {
          if (thinkingState.mode === "latest") {
            thinkingState.latest = content
            setStreamingThinking(content)
            updateStreamingIndicator("thinking", content)
            return
          }

          thinkingState.accumulated = content
          setStreamingThinking(content)
          updateStreamingIndicator("thinking", content)
        },
        onStatusEvent: (status) => {
          updateStreamingIndicator("status", formatStatusIndicator(status))
        },
        onUIEvent: (event) => {
          // show_panel 动作触发画布展开
          if (event.action === 'show_panel') {
            if (!hasTriggeredExpandRef.current) {
              hasTriggeredExpandRef.current = true
              setIsCanvasExpanded(true)
            }
          }
          console.log('[UI事件]', event.action, event)
        },
        onProgressEvent: (progress) => {
          thinkingState.mode = "latest"
          const progressLine = `[${progress.current}/${progress.total}] ${progress.message}`
          thinkingState.latest = progressLine
          setStreamingThinking(progressLine)
        },
        onProcessingEvent: (event) => {
          thinkingState.mode = "latest"
          thinkingState.latest = event.message
          setStreamingThinking(event.message)
          updateStreamingIndicator("processing", formatProcessingIndicator(event))
          // 根据 detail.action 前缀路由到对应面板，保持与聊天区文字同步
          if (event.stage === 'generating' && event.message) {
            const action = event.detail?.action || ''
            if (action.startsWith('course_points_')) {
              updateFillProgress('coursePoints', event.message)
            } else if (action.startsWith('ksa_')) {
              updateFillProgress('ksa', event.message)
            } else if (action.startsWith('chapter_')) {
              updateFillProgress('chapters', event.message)
            } else if (action.startsWith('objective_')) {
              updateFillProgress('objectives', event.message)
            } else if (action.startsWith('course_info_')) {
              updateFillProgress('courseInfo', event.message)
            } else if (action.startsWith('project_matrix_')) {
              updateFillProgress('projectMatrix', event.message)
            } else if (action.startsWith('course_matrix_') || action.startsWith('matrix_')) {
              updateFillProgress('matrix', event.message)
            }
          }
        },
        onModeEvent: (modeEvent) => {
          if (modeEvent.mode === 'course_building') {
            thinkingState.mode = "latest"
          }
          // chat 模式时收起画布
          if (modeEvent.mode === 'chat') {
            setIsCanvasExpanded(false)
            hasTriggeredExpandRef.current = false
          }
        },
        onErrorEvent: (error) => {
          // 保存错误信息，用于最终消息内容
          sseErrorMessage = error.message || '服务出现异常，请稍后重试。'
          // 将错误信息显示在聊天区域
          markStreamingContentStarted()
          setStreamingText(sseErrorMessage)
        },
        onContentChunk: (content) => {
          if (content.trim()) {
            markStreamingContentStarted()
          }
          setStreamingText(content)
        },
        onLegacyFormat: (legacy) => {
          // 旧格式响应中的 canvas_update 触发画布展开
          if (legacy.canvas_update) {
            if (!hasTriggeredExpandRef.current) {
              hasTriggeredExpandRef.current = true
              setIsCanvasExpanded(true)
            }
          }
        },
        onAbort: () => {
          console.log('[聊天] 流式请求已被用户中止')
        },
      })

      // 完成：优先使用 SSE 错误消息，其次使用返回内容，最后使用默认消息
      const finalContent = sseErrorMessage || result.content.trim() || 'AI 暂无新的建议，请稍后再试。'
      const finalThinking = thinkingState.mode === "latest"
        ? (thinkingState.latest || result.thinking || '')
        : (thinkingState.accumulated || result.thinking || '')
      commitAssistantContent(finalContent, finalThinking || undefined)
      if (streamingControllerRef.current === controller) {
        streamingControllerRef.current = null
      }
      setStreamingMessageId(null)
      setStreamingText('')
      // [MOD] 清除本次 SSE 创建的元素 loading 状态
      clearLinkedElementLoading()
      // SSE 结束后统一重定位画布元素（项目矩阵在流式阶段不做居中，此处统一重排）
      relayoutElements()
      // 不清空思考内容，保留显示"思考完毕"状态
    } catch (error) {
      // AbortError 已在 processStream 内部处理并抛出，这里需要捕获
      if (error instanceof Error && error.name === 'AbortError') {
        if (streamingControllerRef.current === controller) {
          streamingControllerRef.current = null
        }
        setStreamingMessageId(null)
        setStreamingText('')
        setIsPreContentIndicatorVisible(false)
        // [MOD] 中止时也清除 loading 状态
        clearLinkedElementLoading()
        return
      }

      const fallback = controller.signal.aborted
        ? "已取消本次 AI 响应。"
        : "抱歉，AI 服务暂时不可用，请稍后再试。"
      commitAssistantContent(fallback)
      if (streamingControllerRef.current === controller) {
        streamingControllerRef.current = null
      }
      setStreamingMessageId(null)
      setStreamingText('')
      setIsPreContentIndicatorVisible(false)
      // [MOD] 错误时也清除 loading 状态
      clearLinkedElementLoading()
    }
  }, [inputMessage, isInitialized, sessionId, regenerateTag, attachedFiles, uploadFileToOss, handleCanvasEvent, processStream, resetSSEController, handleFillCoursePoints, handleFillKsa, handleFillChapterPanel, handleFillObjectivePanel, handleFillCourseMatrix, handleFillProjectMatrix, handleFillCourseInfo, clearAttachedFiles, forceCanvasUpload, waitForCanvasStateFlush, updateCanvasData, updateFillProgress, updateStreamingIndicator, markStreamingContentStarted, selectCanvasElement, relayoutElements])

  // 连接菜单处理器
  const handleConnectionMenuSelect = useMemo(
    () => createConnectionMenuHandler({
      canvasElements,
      handleCanvasEvent,
      handleFillCourseMatrix,
      handleFillProjectMatrix,
      handleFillChapterPanel,
      handleFillObjectivePanel,
      handleFillCourseInfo,
      handleFillCoursePoints,
      handleFillKsa,
    }),
    [
      canvasElements,
      handleCanvasEvent,
      handleFillCourseMatrix,
      handleFillProjectMatrix,
      handleFillChapterPanel,
      handleFillObjectivePanel,
      handleFillCourseInfo,
      handleFillCoursePoints,
      handleFillKsa,
    ]
  )

  // 处理 Panel 空状态加号点击：课点面板直接触发重做，无需等待用户输入
  const handlePanelAdd = useCallback((panelType: string, panelId: string) => {
    if (panelType !== FlowNodeType.COURSE_POINT_PANEL) {
      return
    }

    void handleFillCoursePoints(panelId)
  }, [handleFillCoursePoints])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`ai-drawer-content p-0 bg-background border-border/40 transition-[width] duration-500 ease-out ${
          isCanvasExpanded
            ? "!w-screen !max-w-none"
            : "!w-[605px] sm:!w-[692px] lg:!w-[749px] xl:!w-[807px] 2xl:!w-[864px] sm:!max-w-none lg:!max-w-none 2xl:!max-w-none max-w-[90vw]"
        }`}
      >
        <div
          className="flex h-full min-h-0 relative"
          {...dragHandlers}
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
            isCanvasExpanded ? "w-[25%] shrink-0 min-w-0 overflow-hidden" : "w-full"
          }`}>
          <SheetHeader className={`relative ${isCanvasExpanded ? "px-4 pt-4 pb-3" : "px-6 pt-6 pb-4"}`}>
            <SheetTitle className="text-left text-xl font-semibold flex items-center gap-2">
              <Image
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAqCAMAAAAqEZ1jAAAAAXNSR0IArs4c6QAAAAlwSFlzAAAhOAAAITgBRZYxYAAAAKJQTFRFAAAAenb/RpP/k2j/XXf7cXX6P5z7i2n8W3j7ZHP7jmn9VID7Qpf8jWn8Xnr6iWr8YHb7i2n8RJb9dWz8WXr8mWj9RpP8W3n8bW/8l2j+QJz9Q5f9ToT8fWv9ZW/8lWj9VID8YnX7Pp79QZr9pWb+RJT8m2f9k2j9SYz8jWn9hmr8UIT8fmv8VX78Xnn7d2z8ZHT7WHr7bm77Xnb7Z3D7YHH7RJOQRAAAACJ0Uk5TABAgICAwQEBAWF5gZXBwgICbn5+fo7+/vsLP39/f3urv73XwOA8AAAKfSURBVHja7dbJcuIwFIXhIzCxMTMNcdwMDoMZY4NxeP9X66srEckYQlPVvcvPBhZ8dVSIAvz03xNV/Luq4Xq9Hgo8nfDqjXq97hS1yXZNhXg2Z3o+f1KnLqx62y17Pp5smp+158EUaW6I52rkxLF3eoNpt1Ne+bR+Fd8U5Oc8Px6P5M0Evgq11ytpy0jgbk6e5cSxd2pb7yKOikpTouWyhbsNMsnpefZpOzsCI7c8brkM74/LqFSC7HkwVTu9lsB14ZJy745LlDdV5+3iQTXC7s9z3pNEggOh9s3woOFqJT2BmzUSLnMQEEeeh2+rkraiOrjZeL+XXEBwyp71Ybg+hWL+iltGt8ftKQI9QMzSlDxz9VofssIMdxitdJEvbo3jxqAGKXtt6N4OkpvgkmiFa50Ch1UU8zab/Ya4Br/IUnnewHCHg+FEh7/ExUIXdq+KG4N7z3hfzXDkaa5FmGpdMENrYWWjaoDrJtJLu4ajFFfbUduryN1ue4brb2KpjSvgvETe53R24U6Ggz+RYJnsCTMujmMJ9qELErkv9y7cyXAGtNCoI2Dqx9ymAl1bcYMLJ2NO5fZ2dmHLxiBGrJlxEAl7M1HkTFUzseeiWHOxYK+CrwLltRX3qTk7/4PbTXDdaBHLxytMdcllaaA56U1RSEyU56M0jotfYBLvynM091ni0GGtPO73nLkR7AaK6yqOKnG1g+wXrnqZz9nrw87bszdjjn/dDGffbgdX9YmT4HykaoLTp/UABGfyypx7a1yFNb0wpl7BddW8geSO5JU5TE63xhmOPb2uok8reN1Nrn4qjQNBlmfdvkB5beaoMgdP4LpFgbNuX3svtSwABoZ7WPOKa0Inxgl7DurMdfFXVV7savjK8WQ1/cz5+Q9e7A/jUZeiPQO0fwAAAABJRU5ErkJggg=="
                alt="AI 助手"
                width={32}
                height={32}
                className="object-contain"
                unoptimized
              />
              课程开发AI助手
            </SheetTitle>
            <div className="flex items-center justify-between text-left">
              <p className="text-sm text-muted-foreground">
                灵感来自人工智能，实时协助你分析课程、生成摘要与行动建议。
              </p>
              <div className="flex items-center gap-2 shrink-0">
                {showGeminiEntry && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
                    onClick={() => {
                      if (!showGeminiEntry) {
                        return
                      }
                      onOpenChange(false)
                      setIsGeminiDemoOpen(true)
                    }}
                    title="切换到 Gemini 助手"
                  >
                    <Image
                      src="/assets/ai/gemini-sparkle.svg"
                      alt="Gemini 助手"
                      width={18}
                      height={18}
                      className="object-contain"
                    />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
                  onClick={handleNewSession}
                  title="开始新会话"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
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

          {/* 聊天消息区域 */}
          <ScrollArea ref={scrollViewportRef} className="flex-1 min-h-0 w-full min-w-0">
            <div className={`space-y-6 ${isCanvasExpanded ? "px-4 py-4" : "px-6 py-4"}`}>
              {chatMessages.map((message, index) => {
                const isLastAssistantMessage =
                  message.role === "assistant" &&
                  index === chatMessages.length - 1
                const isCurrentStreaming = message.id === streamingMessageId

                return (
                  <ChatMessageItem
                    key={message.id}
                    message={message}
                    isStreaming={isCurrentStreaming}
                    streamingText={isCurrentStreaming ? streamingText : undefined}
                    streamingThinking={isCurrentStreaming ? streamingThinking : undefined}
                    isThinkingExpanded={isThinkingExpanded}
                    onThinkingToggle={() => setIsThinkingExpanded(!isThinkingExpanded)}
                    greetingForMessage={greetingForMessage}
                    userName={userName}
                    isCanvasExpanded={isCanvasExpanded}
                    isLastAssistantMessage={isLastAssistantMessage}
                    preContentIndicatorVisible={isCurrentStreaming ? isPreContentIndicatorVisible : false}
                    streamingIndicatorText={isCurrentStreaming ? streamingIndicatorText : undefined}
                    onSelectCanvasElement={selectCanvasElement}
                    elementLoadingStates={elementLoadingStates}
                    deletedElementIds={deletedElementIds}
                  />
                )
              })}
            </div>
          </ScrollArea>

          <ChatInputArea
            ref={textareaRef}
            inputMessage={inputMessage}
            onInputChange={setInputMessage}
            isInputExpanded={isInputExpanded}
            onExpandedChange={setIsInputExpanded}
            isGenerating={!!(streamingMessageId || isRegenerating)}
            isUploadingFile={isUploadingFile}
            attachedFiles={attachedFiles}
            onRemoveFile={handleRemoveFile}
            onSend={handleSendMessage}
            onStop={handleStopGeneration}
            isCanvasExpanded={isCanvasExpanded}
            regenerateTag={regenerateTag}
            onRemoveRegenerateTag={() => setRegenerateTag(null)}
            placeholder={regenerateTag ? "请告诉我您需要哪些补充信息？" : undefined}
          />
          </div>

          {/* 展开时显示分割线和Canvas画布 */}
          {isCanvasExpanded && (
            <>
              {/* 垂直分割线 - [MOD] 仅在流式输出时启用动画 */}
              <div className={`ai-canvas-divider w-0.5 h-full shrink-0 ${streamingMessageId ? 'ai-canvas-divider-active' : ''}`} />
              {/* 右侧Canvas画布区域 - 使用绝对定位确保有明确的宽高 */}
              <div className="flex-1 min-w-[1px] bg-background/50 relative">
                <div className="absolute inset-0">
                  <AiCanvasPanel
                    className="w-full h-full"
                    nodes={flowNodes}
                    edges={toFlowEdges()}
                    lockGraduationSupportOrganization={isCourseDetailCanvas}
                    disableAutoFocus={isCanvasHydrating}
                    disableAutoSelectNewNodes={isCanvasHydrating}
                    isBuilding={isCanvasInteractionLocked}
                    buildingProgress={canvasBuildProgress}
                    onNodeDelete={(nodeId) => {
                      // [MOD] 删除前将元素ID加入已删除集合，禁用聊天区关联卡片
                      setDeletedElementIds(prev => new Set(prev).add(nodeId))
                      removeCanvasElement(nodeId)
                      // 删除元素时清除重做标签
                      setRegenerateTag(null)
                    }}
                    onEdgeDelete={removeCanvasEdge}
                    onNodeDataUpdate={(nodeId, data) => updateCanvasElementData(nodeId, data)}
                    onNodePositionChange={(nodeId, position) => updateCanvasElementPosition(nodeId, position)}
                    onSelectionChange={(selectedIds) => {
                      // [MOD] 用户点击画布节点时，仅更新 selectedId state，不触发 elements 变更
                      // React Flow 已经处理了 UI 选中高亮，无需重新同步
                      const newSelectedId = selectedIds.length === 1 ? selectedIds[0] : null
                      setSelectedIdOnly(newSelectedId)
                    }}
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
                    onCourseMatrixUpdate={(nodeId, matrixData) => {
                      // 更新课程矩阵节点数据，确保画布展示与保存数据源同步
                      updateCanvasElementData(nodeId, matrixData)
                    }}
                    onProjectMatrixUpdate={(nodeId, matrixData) => {
                      // 更新项目矩阵节点数据
                      updateCanvasElementData(nodeId, matrixData)
                    }}
                    onPanelAdd={handlePanelAdd}
                    onConnectionMenuSelect={handleConnectionMenuSelect}
                    onNodeRegenerate={handleRegenerate}
                    // [MOD] 画布展开时发送聊天请求锁定画布，防止用户操作导致数据不一致
                    isRegenerating={isRegenerating || (isCanvasExpanded && streamingMessageId !== null)}
                    fillProgress={fillProgress}
                    canvasElements={canvasElements}
                    canvasOssKey={canvasOssKey}
                    treeData={treeData}
                    onSaveSuccess={(majorId, courseId) => {
                      console.log("[AI助手] 课程保存成功, majorId:", majorId, "courseId:", courseId)
                    }}
                    onEnsureLatestCanvasOssKey={ensureLatestCanvasOssKey}
	                    onUpdateCourseInfo={(updates) => {
                      // 查找课程信息节点并更新其 metadata 中的 courseId 和 majorId
                      const courseInfoElement = canvasElements.find(
                        el => el.type === CanvasComponentType.COURSE_INFO
                      )
                      if (courseInfoElement) {
                        const currentData = courseInfoElement.data as CourseInfoData
                        const updatedMetadata = {
                          ...currentData.metadata,
                          courseId: updates.courseId,
                          majorId: updates.majorId,
                        }
                        updateCanvasElementData(courseInfoElement.id, {
                          ...currentData,
                          metadata: updatedMetadata,
                        })
                        console.log("[AI助手] 更新课程信息, courseId:", updates.courseId, "majorId:", updates.majorId)
                      }

                      if (updates.objectives) {
                        updates.objectives.forEach((objective) => {
                          updateCanvasElementData(objective.id, objective)
                        })
                      }

	                      if (updates.coursePoints) {
	                        updates.coursePoints.forEach((coursePoint) => {
	                          updateCanvasElementData(coursePoint.id, coursePoint)
	                        })
	                      }

	                      if (updates.chapters) {
	                        updates.chapters.forEach((chapter) => {
	                          updateCanvasElementData(chapter.id, chapter)
	                        })
	                      }

	                      if (updates.ksaItems) {
	                        updates.ksaItems.forEach((ksaItem) => {
	                          updateCanvasElementData(ksaItem.id, ksaItem)
                        })
                      }
                    }}
                    isUploading={isCanvasUploading}
                    layoutMode={layoutMode}
                    onLayoutModeChange={setLayoutMode}
                  />
                </div>
              </div>
            </>
          )}
        </div>

      </SheetContent>
      <GeminiDemoDrawer
        open={isGeminiDemoOpen}
        onOpenChange={setIsGeminiDemoOpen}
        userName={userName}
      />
    </Sheet>
  )
}
