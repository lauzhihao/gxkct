/**
 * 文件拖拽处理 Hook
 *
 * 提供文件拖拽上传功能，支持文件类型过滤和大小限制
 */

import { useState, useRef, useCallback } from "react"
import type { AttachedFile } from "@/types/ai-assistant"

/**
 * 文件拖拽 Hook 配置选项
 */
export interface UseFileDragOptions {
  /** 最大文件大小（字节），默认 10MB */
  maxFileSize?: number
  /** 支持的 MIME 类型列表 */
  supportedTypes?: readonly string[]
  /** 支持的文件扩展名列表 */
  supportedExtensions?: readonly string[]
  /** 文件添加成功回调 */
  onFileAdded?: (file: AttachedFile) => void
  /** 错误回调 */
  onError?: (message: string) => void
}

/**
 * 拖拽事件处理器对象
 */
export interface DragHandlers {
  onDragEnter: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

/**
 * useFileDrag Hook 返回值
 */
export interface UseFileDragReturn {
  /** 当前附件文件列表 */
  attachedFiles: AttachedFile[]
  /** 是否正在拖拽中 */
  isDragging: boolean
  /** 拖拽事件处理器，可直接绑定到容器元素 */
  dragHandlers: DragHandlers
  /** 移除指定文件 */
  removeFile: (fileId: string) => void
  /** 清空所有文件 */
  clearFiles: () => void
  /** 设置附件列表（用于外部控制） */
  setAttachedFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>
}

/** 默认最大文件大小：10MB */
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024

/** 默认支持的 MIME 类型 */
const DEFAULT_SUPPORTED_TYPES: readonly string[] = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

/** 默认支持的文件扩展名 */
const DEFAULT_SUPPORTED_EXTENSIONS: readonly string[] = [
  ".txt",
  ".md",
  ".pdf",
  ".docx",
  ".xlsx",
  ".csv",
  ".json",
]

/**
 * 文件拖拽处理 Hook
 *
 * @param options - 配置选项
 * @returns 拖拽状态和处理器
 *
 * @example
 * ```tsx
 * const { attachedFiles, isDragging, dragHandlers, removeFile } = useFileDrag({
 *   maxFileSize: 5 * 1024 * 1024, // 5MB
 *   onError: (msg) => toast.error(msg),
 * })
 *
 * return (
 *   <div {...dragHandlers}>
 *     {isDragging && <div>释放以添加文件</div>}
 *     {attachedFiles.map(file => (
 *       <FileTag key={file.id} file={file} onRemove={removeFile} />
 *     ))}
 *   </div>
 * )
 * ```
 */
export function useFileDrag(options: UseFileDragOptions = {}): UseFileDragReturn {
  const {
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    supportedTypes = DEFAULT_SUPPORTED_TYPES,
    supportedExtensions = DEFAULT_SUPPORTED_EXTENSIONS,
    onFileAdded,
    onError,
  } = options

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const dragCounterRef = useRef(0)

  // 检查文件是否为支持的类型
  const isFileSupported = useCallback((file: File): boolean => {
    // 检查 MIME 类型
    if (supportedTypes.includes(file.type)) return true
    // 检查文件扩展名（某些浏览器可能不提供正确的 MIME 类型）
    const fileName = file.name.toLowerCase()
    return supportedExtensions.some(ext => fileName.endsWith(ext))
  }, [supportedTypes, supportedExtensions])

  // 拖拽进入事件
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true)
    }
  }, [])

  // 拖拽悬停事件
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  // 拖拽离开事件
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  // 拖拽释放事件
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0

    const files = Array.from(e.dataTransfer.files)
    const supportedFiles = files.filter(isFileSupported)

    if (supportedFiles.length === 0 && files.length > 0) {
      onError?.("不支持的文件格式，仅支持 .md、.txt、.docx、.pdf、.xlsx、.csv、.json 文件")
      return
    }

    // 只取第一个支持的文件
    const firstFile = supportedFiles[0]
    if (!firstFile) return

    // 检查文件大小
    if (firstFile.size > maxFileSize) {
      const maxSizeMB = Math.round(maxFileSize / (1024 * 1024))
      onError?.(`文件大小超过限制，最大支持 ${maxSizeMB}MB`)
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
    onFileAdded?.(newAttachedFile)
  }, [isFileSupported, maxFileSize, onFileAdded, onError])

  // 移除文件
  const removeFile = useCallback((fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  // 清空所有文件
  const clearFiles = useCallback(() => {
    setAttachedFiles([])
  }, [])

  return {
    attachedFiles,
    isDragging,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
    removeFile,
    clearFiles,
    setAttachedFiles,
  }
}
