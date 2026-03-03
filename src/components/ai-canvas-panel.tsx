"use client"

import { useCallback, useMemo, useState, useEffect, useRef } from "react"
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useUpdateNodeInternals,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type NodeMouseHandler,
  type OnConnectEnd,
  type OnSelectionChangeParams,
  BackgroundVariant,
  ConnectionMode,
  ReactFlowProvider,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import "./flow/canvas.css"
import { FlowNodeType, FlowEdgeType } from "./flow/utils/types"
import { CustomZoomControls } from "./flow/controls/custom-zoom-controls"
import type { CanvasLayoutMode } from "./flow/utils/canvas-layout"
import { CanvasLayoutProvider } from "./flow/utils/canvas-layout-context"
import type { HighlightState } from "@/shared/hooks/use-canvas-highlight"
import { useCanvasDrawers } from "@/shared/hooks/use-canvas-drawers"
import { useProcessedNodes } from "@/shared/hooks/use-processed-nodes"
import { CanvasDrawers } from "./canvas-drawers"
import { CanvasConnectionMenu, type ConnectionMenuOption, type ConnectionMenuState } from "./canvas-drawers/canvas-connection-menu"
import type { CanvasElementData, ProjectMatrixData, ChapterCardData, CoursePointCardData, KsaItemData, CourseMatrixData, ObjectiveCardData, SourceDocumentCardData } from "./canvas-elements/types"
import type { TreeNode } from "@/types"
import type { FillProgress } from "@/types/ai-assistant"
import { CanvasComponentType } from "./canvas-elements/types"
import type { CanvasComponentData } from "./canvas-elements/types"
import { CourseInfoNode } from "./flow/nodes/course-info-node"
import { ObjectiveNode } from "./flow/nodes/objective-node"
import { CoursePointNode } from "./flow/nodes/course-point-node"
import { ChapterNode } from "./flow/nodes/chapter-node"
import { KsaNode } from "./flow/nodes/ksa-node"
import { CourseMatrixNode } from "./flow/nodes/course-matrix-node"
import { ProjectMatrixNode } from "./flow/nodes/project-matrix-node"
import { CourseReportNode } from "./flow/nodes/course-report-node"
// Panel 节点
import { ObjectivePanelNode } from "./flow/nodes/objective-panel-node"
import { CoursePointPanelNode } from "./flow/nodes/course-point-panel-node"
import { ChapterPanelNode } from "./flow/nodes/chapter-panel-node"
import { KsaPanelNode } from "./flow/nodes/ksa-panel-node"
import { GraduationSupportPanelNode } from "./flow/nodes/graduation-support-panel-node"
import { SourceDocumentPanelNode } from "./flow/nodes/source-document-panel-node"
import { SourceDocumentNode } from "./flow/nodes/source-document-node"
import { SupportEdge } from "./flow/edges/support-edge"
import { RainbowConnectionLine } from "./flow/edges/rainbow-connection-line"

// 模块级常量：避免每次渲染创建新引用导致 useMemo 失效
const EMPTY_FILL_PROGRESS: FillProgress = {}
const EMPTY_CANVAS_ELEMENTS: CanvasElementData[] = []

/**
 * 计算节点的绝对位置
 * 对于子节点（带 parentId），其 position 是相对于父节点的相对坐标
 * 需要递归累加所有祖先节点的位置才能得到画布绝对坐标
 * @param node 目标节点
 * @param nodeMap 节点ID到节点的Map（O(1)查找）
 * @returns 节点在画布中的绝对位置
 */
function getAbsolutePosition(node: Node, nodeMap: Map<string, Node>): { x: number; y: number } {
  let absoluteX = node.position.x
  let absoluteY = node.position.y

  // 如果有父节点，需要递归累加父节点位置（使用 Map O(1) 查找）
  let currentParentId = node.parentId
  while (currentParentId) {
    const parentNode = nodeMap.get(currentParentId)
    if (parentNode) {
      absoluteX += parentNode.position.x
      absoluteY += parentNode.position.y
      currentParentId = parentNode.parentId
    } else {
      break
    }
  }

  return { x: absoluteX, y: absoluteY }
}

/**
 * 自定义节点类型注册
 */
const nodeTypes: Record<string, any> = {
  [FlowNodeType.COURSE_INFO]: CourseInfoNode,
  [FlowNodeType.OBJECTIVE]: ObjectiveNode,
  [FlowNodeType.COURSE_POINT]: CoursePointNode,
  [FlowNodeType.CHAPTER]: ChapterNode,
  [FlowNodeType.KSA]: KsaNode,
  [FlowNodeType.COURSE_MATRIX]: CourseMatrixNode,
  [FlowNodeType.PROJECT_MATRIX]: ProjectMatrixNode,
  [FlowNodeType.COURSE_REPORT]: CourseReportNode,
  // Panel 节点
  [FlowNodeType.OBJECTIVE_PANEL]: ObjectivePanelNode,
  [FlowNodeType.COURSE_POINT_PANEL]: CoursePointPanelNode,
  [FlowNodeType.CHAPTER_PANEL]: ChapterPanelNode,
  [FlowNodeType.KSA_PANEL]: KsaPanelNode,
  [FlowNodeType.GRADUATION_SUPPORT_PANEL]: GraduationSupportPanelNode,
  [FlowNodeType.SOURCE_DOCUMENT_PANEL]: SourceDocumentPanelNode,
  [FlowNodeType.SOURCE_DOCUMENT]: SourceDocumentNode,
}

/**
 * 自定义边类型注册
 */
const edgeTypes: Record<string, any> = {
  [FlowEdgeType.SUPPORT]: SupportEdge,
}

export interface AiCanvasPanelProps {
  className?: string
  // 节点数据（React Flow 格式）
  nodes?: Node[]
  // 边数据（React Flow 格式）
  edges?: Edge[]
  // 节点变化回调
  onNodesChange?: (changes: Parameters<typeof useNodesState>[0]) => void
  // 边变化回调
  onEdgesChange?: (changes: Parameters<typeof useEdgesState>[0]) => void
  // 节点点击回调
  onNodeClick?: (nodeId: string, nodeData: unknown) => void
  // 节点删除回调
  onNodeDelete?: (nodeId: string) => void
  // 边删除回调
  onEdgeDelete?: (edgeId: string) => void
  // 连接创建回调
  onConnect?: (connection: Connection) => void
  // 连接菜单选择回调（包含画布坐标位置）
  onConnectionMenuSelect?: (option: ConnectionMenuOption, sourceNodeId: string | null, position?: { x: number; y: number }) => void
  // 节点数据更新回调
  onNodeDataUpdate?: (nodeId: string, data: CanvasComponentData) => void
  // 节点位置更新回调（拖动结束时触发）
  onNodePositionChange?: (nodeId: string, position: { x: number; y: number }) => void
  // 节点选中状态变化回调
  onSelectionChange?: (selectedNodeIds: string[]) => void
  // Panel 空状态添加按钮点击回调
  onPanelAdd?: (panelType: string, panelId: string) => void
  // 课点更新回调（保存课点编辑时触发）
  onCoursePointsUpdate?: (panelId: string, coursePoints: CoursePointCardData[]) => void
  // KSA更新回调（保存KSA编辑时触发）
  onKsaItemsUpdate?: (panelId: string, ksaItems: KsaItemData[]) => void
  // 章节更新回调（保存章节编辑时触发）
  onChaptersUpdate?: (panelId: string, chapters: ChapterCardData[]) => void
  // 教学目标更新回调（保存教学目标编辑时触发）
  onObjectivesUpdate?: (panelId: string, objectives: ObjectiveCardData[]) => void
  // 课程矩阵更新回调（保存课程矩阵编辑时触发）
  onCourseMatrixUpdate?: (nodeId: string, matrixData: CourseMatrixData) => void
  // 项目矩阵更新回调（保存项目矩阵编辑时触发）
  onProjectMatrixUpdate?: (nodeId: string, matrixData: ProjectMatrixData) => void
  // 源文档更新回调（保存源文档编辑时触发）
  onSourceDocumentUpdate?: (document: SourceDocumentCardData) => void
  // 源文档重做回调（重新解析原文件时触发）
  onSourceDocumentRegenerate?: (document: SourceDocumentCardData) => void
  // 专业矩阵更新回调（保存毕业要求支撑编辑时触发）
  onGraduationSupportUpdate?: (panelId: string, data: import("./canvas-elements/types").GraduationSupportData) => void
  // 是否显示小地图
  showMiniMap?: boolean
  // 是否显示控制栏
  showControls?: boolean
  // 节点重做回调（点击重做按钮时触发）
  onNodeRegenerate?: (nodeId: string, nodeType: CanvasComponentType, nodeName: string) => void
  // 是否正在重做（用于禁用所有重做按钮，同时画布进入全局loading状态）
  isRegenerating?: boolean
  // 填充进度信息（合并课程矩阵、项目矩阵、课点、KSA 四种进度）
  fillProgress?: FillProgress
  // 画布元素数据（用于保存向导）
  canvasElements?: CanvasElementData[]
  // 画布内容的OSS Key
  canvasOssKey?: string | null
  // 树形结构数据（用于保存向导选择专业）
  treeData?: TreeNode | null
  // 保存成功回调
  onSaveSuccess?: (majorId: string, courseId: string) => void
  // 更新课程信息回调（用于保存后更新画布中的 courseId）
  onUpdateCourseInfo?: (updates: { courseId?: number; majorId?: number }) => void
  // 是否正在上传画布数据到OSS
  isUploading?: boolean
  // 布局模式
  layoutMode?: CanvasLayoutMode
  // 布局模式切换回调
  onLayoutModeChange?: (mode: CanvasLayoutMode) => void
  // 是否禁用自动聚焦（新增节点或选中变化时）
  disableAutoFocus?: boolean
  // 是否禁用新增节点自动选中
  disableAutoSelectNewNodes?: boolean
  // 画布是否处于增量构建阶段
  isBuilding?: boolean
  // 构建进度
  buildingProgress?: { loaded: number; total: number; stage: string; etaSeconds?: number | null } | null
  // 锁定专业矩阵抽屉中的组织选择（学校/院系/专业）
  lockGraduationSupportOrganization?: boolean
}

/**
 * AI助手画布面板组件
 * 基于 React Flow 实现的课程体系结构可视化画布
 */
function AiCanvasPanelInner({
  className,
  nodes = [],
  edges = [],
  onNodeClick,
  onNodeDelete,
  onEdgeDelete,
  onConnect,
  onConnectionMenuSelect,
  onNodeDataUpdate,
  onNodePositionChange,
  onSelectionChange,
  onPanelAdd,
  onCoursePointsUpdate,
  onKsaItemsUpdate,
  onChaptersUpdate,
  onObjectivesUpdate,
  onCourseMatrixUpdate,
  onProjectMatrixUpdate,
  onSourceDocumentUpdate,
  onSourceDocumentRegenerate,
  onGraduationSupportUpdate,
  showMiniMap = true,
  showControls = true,
  onNodeRegenerate,
  isRegenerating = false,
  fillProgress = EMPTY_FILL_PROGRESS,
  canvasElements = EMPTY_CANVAS_ELEMENTS,
  canvasOssKey = null,
  treeData = null,
  onSaveSuccess,
  onUpdateCourseInfo,
  isUploading = false,
  layoutMode = "horizontal",
  onLayoutModeChange,
  disableAutoFocus = false,
  disableAutoSelectNewNodes = false,
  isBuilding = false,
  buildingProgress = null,
  lockGraduationSupportOrganization = false,
}: AiCanvasPanelProps) {
  const stageLabelMap: Record<string, string> = {
    "base-ready": "骨架已就绪",
    "panel-cards": "课点/KSA 明细加载中",
    "project-matrix": "项目矩阵加载中",
  }
  // 使用 React Flow 的状态管理
  const [flowNodes, setNodes, onNodesChange] = useNodesState(nodes)
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges)

  // 使用 ref 存储 onSelectionChange 回调，避免将其放入 useEffect 依赖数组导致无限循环
  // 问题：内联函数 onSelectionChange 每次渲染都会创建新引用，如果放入依赖数组会导致 effect 不断执行
  const onSelectionChangeRef = useRef(onSelectionChange)
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange
  }, [onSelectionChange])

  // 获取 React Flow 实例方法（用于视角控制和坐标转换）
  const { setCenter, getZoom, screenToFlowPosition, fitView } = useReactFlow()
  const updateNodeInternals = useUpdateNodeInternals()
  const [isLayoutSwitching, setIsLayoutSwitching] = useState(false)
  const [flowRenderKey, setFlowRenderKey] = useState(0)
  const prevLayoutModeRef = useRef<CanvasLayoutMode>(layoutMode)
  const flowNodesRef = useRef<Node[]>(flowNodes)

  // 连接菜单状态
  const [connectionMenu, setConnectionMenu] = useState<ConnectionMenuState>({
    visible: false,
    x: 0,
    y: 0,
    sourceNodeId: null,
    sourceHandle: null,
  })

  // 正在删除的节点ID集合（用于显示loading效果）
  const [deletingNodeIds, setDeletingNodeIds] = useState<Set<string>>(new Set())
  const [expandedCoursePointPanelIds, setExpandedCoursePointPanelIds] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const [isContainerSizeReady, setIsContainerSizeReady] = useState(false)

  useEffect(() => {
    const containerEl = containerRef.current
    if (!containerEl) return

    const updateContainerReadyState = () => {
      const { width, height } = containerEl.getBoundingClientRect()
      setIsContainerSizeReady(width > 0 && height > 0)
    }

    updateContainerReadyState()

    if (typeof ResizeObserver === "undefined") return

    const resizeObserver = new ResizeObserver(() => {
      updateContainerReadyState()
    })
    resizeObserver.observe(containerEl)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // 使用抽屉状态管理 hook
  const {
    editDialog,
    setEditDialog,
    coursePointDrawer,
    isSavingCoursePoints,
    ksaDrawer,
    isSavingKsa,
    chapterDrawer,
    isSavingChapters,
    objectiveDrawer,
    isSavingObjectives,
    courseMatrixDrawer,
    isSavingCourseMatrix,
    projectMatrixDrawer,
    isSavingProjectMatrix,
    courseReportDrawer,
    updatingPanelIds,
    handleNodeEdit,
    handleEditSave,
    handleEditCancel,
    handleCoursePointPanelEdit,
    handleCoursePointsSave,
    handleCoursePointDrawerClose,
    handleKsaPanelEdit,
    handleKsaItemsSave,
    handleKsaDrawerClose,
    handleChapterPanelEdit,
    handleChaptersSave,
    handleChapterDrawerClose,
    handleObjectivePanelEdit,
    handleObjectivesSave,
    handleObjectiveDrawerClose,
    handleCourseMatrixEdit,
    handleCourseMatrixSave,
    handleCourseMatrixDrawerClose,
    handleProjectMatrixEdit,
    handleProjectMatrixSave,
    handleProjectMatrixDrawerClose,
    handleCourseReportEdit,
    handleCourseReportDrawerClose,
    // 源文档编辑
    sourceDocumentDrawer,
    isSavingSourceDocument,
    isRegeneratingSourceDocument,
    handleSourceDocumentEdit,
    handleSourceDocumentSave,
    handleSourceDocumentRegenerate,
    handleSourceDocumentDrawerClose,
    // 专业矩阵编辑
    graduationSupportDrawer,
    isSavingGraduationSupport,
    handleGraduationSupportPanelEdit,
    handleGraduationSupportSave,
    handleGraduationSupportDrawerClose,
  } = useCanvasDrawers({
    flowNodes,
    onNodeDataUpdate,
    onCoursePointsUpdate,
    onKsaItemsUpdate,
    onChaptersUpdate,
    onObjectivesUpdate,
    onCourseMatrixUpdate,
    onProjectMatrixUpdate,
    onSourceDocumentUpdate,
    onSourceDocumentRegenerate,
    onGraduationSupportUpdate,
  })

  // 记录上一次的节点 ID 集合，用于检测节点增删
  const prevNodeIdsRef = useRef<Set<string>>(new Set())
  const prevEdgeIdsRef = useRef<Set<string>>(new Set())
  // 记录上一次的节点数据引用，用于检测数据变化（引用比较替代 JSON.stringify）
  const prevNodeDataRef = useRef<Map<string, unknown>>(new Map())
  // 记录上一次外部传入的节点位置，用于检测外部布局重排
  const prevNodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  // 记录上一次外部传入的选中节点 ID 集合，用于检测外部触发的选中变化（支持多选）
  const prevExternalSelectedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    flowNodesRef.current = flowNodes
  }, [flowNodes])

  // 同步外部 props 变化（节点增删、数据变化、选中状态变化）
  // 合并为单个 effect 避免多次 setNodes 导致连续渲染
  useEffect(() => {
    const currentNodeIds = new Set(nodes.map(n => n.id))
    const prevNodeIds = prevNodeIdsRef.current

    // 构建 nodeMap 用于 O(1) 查找（getAbsolutePosition 等使用）
    const nodeMap = new Map<string, Node>(nodes.map(n => [n.id, n]))

    // 检测是否有节点增删
    const hasNodeChange = currentNodeIds.size !== prevNodeIds.size ||
      nodes.some(n => !prevNodeIds.has(n.id))

    // 检测已有节点的数据是否变化（通过引用比较，避免 JSON.stringify 开销）
    const currentNodeData = new Map<string, unknown>()
    const currentNodePositions = new Map<string, { x: number; y: number }>()
    const positionChangedIds = new Set<string>()
    let hasDataChange = false
    for (const node of nodes) {
      currentNodeData.set(node.id, node.data)
      currentNodePositions.set(node.id, node.position)
      // 只检查已存在节点的数据变化（引用不同即视为数据变化）
      if (prevNodeIds.has(node.id) && prevNodeDataRef.current.get(node.id) !== node.data) {
        hasDataChange = true
      }

      // 检测外部传入的位置变化（用于布局切换时同步重排）
      const prevPos = prevNodePositionsRef.current.get(node.id)
      if (prevPos && (prevPos.x !== node.position.x || prevPos.y !== node.position.y)) {
        positionChangedIds.add(node.id)
      }
    }
    const hasPositionChange = positionChangedIds.size > 0

    // 检测外部选中状态变化
    const externalSelectedIds = new Set(nodes.filter(n => n.selected).map(n => n.id))
    const prevExternalSelectedIds = prevExternalSelectedIdsRef.current
    const newlySelectedIds = [...externalSelectedIds].filter(id => !prevExternalSelectedIds.has(id))
    const hasSelectionChange = newlySelectedIds.length > 0

    if (hasNodeChange || hasDataChange || hasSelectionChange || hasPositionChange) {
      // 找出新增的节点（不在 prevNodeIds 中的节点）
      const newNodes = nodes.filter(n => !prevNodeIds.has(n.id))
      // KSA 子卡片新增时默认选中父面板，避免视角被子卡片频繁抢焦点
      const firstNewKsaChildNode = newNodes.find(
        n => n.type === FlowNodeType.KSA && !!n.parentId
      )
      const autoSelectedNodeId = firstNewKsaChildNode?.parentId || newNodes[0]?.id
      // 判断是否为首次加载（prevNodeIds 为空表示首次加载）
      const isInitialLoad = prevNodeIds.size === 0

      // 合并位置和选中状态：一次 setNodes 完成所有同步
      setNodes(prevFlowNodes => {
        const existingPositions = new Map(prevFlowNodes.map(n => [n.id, n.position]))

        // 仅选中状态变化时，只更新选中状态
        if (hasSelectionChange && !hasNodeChange && !hasDataChange) {
          return prevFlowNodes.map(n => ({
            ...n,
            selected: externalSelectedIds.has(n.id),
          }))
        }

        return nodes.map(node => ({
          ...node,
          // 仅当外部位置发生变化时使用外部位置（如布局切换）；否则保留内部拖拽位置
          position: positionChangedIds.has(node.id)
            ? node.position
            : (existingPositions.get(node.id) || node.position),
          // 首次加载时保留外部传入的选中状态（从 localStorage 恢复），后续新增时选中新节点
          // 数据变化时不改变选中状态
          // [MOD] 批量创建时只选中第一个新节点，而非选中所有新节点
          // 外部选中变化时同步选中状态
          selected: hasSelectionChange
            ? externalSelectedIds.has(node.id)
            : isInitialLoad
              ? node.selected
              : (hasDataChange && !hasNodeChange
                ? (prevFlowNodes.find(n => n.id === node.id)?.selected ?? false)
                : (disableAutoSelectNewNodes
                  ? (prevFlowNodes.find(n => n.id === node.id)?.selected ?? false)
                  : autoSelectedNodeId === node.id)),
        }))
      })
      prevNodeIdsRef.current = currentNodeIds
      prevNodeDataRef.current = currentNodeData
      prevNodePositionsRef.current = currentNodePositions
      prevExternalSelectedIdsRef.current = externalSelectedIds

      // 视角聚焦逻辑
      if (!disableAutoFocus && hasSelectionChange && !hasNodeChange) {
        // 外部选中变化：聚焦到最后一个新选中的节点
        const lastNewlySelectedId = newlySelectedIds[newlySelectedIds.length - 1]
        const targetNode = nodeMap.get(lastNewlySelectedId)
        if (targetNode) {
          const nodeWidth = targetNode.measured?.width || targetNode.width || 300
          const nodeHeight = targetNode.measured?.height || targetNode.height || 200
          const absolutePos = getAbsolutePosition(targetNode, nodeMap)
          setTimeout(() => {
            setCenter(
              absolutePos.x + nodeWidth / 2,
              absolutePos.y + nodeHeight / 2,
              { zoom: getZoom(), duration: 100 }
            )
          }, 50)
        }
      } else if (!disableAutoFocus && hasNodeChange) {
        if (isInitialLoad && nodes.length > 0) {
          // 首次加载：优先聚焦选中节点，否则聚焦第一个节点
          const selectedNode = nodes.find(n => n.selected)
          const targetNode = selectedNode || nodes[0]
          const nodeWidth = targetNode.measured?.width || targetNode.width || 300
          const nodeHeight = targetNode.measured?.height || targetNode.height || 200
          const absolutePos = getAbsolutePosition(targetNode, nodeMap)
          setTimeout(() => {
            setCenter(
              absolutePos.x + nodeWidth / 2,
              absolutePos.y + nodeHeight / 2,
              { zoom: 1, duration: 0 }
            )
          }, 50)
        } else if (newNodes.length > 0) {
          // 后续新增节点：KSA 子卡片新增时优先聚焦父面板，避免视角漂移到空白区域
          const ksaParentNode = firstNewKsaChildNode
            ? nodes.find(n => n.id === firstNewKsaChildNode.parentId)
            : undefined
          // 其余场景保持原策略：优先课点卡片，否则回退到最后一个新节点
          const firstCoursePointNode = newNodes.find(n => n.type === FlowNodeType.COURSE_POINT)
          const targetNode = ksaParentNode || firstCoursePointNode || newNodes[newNodes.length - 1]
          const nodeWidth = targetNode.measured?.width || targetNode.width || 300
          const nodeHeight = targetNode.measured?.height || targetNode.height || 200
          const absolutePos = getAbsolutePosition(targetNode, nodeMap)
          setTimeout(() => {
            setCenter(
              absolutePos.x + nodeWidth / 2,
              absolutePos.y + nodeHeight / 2,
              { zoom: getZoom(), duration: 100 }
            )
          }, 50)
        }
      }
    } else {
      // 无节点/数据变化时也更新选中状态的 ref
      prevNodePositionsRef.current = currentNodePositions
      prevExternalSelectedIdsRef.current = externalSelectedIds
    }
  }, [nodes, setNodes, setCenter, getZoom, disableAutoFocus, disableAutoSelectNewNodes])

  useEffect(() => {
    const currentEdgeIds = new Set(edges.map(e => e.id))
    const prevEdgeIds = prevEdgeIdsRef.current

    // 检测是否有边增删
    const hasEdgeChange = currentEdgeIds.size !== prevEdgeIds.size ||
      edges.some(e => !prevEdgeIds.has(e.id))

    if (hasEdgeChange) {
      setEdges(edges)
      prevEdgeIdsRef.current = currentEdgeIds
    }
  }, [edges, setEdges])

  useEffect(() => {
    if (isBuilding) return
    const currentNodes = flowNodesRef.current
    if (currentNodes.length === 0) return

    // 仅在布局切换后刷新 internals，避免批量挂载期间反复全量重算导致长任务
    let cancelled = false
    const frame1 = requestAnimationFrame(() => {
      const frame2 = requestAnimationFrame(() => {
        if (cancelled) return
        for (const node of currentNodes) {
          updateNodeInternals(node.id)
        }
        // 强制触发边路径重算，避免出现需手动拖拽一次才对齐的问题
        setEdges(prev => [...prev])
      })
      if (cancelled) {
        cancelAnimationFrame(frame2)
      }
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame1)
    }
  }, [layoutMode, isBuilding, updateNodeInternals, setEdges])

  useEffect(() => {
    if (prevLayoutModeRef.current === layoutMode) return

    prevLayoutModeRef.current = layoutMode
    setIsLayoutSwitching(true)
    setFlowRenderKey(prev => prev + 1)

    const completeTimer = setTimeout(() => {
      setIsLayoutSwitching(false)
      requestAnimationFrame(() => {
        const currentNodes = flowNodesRef.current
        const selectedNodes = currentNodes.filter(node => node.selected)
        if (selectedNodes.length > 0) {
          const targetNode = selectedNodes[selectedNodes.length - 1]
          const nodeMap = new Map<string, Node>(currentNodes.map(n => [n.id, n]))
          const absolutePos = getAbsolutePosition(targetNode, nodeMap)
          const nodeWidth = targetNode.measured?.width || targetNode.width || 300
          const nodeHeight = targetNode.measured?.height || targetNode.height || 200

          setCenter(
            absolutePos.x + nodeWidth / 2,
            absolutePos.y + nodeHeight / 2,
            { zoom: getZoom(), duration: 180 }
          )
        } else {
          fitView({ padding: 0.2, duration: 180, maxZoom: 1 })
        }
      })
    }, 280)

    // 兜底超时，避免任何异常时序导致遮罩不消失
    const fallbackTimer = setTimeout(() => {
      setIsLayoutSwitching(false)
    }, 1500)

    return () => {
      clearTimeout(completeTimer)
      clearTimeout(fallbackTimer)
    }
  }, [layoutMode, fitView, setCenter, getZoom])

  // 处理节点拖动结束，同步位置到外部状态
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodePositionChange?.(node.id, node.position)
    },
    [onNodePositionChange]
  )

  // 空的高亮状态（高亮联动功能已移除）
  const highlightState: HighlightState = useMemo(() => ({
    highlightedIds: new Set<string>(),
    sourceId: null,
    type: null,
  }), [])

  // [MOD] 包装 onNodesChange，检测键盘删除（Delete/Backspace）触发的节点移除
  // 解决键盘删除时 onNodesDelete 可能未触发导致聊天区卡片状态不同步的问题
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes)

      // 检测 remove 类型变更，同步调用 onNodeDelete 以更新聊天区关联卡片
      for (const change of changes) {
        if (change.type === 'remove') {
          onNodeDelete?.(change.id)
        }
      }
    },
    [onNodesChange, onNodeDelete]
  )

  // [MOD] 处理 React Flow 内部选中状态变化，同步到父组件
  // 用户点击节点时，React Flow 会立即更新 UI 选中高亮，此处将选中的节点 ID 通知父组件
  // 父组件仅更新 selectedId state 用于持久化，不触发 elements 变更回环
  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      const selectedIds = selectedNodes.map(n => n.id)
      onSelectionChangeRef.current?.(selectedIds)
    },
    []
  )

  // 处理节点删除按钮点击 - 先显示loading，再执行删除
  const handleNodeDeleteClick = useCallback(
    (nodeId: string) => {
      // 找出该节点及其所有子节点（parentId 指向该节点的节点）
      const idsToMark = new Set<string>([nodeId])
      flowNodes.forEach(node => {
        if (node.parentId === nodeId) {
          idsToMark.add(node.id)
        }
      })

      // 立即显示 loading 效果（包括子节点）
      setDeletingNodeIds(prev => {
        const next = new Set(prev)
        idsToMark.forEach(id => next.add(id))
        return next
      })

      // 延迟执行删除，让 loading 效果先渲染
      requestAnimationFrame(() => {
        onNodeDelete?.(nodeId)
        // 删除完成后清除 loading 状态
        setDeletingNodeIds(prev => {
          const next = new Set(prev)
          idsToMark.forEach(id => next.delete(id))
          return next
        })
      })
    },
    [onNodeDelete, flowNodes]
  )

  // 处理节点点击（高亮联动功能已移除）
  const handleNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      // 点击课点卡片时，直接打开课点编辑抽屉并定位到当前课点
      if (node.type === FlowNodeType.COURSE_POINT) {
        const nodeData = node.data as Partial<CoursePointCardData>
        if (node.parentId) {
          handleCoursePointPanelEdit(node.parentId, {
            pointId: typeof nodeData.id === "string" ? nodeData.id : node.id,
            pointIndex: typeof nodeData.index === "number" ? nodeData.index : undefined,
          })
        }
      } else if (node.type !== FlowNodeType.COURSE_INFO && node.type !== FlowNodeType.COURSE_POINT_PANEL) {
        // 课程信息节点和课点面板节点不在点击时打开弹窗（通过编辑图标触发）
        setEditDialog({
          open: true,
          nodeId: node.id,
          nodeType: node.type || "",
          nodeData: node.data as CanvasComponentData,
        })
      }
      onNodeClick?.(node.id, node.data)
    },
    [onNodeClick, setEditDialog, handleCoursePointPanelEdit]
  )

  // 处理连接事件
  const handleConnect = useCallback(
    (connection: Connection) => {
      onConnect?.(connection)
    },
    [onConnect]
  )

  // 处理连接结束事件（连线松开时）
  const handleConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      // 只在连接未完成时显示菜单（即松开时没有连接到目标节点）
      if (!connectionState.isValid) {
        const mouseEvent = event as MouseEvent
        // 获取容器的位置
        const containerRect = containerRef.current?.getBoundingClientRect()
        if (containerRect) {
          setConnectionMenu({
            visible: true,
            x: mouseEvent.clientX - containerRect.left,
            y: mouseEvent.clientY - containerRect.top,
            sourceNodeId: connectionState.fromNode?.id || null,
            sourceHandle: connectionState.fromHandle?.id || null,
          })
        }
      }
    },
    []
  )

  // 处理菜单选择
  const handleMenuSelect = useCallback(
    (option: ConnectionMenuOption) => {
      // 将菜单的屏幕坐标转换为画布坐标
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (containerRect) {
        const screenX = containerRect.left + connectionMenu.x
        const screenY = containerRect.top + connectionMenu.y
        const flowPosition = screenToFlowPosition({ x: screenX, y: screenY })
        onConnectionMenuSelect?.(option, connectionMenu.sourceNodeId, flowPosition)
      } else {
        onConnectionMenuSelect?.(option, connectionMenu.sourceNodeId)
      }
      setConnectionMenu((prev) => ({ ...prev, visible: false }))
    },
    [onConnectionMenuSelect, connectionMenu.sourceNodeId, connectionMenu.x, connectionMenu.y, screenToFlowPosition]
  )

  // 关闭菜单
  const closeMenu = useCallback(() => {
    setConnectionMenu((prev) => ({ ...prev, visible: false }))
  }, [])

  // 用 ref 跟踪菜单可见状态，避免 effect 依赖 connectionMenu.visible 导致频繁 attach/detach
  const connectionMenuVisibleRef = useRef(connectionMenu.visible)

  useEffect(() => {
    connectionMenuVisibleRef.current = connectionMenu.visible
  }, [connectionMenu.visible])

  // 点击画布其他区域关闭菜单（监听器只注册一次）
  useEffect(() => {
    const handleClickOutside = () => {
      if (connectionMenuVisibleRef.current) {
        closeMenu()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [closeMenu])

  // 处理边删除
  const handleEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      deletedEdges.forEach((edge) => {
        onEdgeDelete?.(edge.id)
      })
    },
    [onEdgeDelete]
  )

  // 处理项目矩阵中的课点行点击（高亮联动功能已移除，保留空回调）
  const handleCoursePointRowClick = useCallback(() => {
    // 高亮联动功能已移除
  }, [])

  // 处理 Panel 添加按钮点击
  const handlePanelAdd = useCallback((panelType: string, panelId: string) => {
    // TODO: 实现添加空白卡片功能
    console.log("[AiCanvasPanel] Panel添加按钮点击, panelType:", panelType, "panelId:", panelId)
    onPanelAdd?.(panelType, panelId)
  }, [onPanelAdd])

  const handleCoursePointPanelExpand = useCallback((panelId: string) => {
    setExpandedCoursePointPanelIds(prev => {
      if (prev.has(panelId)) {
        return prev
      }
      const next = new Set(prev)
      next.add(panelId)
      return next
    })
  }, [])

  const handleCoursePointPanelCollapse = useCallback((panelId: string) => {
    setExpandedCoursePointPanelIds(prev => {
      if (!prev.has(panelId)) {
        return prev
      }
      const next = new Set(prev)
      next.delete(panelId)
      return next
    })
  }, [])

  useEffect(() => {
    const panelIds = new Set(
      flowNodes
        .filter(node => node.type === FlowNodeType.COURSE_POINT_PANEL)
        .map(node => node.id)
    )

    setExpandedCoursePointPanelIds(prev => {
      const next = new Set<string>()
      prev.forEach(panelId => {
        if (panelIds.has(panelId)) {
          next.add(panelId)
        }
      })
      return next.size === prev.size ? prev : next
    })
  }, [flowNodes])

  // 使用 useProcessedNodes hook 处理节点数据
  const processedNodes = useProcessedNodes({
    flowNodes,
    highlightState,
    deletingNodeIds,
    updatingPanelIds,
    isRegenerating,
    fillProgress,
    onNodeDelete: handleNodeDeleteClick,
    onNodeRegenerate,
    onCoursePointRowClick: handleCoursePointRowClick,
    onCourseInfoEdit: handleNodeEdit,
    onCourseMatrixEdit: handleCourseMatrixEdit,
    onProjectMatrixEdit: handleProjectMatrixEdit,
    onCourseReportEdit: handleCourseReportEdit,
    onPanelAdd: handlePanelAdd,
    onCoursePointPanelEdit: handleCoursePointPanelEdit,
    expandedCoursePointPanelIds,
    onCoursePointPanelExpand: handleCoursePointPanelExpand,
    onCoursePointPanelCollapse: handleCoursePointPanelCollapse,
    onKsaPanelEdit: handleKsaPanelEdit,
    onChapterPanelEdit: handleChapterPanelEdit,
    onObjectivePanelEdit: handleObjectivePanelEdit,
    onGraduationSupportPanelEdit: handleGraduationSupportPanelEdit,
    onSourceDocumentEdit: handleSourceDocumentEdit,
    onSourceDocumentRefresh: (nodeId: string) => {
      // 从节点中获取文档数据后调用 handleSourceDocumentRegenerate
      const node = flowNodes.find(n => n.id === nodeId)
      if (node) {
        const docData = node.data as unknown as import("./canvas-elements/types").SourceDocumentCardData
        handleSourceDocumentRegenerate(docData)
      }
    },
  })

  // MiniMap 节点颜色
  const nodeColor = useCallback((node: Node) => {
    const nodeType = node.type as FlowNodeType
    const colorMap: Partial<Record<FlowNodeType, string>> = {
      [FlowNodeType.COURSE_INFO]: "#0ea5e9",
      [FlowNodeType.OBJECTIVE]: "#3b82f6",
      [FlowNodeType.COURSE_POINT]: "#22c55e",
      [FlowNodeType.CHAPTER]: "#a855f7",
      [FlowNodeType.KSA]: "#f59e0b",
      [FlowNodeType.COURSE_MATRIX]: "#6366f1",
      [FlowNodeType.PROJECT_MATRIX]: "#64748b",
      [FlowNodeType.COURSE_REPORT]: "#f43f5e",
      // Panel 节点颜色（使用比对应 Card 更深的色调）
      [FlowNodeType.OBJECTIVE_PANEL]: "#2563eb",
      [FlowNodeType.COURSE_POINT_PANEL]: "#16a34a",
      [FlowNodeType.CHAPTER_PANEL]: "#9333ea",
      [FlowNodeType.KSA_PANEL]: "#d97706",
      [FlowNodeType.GRADUATION_SUPPORT_PANEL]: "#059669",
      [FlowNodeType.SOURCE_DOCUMENT_PANEL]: "#ea580c",
      [FlowNodeType.SOURCE_DOCUMENT]: "#f97316",
    }
    return colorMap[nodeType] || "#64748b"
  }, [])

  // 默认边样式（使用贝塞尔曲线 + 彩虹渐变）
  const defaultEdgeOptions = useMemo(
    () => ({
      type: "support",
      animated: false,
    }),
    []
  )

  return (
    <div ref={containerRef} className={`w-full h-full relative ${className || ""}`}>
      {isContainerSizeReady && (
        <CanvasLayoutProvider layoutMode={layoutMode}>
          <ReactFlow
            key={`canvas-flow-${layoutMode}-${flowRenderKey}`}
            nodes={processedNodes}
            edges={flowEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onConnectEnd={handleConnectEnd}
            onNodeClick={handleNodeClick}
            onNodeDragStop={handleNodeDragStop}
            onEdgesDelete={handleEdgesDelete}
            onSelectionChange={handleSelectionChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionLineComponent={RainbowConnectionLine}
            connectionMode={ConnectionMode.Loose}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.1}
            maxZoom={2}
            onlyRenderVisibleElements
            deleteKeyCode={["Backspace", "Delete"]}
            multiSelectionKeyCode={["Control", "Meta"]}
            // 默认拖动模式：左键拖拽空白处平移视口，滚轮缩放
            panOnScroll={false}
            panOnDrag={true}
            // 按住 Shift 键时才能框选，避免与拖拽平移冲突
            selectionOnDrag={false}
            selectionKeyCode="Shift"
            selectNodesOnDrag={false}
            proOptions={{ hideAttribution: true }}
          >
            {/* 虚线网格背景 */}
            <Background
              variant={BackgroundVariant.Lines}
              gap={24}
              color="#d1d5db"
              lineWidth={1}
              patternClassName="canvas-dashed-pattern"
            />

            {/* 自定义缩放控制栏（含同步状态指示器） */}
            {showControls && (
              <CustomZoomControls
                isUploading={isUploading}
                isLoading={isRegenerating}
                layoutMode={layoutMode}
                onLayoutModeChange={onLayoutModeChange}
              />
            )}

            {/* 小地图 */}
            {showMiniMap && !isBuilding && (
              <MiniMap
                nodeColor={nodeColor}
                nodeStrokeWidth={3}
                zoomable
                pannable
                position="bottom-left"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
            )}
          </ReactFlow>
        </CanvasLayoutProvider>
      )}

      {isLayoutSwitching && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center canvas-loading-overlay">
          <div className="px-4 py-2 rounded-md border border-white/30 bg-white/20 text-sm text-white canvas-loading-text">
            正在切换布局，请稍候...
          </div>
        </div>
      )}

      {isBuilding && (
        <div className="absolute inset-0 z-[55] flex items-center justify-center bg-background/50 pointer-events-auto">
          <div className="px-4 py-2 rounded-md border border-border bg-background text-sm text-foreground shadow-sm">
            正在构建画布...
            {buildingProgress && (
              <span className="ml-2 text-muted-foreground">
                {stageLabelMap[buildingProgress.stage] || buildingProgress.stage} {buildingProgress.loaded}/{buildingProgress.total}
                {buildingProgress.etaSeconds != null ? `，约 ${buildingProgress.etaSeconds}s` : ""}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 连接菜单 */}
      <CanvasConnectionMenu
        connectionMenu={connectionMenu}
        flowNodes={flowNodes}
        onMenuSelect={handleMenuSelect}
      />

      {/* 画布抽屉组件集合 */}
      <CanvasDrawers
        flowNodes={flowNodes}
        editDialog={editDialog}
        setEditDialog={setEditDialog}
        onEditSave={handleEditSave}
        onEditCancel={handleEditCancel}
        coursePointDrawer={coursePointDrawer}
        isSavingCoursePoints={isSavingCoursePoints}
        onCoursePointsSave={handleCoursePointsSave}
        onCoursePointDrawerClose={handleCoursePointDrawerClose}
        ksaDrawer={ksaDrawer}
        isSavingKsa={isSavingKsa}
        onKsaItemsSave={handleKsaItemsSave}
        onKsaDrawerClose={handleKsaDrawerClose}
        chapterDrawer={chapterDrawer}
        isSavingChapters={isSavingChapters}
        onChaptersSave={handleChaptersSave}
        onChapterDrawerClose={handleChapterDrawerClose}
        objectiveDrawer={objectiveDrawer}
        isSavingObjectives={isSavingObjectives}
        onObjectivesSave={handleObjectivesSave}
        onObjectiveDrawerClose={handleObjectiveDrawerClose}
        courseMatrixDrawer={courseMatrixDrawer}
        isSavingCourseMatrix={isSavingCourseMatrix}
        onCourseMatrixSave={handleCourseMatrixSave}
        onCourseMatrixDrawerClose={handleCourseMatrixDrawerClose}
        projectMatrixDrawer={projectMatrixDrawer}
        isSavingProjectMatrix={isSavingProjectMatrix}
        onProjectMatrixSave={handleProjectMatrixSave}
        onProjectMatrixDrawerClose={handleProjectMatrixDrawerClose}
        courseReportDrawer={courseReportDrawer}
        onCourseReportDrawerClose={handleCourseReportDrawerClose}
        sourceDocumentDrawer={sourceDocumentDrawer}
        isSavingSourceDocument={isSavingSourceDocument}
        isRegeneratingSourceDocument={isRegeneratingSourceDocument}
        onSourceDocumentSave={handleSourceDocumentSave}
        onSourceDocumentRegenerate={handleSourceDocumentRegenerate}
        onSourceDocumentDrawerClose={handleSourceDocumentDrawerClose}
        graduationSupportDrawer={graduationSupportDrawer}
        isSavingGraduationSupport={isSavingGraduationSupport}
        onGraduationSupportSave={handleGraduationSupportSave}
        onGraduationSupportDrawerClose={handleGraduationSupportDrawerClose}
        canvasElements={canvasElements}
        canvasOssKey={canvasOssKey}
        treeData={treeData}
        onSaveSuccess={onSaveSuccess}
        onUpdateCourseInfo={onUpdateCourseInfo}
        lockGraduationSupportOrganization={lockGraduationSupportOrganization}
      />
    </div>
  )
}

/**
 * AI助手画布面板组件（带 Provider 包装）
 */
export function AiCanvasPanel(props: AiCanvasPanelProps) {
  return (
    <ReactFlowProvider>
      <AiCanvasPanelInner {...props} />
    </ReactFlowProvider>
  )
}

export default AiCanvasPanel
