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
  }, [sessionId, serializeCanvas])

  /**
   * 上传到阿里云 OSS
   */
  const uploadToOss = useCallback(async (): Promise<string | null> => {
    if (!sessionId) return null

    const content = serializeCanvas()
    if (!content) return null

    // 检查是否有实际内容需要上传
    if (content.elements.length === 0 && content.edges.length === 0) {
      return state.ossKey
    }

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

      console.log("[画布] presign响应:", presignResponse)

      if (!presignResponse.data) {
        throw new Error(presignResponse.error || "获取上传签名失败")
      }

      console.log("[画布] presign.data:", presignResponse.data)

      // 兼容后端返回的字段名
      const responseData = presignResponse.data as Record<string, unknown>
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
        isUploading: false,
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
      setState(prev => ({ ...prev, isUploading: false }))
      const err = error instanceof Error ? error : new Error("上传失败")
      onUploadError?.(err)
      console.error("上传画布到 OSS 失败:", error)
      return null
    }
  }, [sessionId, serializeCanvas, state.ossKey, onUploadSuccess, onUploadError])

  /**
   * 更新画布数据（供外部调用）
   */
  const updateCanvasData = useCallback((
    elements: CanvasElementData[],
    edges: CanvasEdgeData[],
    specialComponents: Record<string, { type: CanvasComponentType; data: CanvasComponentData }>,
    selectedIds: string[] = []
  ) => {
    canvasDataRef.current = { elements, edges, specialComponents, selectedIds }
    setState(prev => ({ ...prev, hasUnsavedChanges: true }))

    // 立即保存到本地
    saveToLocal()
  }, [saveToLocal])

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
    if (!autoUpload || !sessionId) return

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
  }, [autoUpload, sessionId, uploadInterval, state.hasUnsavedChanges, state.isUploading, uploadToOss])

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
    saveToLocal,
    loadFromLocal,
    clearPersistence,
  }
}
