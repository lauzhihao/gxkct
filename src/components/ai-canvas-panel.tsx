"use client"

import { useCallback, useMemo, useState, useEffect, useRef } from "react"
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeMouseHandler,
  type OnConnectEnd,
  BackgroundVariant,
  ConnectionMode,
  ReactFlowProvider,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import "./flow/canvas.css"
import { FlowNodeType, FlowEdgeType, NODE_COLORS } from "./flow/utils/types"
import { CustomZoomControls } from "./flow/controls/custom-zoom-controls"
import type { HighlightState } from "@/shared/hooks/use-canvas-highlight"
import { useCanvasDrawers } from "@/shared/hooks/use-canvas-drawers"
import { useProcessedNodes } from "@/shared/hooks/use-processed-nodes"
import { CanvasDrawers } from "./canvas-drawers"
import { CanvasConnectionMenu, type ConnectionMenuOption, type ConnectionMenuState } from "./canvas-drawers/canvas-connection-menu"
import type { CanvasElementData, ProjectMatrixData, ChapterCardData, CoursePointCardData, KsaItemData, CourseMatrixData, ObjectiveCardData, SourceDocumentCardData } from "./canvas-elements/types"
import type { TreeNode } from "@/types"
import { CanvasComponentType } from "./canvas-elements/types"
import type { CourseInfoData, CanvasComponentData } from "./canvas-elements/types"
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
import { SourceDocumentPanelNode } from "./flow/nodes/source-document-panel-node"
import { SourceDocumentNode } from "./flow/nodes/source-document-node"
import { SupportEdge } from "./flow/edges/support-edge"
import { RainbowConnectionLine } from "./flow/edges/rainbow-connection-line"

/**
 * 计算节点的绝对位置
 * 对于子节点（带 parentId），其 position 是相对于父节点的相对坐标
 * 需要递归累加所有祖先节点的位置才能得到画布绝对坐标
 * @param node 目标节点
 * @param allNodes 所有节点列表
 * @returns 节点在画布中的绝对位置
 */
function getAbsolutePosition(node: Node, allNodes: Node[]): { x: number; y: number } {
  let absoluteX = node.position.x
  let absoluteY = node.position.y

  // 如果有父节点，需要递归累加父节点位置
  let currentParentId = node.parentId
  while (currentParentId) {
    const parentNode = allNodes.find(n => n.id === currentParentId)
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
const nodeTypes = {
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
  [FlowNodeType.SOURCE_DOCUMENT_PANEL]: SourceDocumentPanelNode,
  [FlowNodeType.SOURCE_DOCUMENT]: SourceDocumentNode,
}

/**
 * 自定义边类型注册
 */
const edgeTypes = {
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
  // 是否显示小地图
  showMiniMap?: boolean
  // 是否显示控制栏
  showControls?: boolean
  // 节点重做回调（点击重做按钮时触发）
  onNodeRegenerate?: (nodeId: string, nodeType: CanvasComponentType, nodeName: string) => void
  // 是否正在重做（用于禁用所有重做按钮，同时画布进入全局loading状态）
  isRegenerating?: boolean
  // 课程矩阵填充进度信息（显示在课程矩阵节点的 loading 下方）
  fillMatrixProgress?: string | null
  // 项目矩阵填充进度信息（显示在项目矩阵节点的 loading 下方）
  fillProjectMatrixProgress?: string | null
  // 课点信息填充进度信息（显示在课点面板节点的 loading 下方）
  fillCoursePointsProgress?: string | null
  // KSA填充进度信息（显示在KSA面板节点的 loading 下方）
  fillKsaProgress?: string | null
  // 画布元素数据（用于保存向导）
  canvasElements?: CanvasElementData[]
  // 画布内容的OSS Key
  canvasOssKey?: string | null
  // 树形结构数据（用于保存向导选择专业）
  treeData?: TreeNode | null
  // 保存成功回调
  onSaveSuccess?: (majorId: string, courseId: string) => void
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
  showMiniMap = true,
  showControls = true,
  onNodeRegenerate,
  isRegenerating = false,
  fillMatrixProgress = null,
  fillProjectMatrixProgress = null,
  fillCoursePointsProgress = null,
  fillKsaProgress = null,
  canvasElements = [],
  canvasOssKey = null,
  treeData = null,
  onSaveSuccess,
}: AiCanvasPanelProps) {
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
  const { setCenter, getZoom, screenToFlowPosition } = useReactFlow()

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
  const containerRef = useRef<HTMLDivElement>(null)

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
    setUpdatingPanelIds,
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
  })

  // 记录上一次的节点 ID 集合，用于检测节点增删
  const prevNodeIdsRef = useRef<Set<string>>(new Set())
  const prevEdgeIdsRef = useRef<Set<string>>(new Set())
  // 记录上一次的节点数据签名，用于检测数据变化
  const prevNodeDataRef = useRef<Map<string, string>>(new Map())
  // 记录上一次外部传入的选中节点 ID 集合，用于检测外部触发的选中变化（支持多选）
  const prevExternalSelectedIdsRef = useRef<Set<string>>(new Set())

  // 同步外部 props 变化（节点增删或数据变化时同步，不覆盖拖动位置）
  // 同时在新增节点时自动聚焦到新节点位置
  useEffect(() => {
    const currentNodeIds = new Set(nodes.map(n => n.id))
    const prevNodeIds = prevNodeIdsRef.current

    // 检测是否有节点增删
    const hasNodeChange = currentNodeIds.size !== prevNodeIds.size ||
      nodes.some(n => !prevNodeIds.has(n.id))

    // 检测已有节点的数据是否变化（通过 JSON 序列化比较）
    const currentNodeData = new Map<string, string>()
    let hasDataChange = false
    for (const node of nodes) {
      const dataStr = JSON.stringify(node.data)
      currentNodeData.set(node.id, dataStr)
      // 只检查已存在节点的数据变化
      if (prevNodeIds.has(node.id) && prevNodeDataRef.current.get(node.id) !== dataStr) {
        hasDataChange = true
      }
    }

    if (hasNodeChange || hasDataChange) {
      // 找出新增的节点（不在 prevNodeIds 中的节点）
      const newNodes = nodes.filter(n => !prevNodeIds.has(n.id))
      // 判断是否为首次加载（prevNodeIds 为空表示首次加载）
      const isInitialLoad = prevNodeIds.size === 0

      // 合并位置：保留已存在节点的当前位置，仅添加新节点
      setNodes(prevFlowNodes => {
        const existingPositions = new Map(prevFlowNodes.map(n => [n.id, n.position]))
        return nodes.map(node => ({
          ...node,
          // 如果节点已存在，保留其当前位置；否则使用外部传入的位置
          position: existingPositions.get(node.id) || node.position,
          // 首次加载时保留外部传入的选中状态（从 localStorage 恢复），后续新增时选中新节点
          // 数据变化时不改变选中状态
          selected: isInitialLoad ? node.selected : (hasDataChange && !hasNodeChange ? (prevFlowNodes.find(n => n.id === node.id)?.selected ?? false) : newNodes.some(n => n.id === node.id)),
        }))
      })
      prevNodeIdsRef.current = currentNodeIds
      prevNodeDataRef.current = currentNodeData

      // 视角聚焦逻辑（仅在节点增删时触发，数据变化不触发）
      if (hasNodeChange) {
        if (isInitialLoad && nodes.length > 0) {
          // 首次加载：优先聚焦选中节点，否则聚焦第一个节点
          const selectedNode = nodes.find(n => n.selected)
          const targetNode = selectedNode || nodes[0]
          const nodeWidth = targetNode.measured?.width || targetNode.width || 300
          const nodeHeight = targetNode.measured?.height || targetNode.height || 200
          // 计算绝对位置（子节点的 position 是相对于父节点的相对坐标）
          const absolutePos = getAbsolutePosition(targetNode, nodes)
          // 延迟执行，确保节点已渲染
          setTimeout(() => {
            setCenter(
              absolutePos.x + nodeWidth / 2,
              absolutePos.y + nodeHeight / 2,
              { zoom: 1, duration: 0 }
            )
          }, 50)
        } else if (newNodes.length > 0) {
          // 后续新增节点：聚焦到最后一个新节点
          const lastNewNode = newNodes[newNodes.length - 1]
          const nodeWidth = lastNewNode.measured?.width || lastNewNode.width || 300
          const nodeHeight = lastNewNode.measured?.height || lastNewNode.height || 200
          // 计算绝对位置（子节点的 position 是相对于父节点的相对坐标）
          const absolutePos = getAbsolutePosition(lastNewNode, nodes)
          // 延迟执行，确保节点已渲染
          setTimeout(() => {
            setCenter(
              absolutePos.x + nodeWidth / 2,
              absolutePos.y + nodeHeight / 2,
              { zoom: getZoom(), duration: 100 }
            )
          }, 50)
        }
      }
    }
  }, [nodes, setNodes, setCenter, getZoom])

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

  // 监听外部传入的节点选中状态变化，自动聚焦到被选中的节点
  // 注意：不再通过 setNodes 同步选中状态，避免与 React Flow 的多选管理冲突导致无限循环
  useEffect(() => {
    // 获取外部传入的所有选中节点 ID（支持多选）
    const externalSelectedIds = new Set(nodes.filter(n => n.selected).map(n => n.id))
    const prevExternalSelectedIds = prevExternalSelectedIdsRef.current

    // 检测是否有新的节点被外部选中（之前未选中，现在选中）
    const newlySelectedIds = [...externalSelectedIds].filter(id => !prevExternalSelectedIds.has(id))

    // 只有当有新节点被选中时才聚焦（聚焦到最后一个新选中的节点）
    if (newlySelectedIds.length > 0) {
      const lastNewlySelectedId = newlySelectedIds[newlySelectedIds.length - 1]
      const targetNode = nodes.find(n => n.id === lastNewlySelectedId)
      if (targetNode) {
        const nodeWidth = targetNode.measured?.width || targetNode.width || 300
        const nodeHeight = targetNode.measured?.height || targetNode.height || 200
        // 计算绝对位置（子节点的 position 是相对于父节点的相对坐标）
        const absolutePos = getAbsolutePosition(targetNode, nodes)
        setTimeout(() => {
          setCenter(
            absolutePos.x + nodeWidth / 2,
            absolutePos.y + nodeHeight / 2,
            { zoom: getZoom(), duration: 100 }
          )
        }, 50)
      }
    }

    prevExternalSelectedIdsRef.current = externalSelectedIds
  }, [nodes, setCenter, getZoom])

  // 记录上一次选中的节点 ID 集合（保留用于未来可能的多选同步）
  const prevSelectedIdsRef = useRef<Set<string>>(new Set())

  // [性能优化] 禁用 flowNodes 选中状态同步到外部
  // 原因：外部已通过 onNodeClick 处理单击选中，此处同步会导致双向循环更新，造成明显延迟
  // 影响：React Flow 的框选/多选操作不会同步到外部状态，如需支持多选需另行处理
  // 原代码：
  // useEffect(() => {
  //   const currentSelectedIds = new Set(flowNodes.filter(n => n.selected).map(n => n.id))
  //   const prevSelectedIds = prevSelectedIdsRef.current
  //   const hasSelectionChange = currentSelectedIds.size !== prevSelectedIds.size ||
  //     [...currentSelectedIds].some(id => !prevSelectedIds.has(id))
  //   if (hasSelectionChange) {
  //     prevSelectedIdsRef.current = currentSelectedIds
  //     onSelectionChangeRef.current?.([...currentSelectedIds])
  //   }
  // }, [flowNodes])

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
      // 课程信息节点和课点面板节点不在点击时打开弹窗（通过编辑图标触发）
      if (node.type !== FlowNodeType.COURSE_INFO && node.type !== FlowNodeType.COURSE_POINT_PANEL) {
        setEditDialog({
          open: true,
          nodeId: node.id,
          nodeType: node.type || "",
          nodeData: node.data as CanvasComponentData,
        })
      }
      onNodeClick?.(node.id, node.data)
    },
    [onNodeClick, setEditDialog]
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

  // 点击画布其他区域关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (connectionMenu.visible) {
        closeMenu()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [connectionMenu.visible, closeMenu])

  // 处理节点删除
  const handleNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      deletedNodes.forEach((node) => {
        onNodeDelete?.(node.id)
      })
    },
    [onNodeDelete]
  )

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
  const handleCoursePointRowClick = useCallback((_coursePointId: string) => {
    // 高亮联动功能已移除
  }, [])

  // 处理 Panel 添加按钮点击
  const handlePanelAdd = useCallback((panelType: string, panelId: string) => {
    // TODO: 实现添加空白卡片功能
    console.log("[AiCanvasPanel] Panel添加按钮点击, panelType:", panelType, "panelId:", panelId)
    onPanelAdd?.(panelType, panelId)
  }, [onPanelAdd])

  // 使用 useProcessedNodes hook 处理节点数据
  const processedNodes = useProcessedNodes({
    flowNodes,
    highlightState,
    deletingNodeIds,
    updatingPanelIds,
    isRegenerating,
    fillMatrixProgress,
    fillProjectMatrixProgress,
    fillCoursePointsProgress,
    fillKsaProgress,
    onNodeDelete: handleNodeDeleteClick,
    onNodeRegenerate,
    onCoursePointRowClick: handleCoursePointRowClick,
    onCourseInfoEdit: handleNodeEdit,
    onCourseMatrixEdit: handleCourseMatrixEdit,
    onProjectMatrixEdit: handleProjectMatrixEdit,
    onCourseReportEdit: handleCourseReportEdit,
    onPanelAdd: handlePanelAdd,
    onCoursePointPanelEdit: handleCoursePointPanelEdit,
    onKsaPanelEdit: handleKsaPanelEdit,
    onChapterPanelEdit: handleChapterPanelEdit,
    onObjectivePanelEdit: handleObjectivePanelEdit,
    onSourceDocumentEdit: handleSourceDocumentEdit,
    onSourceDocumentRefresh: (nodeId: string) => {
      // 从节点中获取文档数据后调用 handleSourceDocumentRegenerate
      const node = flowNodes.find(n => n.id === nodeId)
      if (node) {
        const docData = node.data as import("./canvas-elements/types").SourceDocumentCardData
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
      <ReactFlow
        nodes={processedNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineComponent={RainbowConnectionLine}
        connectionMode={ConnectionMode.Loose}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Control", "Meta"]}
        panOnScroll
        selectionOnDrag
        panOnDrag={[1, 2]}
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

        {/* 自定义缩放控制栏 */}
        {showControls && <CustomZoomControls />}

        {/* 小地图 */}
        {showMiniMap && (
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
        canvasElements={canvasElements}
        canvasOssKey={canvasOssKey}
        treeData={treeData}
        onSaveSuccess={onSaveSuccess}
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
