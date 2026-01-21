"use client"

import { useState, useCallback } from "react"
import type {
  CanvasElementData,
  ProjectMatrixData,
  ChapterCardData,
  CoursePointCardData,
  KsaItemData,
} from "@/components/canvas-elements/types"
import { CanvasComponentType } from "@/components/canvas-elements/types"

/**
 * 高亮类型枚举
 * - chapter: 章节卡片高亮（选中项目矩阵时触发）
 * - coursePoint: 课点卡片高亮（选中项目矩阵中的课点行时触发）
 * - ksa: KSA卡片高亮（选中项目矩阵中的KSA标签时触发）
 */
export type HighlightType = "chapter" | "coursePoint" | "ksa" | null

/**
 * 高亮状态接口
 */
export interface HighlightState {
  /** 当前高亮的节点ID集合 */
  highlightedIds: Set<string>
  /** 触发高亮的源节点ID */
  sourceId: string | null
  /** 高亮类型 */
  type: HighlightType
}

/**
 * useCanvasHighlight Hook 返回值接口
 */
export interface UseCanvasHighlightReturn {
  /** 高亮状态 */
  highlightState: HighlightState
  /** 高亮指定节点 */
  highlightNodes: (ids: string[], sourceId: string, type: HighlightType) => void
  /** 清除高亮 */
  clearHighlight: () => void
  /** 检查节点是否高亮 */
  isHighlighted: (nodeId: string) => boolean
  /** 根据项目矩阵选中触发高亮（高亮对应的章节卡片） */
  highlightByProjectMatrix: (matrixData: ProjectMatrixData, elements: CanvasElementData[]) => void
  /** 根据课点选中触发高亮（高亮对应的课点卡片） */
  highlightByCoursePoint: (coursePointId: string, elements: CanvasElementData[]) => void
  /** 根据KSA选中触发高亮（高亮对应的KSA卡片） */
  highlightByKsa: (ksaId: string, elements: CanvasElementData[]) => void
}

/**
 * 画布高亮联动系统 Hook
 * 实现选中元素时自动高亮关联元素的交互效果
 *
 * 高亮规则：
 * 1. 选中项目矩阵 → 高亮 B 中对应的章节卡片（通过 chapter_id 匹配）
 * 2. 选中项目矩阵中的课点行 → 高亮 C 中对应的课点卡片（通过 course_point_id 匹配）
 * 3. 选中项目矩阵中的KSA标签 → 高亮 D 中对应的KSA卡片（通过 ksa_id 匹配）
 */
export function useCanvasHighlight(): UseCanvasHighlightReturn {
  const [highlightState, setHighlightState] = useState<HighlightState>({
    highlightedIds: new Set(),
    sourceId: null,
    type: null,
  })

  /**
   * 高亮指定节点
   * @param ids 要高亮的节点ID数组
   * @param sourceId 触发高亮的源节点ID
   * @param type 高亮类型
   */
  const highlightNodes = useCallback((
    ids: string[],
    sourceId: string,
    type: HighlightType
  ) => {
    setHighlightState({
      highlightedIds: new Set(ids),
      sourceId,
      type,
    })
  }, [])

  /**
   * 清除所有高亮
   */
  const clearHighlight = useCallback(() => {
    setHighlightState({
      highlightedIds: new Set(),
      sourceId: null,
      type: null,
    })
  }, [])

  /**
   * 检查节点是否处于高亮状态
   * @param nodeId 节点ID
   * @returns 是否高亮
   */
  const isHighlighted = useCallback((nodeId: string) => {
    return highlightState.highlightedIds.has(nodeId)
  }, [highlightState.highlightedIds])

  /**
   * 选中项目矩阵时，高亮对应的章节卡片
   * 通过 chapter_id 匹配查找章节卡片
   * @param matrixData 项目矩阵数据
   * @param elements 画布所有元素
   */
  const highlightByProjectMatrix = useCallback((
    matrixData: ProjectMatrixData,
    elements: CanvasElementData[]
  ) => {
    const chapterId = matrixData.chapter_id
    if (!chapterId) {
      clearHighlight()
      return
    }

    // 查找对应的章节卡片
    const chapterCard = elements.find(el => {
      if (el.type !== CanvasComponentType.CHAPTER_CARD) return false
      const cardData = el.data as ChapterCardData
      return cardData.id === chapterId
    })

    if (chapterCard) {
      highlightNodes([chapterCard.id], chapterId, "chapter")
    } else {
      clearHighlight()
    }
  }, [highlightNodes, clearHighlight])

  /**
   * 选中课点时，高亮对应的课点卡片
   * 通过 course_point_id 匹配查找课点卡片
   * @param coursePointId 课点ID
   * @param elements 画布所有元素
   */
  const highlightByCoursePoint = useCallback((
    coursePointId: string,
    elements: CanvasElementData[]
  ) => {
    if (!coursePointId) {
      clearHighlight()
      return
    }

    // 查找对应的课点卡片
    const coursePointCard = elements.find(el => {
      if (el.type !== CanvasComponentType.COURSE_POINT_CARD) return false
      const cardData = el.data as CoursePointCardData
      return cardData.id === coursePointId
    })

    if (coursePointCard) {
      highlightNodes([coursePointCard.id], coursePointId, "coursePoint")
    } else {
      clearHighlight()
    }
  }, [highlightNodes, clearHighlight])

  /**
   * 选中KSA时，高亮对应的KSA卡片
   * 通过 ksa_id 匹配查找KSA卡片
   * @param ksaId KSA ID
   * @param elements 画布所有元素
   */
  const highlightByKsa = useCallback((
    ksaId: string,
    elements: CanvasElementData[]
  ) => {
    if (!ksaId) {
      clearHighlight()
      return
    }

    // 查找对应的KSA卡片
    const ksaCard = elements.find(el => {
      if (el.type !== CanvasComponentType.KSA_ITEM) return false
      const cardData = el.data as KsaItemData
      return cardData.id === ksaId
    })

    if (ksaCard) {
      highlightNodes([ksaCard.id], ksaId, "ksa")
    } else {
      clearHighlight()
    }
  }, [highlightNodes, clearHighlight])

  return {
    highlightState,
    highlightNodes,
    clearHighlight,
    isHighlighted,
    highlightByProjectMatrix,
    highlightByCoursePoint,
    highlightByKsa,
  }
}
