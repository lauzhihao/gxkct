/**
 * 项目矩阵数据管理Hook
 * 负责加载和管理项目矩阵数据、KSA列表数据
 */

import { useState, useEffect, useRef } from "react"
import type { TreeNode } from "@/types"
import { projectMatrixApi } from "@/modules/courses/api/projectMatrixApi"

export interface ProjectMatrixData {
  projectChapters?: Array<{
    id: string
    name: string
    coursePoints?: Array<{
      id: string
      content: string
    }>
  }>
  projectGoals?: Array<{
    id: string
    content: string
  }>
}

export interface KsaItem {
  id: number
  title: "K" | "S" | "A"
  description: string
  level: number
}

export interface UseProjectMatrixResult {
  // 数据状态
  projectMatrixData: ProjectMatrixData | null
  chapterTaskObjectives: Record<string, any[]>
  ksaData: Record<string, Record<string, "strong" | "weak">>
  ksaListData: KsaItem[]

  // 加载状态
  isLoadingProjectMatrix: boolean
  isLoadingKsaList: boolean

  // 编辑状态
  isEditingProjectMatrix: boolean
  isSavingProjectMatrix: boolean

  // 数据更新方法
  setProjectMatrixData: (data: ProjectMatrixData | null) => void
  setChapterTaskObjectives: (data: Record<string, any[]>) => void
  setKsaData: (data: Record<string, Record<string, "strong" | "weak">>) => void
  setKsaListData: (data: KsaItem[]) => void

  // 编辑状态更新
  setIsEditingProjectMatrix: (value: boolean) => void
  setIsSavingProjectMatrix: (value: boolean) => void

  // 数据操作方法
  loadProjectMatrixData: () => Promise<void>
  updateKsaSupport: (chapterId: string, coursePointId: string, taskId: string, ksaId: number, support: "strong" | "weak" | null) => void
}

export function useProjectMatrix(node: TreeNode): UseProjectMatrixResult {
  const [projectMatrixData, setProjectMatrixData] = useState<ProjectMatrixData | null>(null)
  const [chapterTaskObjectives, setChapterTaskObjectives] = useState<Record<string, any[]>>({})
  const [ksaData, setKsaData] = useState<Record<string, Record<string, "strong" | "weak">>>({})
  const [ksaListData, setKsaListData] = useState<KsaItem[]>([])

  const [isLoadingProjectMatrix, setIsLoadingProjectMatrix] = useState(false)
  const [isLoadingKsaList, setIsLoadingKsaList] = useState(true)
  const [isEditingProjectMatrix, setIsEditingProjectMatrix] = useState(false)
  const [isSavingProjectMatrix, setIsSavingProjectMatrix] = useState(false)

  // 防止在StrictMode下重复调用API
  const hasLoadedRef = useRef(false)
  const prevNodeIdRef = useRef<string | null>(null)

  // 加载数据
  useEffect(() => {
    // 当node改变时，重置ref
    if (prevNodeIdRef.current !== node.id) {
      hasLoadedRef.current = false
      prevNodeIdRef.current = node.id
    }

    // 防止在StrictMode下重复调用
    if (hasLoadedRef.current) {
      return
    }
    hasLoadedRef.current = true

    loadProjectMatrixData()
  }, [node.id])

  // 加载项目矩阵数据和KSA列表
  const loadProjectMatrixData = async () => {
    try {
      setIsLoadingProjectMatrix(true)

      // 直接使用 node.id 作为 courseId
      const courseIdValue = node.id

      if (!courseIdValue) {
        console.warn("[useProjectMatrix] 缺少courseId")
        return
      }

      // majorId 暂不可用，KSA列表相关功能可能需要后续调整
      const majorIdValue: string | undefined = undefined

      // 获取项目矩阵数据（包含项目章节列表）
      const projectMatrixResponse = await projectMatrixApi.getProjectMatrixData(String(courseIdValue))
      if (projectMatrixResponse.error) {
        console.error("[useProjectMatrix] 获取项目矩阵数据失败:", projectMatrixResponse.error)
      } else if (projectMatrixResponse.data) {
        console.log("[useProjectMatrix] 项目矩阵数据加载成功:", projectMatrixResponse.data)
        setProjectMatrixData(projectMatrixResponse.data)
      }

      // 获取KSA列表数据
      if (majorIdValue && courseIdValue) {
        try {
          const ksaListResponse = await projectMatrixApi.getKsaList(String(majorIdValue), String(courseIdValue))
          console.log("[useProjectMatrix] KSA列表响应:", ksaListResponse)
          if (ksaListResponse.error) {
            console.error("[useProjectMatrix] 获取KSA列表失败:", ksaListResponse.error)
            // 如果API调用失败，使用模拟数据
            console.log("[useProjectMatrix] 使用模拟数据")
            const mockKsaData: KsaItem[] = [
              { id: 1, title: "K", description: "知识点1", level: 1 },
              { id: 2, title: "K", description: "知识点2", level: 2 },
              { id: 3, title: "S", description: "技能点1", level: 1 },
              { id: 4, title: "S", description: "技能点2", level: 2 },
              { id: 5, title: "A", description: "态度点1", level: 1 },
              { id: 6, title: "A", description: "态度点2", level: 2 },
            ]
            setKsaListData(mockKsaData)
          } else if (ksaListResponse.data) {
            console.log("[useProjectMatrix] KSA列表加载成功:", ksaListResponse.data)
            const ksaArray = Array.isArray(ksaListResponse.data) ? ksaListResponse.data : []
            setKsaListData(ksaArray)
          }
        } catch (error) {
          console.error("[useProjectMatrix] 获取KSA列表异常:", error)
        } finally {
          setIsLoadingKsaList(false)
        }
      } else {
        setIsLoadingKsaList(false)
      }
    } catch (error) {
      console.error("[useProjectMatrix] 加载数据异常:", error)
    } finally {
      setIsLoadingProjectMatrix(false)
    }
  }

  // 更新KSA支撑关系
  const updateKsaSupport = (
    chapterId: string,
    coursePointId: string,
    taskId: string,
    ksaId: number,
    support: "strong" | "weak" | null
  ) => {
    setKsaData((prev) => {
      const newData = { ...prev }
      const cellKey = `${chapterId}-${coursePointId}-${taskId}`

      if (!newData[cellKey]) {
        newData[cellKey] = {}
      }

      if (support === null) {
        // 移除支撑关系
        delete newData[cellKey][String(ksaId)]
        // 如果该单元格没有任何支撑关系，删除整个单元格
        if (Object.keys(newData[cellKey]).length === 0) {
          delete newData[cellKey]
        }
      } else {
        // 添加或更新支撑关系
        newData[cellKey][String(ksaId)] = support
      }

      return newData
    })
  }

  return {
    projectMatrixData,
    chapterTaskObjectives,
    ksaData,
    ksaListData,
    isLoadingProjectMatrix,
    isLoadingKsaList,
    isEditingProjectMatrix,
    isSavingProjectMatrix,
    setProjectMatrixData,
    setChapterTaskObjectives,
    setKsaData,
    setKsaListData,
    setIsEditingProjectMatrix,
    setIsSavingProjectMatrix,
    loadProjectMatrixData,
    updateKsaSupport,
  }
}
