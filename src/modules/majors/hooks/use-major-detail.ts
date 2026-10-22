/**
 * 专业详情 Hook
 *
 * 详情接口原先由「专业详情」标签页自己在挂载时调用，标签页未点开就不会有数据。
 * 现在提到专业详情页入口统一拉一次：页头标签与「专业详情」标签页共用同一份结果，
 * 进入专业后不会再重复请求该接口。
 */

import { useEffect, useRef, useState } from "react"
import { TreeApi } from "@/lib/api/tree-api"

export interface ProfessionPathItem {
  name: string
  code?: string
}

export interface ProfessionVO {
  id: string | number
  level?: string
  profession?: ProfessionPathItem[]
  direction?: {
    category1?: string
    category2?: string
    category3?: string
    category4?: string
  }
  task?: string
  tasks?: string
}

export interface RequirementIndicator {
  id: string | number
  description: string
}

export interface RequirementVO {
  id: string | number
  description: string
  children?: RequirementIndicator[]
}

export interface MajorDetailData {
  majorLevel?: string
  majorClass?: string
  feature?: string
  careerLevel?: string
  demandType?: string
  demandArea?: string
  professionsVOS?: ProfessionVO[]
  position?: string
  requiresVOS?: RequirementVO[]
}

export interface UseMajorDetailResult {
  detailData: MajorDetailData | null
  isLoading: boolean
}

// 专业层次字典映射
const majorLevelMap: { [key: string]: string } = {
  "2": "本科",
  "1": "高职",
  "0": "中职",
}

/**
 * 把后端的专业层次字典值翻成显示文本。
 * 字典未命中时原样返回该值，不静默吞成空。
 */
export function getMajorLevelText(level: string | undefined): string {
  if (typeof level !== "string" || level.trim() === "") {
    return "未设置"
  }

  const mapped = majorLevelMap[level]
  return typeof mapped === "string" ? mapped : level
}

// 创建单例 TreeApi 实例
const treeApiInstance = new TreeApi()

export function useMajorDetail(majorId: string | null | undefined): UseMajorDetailResult {
  const [detailData, setDetailData] = useState<MajorDetailData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const loadedMajorIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof majorId !== "string" || majorId === "") {
      return
    }

    // 同一个专业只拉一次
    if (loadedMajorIdRef.current === majorId) {
      return
    }

    loadedMajorIdRef.current = majorId
    let cancelled = false

    const loadMajorDetail = async () => {
      // 切换专业时先清空，避免页头标签在新数据回来前仍显示上一个专业的代码与层次
      setDetailData(null)
      setIsLoading(true)
      try {
        const response = await treeApiInstance.getMajorDetail(majorId)
        if (cancelled) {
          return
        }
        if (response.data) {
          setDetailData(response.data as MajorDetailData)
        }
      } catch (error) {
        console.error("加载专业详情失败:", error)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadMajorDetail()

    return () => {
      cancelled = true
    }
  }, [majorId])

  return { detailData, isLoading }
}
