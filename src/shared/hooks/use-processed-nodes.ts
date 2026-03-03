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

const STATIC_CARD_NODE_TYPES = new Set<FlowNodeType>([
  FlowNodeType.OBJECTIVE,
  FlowNodeType.COURSE_POINT,
  FlowNodeType.CHAPTER,
  FlowNodeType.KSA,
])

// 课点面板默认渲染条数上限（超出部分折叠）
const COURSE_POINT_PANEL_VISIBLE_LIMIT = 10
const COURSE_POINT_PANEL_COLUMNS = 5
const COURSE_POINT_CARD_WIDTH = 280
const COURSE_POINT_CARD_HEIGHT = 140
const COURSE_POINT_CARD_GAP_X = 10
const PANEL_TOP_PADDING = 75
const PANEL_LEFT_PADDING = 20
const PANEL_BOTTOM_PADDING = 10
const CARD_GAP_Y = 10
const PANEL_MIN_HEIGHT = 200
const COURSE_POINT_FOLD_BAR_HEIGHT = 34

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
  /** 课点面板展开状态 */
  expandedCoursePointPanelIds?: Set<string>
  /** 课点面板展开回调 */
  onCoursePointPanelExpand?: (panelId: string) => void
  /** 课点面板折叠回调 */
  onCoursePointPanelCollapse?: (panelId: string) => void
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
  expandedCoursePointPanelIds,
  onCoursePointPanelExpand,
  onCoursePointPanelCollapse,
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
  }, [flowNodes])

  const ksaPanelStatsMap = useMemo(() => {
    const map = new Map<string, { K: number; S: number; A: number }>()
    for (const node of flowNodes) {
      if (node.type !== FlowNodeType.KSA || !node.parentId || !node.data) {
        continue
      }
      const ksaData = node.data as unknown as KsaItemData
      const current = map.get(node.parentId) || { K: 0, S: 0, A: 0 }
      if (ksaData.category === "K") {
        current.K += 1
      } else if (ksaData.category === "S") {
        current.S += 1
      } else if (ksaData.category === "A") {
        current.A += 1
      }
      map.set(node.parentId, current)
    }
    return map
  }, [flowNodes])

  const coursePointMetaMap = useMemo(() => {
    const map: Record<string, { name?: string; description?: string }> = {}

    for (const node of flowNodes) {
      if (node.type !== FlowNodeType.COURSE_POINT || !node.data) {
        continue
      }

      const pointData = node.data as {
        id?: string
        name?: string
        description?: string
        content?: string
      }

      const pointId = typeof pointData.id === "string" && pointData.id.trim().length > 0
        ? pointData.id
        : node.id

      const pointName = typeof pointData.name === "string" ? pointData.name.trim() : ""
      const pointDescription = typeof pointData.description === "string"
        ? pointData.description.trim()
        : typeof pointData.content === "string"
          ? pointData.content.trim()
          : ""

      map[pointId] = {
        name: pointName || undefined,
        description: pointDescription || undefined,
      }
    }

    return map
  }, [flowNodes])

  const coursePointPanelFoldState = useMemo(() => {
    const panelItemsMap = new Map<string, Array<{ id: string; index: number }>>()
    for (const node of flowNodes) {
      if (node.type !== FlowNodeType.COURSE_POINT || !node.parentId) {
        continue
      }
      const pointData = node.data as { index?: number }
      const list = panelItemsMap.get(node.parentId) || []
      list.push({ id: node.id, index: pointData.index ?? Number.MAX_SAFE_INTEGER })
      panelItemsMap.set(node.parentId, list)
    }

    const visibleIds = new Set<string>()
    const collapsedVisiblePositions = new Map<string, { x: number; y: number }>()
    const panelMeta = new Map<string, {
      totalCount: number
      visibleCount: number
      hiddenCount: number
      isExpanded: boolean
      collapsedHeight: number
      hasOverflow: boolean
    }>()

    panelItemsMap.forEach((items, panelId) => {
      const sorted = [...items].sort((a, b) => a.index - b.index)
      const totalCount = sorted.length
      const isExpanded = expandedCoursePointPanelIds?.has(panelId) ?? false
      const visibleCount = isExpanded ? totalCount : Math.min(totalCount, COURSE_POINT_PANEL_VISIBLE_LIMIT)
      const hiddenCount = Math.max(0, totalCount - visibleCount)
      const hasOverflow = totalCount > COURSE_POINT_PANEL_VISIBLE_LIMIT
      sorted.slice(0, visibleCount).forEach((item, visibleIndex) => {
        visibleIds.add(item.id)
        // 折叠态下对可见课点重排为紧凑 5 列，避免保留原始稀疏坐标造成大间距
        if (!isExpanded) {
          const col = visibleIndex % COURSE_POINT_PANEL_COLUMNS
          const row = Math.floor(visibleIndex / COURSE_POINT_PANEL_COLUMNS)
          collapsedVisiblePositions.set(item.id, {
            x: PANEL_LEFT_PADDING + col * (COURSE_POINT_CARD_WIDTH + COURSE_POINT_CARD_GAP_X),
            y: PANEL_TOP_PADDING + row * (COURSE_POINT_CARD_HEIGHT + CARD_GAP_Y),
          })
        }
      })

      const collapsedVisibleCount = Math.min(totalCount, COURSE_POINT_PANEL_VISIBLE_LIMIT)
      const rows = Math.max(1, Math.ceil(collapsedVisibleCount / COURSE_POINT_PANEL_COLUMNS))
      const collapsedHeight = Math.max(
        PANEL_MIN_HEIGHT,
        PANEL_TOP_PADDING + rows * COURSE_POINT_CARD_HEIGHT + (rows - 1) * CARD_GAP_Y + PANEL_BOTTOM_PADDING + (hasOverflow ? COURSE_POINT_FOLD_BAR_HEIGHT : 0)
      )

      panelMeta.set(panelId, {
        totalCount,
        visibleCount,
        hiddenCount,
        isExpanded,
        collapsedHeight,
        hasOverflow,
      })
    })

    return {
      visibleIds,
      collapsedVisiblePositions,
      panelMeta,
    }
  }, [flowNodes, expandedCoursePointPanelIds])

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
      const nodeType = node.type as FlowNodeType
      if (node.type === FlowNodeType.COURSE_POINT && node.parentId) {
        const collapsedPosition = coursePointPanelFoldState.collapsedVisiblePositions.get(node.id)
        return {
          ...node,
          hidden: !coursePointPanelFoldState.visibleIds.has(node.id),
          ...(collapsedPosition ? { position: collapsedPosition } : {}),
        }
      }

      if (node.type === FlowNodeType.KSA) {
        return {
          ...node,
          hidden: true,
        }
      }

      if (STATIC_CARD_NODE_TYPES.has(nodeType)) {
        return node
      }

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
      const canvasComponentType = FLOW_TO_CANVAS_TYPE[nodeType]

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
            // 课程矩阵中 SSE 课点可能缺少 description，注入全量课点元数据供节点回填 Tooltip
            coursePointMetaMap,
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
          const foldMeta = coursePointPanelFoldState.panelMeta.get(node.id)
          panelData.onEdit = onCoursePointPanelEdit
          panelData.totalChildCount = foldMeta?.totalCount || childCount
          panelData.visibleChildCount = foldMeta?.visibleCount || childCount
          panelData.hiddenChildCount = foldMeta?.hiddenCount || 0
          panelData.isExpanded = foldMeta?.isExpanded || false
          panelData.onExpand = onCoursePointPanelExpand
          panelData.onCollapse = onCoursePointPanelCollapse
          // 课点面板填充进度信息（在生成过程中显示）
          panelData.progressMessage = isRegenerating ? fillProgress.coursePoints : null

          const mergedStyle = {
            ...node.style,
            ...(childDisabledStyle || {}),
          }
          if (foldMeta?.hasOverflow) {
            if (foldMeta.isExpanded) {
              const baseHeight = typeof node.style?.height === "number"
                ? node.style.height
                : foldMeta.collapsedHeight
              mergedStyle.height = baseHeight + COURSE_POINT_FOLD_BAR_HEIGHT
            } else {
              mergedStyle.height = foldMeta.collapsedHeight
            }
          }
          return {
            ...node,
            style: mergedStyle,
            data: panelData,
          }
        }
        if (node.type === FlowNodeType.KSA_PANEL) {
          panelData.onEdit = onKsaPanelEdit
          // KSA面板填充进度信息（在生成过程中显示）
          panelData.progressMessage = isRegenerating ? fillProgress.ksa : null
          panelData.ksaStats = ksaPanelStatsMap.get(node.id) || { K: 0, S: 0, A: 0 }
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
    onCoursePointPanelExpand,
    onCoursePointPanelCollapse,
    onKsaPanelEdit,
    onChapterPanelEdit,
    onObjectivePanelEdit,
    onGraduationSupportPanelEdit,
    onSourceDocumentPanelEdit,
    onSourceDocumentEdit,
    onSourceDocumentRefresh,
    ksaItemsMap,
    ksaPanelStatsMap,
    coursePointMetaMap,
    coursePointPanelFoldState,
  ])
}
