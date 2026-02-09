"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { canvasApi, type CanvasContentData } from "@/lib/api/canvas-api"
import type { CanvasElementData, CanvasEdgeData, CanvasComponentData, CanvasComponentType } from "@/components/canvas-elements/types"

// 本地存储 key
const STORAGE_KEY_CANVAS_CONTENT = "ai-canvas-content"
const STORAGE_KEY_CANVAS_OSS_KEY = "ai-canvas-oss-key"

// 画布内容版本号
const CANVAS_VERSION = "1.0"

// 默认上传间隔（毫秒）
const DEFAULT_UPLOAD_INTERVAL = 30000 // 30秒
const SAVE_TO_LOCAL_DEBOUNCE_MS = 400
const AUTO_UPLOAD_MIN_INTERVAL_MS = 5000


/**
 * 比较两个画布数据是否在数据层面有变化
 * 忽略 UI 层级变化：position, selected, size
 * 检测数据层变化：元素增删、data内容、边增删、specialComponents
 */
function hasDataLayerChanges(
  prev: {
    elements: CanvasElementData[]
    edges: CanvasEdgeData[]
    specialComponents: Record<string, { type: CanvasComponentType; data: CanvasComponentData }>
  } | null,
  next: {
    elements: CanvasElementData[]
    edges: CanvasEdgeData[]
    specialComponents: Record<string, { type: CanvasComponentType; data: CanvasComponentData }>
  }
): boolean {
  // 首次有数据时视为变化
  if (!prev) return next.elements.length > 0 || next.edges.length > 0

  // 比较元素数量
  if (prev.elements.length !== next.elements.length) return true

  // 比较边数量
  if (prev.edges.length !== next.edges.length) return true

  // 比较 specialComponents 的 keys 数量
  const prevKeys = Object.keys(prev.specialComponents)
  const nextKeys = Object.keys(next.specialComponents)
  if (prevKeys.length !== nextKeys.length) return true

  const prevElementMap = new Map(prev.elements.map((element) => [element.id, element]))
  const nextElementMap = new Map(next.elements.map((element) => [element.id, element]))

  // 比较每个元素的 id, type, data, parentId（忽略 position, selected, size）
  for (const [id, nextEl] of nextElementMap) {
    const prevEl = prevElementMap.get(id)
    if (!prevEl) return true // 新增元素

    if (prevEl.type !== nextEl.type) return true
    if (prevEl.parentId !== nextEl.parentId) return true
    // 深度比较 data
    if (JSON.stringify(prevEl.data) !== JSON.stringify(nextEl.data)) return true
  }

  // 检查是否有被删除的元素
  for (const id of prevElementMap.keys()) {
    if (!nextElementMap.has(id)) return true
  }

  const prevEdgeMap = new Map(prev.edges.map((edge) => [edge.id, edge]))
  const nextEdgeMap = new Map(next.edges.map((edge) => [edge.id, edge]))

  // 比较边的内容
  for (const [id, nextEdge] of nextEdgeMap) {
    const prevEdge = prevEdgeMap.get(id)
    if (!prevEdge) return true // 新增边
    if (prevEdge.source !== nextEdge.source || prevEdge.target !== nextEdge.target) return true
  }

  // 检查是否有被删除的边
  for (const id of prevEdgeMap.keys()) {
    if (!nextEdgeMap.has(id)) return true
  }

  // 比较 specialComponents 的内容
  for (const key of nextKeys) {
    if (!prev.specialComponents[key]) return true
    if (JSON.stringify(prev.specialComponents[key]) !== JSON.stringify(next.specialComponents[key])) return true
  }

  return false
}

export interface UseCanvasPersistenceOptions {
  sessionId: string
  // 上传间隔（毫秒）
  uploadInterval?: number
  // 是否启用自动上传
  autoUpload?: boolean
  // 上传成功回调
  onUploadSuccess?: (ossKey: string) => void
  // 上传失败回调
  onUploadError?: (error: Error) => void
  // 是否暂停自动上传（用于大批量构建阶段）
  suspendAutoUpload?: boolean
}

export interface CanvasPersistenceState {
  // 当前 OSS Key
  ossKey: string | null
  // 是否正在上传
  isUploading: boolean
  // 上次上传时间
  lastUploadTime: number | null
  // 是否有未保存的更改
  hasUnsavedChanges: boolean
}

interface UpdateCanvasDataOptions {
  skipAutoUpload?: boolean
}

/**
 * 画布持久化 Hook
 * 处理画布内容的本地保存和阿里云 OSS 上传
 */
export function useCanvasPersistence(options: UseCanvasPersistenceOptions) {
  const {
    sessionId,
    uploadInterval = DEFAULT_UPLOAD_INTERVAL,
    autoUpload = true,
    onUploadSuccess,
    onUploadError,
    suspendAutoUpload = false,
  } = options

  const [state, setState] = useState<CanvasPersistenceState>({
    ossKey: null,
    isUploading: false,
    lastUploadTime: null,
    hasUnsavedChanges: false,
  })

  // 缓存最新的画布数据
  const canvasDataRef = useRef<{
    elements: CanvasElementData[]
    edges: CanvasEdgeData[]
    specialComponents: Record<string, { type: CanvasComponentType; data: CanvasComponentData }>
    selectedIds: string[]
  } | null>(null)

  // 上传定时器
  const uploadTimerRef = useRef<NodeJS.Timeout | null>(null)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const coalescedUploadTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isUploadingRef = useRef(false)
  const lastAutoUploadAtRef = useRef(0)

  // 初始化：从本地存储恢复 ossKey
  useEffect(() => {
    if (typeof window === "undefined" || !sessionId) return

    try {
      const storedOssKey = localStorage.getItem(`${STORAGE_KEY_CANVAS_OSS_KEY}_${sessionId}`)
      if (storedOssKey) {
        setState(prev => ({ ...prev, ossKey: storedOssKey }))
      }
    } catch (error) {
      console.error("读取 OSS Key 失败:", error)
    }
  }, [sessionId])

  /**
   * 序列化画布内容为 JSON
   */
  const serializeCanvas = useCallback((): CanvasContentData | null => {
    if (!canvasDataRef.current) return null

    return {
      version: CANVAS_VERSION,
      sessionId,
      timestamp: Date.now(),
      elements: canvasDataRef.current.elements,
      edges: canvasDataRef.current.edges,
      specialComponents: canvasDataRef.current.specialComponents,
      selectedIds: canvasDataRef.current.selectedIds,
    }
  }, [sessionId])

  /**
   * 保存到本地存储
   */
  const saveToLocal = useCallback(() => {
    if (typeof window === "undefined") {
      console.log("[画布] saveToLocal: 非浏览器环境")
      return
    }
    if (!sessionId) {
      console.log("[画布] saveToLocal: sessionId为空，跳过保存")
      return
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      const content = serializeCanvas()
      if (!content) {
        console.log("[画布] saveToLocal: 无画布数据可保存")
        return
      }

      const storageKey = `${STORAGE_KEY_CANVAS_CONTENT}_${sessionId}`
      try {
        localStorage.setItem(storageKey, JSON.stringify(content))
        console.log("[画布] 已保存到本地存储, key:", storageKey, "元素数:", content.elements.length)
      } catch (error) {
        console.error("[画布] 保存到本地存储失败:", error)
      }
    }, SAVE_TO_LOCAL_DEBOUNCE_MS)
  }, [sessionId, serializeCanvas])

  /**
   * 上传到阿里云 OSS
   */
  const uploadToOss = useCallback(async (): Promise<string | null> => {
    if (!sessionId) return null
    if (isUploadingRef.current) return state.ossKey

    const content = serializeCanvas()
    if (!content) return null

    // 检查是否有实际内容需要上传
    if (content.elements.length === 0 && content.edges.length === 0) {
      return state.ossKey
    }

    isUploadingRef.current = true
    setState(prev => ({ ...prev, isUploading: true }))

    try {
      // 1. 序列化内容并计算大小
      const contentJson = JSON.stringify(content)
      const contentSize = new Blob([contentJson]).size

      // 2. 从 sessionId 解析日期，格式：session_{timestamp}_{random}
      const timestampMatch = sessionId.match(/^session_(\d+)_/)
      const timestamp = timestampMatch ? parseInt(timestampMatch[1], 10) : Date.now()
      const sessionDate = new Date(timestamp)
      const dateStr = `${sessionDate.getFullYear()}${String(sessionDate.getMonth() + 1).padStart(2, "0")}${String(sessionDate.getDate()).padStart(2, "0")}`
      const fileName = `gxkct/course_ai_canvas/${dateStr}/${sessionId}.json`

      // 3. 获取上传签名
      const presignResponse = await canvasApi.getPresignUrl({
        fileName,
        mimeType: "application/json",
        size: contentSize,
      })

      if (!presignResponse.data) {
        throw new Error(presignResponse.error || "获取上传签名失败")
      }

      // 兼容后端返回的字段名
      const responseData = presignResponse.data as unknown as Record<string, unknown>
      const uploadUrl = (responseData.uploadUrl || responseData.upload_url || responseData.url) as string
      // 后端返回 uploadPath 作为 OSS 存储路径
      const ossKey = (responseData.ossKey || responseData.oss_key || responseData.uploadPath || responseData.key) as string
      const headers = (responseData.headers || responseData.uploadHeaders || {}) as Record<string, string>

      if (!uploadUrl || !ossKey) {
        console.error("[画布] presign响应缺少必要字段, uploadUrl:", uploadUrl, "ossKey:", ossKey)
        throw new Error("获取上传签名失败：响应格式错误")
      }

      // 3. 上传到 OSS
      const uploadSuccess = await canvasApi.uploadToOss(uploadUrl, content, headers)

      if (!uploadSuccess) {
        throw new Error("上传到 OSS 失败")
      }

      // 4. 更新状态和本地存储
      setState(prev => ({
        ...prev,
        ossKey,
        lastUploadTime: Date.now(),
        hasUnsavedChanges: false,
      }))

      // 保存 ossKey 到本地存储
      if (typeof window !== "undefined") {
        localStorage.setItem(`${STORAGE_KEY_CANVAS_OSS_KEY}_${sessionId}`, ossKey)
      }

      onUploadSuccess?.(ossKey)
      return ossKey
    } catch (error) {
      const err = error instanceof Error ? error : new Error("上传失败")
      onUploadError?.(err)
      console.error("上传画布到 OSS 失败:", error)
      throw err
    } finally {
      isUploadingRef.current = false
      setState(prev => ({ ...prev, isUploading: false }))
    }
  }, [sessionId, serializeCanvas, state.ossKey, onUploadSuccess, onUploadError])

  /**
   * 更新画布数据（供外部调用）
   */
  const updateCanvasData = useCallback((
    elements: CanvasElementData[],
    edges: CanvasEdgeData[],
    specialComponents: Record<string, { type: CanvasComponentType; data: CanvasComponentData }>,
    selectedIds: string[] = [],
    options: UpdateCanvasDataOptions = {}
  ) => {
    const newData = { elements, edges, specialComponents, selectedIds }

    // 检测是否是数据层变化（排除位置、选中状态等 UI 层级变化）
    const isDataChange = hasDataLayerChanges(canvasDataRef.current, newData)

    canvasDataRef.current = newData
    if (isDataChange) {
      setState(prev => (prev.hasUnsavedChanges ? prev : { ...prev, hasUnsavedChanges: true }))
    }

    // 立即保存到本地
    saveToLocal()

    // [MOD] 如果是数据层变化，直接上传到 OSS（覆盖式上传，移除防抖逻辑）
    if (isDataChange && !options.skipAutoUpload && !suspendAutoUpload) {
      const now = Date.now()
      const elapsedSinceLastAutoUpload = now - lastAutoUploadAtRef.current

      if (!isUploadingRef.current && elapsedSinceLastAutoUpload >= AUTO_UPLOAD_MIN_INTERVAL_MS) {
        lastAutoUploadAtRef.current = now
        console.log("[画布] 检测到数据层变化，直接上传到 OSS")
        uploadToOss().catch(() => {
          // 已在 uploadToOss 内部统一触发 onUploadError 和日志
        })
      } else {
        const waitMs = Math.max(AUTO_UPLOAD_MIN_INTERVAL_MS - elapsedSinceLastAutoUpload, 300)
        if (coalescedUploadTimerRef.current) {
          clearTimeout(coalescedUploadTimerRef.current)
        }
        coalescedUploadTimerRef.current = setTimeout(() => {
          if (isUploadingRef.current) return
          lastAutoUploadAtRef.current = Date.now()
          console.log("[画布] 自动上传合并触发")
          uploadToOss().catch(() => {
            // 已在 uploadToOss 内部统一触发 onUploadError 和日志
          })
        }, waitMs)
      }
    }
  }, [saveToLocal, uploadToOss, suspendAutoUpload])

  /**
   * 手动触发上传
   */
  const triggerUpload = useCallback(async () => {
    return uploadToOss()
  }, [uploadToOss])

  /**
   * 获取当前 ossKey（如果没有则先上传）
   */
  const getOssKey = useCallback(async (): Promise<string | null> => {
    // 如果没有内容，返回 null
    if (!canvasDataRef.current ||
        (canvasDataRef.current.elements.length === 0 && canvasDataRef.current.edges.length === 0)) {
      return null
    }

    // 如果有未保存的更改或没有 ossKey，先上传
    if (state.hasUnsavedChanges || !state.ossKey) {
      return uploadToOss()
    }

    return state.ossKey
  }, [state.hasUnsavedChanges, state.ossKey, uploadToOss])

  /**
   * 强制上传最新画布数据并返回 ossKey
   * 无论是否有未保存更改，都会执行上传（用于发送聊天消息前确保画布数据最新）
   */
  const forceUpload = useCallback(async (): Promise<string | null> => {
    // 如果没有内容，返回 null
    if (!canvasDataRef.current ||
        (canvasDataRef.current.elements.length === 0 && canvasDataRef.current.edges.length === 0)) {
      return null
    }

    // 无条件上传最新数据
    console.log("[画布] 强制上传最新数据")
    return uploadToOss()
  }, [uploadToOss])

  /**
   * 从本地存储加载画布数据
   */
  const loadFromLocal = useCallback((): CanvasContentData | null => {
    if (typeof window === "undefined") {
      console.log("[画布] loadFromLocal: 非浏览器环境")
      return null
    }
    if (!sessionId) {
      console.log("[画布] loadFromLocal: sessionId为空")
      return null
    }

    const storageKey = `${STORAGE_KEY_CANVAS_CONTENT}_${sessionId}`
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const content = JSON.parse(stored) as CanvasContentData
        console.log("[画布] 从本地存储加载成功, key:", storageKey, "元素数:", content.elements?.length || 0)
        return content
      } else {
        console.log("[画布] 本地存储无数据, key:", storageKey)
      }
    } catch (error) {
      console.error("[画布] 从本地存储加载失败:", error)
    }
    return null
  }, [sessionId])

  /**
   * 清除持久化数据
   */
  const clearPersistence = useCallback(() => {
    if (typeof window === "undefined") return

    canvasDataRef.current = null
    setState({
      ossKey: null,
      isUploading: false,
      lastUploadTime: null,
      hasUnsavedChanges: false,
    })

    try {
      localStorage.removeItem(`${STORAGE_KEY_CANVAS_CONTENT}_${sessionId}`)
      localStorage.removeItem(`${STORAGE_KEY_CANVAS_OSS_KEY}_${sessionId}`)
    } catch (error) {
      console.error("清除持久化数据失败:", error)
    }
  }, [sessionId])

  // 自动上传定时器
  useEffect(() => {
    // sessionId 为空时不启动定时器
    if (!autoUpload || !sessionId || suspendAutoUpload) return

    // 清除旧定时器
    if (uploadTimerRef.current) {
      clearInterval(uploadTimerRef.current)
    }

    // 设置新定时器
    uploadTimerRef.current = setInterval(() => {
      if (state.hasUnsavedChanges && !state.isUploading) {
        console.log("[画布] 自动上传触发")
        uploadToOss()
      }
    }, uploadInterval)

    return () => {
      if (uploadTimerRef.current) {
        clearInterval(uploadTimerRef.current)
      }
    }
  }, [autoUpload, sessionId, uploadInterval, suspendAutoUpload, state.hasUnsavedChanges, state.isUploading, uploadToOss])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      if (coalescedUploadTimerRef.current) {
        clearTimeout(coalescedUploadTimerRef.current)
      }
    }
  }, [])


  return {
    // 状态
    ossKey: state.ossKey,
    isUploading: state.isUploading,
    lastUploadTime: state.lastUploadTime,
    hasUnsavedChanges: state.hasUnsavedChanges,
    // 方法
    updateCanvasData,
    triggerUpload,
    getOssKey,
    forceUpload,
    saveToLocal,
    loadFromLocal,
    clearPersistence,
  }
}
