"use client"

import { useMemo } from "react"
import type { Node } from "@xyflow/react"

import { FlowNodeType } from "@/components/flow/utils/types"
import { CanvasComponentType, type KsaItemData } from "@/components/canvas-elements/types"
import type { HighlightState } from "./use-canvas-highlight"
import type { FillProgress } from "@/types/ai-assistant"

/**
 * FlowNodeType 到 CanvasComponentType 的映射（用于重做功能）
 */
const FLOW_TO_CANVAS_TYPE: Partial<Record<FlowNodeType, CanvasComponentType>> = {
  [FlowNodeType.COURSE_INFO]: CanvasComponentType.COURSE_INFO,
  [FlowNodeType.OBJECTIVE_PANEL]: CanvasComponentType.OBJECTIVE_PANEL,
  [FlowNodeType.COURSE_POINT_PANEL]: CanvasComponentType.COURSE_POINT_PANEL,
  [FlowNodeType.CHAPTER_PANEL]: CanvasComponentType.CHAPTER_PANEL,
  [FlowNodeType.KSA_PANEL]: CanvasComponentType.KSA_PANEL,
  [FlowNodeType.GRADUATION_SUPPORT_PANEL]: CanvasComponentType.GRADUATION_SUPPORT,
  [FlowNodeType.COURSE_MATRIX]: CanvasComponentType.COURSE_MATRIX,
  [FlowNodeType.PROJECT_MATRIX]: CanvasComponentType.PROJECT_MATRIX,
  [FlowNodeType.COURSE_REPORT]: CanvasComponentType.COURSE_REPORT,
  [FlowNodeType.SOURCE_DOCUMENT_PANEL]: CanvasComponentType.SOURCE_DOCUMENT_PANEL,
}

/**
 * Panel 节点类型列表
 */
const PANEL_NODE_TYPES = [
  FlowNodeType.OBJECTIVE_PANEL,
  FlowNodeType.COURSE_POINT_PANEL,
  FlowNodeType.CHAPTER_PANEL,
  FlowNodeType.KSA_PANEL,
  FlowNodeType.GRADUATION_SUPPORT_PANEL,
  FlowNodeType.SOURCE_DOCUMENT_PANEL,
]

/**
 * useProcessedNodes hook 参数
 */
export interface UseProcessedNodesOptions {
  /** 画布节点列表 */
  flowNodes: Node[]
  /** 高亮状态 */
  highlightState: HighlightState
  /** 正在删除的节点ID集合 */
  deletingNodeIds: Set<string>
  /** 正在更新的面板ID集合 */
  updatingPanelIds: Set<string>
  /** 是否正在重做 */
  isRegenerating: boolean
  /** 填充进度信息（合并课程矩阵、项目矩阵、课点、KSA 四种进度） */
  fillProgress?: FillProgress
  /** 节点删除回调 */
  onNodeDelete: (nodeId: string) => void
  /** 节点重做回调 */
  onNodeRegenerate?: (nodeId: string, nodeType: CanvasComponentType, nodeName: string) => void
  /** 课点行点击回调 */
  onCoursePointRowClick: (coursePointId: string) => void
  /** 课程信息编辑回调 */
  onCourseInfoEdit: (nodeId: string) => void
  /** 课程矩阵编辑回调 */
  onCourseMatrixEdit: (nodeId: string) => void
  /** 项目矩阵编辑回调 */
  onProjectMatrixEdit: (nodeId: string) => void
  /** 开课报告编辑回调 */
  onCourseReportEdit: (nodeId: string) => void
  /** Panel 添加回调 */
  onPanelAdd: (panelType: string, panelId: string) => void
  /** 课点面板编辑回调 */
  onCoursePointPanelEdit: (panelId: string) => void
  /** KSA面板编辑回调 */
  onKsaPanelEdit: (panelId: string) => void
  /** 章节面板编辑回调 */
  onChapterPanelEdit: (panelId: string) => void
  /** 教学目标面板编辑回调 */
  onObjectivePanelEdit: (panelId: string) => void
  /** 专业矩阵面板编辑回调 */
  onGraduationSupportPanelEdit?: (panelId: string) => void
  /** 源文档面板编辑回调 */
  onSourceDocumentPanelEdit?: (panelId: string) => void
  /** 源文档卡片编辑回调 */
  onSourceDocumentEdit?: (nodeId: string) => void
  /** 源文档卡片重做回调 */
  onSourceDocumentRefresh?: (nodeId: string) => void
}

/**
 * 获取节点显示名称（用于重做时显示用户消息）
 */
function getNodeDisplayName(node: Node): string {
  const nodeData = node.data as Record<string, unknown>
  switch (node.type) {
    case FlowNodeType.COURSE_INFO:
      return (nodeData.name as string) || "课程信息"
    case FlowNodeType.OBJECTIVE_PANEL:
      return "教学目标"
    case FlowNodeType.COURSE_POINT_PANEL:
      return "课点信息"
    case FlowNodeType.CHAPTER_PANEL:
      return "章节项目"
    case FlowNodeType.KSA_PANEL:
      return "KSA"
    case FlowNodeType.GRADUATION_SUPPORT_PANEL:
      return "专业矩阵"
    case FlowNodeType.COURSE_MATRIX:
      return "课程矩阵"
    case FlowNodeType.PROJECT_MATRIX:
      return `${(nodeData.chapter_name as string) || ""}项目矩阵`
    case FlowNodeType.COURSE_REPORT:
      return "开课报告"
    case FlowNodeType.SOURCE_DOCUMENT_PANEL:
      return "源文档"
    case FlowNodeType.SOURCE_DOCUMENT:
      return (nodeData.filename as string) || "文件"
    default:
      return "组件"
  }
}

/**
 * 处理画布节点，注入高亮状态和回调函数
 * 将原始节点数据转换为带有交互功能的节点
 */
export function useProcessedNodes({
  flowNodes,
  highlightState,
  deletingNodeIds,
  updatingPanelIds,
  isRegenerating,
  fillProgress = {},
  onNodeDelete,
  onNodeRegenerate,
  onCoursePointRowClick,
  onCourseInfoEdit,
  onCourseMatrixEdit,
  onProjectMatrixEdit,
  onCourseReportEdit,
  onPanelAdd,
  onCoursePointPanelEdit,
  onKsaPanelEdit,
  onChapterPanelEdit,
  onObjectivePanelEdit,
  onGraduationSupportPanelEdit,
  onSourceDocumentPanelEdit,
  onSourceDocumentEdit,
  onSourceDocumentRefresh,
}: UseProcessedNodesOptions): Node[] {
  // 单独计算 KSA 映射，只在 KSA 数据变化时更新（避免 flowNodes 其他变化触发重建）
  const ksaItemsMap = useMemo(() => {
    const map = new Map<string, KsaItemData>()
    for (const node of flowNodes) {
      if (node.type === FlowNodeType.KSA && node.data) {
        const ksaData = node.data as unknown as KsaItemData
        map.set(ksaData.id, ksaData)
      }
    }
    return map
  }, [
    // 只依赖 KSA 节点的数量和数据签名，而不是整个 flowNodes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    flowNodes.filter(n => n.type === FlowNodeType.KSA).map(n => `${(n.data as KsaItemData).id}_${(n.data as KsaItemData).category}${(n.data as KsaItemData).index}`).join(',')
  ])

  return useMemo(() => {
    // 预先计算每个 Panel 的子节点数量
    const panelChildCounts = new Map<string, number>()
    for (const node of flowNodes) {
      if (node.parentId) {
        const currentCount = panelChildCounts.get(node.parentId) || 0
        panelChildCounts.set(node.parentId, currentCount + 1)
      }
    }

    const result = flowNodes.map((node) => {
      const isHighlighted = highlightState.highlightedIds.has(node.id)
      const isNodeDeleting = deletingNodeIds.has(node.id)
      const isUpdating = updatingPanelIds.has(node.id)
      // 判断是否为子节点（有 parentId 表示是 Panel 内的子卡片）
      const isChildNode = !!node.parentId

      // 计算是否显示 loading 遮罩
      // [MOD] 子节点不显示全局重做 loading，由父 Panel 的遮罩提供视觉反馈
      const showLoading = isChildNode
        ? (isNodeDeleting || isUpdating)
        : (isNodeDeleting || isUpdating || isRegenerating)

      // [MOD] 当父 Panel loading 时，禁用子节点的交互（pointer-events: none）
      // 这样不需要给子节点渲染 loading 效果，避免 CPU 开销
      const isParentPanelLoading = isChildNode && node.parentId &&
        (updatingPanelIds.has(node.parentId) || deletingNodeIds.has(node.parentId) || isRegenerating)
      // 子节点在父 Panel loading 时禁用交互
      const childDisabledStyle = isParentPanelLoading
        ? { pointerEvents: 'none' as const, opacity: 0.6 }
        : undefined

      // 获取节点对应的画布组件类型（用于重做功能）
      const canvasComponentType = FLOW_TO_CANVAS_TYPE[node.type as FlowNodeType]

      // [MOD] 分离删除状态和加载状态，修复更新时 Handle 消失导致连线丢失的问题
      const baseInjection = {
        highlighted: isHighlighted,
        isDeleting: isNodeDeleting,  // 仅真正删除时为 true，用于隐藏 Handle
        isLoading: showLoading,      // 显示遮罩（包含删除、更新、重做）
        onDelete: onNodeDelete,
        // 只有支持重做的节点类型才注入 onRefresh
        onRefresh: canvasComponentType && onNodeRegenerate
          ? (nodeId: string) => onNodeRegenerate(nodeId, canvasComponentType, getNodeDisplayName(node))
          : undefined,
        isRefreshing: isRegenerating,
      }

      // 根据节点类型注入不同的属性
      if (node.type === FlowNodeType.PROJECT_MATRIX) {
        return {
          ...node,
          ...(childDisabledStyle && { style: { ...node.style, ...childDisabledStyle } }),
          data: {
            ...node.data,
            ...baseInjection,
            onCoursePointClick: onCoursePointRowClick,
            onEdit: onProjectMatrixEdit,
            // 填充进度信息（仅在重做状态下显示）
            progressMessage: isRegenerating ? fillProgress.projectMatrix : null,
            // 注入 KSA 卡片数据映射，用于通过 id 匹配获取完整 KSA 信息
            ksaItemsMap,
          },
        }
      }

      // 课程信息节点注入 onEdit 回调
      if (node.type === FlowNodeType.COURSE_INFO) {
        return {
          ...node,
          ...(childDisabledStyle && { style: { ...node.style, ...childDisabledStyle } }),
          data: {
            ...node.data,
            ...baseInjection,
            onEdit: onCourseInfoEdit,
          },
        }
      }

      // 课程矩阵节点注入 onEdit 回调和进度信息
      if (node.type === FlowNodeType.COURSE_MATRIX) {
        return {
          ...node,
          ...(childDisabledStyle && { style: { ...node.style, ...childDisabledStyle } }),
          data: {
            ...node.data,
            ...baseInjection,
            onEdit: onCourseMatrixEdit,
            // 填充进度信息（仅在重做状态下显示）
            progressMessage: isRegenerating ? fillProgress.matrix : null,
          },
        }
      }

      // 开课报告节点注入 onEdit 回调
      if (node.type === FlowNodeType.COURSE_REPORT) {
        return {
          ...node,
          ...(childDisabledStyle && { style: { ...node.style, ...childDisabledStyle } }),
          data: {
            ...node.data,
            ...baseInjection,
            onEdit: onCourseReportEdit,
          },
        }
      }

      // Panel 节点注入 childCount 和 onAdd 回调
      if (PANEL_NODE_TYPES.includes(node.type as FlowNodeType)) {
        const childCount = panelChildCounts.get(node.id) || 0
        // 各面板节点额外注入对应的 onEdit 回调
        const panelData: Record<string, unknown> = {
          ...node.data,
          ...baseInjection,
          childCount,
          onAdd: () => onPanelAdd(node.type || "", node.id),
        }
        if (node.type === FlowNodeType.COURSE_POINT_PANEL) {
          panelData.onEdit = onCoursePointPanelEdit
          // 课点面板填充进度信息（在生成过程中显示）
          panelData.progressMessage = isRegenerating ? fillProgress.coursePoints : null
        }
        if (node.type === FlowNodeType.KSA_PANEL) {
          panelData.onEdit = onKsaPanelEdit
          // KSA面板填充进度信息（在生成过程中显示）
          panelData.progressMessage = isRegenerating ? fillProgress.ksa : null
        }
        if (node.type === FlowNodeType.CHAPTER_PANEL) {
          panelData.onEdit = onChapterPanelEdit
        }
        if (node.type === FlowNodeType.OBJECTIVE_PANEL) {
          panelData.onEdit = onObjectivePanelEdit
        }
        if (node.type === FlowNodeType.GRADUATION_SUPPORT_PANEL) {
          panelData.onEdit = onGraduationSupportPanelEdit
        }
        if (node.type === FlowNodeType.SOURCE_DOCUMENT_PANEL) {
          panelData.onEdit = onSourceDocumentPanelEdit
        }
        return {
          ...node,
          ...(childDisabledStyle && { style: { ...node.style, ...childDisabledStyle } }),
          data: panelData,
        }
      }

      // 源文档卡片节点注入 onEdit 和 onRefresh 回调
      if (node.type === FlowNodeType.SOURCE_DOCUMENT) {
        return {
          ...node,
          ...(childDisabledStyle && { style: { ...node.style, ...childDisabledStyle } }),
          data: {
            ...node.data,
            ...baseInjection,
            onEdit: onSourceDocumentEdit,
            onRefresh: onSourceDocumentRefresh,
          },
        }
      }

      // 其他节点注入 highlighted 和 onDelete
      return {
        ...node,
        ...(childDisabledStyle && { style: { ...node.style, ...childDisabledStyle } }),
        data: {
          ...node.data,
          ...baseInjection,
        },
      }
    })
    return result
  }, [
    flowNodes,
    highlightState.highlightedIds,
    deletingNodeIds,
    updatingPanelIds,
    isRegenerating,
    fillProgress,
    onNodeDelete,
    onNodeRegenerate,
    onCoursePointRowClick,
    onCourseInfoEdit,
    onCourseMatrixEdit,
    onProjectMatrixEdit,
    onCourseReportEdit,
    onPanelAdd,
    onCoursePointPanelEdit,
    onKsaPanelEdit,
    onChapterPanelEdit,
    onObjectivePanelEdit,
    onGraduationSupportPanelEdit,
    onSourceDocumentPanelEdit,
    onSourceDocumentEdit,
    onSourceDocumentRefresh,
    ksaItemsMap,
  ])
}
