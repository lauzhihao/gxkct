"use client"

import { useState, useEffect, useCallback } from "react"
import type { FileData, CourseResourceData } from "@/lib/api"
import { courseResourcesApi } from "@/modules/courses/api/courseResourcesApi"

interface UseCourseResourcesReturn {
  // 数据状态
  resourceData: CourseResourceData | null
  setResourceData: React.Dispatch<React.SetStateAction<CourseResourceData | null>>
  isLoading: boolean
  error: string | null
  // 导航状态
  currentFolder: string | null
  selectedFile: FileData | null
  searchTerm: string
  // 导航操作
  handleFolderClick: (folderId: string) => void
  handleBackToFolders: () => void
  handleFileClick: (file: FileData) => void
  handleBackToFiles: () => void
  setSearchTerm: (term: string) => void
  // 数据获取
  getFilteredFolders: () => CourseResourceData["folders"]
  getCurrentFolderData: () => { folder: CourseResourceData["folders"][0] | undefined; files: FileData[] } | null
  // 评分数据
  mockScoring: CourseResourceData["scoring"]
}

export function useCourseResources(nodeId: string): UseCourseResourcesReturn {
  const [resourceData, setResourceData] = useState<CourseResourceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // 加载资源数据
  useEffect(() => {
    const loadResources = async () => {
      setIsLoading(true)
      setError(null)
      try {
        console.log(`[CourseResources] 开始加载课程资源，nodeId=${nodeId}`)
        const response = await courseResourcesApi.getCourseResources(nodeId)
        console.log(`[CourseResources] 响应:`, response)
        if (response.data) {
          console.log(`[CourseResources] 成功加载数据:`, response.data)
          setResourceData(response.data)
        } else {
          console.warn(`[CourseResources] 响应中没有数据:`, response)
          setError(response.error || "无法加载课程资源")
        }
      } catch (err) {
        console.error(`[CourseResources] 加载失败:`, err)
        setError(err instanceof Error ? err.message : "加载课程资源失败")
      } finally {
        setIsLoading(false)
      }
    }
    loadResources()
  }, [nodeId])

  const courseResources = resourceData?.folders || []
  const mockFiles = resourceData?.files || {}
  const mockScoring = resourceData?.scoring || {
    selfEvaluation: { total: 0, indicators: [] },
    professionalEvaluation: { total: 0, indicators: [] },
    supervisionEvaluation: { total: 0, indicators: [] },
  }

  // 导航操作
  const handleFolderClick = useCallback((folderId: string) => {
    setCurrentFolder(folderId)
    setSelectedFile(null)
    setSearchTerm("")
  }, [])

  const handleBackToFolders = useCallback(() => {
    setCurrentFolder(null)
    setSelectedFile(null)
    setSearchTerm("")
  }, [])

  const handleFileClick = useCallback((file: FileData) => {
    setSelectedFile(file)
  }, [])

  const handleBackToFiles = useCallback(() => {
    setSelectedFile(null)
  }, [])

  // 获取过滤后的文件夹
  const getFilteredFolders = useCallback(() => {
    if (!searchTerm.trim()) return courseResources
    const lowerSearchTerm = searchTerm.toLowerCase()
    return courseResources.filter((folder) => folder.name.toLowerCase().includes(lowerSearchTerm))
  }, [courseResources, searchTerm])

  // 获取当前文件夹数据
  const getCurrentFolderData = useCallback(() => {
    if (!currentFolder) return null
    const folder = courseResources.find((r) => r.id === currentFolder)
    let files = mockFiles[currentFolder] || []

    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      files = files.filter((file) => file.name.toLowerCase().includes(lowerSearchTerm))
    }

    return { folder, files }
  }, [currentFolder, courseResources, mockFiles, searchTerm])

  return {
    resourceData,
    setResourceData,
    isLoading,
    error,
    currentFolder,
    selectedFile,
    searchTerm,
    handleFolderClick,
    handleBackToFolders,
    handleFileClick,
    handleBackToFiles,
    setSearchTerm,
    getFilteredFolders,
    getCurrentFolderData,
    mockScoring,
  }
}

