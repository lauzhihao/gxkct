"use client"

import "./ai-assistant.css"
import { useState, useEffect, useRef, useCallback } from "react"
import { Plus, Copy, Check, FileText } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"
import { AiCanvasPanel } from "./ai-canvas-panel"
import {
  CanvasAction,
  CanvasComponentType,
  CanvasEventMessage,
  ProgressEventMessage,
  ObjectiveCardData,
  ChapterCardData,
  CoursePointCardData,
  KsaItemData,
  RegenerateTarget,
  CourseInfoData,
} from "./canvas-elements"
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
  getToolStatusText,
  type AIRequestPayload,
} from "./ai-assistant/api-config"
import {
  createMessagePair,
  createMessageCommitter,
  canStartAIRequest,
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

  // 填充进度状态（合并课程矩阵、项目矩阵、课点、KSA 四种进度）
  const [fillProgress, setFillProgress] = useState<FillProgress>({})

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
        // 类型断言：本地存储的数据结构与画布元素类型一致
        loadCanvasData(
          (localCanvasData.elements || []) as Parameters<typeof loadCanvasData>[0],
          (localCanvasData.edges || []) as Parameters<typeof loadCanvasData>[1],
          localCanvasData.specialComponents as Parameters<typeof loadCanvasData>[2],
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

  // SSE 流式处理 Hook（提供统一的流处理能力）
  const {
    processStream,
    resetController: resetSSEController,
    abort: abortSSE,
    getSignal: getSSESignal,
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
    clearAttachedFiles()
  }, [clearCanvas, clearCanvasPersistence, clearAttachedFiles])

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

  /**
   * 通用 SSE 请求执行函数
   * 封装了所有 AI 填充请求的公共逻辑
   */
  interface SSERequestConfig {
    userContent: string
    messageSuffix: string
    logPrefix: string
    defaultCompleteMessage: string
    cancelMessage: string
    errorMessage: string
    payload: Partial<Omit<AIRequestPayload, 'sessionId' | 'messages' | 'canvasOssKey'>>
    onBeforeRequest?: () => Promise<void> | void
    onComplete?: () => void
    onProgress?: (progress: ProgressEventMessage) => void
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
      config.userContent,
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

    // 用于追踪 progress 累积的 thinking 内容（因为 progress 需要追加到 thinking）
    let progressThinking = ''

    try {
      // 执行请求前的准备操作
      if (config.onBeforeRequest) {
        await config.onBeforeRequest()
      }

      // 获取画布 OSS Key
      const ossKey = await getCanvasOssKey()
      if (!ossKey) {
        throw new Error("画布上传失败")
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
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // 使用 useSSEStream 的 processStream 处理响应
      const result = await processStream(response, {
        onCanvasEvent: (event) => {
          handleCanvasEvent(event)
        },
        onThinkingChunk: (content) => {
          // thinking 内容需要加上 progress 追加的部分
          setStreamingThinking(progressThinking + content)
        },
        onErrorEvent: (error) => {
          toast.error(error.message)
        },
        onProgressEvent: (progress) => {
          // 将进度追加到思考区域
          const progressLine = `[${progress.current}/${progress.total}] ${progress.message}\n`
          progressThinking += progressLine
          setStreamingThinking(progressThinking)
          // 调用自定义进度回调
          config.onProgress?.(progress)
        },
        onContentChunk: (content) => {
          setStreamingText(content)
        },
        onAbort: () => {
          console.log(`[${config.logPrefix}] 流式请求已被用户中止`)
        },
      })

      // 完成
      const finalContent = result.content.trim() || config.defaultCompleteMessage
      const finalThinking = progressThinking + (result.thinking || '')
      commitAssistantContent(finalContent, finalThinking || undefined)

      if (streamingControllerRef.current === controller) {
        streamingControllerRef.current = null
      }
      setStreamingMessageId(null)
      setStreamingText('')
      setIsRegenerating(false)

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

      console.error(`[${config.logPrefix}] 失败:`, error)
    }
  }, [isRegenerating, streamingMessageId, isInitialized, sessionId, getCanvasOssKey, handleCanvasEvent, processStream, resetSSEController])

  // 处理章节项目面板自动填充请求
  const handleFillChapterPanel = useCallback(async (targetPanelId?: string) => {
    await executeSSERequest({
      userContent: "请根据画布中的课程信息，自动填充章节项目列表",
      messageSuffix: "fill-chapter-panel",
      logPrefix: `填充章节项目${targetPanelId ? ` 目标面板: ${targetPanelId}` : ""}`,
      defaultCompleteMessage: "章节项目已自动填充",
      cancelMessage: "已取消填充操作。",
      errorMessage: "章节项目填充失败，请稍后再试。",
      payload: {
        fill_chapter_panel: true,
        ...(targetPanelId && { target_panel_id: targetPanelId }),
      },
      onBeforeRequest: () => {
        // 清空章节面板子节点（填充前必须清空，否则原有内容会传到后台）
        const chapterPanel = targetPanelId
          ? canvasElements.find(el => el.id === targetPanelId)
          : canvasElements.find(el => el.type === CanvasComponentType.CHAPTER_PANEL)
        if (chapterPanel) {
          console.log("[填充章节项目] 清空章节面板:", chapterPanel.id)
          updateCanvasPanelChildren(chapterPanel.id, CanvasComponentType.CHAPTER_PANEL, CanvasComponentType.CHAPTER_CARD, [])
        }
      },
      onComplete: () => {
        // 如果有目标面板ID，选中该面板
        if (targetPanelId) {
          selectCanvasElement(targetPanelId)
        }
      },
    })
  }, [executeSSERequest, canvasElements, updateCanvasPanelChildren, selectCanvasElement])

  // 处理教学目标面板自动填充请求
  const handleFillObjectivePanel = useCallback(async (targetPanelId?: string) => {
    await executeSSERequest({
      userContent: "请根据画布中的课程信息，自动填充教学目标列表",
      messageSuffix: "fill-objective-panel",
      logPrefix: `填充教学目标${targetPanelId ? ` 目标面板: ${targetPanelId}` : ""}`,
      defaultCompleteMessage: "教学目标已自动填充",
      cancelMessage: "已取消填充操作。",
      errorMessage: "教学目标填充失败，请稍后再试。",
      payload: {
        fill_objective_panel: true,
        ...(targetPanelId && { target_panel_id: targetPanelId }),
      },
      onBeforeRequest: () => {
        // 清空教学目标面板子节点（填充前必须清空，否则原有内容会传到后台）
        const objectivePanel = targetPanelId
          ? canvasElements.find(el => el.id === targetPanelId)
          : canvasElements.find(el => el.type === CanvasComponentType.OBJECTIVE_PANEL)
        if (objectivePanel) {
          console.log("[填充教学目标] 清空教学目标面板:", objectivePanel.id)
          updateCanvasPanelChildren(objectivePanel.id, CanvasComponentType.OBJECTIVE_PANEL, CanvasComponentType.OBJECTIVE_CARD, [])
        }
      },
      onComplete: () => {
        // 如果有目标面板ID，选中该面板
        if (targetPanelId) {
          selectCanvasElement(targetPanelId)
        }
      },
    })
  }, [executeSSERequest, canvasElements, updateCanvasPanelChildren, selectCanvasElement])

  // 处理画布组件重做请求
  const handleRegenerate = useCallback(async (nodeId: string, nodeType: CanvasComponentType, nodeName: string) => {
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

    // 设置重做目标状态（在 executeSSERequest 之前）
    setRegenerateTarget({
      component_id: nodeId,
      component_type: nodeType,
    })

    try {
      await executeSSERequest({
        userContent: `请帮我重新设计${nodeName}`,
        messageSuffix: "regenerate",
        logPrefix: "重做",
        defaultCompleteMessage: "组件已重新生成",
        cancelMessage: "已取消重做操作。",
        errorMessage: "重做失败，请稍后再试。",
        payload: {
          regenerate: {
            component_id: nodeId,
            component_type: nodeType,
          },
        },
        onBeforeRequest: () => {
          // 清空目标节点内容（重做前必须清空，否则原有内容会传到后台）
          const PANEL_TO_CARD_TYPE: Record<string, CanvasComponentType> = {
            [CanvasComponentType.OBJECTIVE_PANEL]: CanvasComponentType.OBJECTIVE_CARD,
            [CanvasComponentType.CHAPTER_PANEL]: CanvasComponentType.CHAPTER_CARD,
            [CanvasComponentType.COURSE_POINT_PANEL]: CanvasComponentType.COURSE_POINT_CARD,
            [CanvasComponentType.KSA_PANEL]: CanvasComponentType.KSA_ITEM,
          }
          const childType = PANEL_TO_CARD_TYPE[nodeType]
          if (childType) {
            console.log("[重做] 清空Panel子节点:", nodeId, nodeType)
            updateCanvasPanelChildren(nodeId, nodeType, childType, [])
          } else if (nodeType === CanvasComponentType.COURSE_MATRIX) {
            console.log("[重做] 清空课程矩阵:", nodeId)
            updateCanvasElementData(nodeId, { rows: [] })
          } else if (nodeType === CanvasComponentType.PROJECT_MATRIX) {
            console.log("[重做] 清空项目矩阵:", nodeId)
            updateCanvasElementData(nodeId, { rows: [] })
          }
        },
        onComplete: () => {
          // 选中被更新的节点，使其自动获取焦点
          selectCanvasElement(nodeId)
        },
      })
    } finally {
      // 确保清理重做目标状态
      setRegenerateTarget(null)
    }
  }, [executeSSERequest, handleFillChapterPanel, handleFillObjectivePanel, updateCanvasPanelChildren, updateCanvasElementData, selectCanvasElement])

  // 处理课程矩阵自动填充请求
  const handleFillCourseMatrix = useCallback(async () => {
    await executeSSERequest({
      userContent: "请根据画布中的教学目标、章节和课点信息，自动填充课程矩阵的支撑关系",
      messageSuffix: "fill-matrix",
      logPrefix: "填充课程矩阵",
      defaultCompleteMessage: "课程矩阵已自动填充支撑关系",
      cancelMessage: "已取消填充操作。",
      errorMessage: "课程矩阵填充失败，请稍后再试。",
      payload: { fill_course_matrix: true },
      onBeforeRequest: () => {
        // 清空课程矩阵数据（填充前必须清空，否则原有内容会传到后台）
        const courseMatrix = canvasElements.find(el => el.type === CanvasComponentType.COURSE_MATRIX)
        if (courseMatrix) {
          console.log("[填充课程矩阵] 清空课程矩阵:", courseMatrix.id)
          updateCanvasElementData(courseMatrix.id, { rows: [] })
        }
      },
      onProgress: (progress) => {
        updateFillProgress('matrix', progress.message)
      },
      onComplete: () => {
        updateFillProgress('matrix', null)
      },
    })
    // 确保进度在任何情况下都被清除
    updateFillProgress('matrix', null)
  }, [executeSSERequest, canvasElements, updateCanvasElementData, updateFillProgress])

  // 处理项目矩阵自动填充请求
  const handleFillProjectMatrix = useCallback(async () => {
    await executeSSERequest({
      userContent: "请根据画布中的课程矩阵和章节信息，自动填充项目矩阵的任务目标和支撑关系",
      messageSuffix: "fill-project-matrix",
      logPrefix: "填充项目矩阵",
      defaultCompleteMessage: "项目矩阵已自动填充任务目标和支撑关系",
      cancelMessage: "已取消填充操作。",
      errorMessage: "项目矩阵填充失败，请稍后再试。",
      payload: { fill_project_matrix: true },
      onProgress: (progress) => {
        updateFillProgress('projectMatrix', progress.message)
      },
      onComplete: () => {
        updateFillProgress('projectMatrix', null)
      },
    })
    updateFillProgress('projectMatrix', null)
  }, [executeSSERequest, updateFillProgress])

  // 处理课程信息自动填充请求（从源文档生成课程基本信息）
  const handleFillCourseInfo = useCallback(async (courseInfoId: string) => {
    if (!sessionId) {
      console.warn("[填充课程信息] 缺少sessionId")
      return
    }

    await executeSSERequest({
      userContent: "请根据上传的源文档，自动生成课程基本信息",
      messageSuffix: "fill-course-info",
      logPrefix: `填充课程信息 课程信息ID: ${courseInfoId}`,
      defaultCompleteMessage: "课程基本信息已自动填充",
      cancelMessage: "已取消填充操作。",
      errorMessage: "课程信息填充失败，请稍后再试。",
      payload: {
        fill_course_info: true,
        target_course_info_id: courseInfoId,
      },
      skipInitCheck: true,
      onComplete: () => {
        // 选中课程信息卡片
        selectCanvasElement(courseInfoId)
      },
    })
  }, [sessionId, executeSSERequest, selectCanvasElement])

  // 处理课点信息自动填充请求
  const handleFillCoursePoints = useCallback(async () => {
    await executeSSERequest({
      userContent: "请根据画布中的课程信息和教学目标，自动生成课点信息",
      messageSuffix: "fill-course-points",
      logPrefix: "填充课点信息",
      defaultCompleteMessage: "课点信息已自动生成",
      cancelMessage: "已取消填充操作。",
      errorMessage: "课点信息生成失败，请稍后再试。",
      payload: { fill_course_point_panel: true },
      onBeforeRequest: () => {
        // 清空课点面板子节点（填充前必须清空，否则原有内容会传到后台）
        const coursePointPanel = canvasElements.find(el => el.type === CanvasComponentType.COURSE_POINT_PANEL)
        if (coursePointPanel) {
          console.log("[填充课点信息] 清空课点面板:", coursePointPanel.id)
          updateCanvasPanelChildren(coursePointPanel.id, CanvasComponentType.COURSE_POINT_PANEL, CanvasComponentType.COURSE_POINT_CARD, [])
        }
      },
      onProgress: (progress) => {
        updateFillProgress('coursePoints', progress.message)
      },
      onComplete: () => {
        updateFillProgress('coursePoints', null)
      },
    })
    updateFillProgress('coursePoints', null)
  }, [executeSSERequest, canvasElements, updateCanvasPanelChildren, updateFillProgress])

  // 处理KSA自动填充请求
  // 处理 KSA 面板自动填充请求
  const handleFillKsa = useCallback(async () => {
    await executeSSERequest({
      userContent: "请根据画布中的课程信息和课点信息，自动生成KSA（知识、技能、态度）三要素",
      messageSuffix: "fill-ksa",
      logPrefix: "填充KSA",
      defaultCompleteMessage: "KSA三要素已自动生成",
      cancelMessage: "已取消填充操作。",
      errorMessage: "KSA生成失败，请稍后再试。",
      payload: { fill_ksa_panel: true },
      onBeforeRequest: () => {
        // 清空KSA面板子节点（填充前必须清空，否则原有内容会传到后台）
        const ksaPanel = canvasElements.find(el => el.type === CanvasComponentType.KSA_PANEL)
        if (ksaPanel) {
          console.log("[填充KSA] 清空KSA面板:", ksaPanel.id)
          updateCanvasPanelChildren(ksaPanel.id, CanvasComponentType.KSA_PANEL, CanvasComponentType.KSA_ITEM, [])
        }
      },
      onProgress: (progress) => {
        updateFillProgress('ksa', progress.message)
      },
      onComplete: () => {
        updateFillProgress('ksa', null)
      },
    })
    // 确保进度被清除（包括错误情况）
    updateFillProgress('ksa', null)
  }, [executeSSERequest, canvasElements, updateCanvasPanelChildren, updateFillProgress])

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
    setRegenerateTarget(null)
    setToolStatus(null)
    setProgress(null)

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
    if (!inputMessage.trim() || !isInitialized || !sessionId) {
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

    try {
      const ossKey = await getCanvasOssKey()

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
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // 使用 useSSEStream 的 processStream 处理响应
      const result = await processStream(response, {
        onStatusEvent: (status) => {
          setToolStatus({
            node: status.node,
            event: status.event,
            tool: status.tool,
            args: status.args,
          })
          // tools end 时清除状态
          if (status.node === 'tools' && status.event === 'end') {
            setTimeout(() => setToolStatus(null), 1000)
          }
        },
        onCanvasEvent: (event) => {
          handleCanvasEvent(event)
          // canvas 事件触发画布展开
          if (!hasTriggeredExpandRef.current) {
            hasTriggeredExpandRef.current = true
            setIsCanvasExpanded(true)
          }
        },
        onThinkingChunk: (content) => {
          setStreamingThinking(content)
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
        onProgressEvent: (progressEvent) => {
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
        },
        onModeEvent: (modeEvent) => {
          setCurrentMode(modeEvent.mode)
          if (modeEvent.stage) {
            setBuildingStage(modeEvent.stage)
          }
          // chat 模式时收起画布
          if (modeEvent.mode === 'chat') {
            setIsCanvasExpanded(false)
            hasTriggeredExpandRef.current = false
          }
        },
        onErrorEvent: (error) => {
          toast.error(error.message)
        },
        onContentChunk: (content) => {
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

      // 完成
      const finalContent = result.content.trim() || 'AI 暂无新的建议，请稍后再试。'
      commitAssistantContent(finalContent, result.thinking || undefined)
      if (streamingControllerRef.current === controller) {
        streamingControllerRef.current = null
      }
      setStreamingMessageId(null)
      setStreamingText('')
      // 不清空思考内容，保留显示"思考完毕"状态
    } catch (error) {
      // AbortError 已在 processStream 内部处理并抛出，这里需要捕获
      if (error instanceof Error && error.name === 'AbortError') {
        if (streamingControllerRef.current === controller) {
          streamingControllerRef.current = null
        }
        setStreamingMessageId(null)
        setStreamingText('')
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
    }
  }, [inputMessage, isInitialized, sessionId, attachedFiles, uploadFileToOss, getCanvasOssKey, handleCanvasEvent, processStream, resetSSEController])

  // 连接菜单处理器
  const handleConnectionMenuSelect = useCallback(
    createConnectionMenuHandler({
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
                const isStreaming = streamingMessageId === message.id
                const isLastAssistantMessage =
                  message.role === "assistant" &&
                  chatMessages.filter((m) => m.role === "assistant").pop()?.id === message.id

                return (
                  <ChatMessageItem
                    key={message.id}
                    message={message}
                    isStreaming={isStreaming}
                    streamingText={streamingText}
                    streamingThinking={streamingThinking}
                    isThinkingExpanded={isThinkingExpanded}
                    onThinkingToggle={() => setIsThinkingExpanded(!isThinkingExpanded)}
                    greetingForMessage={greetingForMessage}
                    userName={userName}
                    isCanvasExpanded={isCanvasExpanded}
                    isLastAssistantMessage={isLastAssistantMessage}
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
          />
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
                    onConnectionMenuSelect={handleConnectionMenuSelect}
                    onNodeRegenerate={handleRegenerate}
                    isRegenerating={isRegenerating}
                    fillProgress={fillProgress}
                    canvasElements={canvasElements}
                    canvasOssKey={canvasOssKey}
                    treeData={treeData}
                    onSaveSuccess={(majorId, courseId) => {
                      console.log("[AI助手] 课程保存成功, majorId:", majorId, "courseId:", courseId)
                    }}
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
