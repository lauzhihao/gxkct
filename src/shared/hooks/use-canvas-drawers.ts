"use client"

import { useState, useCallback } from "react"
import type { Node } from "@xyflow/react"

import { FlowNodeType } from "@/components/flow/utils/types"
import type {
  CanvasComponentData,
  CourseInfoData,
  CoursePointCardData,
  KsaItemData,
  ChapterCardData,
  ObjectiveCardData,
  CourseMatrixData,
  ProjectMatrixData,
  SourceDocumentCardData,
  GraduationSupportData,
} from "@/components/canvas-elements/types"

/**
 * 编辑弹窗状态类型
 */
export interface EditDialogState {
  open: boolean
  nodeId: string
  nodeType: string
  nodeData: CanvasComponentData
}

/**
 * 课点编辑抽屉状态类型
 */
export interface CoursePointDrawerState {
  open: boolean
  panelId: string
  coursePoints: CoursePointCardData[]
  focusPointId: string | null
  focusPointIndex: number | null
}

/**
 * KSA编辑抽屉状态类型
 */
export interface KsaDrawerState {
  open: boolean
  panelId: string
  ksaItems: KsaItemData[]
}

/**
 * 章节编辑抽屉状态类型
 */
export interface ChapterDrawerState {
  open: boolean
  panelId: string
  chapters: ChapterCardData[]
}

/**
 * 教学目标编辑抽屉状态类型
 */
export interface ObjectiveDrawerState {
  open: boolean
  panelId: string
  objectives: ObjectiveCardData[]
}

/**
 * 课程矩阵编辑抽屉状态类型
 */
export interface CourseMatrixDrawerState {
  open: boolean
  nodeId: string
  matrixData: CourseMatrixData | null
}

/**
 * 项目矩阵编辑抽屉状态类型
 */
export interface ProjectMatrixDrawerState {
  open: boolean
  nodeId: string
  matrixData: ProjectMatrixData | null
}

/**
 * 开课报告预览抽屉状态类型
 */
export interface CourseReportDrawerState {
  open: boolean
  nodeId: string
}

/**
 * 源文档编辑抽屉状态类型
 */
export interface SourceDocumentDrawerState {
  open: boolean
  document: SourceDocumentCardData | null
}

/**
 * 专业矩阵编辑抽屉状态类型
 */
export interface GraduationSupportDrawerState {
  open: boolean
  panelId: string
  data: GraduationSupportData | null
}

/**
 * useCanvasDrawers hook 参数
 */
export interface UseCanvasDrawersOptions {
  /** 画布节点列表 */
  flowNodes: Node[]
  /** 节点数据更新回调 */
  onNodeDataUpdate?: (nodeId: string, data: CanvasComponentData) => void
  /** 课点更新回调 */
  onCoursePointsUpdate?: (panelId: string, coursePoints: CoursePointCardData[]) => void
  /** KSA更新回调 */
  onKsaItemsUpdate?: (panelId: string, ksaItems: KsaItemData[]) => void
  /** 章节更新回调 */
  onChaptersUpdate?: (panelId: string, chapters: ChapterCardData[]) => void
  /** 教学目标更新回调 */
  onObjectivesUpdate?: (panelId: string, objectives: ObjectiveCardData[]) => void
  /** 课程矩阵更新回调 */
  onCourseMatrixUpdate?: (nodeId: string, matrixData: CourseMatrixData) => void
  /** 项目矩阵更新回调 */
  onProjectMatrixUpdate?: (nodeId: string, matrixData: ProjectMatrixData) => void
  /** 源文档更新回调 */
  onSourceDocumentUpdate?: (document: SourceDocumentCardData) => void
  /** 源文档重做回调（重新解析） */
  onSourceDocumentRegenerate?: (document: SourceDocumentCardData) => void
  /** 专业矩阵（毕业要求支撑）更新回调 */
  onGraduationSupportUpdate?: (panelId: string, data: GraduationSupportData) => void
  /** 强制上传最新画布并返回最新 ossKey */
  onEnsureLatestCanvasOssKey?: () => Promise<string | null>
}

/**
 * useCanvasDrawers hook 返回值
 */
export interface UseCanvasDrawersReturn {
  // 状态
  editDialog: EditDialogState
  setEditDialog: React.Dispatch<React.SetStateAction<EditDialogState>>
  coursePointDrawer: CoursePointDrawerState
  isSavingCoursePoints: boolean
  ksaDrawer: KsaDrawerState
  isSavingKsa: boolean
  chapterDrawer: ChapterDrawerState
  isSavingChapters: boolean
  objectiveDrawer: ObjectiveDrawerState
  isSavingObjectives: boolean
  courseMatrixDrawer: CourseMatrixDrawerState
  isSavingCourseMatrix: boolean
  projectMatrixDrawer: ProjectMatrixDrawerState
  isSavingProjectMatrix: boolean
  courseReportDrawer: CourseReportDrawerState
  updatingPanelIds: Set<string>
  setUpdatingPanelIds: React.Dispatch<React.SetStateAction<Set<string>>>

  // 编辑弹窗处理函数
  handleNodeEdit: (nodeId: string) => void
  handleEditSave: (courseData: unknown, isAutoSave?: boolean) => void
  handleEditCancel: () => void

  // 课点编辑处理函数
  handleCoursePointPanelEdit: (panelId: string, focusTarget?: { pointId?: string; pointIndex?: number }) => void
  handleCoursePointsSave: (coursePoints: CoursePointCardData[]) => Promise<void>
  handleCoursePointDrawerClose: () => void

  // KSA编辑处理函数
  handleKsaPanelEdit: (panelId: string) => void
  handleKsaItemsSave: (ksaItems: KsaItemData[]) => void
  handleKsaDrawerClose: () => void

  // 章节编辑处理函数
  handleChapterPanelEdit: (panelId: string) => void
  handleChaptersSave: (chapters: ChapterCardData[]) => void
  handleChapterDrawerClose: () => void

  // 教学目标编辑处理函数
  handleObjectivePanelEdit: (panelId: string) => void
  handleObjectivesSave: (objectives: ObjectiveCardData[]) => void
  handleObjectiveDrawerClose: () => void

  // 课程矩阵编辑处理函数
  handleCourseMatrixEdit: (nodeId: string) => void
  handleCourseMatrixSave: (matrixData: CourseMatrixData) => void
  handleCourseMatrixDrawerClose: () => void

  // 项目矩阵编辑处理函数
  handleProjectMatrixEdit: (nodeId: string) => void
  handleProjectMatrixSave: (matrixData: ProjectMatrixData) => void
  handleProjectMatrixDrawerClose: () => void

  // 开课报告预览处理函数
  handleCourseReportEdit: (nodeId: string) => void
  handleCourseReportDrawerClose: () => void

  // 源文档编辑处理函数
  sourceDocumentDrawer: SourceDocumentDrawerState
  isSavingSourceDocument: boolean
  isRegeneratingSourceDocument: boolean
  handleSourceDocumentEdit: (nodeId: string) => void
  handleSourceDocumentSave: (document: SourceDocumentCardData) => void
  handleSourceDocumentRegenerate: (document: SourceDocumentCardData) => void
  handleSourceDocumentDrawerClose: () => void

  // 专业矩阵编辑处理函数
  graduationSupportDrawer: GraduationSupportDrawerState
  isSavingGraduationSupport: boolean
  handleGraduationSupportPanelEdit: (panelId: string) => void
  handleGraduationSupportSave: (data: GraduationSupportData) => void
  handleGraduationSupportDrawerClose: () => void
}

/**
 * 画布抽屉状态管理 hook
 * 集中管理所有编辑抽屉的状态和处理函数
 */
export function useCanvasDrawers({
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
  onEnsureLatestCanvasOssKey,
}: UseCanvasDrawersOptions): UseCanvasDrawersReturn {
  // 正在更新的面板ID集合（用于显示loading效果）
  const [updatingPanelIds, setUpdatingPanelIds] = useState<Set<string>>(new Set())

  // 编辑弹窗状态
  const [editDialog, setEditDialog] = useState<EditDialogState>({
    open: false,
    nodeId: "",
    nodeType: "",
    nodeData: {} as CanvasComponentData,
  })

  // 课点编辑抽屉状态
  const [coursePointDrawer, setCoursePointDrawer] = useState<CoursePointDrawerState>({
    open: false,
    panelId: "",
    coursePoints: [],
    focusPointId: null,
    focusPointIndex: null,
  })
  const [isSavingCoursePoints, setIsSavingCoursePoints] = useState(false)

  // KSA编辑抽屉状态
  const [ksaDrawer, setKsaDrawer] = useState<KsaDrawerState>({
    open: false,
    panelId: "",
    ksaItems: [],
  })
  const [isSavingKsa, setIsSavingKsa] = useState(false)

  // 章节编辑抽屉状态
  const [chapterDrawer, setChapterDrawer] = useState<ChapterDrawerState>({
    open: false,
    panelId: "",
    chapters: [],
  })
  const [isSavingChapters, setIsSavingChapters] = useState(false)

  // 教学目标编辑抽屉状态
  const [objectiveDrawer, setObjectiveDrawer] = useState<ObjectiveDrawerState>({
    open: false,
    panelId: "",
    objectives: [],
  })
  const [isSavingObjectives, setIsSavingObjectives] = useState(false)

  // 课程矩阵编辑抽屉状态
  const [courseMatrixDrawer, setCourseMatrixDrawer] = useState<CourseMatrixDrawerState>({
    open: false,
    nodeId: "",
    matrixData: null,
  })
  const [isSavingCourseMatrix, setIsSavingCourseMatrix] = useState(false)

  // 项目矩阵编辑抽屉状态
  const [projectMatrixDrawer, setProjectMatrixDrawer] = useState<ProjectMatrixDrawerState>({
    open: false,
    nodeId: "",
    matrixData: null,
  })
  const [isSavingProjectMatrix, setIsSavingProjectMatrix] = useState(false)

  // 开课报告预览抽屉状态
  const [courseReportDrawer, setCourseReportDrawer] = useState<CourseReportDrawerState>({
    open: false,
    nodeId: "",
  })

  // 源文档编辑抽屉状态
  const [sourceDocumentDrawer, setSourceDocumentDrawer] = useState<SourceDocumentDrawerState>({
    open: false,
    document: null,
  })
  const [isSavingSourceDocument, setIsSavingSourceDocument] = useState(false)
  const [isRegeneratingSourceDocument, setIsRegeneratingSourceDocument] = useState(false)

  // 专业矩阵编辑抽屉状态
  const [graduationSupportDrawer, setGraduationSupportDrawer] = useState<GraduationSupportDrawerState>({
    open: false,
    panelId: "",
    data: null,
  })
  const [isSavingGraduationSupport, setIsSavingGraduationSupport] = useState(false)

  // ==================== 编辑弹窗处理函数 ====================

  // 处理节点编辑按钮点击 - 打开编辑弹窗
  const handleNodeEdit = useCallback(
    (nodeId: string) => {
      const node = flowNodes.find(n => n.id === nodeId)
      if (node) {
        setEditDialog({
          open: true,
          nodeId: node.id,
          nodeType: node.type || "",
          nodeData: node.data as CanvasComponentData,
        })
      }
    },
    [flowNodes]
  )

  // 处理编辑抽屉保存（转换 AddCourseForm 数据为 CourseInfoData）
  const handleEditSave = useCallback(
    (courseData: unknown, isAutoSave?: boolean) => {
      if (!editDialog.nodeId) return

      const data = courseData as Record<string, unknown>
      const newMetadata = data.metadata as CourseInfoData["metadata"]

      // 从原有节点数据中获取 courseId 和 majorId（保存课程后写入的）
      const originalNodeData = editDialog.nodeData as CourseInfoData | undefined
      const originalCourseId = originalNodeData?.metadata?.courseId
      const originalMajorId = originalNodeData?.metadata?.majorId

      // 将 AddCourseForm 的数据转换为 CourseInfoData 格式（匹配后端SSE格式）
      // 同时保留原有的 courseId 和 majorId，避免编辑后丢失
      const courseInfoData: CourseInfoData = {
        name: (data.name as string) || "",
        type: "course",
        metadata: {
          ...newMetadata,
          // 保留原有的课程ID和专业ID
          courseId: originalCourseId,
          majorId: originalMajorId,
        },
        children: (data.children as CourseInfoData["children"]) || [],
      }

      onNodeDataUpdate?.(editDialog.nodeId, courseInfoData)

      // 非自动保存时关闭抽屉
      if (!isAutoSave) {
        setEditDialog(prev => ({ ...prev, open: false }))
      }
    },
    [onNodeDataUpdate, editDialog.nodeId, editDialog.nodeData]
  )

  // 关闭编辑抽屉
  const handleEditCancel = useCallback(() => {
    setEditDialog(prev => ({ ...prev, open: false }))
  }, [])

  // ==================== 课点编辑处理函数 ====================

  // 处理课点面板编辑图标点击
  const handleCoursePointPanelEdit = useCallback(
    (panelId: string, focusTarget?: { pointId?: string; pointIndex?: number }) => {
      const childNodes = flowNodes.filter(n => n.parentId === panelId)
      const coursePoints: CoursePointCardData[] = childNodes.map(n => n.data as unknown as CoursePointCardData)
      coursePoints.sort((a, b) => (a.index || 0) - (b.index || 0))

      setCoursePointDrawer({
        open: true,
        panelId,
        coursePoints,
        focusPointId: focusTarget?.pointId || null,
        focusPointIndex: typeof focusTarget?.pointIndex === "number" ? focusTarget.pointIndex : null,
      })
    },
    [flowNodes]
  )

  // 处理课点编辑保存
  const handleCoursePointsSave = useCallback(
    async (coursePoints: CoursePointCardData[]) => {
      if (!coursePointDrawer.panelId) return

      const panelId = coursePointDrawer.panelId
      setIsSavingCoursePoints(true)
      setUpdatingPanelIds(prev => new Set(prev).add(panelId))

      try {
        onCoursePointsUpdate?.(panelId, coursePoints)
        await onEnsureLatestCanvasOssKey?.()

        setCoursePointDrawer({
          open: false,
          panelId: "",
          coursePoints: [],
          focusPointId: null,
          focusPointIndex: null,
        })
      } finally {
        setIsSavingCoursePoints(false)

        setTimeout(() => {
          setUpdatingPanelIds(prev => {
            const next = new Set(prev)
            next.delete(panelId)
            return next
          })
        }, 300)
      }
    },
    [coursePointDrawer.panelId, onCoursePointsUpdate, onEnsureLatestCanvasOssKey]
  )

  // 关闭课点编辑抽屉
  const handleCoursePointDrawerClose = useCallback(() => {
    setCoursePointDrawer({
      open: false,
      panelId: "",
      coursePoints: [],
      focusPointId: null,
      focusPointIndex: null,
    })
  }, [])

  // ==================== KSA编辑处理函数 ====================

  // 处理KSA面板编辑图标点击
  const handleKsaPanelEdit = useCallback(
    (panelId: string) => {
      const childNodes = flowNodes.filter(n => n.parentId === panelId)
      const ksaItems: KsaItemData[] = childNodes.map(n => n.data as unknown as KsaItemData)
      ksaItems.sort((a, b) => (a.index || 0) - (b.index || 0))

      setKsaDrawer({
        open: true,
        panelId,
        ksaItems,
      })
    },
    [flowNodes]
  )

  // 处理KSA编辑保存
  const handleKsaItemsSave = useCallback(
    (ksaItems: KsaItemData[]) => {
      if (!ksaDrawer.panelId) return

      const panelId = ksaDrawer.panelId
      setIsSavingKsa(true)
      setUpdatingPanelIds(prev => new Set(prev).add(panelId))

      setKsaDrawer({ open: false, panelId: "", ksaItems: [] })
      setIsSavingKsa(false)

      onKsaItemsUpdate?.(panelId, ksaItems)

      setTimeout(() => {
        setUpdatingPanelIds(prev => {
          const next = new Set(prev)
          next.delete(panelId)
          return next
        })
      }, 300)
    },
    [ksaDrawer.panelId, onKsaItemsUpdate]
  )

  // 关闭KSA编辑抽屉
  const handleKsaDrawerClose = useCallback(() => {
    setKsaDrawer({ open: false, panelId: "", ksaItems: [] })
  }, [])

  // ==================== 章节编辑处理函数 ====================

  // 处理章节面板编辑图标点击
  const handleChapterPanelEdit = useCallback(
    (panelId: string) => {
      const childNodes = flowNodes.filter(n => n.parentId === panelId)
      const chapters: ChapterCardData[] = childNodes.map(n => n.data as unknown as ChapterCardData)
      chapters.sort((a, b) => (a.index || 0) - (b.index || 0))

      setChapterDrawer({
        open: true,
        panelId,
        chapters,
      })
    },
    [flowNodes]
  )

  // 处理章节编辑保存
  const handleChaptersSave = useCallback(
    (chapters: ChapterCardData[]) => {
      if (!chapterDrawer.panelId) return

      const panelId = chapterDrawer.panelId
      setIsSavingChapters(true)
      setUpdatingPanelIds(prev => new Set(prev).add(panelId))

      setChapterDrawer({ open: false, panelId: "", chapters: [] })
      setIsSavingChapters(false)

      onChaptersUpdate?.(panelId, chapters)

      setTimeout(() => {
        setUpdatingPanelIds(prev => {
          const next = new Set(prev)
          next.delete(panelId)
          return next
        })
      }, 300)
    },
    [chapterDrawer.panelId, onChaptersUpdate]
  )

  // 关闭章节编辑抽屉
  const handleChapterDrawerClose = useCallback(() => {
    setChapterDrawer({ open: false, panelId: "", chapters: [] })
  }, [])

  // ==================== 教学目标编辑处理函数 ====================

  // 处理教学目标面板编辑图标点击
  const handleObjectivePanelEdit = useCallback(
    (panelId: string) => {
      const childNodes = flowNodes.filter(n => n.parentId === panelId)
      const objectives: ObjectiveCardData[] = childNodes.map(n => n.data as unknown as ObjectiveCardData)
      objectives.sort((a, b) => (a.index || 0) - (b.index || 0))

      setObjectiveDrawer({
        open: true,
        panelId,
        objectives,
      })
    },
    [flowNodes]
  )

  // 处理教学目标编辑保存
  const handleObjectivesSave = useCallback(
    (objectives: ObjectiveCardData[]) => {
      if (!objectiveDrawer.panelId) return

      const panelId = objectiveDrawer.panelId
      setIsSavingObjectives(true)
      setUpdatingPanelIds(prev => new Set(prev).add(panelId))

      onObjectivesUpdate?.(panelId, objectives)
      setObjectiveDrawer((prev) => ({
        ...prev,
        objectives,
      }))
      setIsSavingObjectives(false)

      setTimeout(() => {
        setUpdatingPanelIds(prev => {
          const next = new Set(prev)
          next.delete(panelId)
          return next
        })
      }, 300)
    },
    [objectiveDrawer.panelId, onObjectivesUpdate]
  )

  // 关闭教学目标编辑抽屉
  const handleObjectiveDrawerClose = useCallback(() => {
    setObjectiveDrawer({ open: false, panelId: "", objectives: [] })
  }, [])

  // ==================== 课程矩阵编辑处理函数 ====================

  // 处理课程矩阵节点编辑图标点击
  const handleCourseMatrixEdit = useCallback(
    (nodeId: string) => {
      const node = flowNodes.find(n => n.id === nodeId)
      if (node && node.type === FlowNodeType.COURSE_MATRIX) {
        const matrixData = node.data as unknown as CourseMatrixData
        setCourseMatrixDrawer({
          open: true,
          nodeId,
          matrixData,
        })
      }
    },
    [flowNodes]
  )

  // 处理课程矩阵编辑保存
  const handleCourseMatrixSave = useCallback(
    (matrixData: CourseMatrixData) => {
      if (!courseMatrixDrawer.nodeId) return

      const nodeId = courseMatrixDrawer.nodeId
      setIsSavingCourseMatrix(true)

      setCourseMatrixDrawer({ open: false, nodeId: "", matrixData: null })
      setIsSavingCourseMatrix(false)

      onCourseMatrixUpdate?.(nodeId, matrixData)
    },
    [courseMatrixDrawer.nodeId, onCourseMatrixUpdate]
  )

  // 关闭课程矩阵编辑抽屉
  const handleCourseMatrixDrawerClose = useCallback(() => {
    setCourseMatrixDrawer({ open: false, nodeId: "", matrixData: null })
  }, [])

  // ==================== 项目矩阵编辑处理函数 ====================

  // 处理项目矩阵节点编辑图标点击
  const handleProjectMatrixEdit = useCallback(
    (nodeId: string) => {
      const node = flowNodes.find(n => n.id === nodeId)
      if (node && node.type === FlowNodeType.PROJECT_MATRIX) {
        const matrixData = node.data as unknown as ProjectMatrixData
        setProjectMatrixDrawer({
          open: true,
          nodeId,
          matrixData,
        })
      }
    },
    [flowNodes]
  )

  // 处理项目矩阵编辑保存
  const handleProjectMatrixSave = useCallback(
    (matrixData: ProjectMatrixData) => {
      if (!projectMatrixDrawer.nodeId) return

      const nodeId = projectMatrixDrawer.nodeId
      setIsSavingProjectMatrix(true)
      setUpdatingPanelIds(prev => new Set(prev).add(nodeId))

      setProjectMatrixDrawer({ open: false, nodeId: "", matrixData: null })
      setIsSavingProjectMatrix(false)

      onProjectMatrixUpdate?.(nodeId, matrixData)

      setTimeout(() => {
        setUpdatingPanelIds(prev => {
          const next = new Set(prev)
          next.delete(nodeId)
          return next
        })
      }, 300)
    },
    [projectMatrixDrawer.nodeId, onProjectMatrixUpdate]
  )

  // 关闭项目矩阵编辑抽屉
  const handleProjectMatrixDrawerClose = useCallback(() => {
    setProjectMatrixDrawer({ open: false, nodeId: "", matrixData: null })
  }, [])

  // ==================== 开课报告预览处理函数 ====================

  // 处理开课报告节点编辑图标点击
  const handleCourseReportEdit = useCallback((nodeId: string) => {
      setCourseReportDrawer({
        open: true,
        nodeId,
      })
    },
    []
  )

  // 关闭开课报告预览抽屉
  const handleCourseReportDrawerClose = useCallback(() => {
    setCourseReportDrawer({ open: false, nodeId: "" })
  }, [])

  // ==================== 源文档编辑处理函数 ====================

  // 处理源文档卡片编辑按钮点击
  const handleSourceDocumentEdit = useCallback(
    (nodeId: string) => {
      const node = flowNodes.find(n => n.id === nodeId)
      if (node) {
        setSourceDocumentDrawer({
          open: true,
          document: node.data as unknown as SourceDocumentCardData,
        })
      }
    },
    [flowNodes]
  )

  // 处理源文档编辑保存
  const handleSourceDocumentSave = useCallback(
    (document: SourceDocumentCardData) => {
      setIsSavingSourceDocument(true)
      onSourceDocumentUpdate?.(document)
      setIsSavingSourceDocument(false)
      setSourceDocumentDrawer({ open: false, document: null })
    },
    [onSourceDocumentUpdate]
  )

  // 处理源文档重做（重新解析）
  const handleSourceDocumentRegenerate = useCallback(
    (document: SourceDocumentCardData) => {
      setIsRegeneratingSourceDocument(true)
      onSourceDocumentRegenerate?.(document)
      // 注意：重做完成后需要外部调用来重置状态
      // 这里不自动关闭抽屉，等待重做完成后由外部处理
    },
    [onSourceDocumentRegenerate]
  )

  // 关闭源文档编辑抽屉
  const handleSourceDocumentDrawerClose = useCallback(() => {
    setSourceDocumentDrawer({ open: false, document: null })
    setIsRegeneratingSourceDocument(false)
  }, [])

  // ==================== 专业矩阵编辑处理函数 ====================

  // 处理专业矩阵面板编辑图标点击
  const handleGraduationSupportPanelEdit = useCallback(
    (panelId: string) => {
      const node = flowNodes.find(n => n.id === panelId)
      const nodeData = node ? (node.data as unknown as GraduationSupportData) : null

      setGraduationSupportDrawer({
        open: true,
        panelId,
        data: nodeData || { id: panelId },
      })
    },
    [flowNodes]
  )

  // 处理专业矩阵编辑保存
  const handleGraduationSupportSave = useCallback(
    (data: GraduationSupportData) => {
      if (!graduationSupportDrawer.panelId) return

      const panelId = graduationSupportDrawer.panelId
      setIsSavingGraduationSupport(true)
      setUpdatingPanelIds(prev => new Set(prev).add(panelId))

      // 直接更新节点数据，使面板组件重新渲染支撑标签
      onNodeDataUpdate?.(panelId, data)

      setGraduationSupportDrawer({ open: false, panelId: "", data: null })
      setIsSavingGraduationSupport(false)

      // 通知外部（用于持久化等）
      onGraduationSupportUpdate?.(panelId, data)

      setTimeout(() => {
        setUpdatingPanelIds(prev => {
          const next = new Set(prev)
          next.delete(panelId)
          return next
        })
      }, 300)
    },
    [graduationSupportDrawer.panelId, onNodeDataUpdate, onGraduationSupportUpdate]
  )

  // 关闭专业矩阵编辑抽屉
  const handleGraduationSupportDrawerClose = useCallback(() => {
    setGraduationSupportDrawer({ open: false, panelId: "", data: null })
  }, [])

  return {
    // 状态
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

    // 编辑弹窗处理函数
    handleNodeEdit,
    handleEditSave,
    handleEditCancel,

    // 课点编辑处理函数
    handleCoursePointPanelEdit,
    handleCoursePointsSave,
    handleCoursePointDrawerClose,

    // KSA编辑处理函数
    handleKsaPanelEdit,
    handleKsaItemsSave,
    handleKsaDrawerClose,

    // 章节编辑处理函数
    handleChapterPanelEdit,
    handleChaptersSave,
    handleChapterDrawerClose,

    // 教学目标编辑处理函数
    handleObjectivePanelEdit,
    handleObjectivesSave,
    handleObjectiveDrawerClose,

    // 课程矩阵编辑处理函数
    handleCourseMatrixEdit,
    handleCourseMatrixSave,
    handleCourseMatrixDrawerClose,

    // 项目矩阵编辑处理函数
    handleProjectMatrixEdit,
    handleProjectMatrixSave,
    handleProjectMatrixDrawerClose,

    // 开课报告预览处理函数
    handleCourseReportEdit,
    handleCourseReportDrawerClose,

    // 源文档编辑处理函数
    sourceDocumentDrawer,
    isSavingSourceDocument,
    isRegeneratingSourceDocument,
    handleSourceDocumentEdit,
    handleSourceDocumentSave,
    handleSourceDocumentRegenerate,
    handleSourceDocumentDrawerClose,

    // 专业矩阵编辑处理函数
    graduationSupportDrawer,
    isSavingGraduationSupport,
    handleGraduationSupportPanelEdit,
    handleGraduationSupportSave,
    handleGraduationSupportDrawerClose,
  }
}
