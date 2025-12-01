"use client"

import { useState, useCallback } from "react"
import type { FileData, CourseResourceData } from "@/lib/api"
import { courseResourcesApi } from "@/modules/courses/api/courseResourcesApi"

export interface UploadFile {
  file: File
  id: string
}

interface UseFileUploadProps {
  nodeId: string
  currentFolder: string | null
  resourceData: CourseResourceData | null
  setResourceData: React.Dispatch<React.SetStateAction<CourseResourceData | null>>
}

interface UseFileUploadReturn {
  isUploadDialogOpen: boolean
  setIsUploadDialogOpen: (open: boolean) => void
  uploadFiles: UploadFile[]
  uploadProgress: number
  isUploading: boolean
  isDragging: boolean
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleDrop: (e: React.DragEvent) => void
  handleDragOver: (e: React.DragEvent) => void
  handleDragLeave: (e: React.DragEvent) => void
  removeUploadFile: (id: string) => void
  handleUpload: () => Promise<void>
}

export function useFileUpload({
  nodeId,
  currentFolder,
  resourceData,
  setResourceData,
}: UseFileUploadProps): UseFileUploadReturn {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles: UploadFile[] = Array.from(files).map((file) => ({
        file,
        id: `${Date.now()}-${Math.random()}`,
      }))
      setUploadFiles((prev) => [...prev, ...newFiles])
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files) {
      const newFiles: UploadFile[] = Array.from(files).map((file) => ({
        file,
        id: `${Date.now()}-${Math.random()}`,
      }))
      setUploadFiles((prev) => [...prev, ...newFiles])
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeUploadFile = useCallback((id: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleUpload = useCallback(async () => {
    if (!currentFolder || uploadFiles.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    // 模拟上传进度
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 200)

    await new Promise((resolve) => setTimeout(resolve, 2200))

    if (resourceData) {
      const newFiles: FileData[] = uploadFiles.map((uf) => ({
        name: uf.file.name,
        size: `${(uf.file.size / 1024).toFixed(2)} KB`,
        date: new Date().toLocaleDateString("zh-CN"),
        type: uf.file.type || "未知类型",
        uploader: "当前用户",
        version: "v1.0",
      }))

      const updatedFiles = {
        ...resourceData.files,
        [currentFolder]: [...(resourceData.files[currentFolder] || []), ...newFiles],
      }

      const updatedFolders = resourceData.folders.map((folder) =>
        folder.id === currentFolder ? { ...folder, count: folder.count + newFiles.length } : folder,
      )

      const updatedResourceData: CourseResourceData = {
        ...resourceData,
        files: updatedFiles,
        folders: updatedFolders,
      }

      setResourceData(updatedResourceData)
      await courseResourcesApi.updateCourseResources(nodeId, updatedResourceData)
    }

    setIsUploading(false)
    setUploadProgress(0)
    setUploadFiles([])
    setIsUploadDialogOpen(false)
  }, [currentFolder, uploadFiles, resourceData, setResourceData, nodeId])

  return {
    isUploadDialogOpen,
    setIsUploadDialogOpen,
    uploadFiles,
    uploadProgress,
    isUploading,
    isDragging,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    removeUploadFile,
    handleUpload,
  }
}

