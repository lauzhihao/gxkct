"use client"

import { memo, useMemo } from "react"
import type { Node } from "@xyflow/react"
import { FlowNodeType } from "../flow/utils/types"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"
import { AddCourseForm } from "../add-course-form"
import { CanvasCoursePointEditor } from "../canvas-course-point-editor"
import { CanvasKsaEditor } from "../canvas-ksa-editor"
import { CanvasChapterEditor } from "../canvas-chapter-editor"
import { CanvasObjectiveEditor } from "../canvas-objective-editor"
import type { CanvasObjectiveGroup } from "../canvas-objective-editor"
import { CanvasCourseMatrixEditor } from "../canvas-course-matrix-editor"
import { CanvasProjectMatrixEditor } from "../canvas-project-matrix-editor"
import { CanvasCourseReportPreview } from "../canvas-course-report-preview"
import { CanvasSourceDocumentEditor } from "../canvas-source-document-editor"
import { CanvasGraduationSupportEditor } from "../canvas-graduation-support-editor"
import type {
  CoursePointCardData,
  KsaItemData,
  ChapterCardData,
  ObjectiveCardData,
  ObjectiveSupportLabel,
  CourseMatrixData,
  ProjectMatrixData,
  CourseInfoData,
  CanvasElementData,
  SourceDocumentCardData,
  GraduationSupportData,
} from "../canvas-elements/types"
import type { TreeNode } from "@/types"
import type {
  EditDialogState,
  CoursePointDrawerState,
  KsaDrawerState,
  ChapterDrawerState,
  ObjectiveDrawerState,
  CourseMatrixDrawerState,
  ProjectMatrixDrawerState,
  CourseReportDrawerState,
  SourceDocumentDrawerState,
  GraduationSupportDrawerState,
} from "@/shared/hooks/use-canvas-drawers"
import { getKsaReferenceId } from "@/shared/utils/ksa"
import type { CourseReportPreviewData } from "../canvas-course-report-preview"

type ObjectiveSupportItem = NonNullable<ObjectiveCardData["supports"]>[number]
type ObjectiveSupportWarningMap = Record<string, string[]>

interface GraduationIndicatorMeta {
  requirementId: number
  requirementIndex: number
  indicatorIndex: number
  code: string
  description: string
  requirementContent: string
  supportLevel?: "strong" | "weak"
}

function normalizeTextValue(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function resolveObjectiveSupportType(
  rawType: ObjectiveSupportItem["type"],
  fallbackType: GraduationIndicatorMeta["supportLevel"]
): ObjectiveSupportItem["type"] {
  if (rawType === "strong" || rawType === "weak") {
    return rawType
  }

  if (fallbackType === "strong" || fallbackType === "weak") {
    return fallbackType
  }

  return undefined
}

function buildGraduationIndicatorMetaMap(
  graduationSupportData: GraduationSupportData | null
): Map<number, GraduationIndicatorMeta> {
  const indicatorMetaById = new Map<number, GraduationIndicatorMeta>()

  if (!graduationSupportData || !Array.isArray(graduationSupportData.requirements)) {
    return indicatorMetaById
  }

  graduationSupportData.requirements.forEach((requirement, requirementIndex) => {
    if (!Array.isArray(requirement.indicators)) {
      return
    }

    requirement.indicators.forEach((indicator, indicatorIndex) => {
      if (typeof indicator.id !== "number" || !Number.isFinite(indicator.id) || indicator.id <= 0) {
        return
      }

      indicatorMetaById.set(indicator.id, {
        requirementId: requirement.id,
        requirementIndex,
        indicatorIndex,
        code: `${requirementIndex + 1}.${indicatorIndex + 1}`,
        description: normalizeTextValue(indicator.description),
        requirementContent: normalizeTextValue(requirement.content),
        supportLevel: indicator.supportLevel,
      })
    })
  })

  return indicatorMetaById
}

function buildInitialObjectiveGroups(
  graduationSupportData: GraduationSupportData | null
): CanvasObjectiveGroup[] {
  if (!graduationSupportData || !Array.isArray(graduationSupportData.requirements)) {
    return []
  }

  return graduationSupportData.requirements.flatMap((requirement, requirementIndex) => {
    if (!Array.isArray(requirement.indicators)) {
      return []
    }

    return [{
      requirementId: requirement.id,
      requirementOrder: requirementIndex + 1,
      requirementDescription: normalizeTextValue(requirement.content),
      indicators: requirement.indicators
        .filter((indicator) => (
          typeof indicator.id === "number" && Number.isFinite(indicator.id) && indicator.id > 0
        ))
        .map((indicator, indicatorIndex) => ({
          indicatorId: indicator.id,
          indicatorCode: `${requirementIndex + 1}.${indicatorIndex + 1}`,
          indicatorDescription: normalizeTextValue(indicator.description),
          indicatorOrder: indicatorIndex + 1,
          objectiveIds: [],
        })),
    }]
  })
}

function buildObjectiveDrawerDisplayData(
  objectives: ObjectiveCardData[],
  graduationSupportData: GraduationSupportData | null
): {
  objectives: ObjectiveCardData[]
  supportWarnings: ObjectiveSupportWarningMap
  objectiveGroups: CanvasObjectiveGroup[]
  ungroupedObjectiveIds: string[]
} {
  const indicatorMetaById = buildGraduationIndicatorMetaMap(graduationSupportData)
  const supportWarnings: ObjectiveSupportWarningMap = {}
  const requirementGroupMap = new Map<number, CanvasObjectiveGroup>(
    buildInitialObjectiveGroups(graduationSupportData).map((group) => [group.requirementId, group])
  )
  const ungroupedObjectiveIds = new Set<string>()

  const normalizedObjectives = objectives.map((objective) => {
    const rawSupports = Array.isArray(objective.supports) ? objective.supports : null
    const objectiveWarnings: string[] = []
    let hasValidGrouping = false

    if (rawSupports === null || rawSupports.length === 0) {
      supportWarnings[objective.id] = [
        "该教学目标缺少归属的毕业要求指标点信息，当前更新课程时会被保存校验拦截。",
      ]
      ungroupedObjectiveIds.add(objective.id)
      return objective
    }

    const normalizedSupports: ObjectiveSupportLabel[] = rawSupports.map((support, supportIndex) => {
      const indicatorId = typeof support?.indicatorId === "number"
        && Number.isFinite(support.indicatorId)
        && support.indicatorId > 0
        ? support.indicatorId
        : null
      const rawTitle = normalizeTextValue(support?.title)

      if (indicatorId === null) {
        const warningDetail = rawTitle.length > 0
          ? `，原始标签为“${rawTitle}”`
          : ""
        objectiveWarnings.push(`第 ${supportIndex + 1} 条归属信息缺少有效的指标点 ID${warningDetail}。`)
        return support
      }

      const indicatorMeta = indicatorMetaById.get(indicatorId)
      if (!indicatorMeta) {
        objectiveWarnings.push(
          `指标点 ID ${indicatorId} 未在当前毕业要求面板中找到，请检查课程所属专业或画布数据是否已同步。`
        )
        return support
      }

      const descParts: string[] = []
      if (indicatorMeta.requirementContent.length > 0) {
        descParts.push(`毕业要求：${indicatorMeta.requirementContent}`)
      }
      if (indicatorMeta.description.length > 0) {
        descParts.push(`指标点：${indicatorMeta.description}`)
      }

      const normalizedSupport: ObjectiveSupportLabel = {
        indicatorId,
        title: `指标点 ${indicatorMeta.code}`,
        type: resolveObjectiveSupportType(support?.type, indicatorMeta.supportLevel),
      }

      const existingRequirementGroup = requirementGroupMap.get(indicatorMeta.requirementId)
      const nextRequirementGroup = existingRequirementGroup ?? {
        requirementId: indicatorMeta.requirementId,
        requirementOrder: indicatorMeta.requirementIndex + 1,
        requirementDescription: indicatorMeta.requirementContent,
        indicators: [],
      }

      let indicatorGroup = nextRequirementGroup.indicators.find((item) => item.indicatorId === indicatorId)
      if (!indicatorGroup) {
        indicatorGroup = {
          indicatorId,
          indicatorCode: indicatorMeta.code,
          indicatorDescription: indicatorMeta.description,
          indicatorOrder: indicatorMeta.indicatorIndex + 1,
          objectiveIds: [],
        }
        nextRequirementGroup.indicators.push(indicatorGroup)
      }

      if (!indicatorGroup.objectiveIds.includes(objective.id)) {
        indicatorGroup.objectiveIds.push(objective.id)
      }

      if (!existingRequirementGroup) {
        requirementGroupMap.set(indicatorMeta.requirementId, nextRequirementGroup)
      }
      hasValidGrouping = true

      if (descParts.length > 0) {
        normalizedSupport.desc = descParts.join("；")
      } else {
        const rawDesc = normalizeTextValue(support?.desc)
        if (rawDesc.length > 0) {
          normalizedSupport.desc = rawDesc
        }
      }

      return normalizedSupport
    })

    if (objectiveWarnings.length > 0) {
      supportWarnings[objective.id] = objectiveWarnings
    }
    if (!hasValidGrouping) {
      ungroupedObjectiveIds.add(objective.id)
    }

    return {
      ...objective,
      supports: normalizedSupports,
    }
  })

  return {
    objectives: normalizedObjectives,
    supportWarnings,
    objectiveGroups: Array.from(requirementGroupMap.values()),
    ungroupedObjectiveIds: Array.from(ungroupedObjectiveIds),
  }
}

/**
 * CanvasDrawers 组件属性
 */
export interface CanvasDrawersProps {
  // 节点列表（用于获取可用的课点/KSA列表）
  flowNodes: Node[]

  // 编辑弹窗状态和处理函数
  editDialog: EditDialogState
  setEditDialog: React.Dispatch<React.SetStateAction<EditDialogState>>
  onEditSave: (courseData: Record<string, unknown>, isAutoSave?: boolean) => void
  onEditCancel: () => void

  // 课点编辑抽屉状态和处理函数
  coursePointDrawer: CoursePointDrawerState
  isSavingCoursePoints: boolean
  onCoursePointsSave: (coursePoints: CoursePointCardData[]) => Promise<void> | void
  onCoursePointDrawerClose: () => void

  // KSA编辑抽屉状态和处理函数
  ksaDrawer: KsaDrawerState
  isSavingKsa: boolean
  onKsaItemsSave: (ksaItems: KsaItemData[]) => void
  onKsaDrawerClose: () => void

  // 章节编辑抽屉状态和处理函数
  chapterDrawer: ChapterDrawerState
  isSavingChapters: boolean
  onChaptersSave: (chapters: ChapterCardData[]) => void
  onChapterDrawerClose: () => void

  // 教学目标编辑抽屉状态和处理函数
  objectiveDrawer: ObjectiveDrawerState
  isSavingObjectives: boolean
  onObjectivesSave: (objectives: ObjectiveCardData[]) => void
  onObjectiveDrawerClose: () => void

  // 课程矩阵编辑抽屉状态和处理函数
  courseMatrixDrawer: CourseMatrixDrawerState
  isSavingCourseMatrix: boolean
  onCourseMatrixSave: (matrixData: CourseMatrixData) => void
  onCourseMatrixDrawerClose: () => void

  // 项目矩阵编辑抽屉状态和处理函数
  projectMatrixDrawer: ProjectMatrixDrawerState
  isSavingProjectMatrix: boolean
  onProjectMatrixSave: (matrixData: ProjectMatrixData) => void
  onProjectMatrixDrawerClose: () => void

  // 开课说明预览抽屉状态和处理函数
  courseReportDrawer: CourseReportDrawerState
  onCourseReportDrawerClose: () => void

  // 源文档编辑抽屉状态和处理函数
  sourceDocumentDrawer: SourceDocumentDrawerState
  isSavingSourceDocument: boolean
  isRegeneratingSourceDocument: boolean
  onSourceDocumentSave: (document: SourceDocumentCardData) => void
  onSourceDocumentRegenerate: (document: SourceDocumentCardData) => void
  onSourceDocumentDrawerClose: () => void

  // 专业矩阵编辑抽屉状态和处理函数
  graduationSupportDrawer: GraduationSupportDrawerState
  isSavingGraduationSupport: boolean
  onGraduationSupportSave: (data: GraduationSupportData) => void
  onGraduationSupportDrawerClose: () => void

  // 保存向导所需的数据
  canvasElements?: CanvasElementData[]
  canvasOssKey?: string | null
  treeData?: TreeNode | null
  onSaveSuccess?: (majorId: string, courseId: string) => void
  onUpdateCourseInfo?: (updates: {
    courseId?: number
    majorId?: number
    objectives?: ObjectiveCardData[]
    coursePoints?: CoursePointCardData[]
    chapters?: ChapterCardData[]
    ksaItems?: KsaItemData[]
  }) => void
  onEnsureLatestCanvasOssKey?: () => Promise<string | null>
  lockGraduationSupportOrganization?: boolean
}

function buildCourseReportPreviewData(flowNodes: Node[]): CourseReportPreviewData {
  const courseInfoNode = flowNodes.find((node) => node.type === FlowNodeType.COURSE_INFO)
  const courseInfo = courseInfoNode ? (courseInfoNode.data as CourseInfoData) : null

  const objectivePanelNode = flowNodes.find((node) => node.type === FlowNodeType.OBJECTIVE_PANEL)
  const objectives = objectivePanelNode
    ? flowNodes
        .filter((node) => node.parentId === objectivePanelNode.id)
        .map((node) => node.data as ObjectiveCardData)
        .sort((left, right) => left.index - right.index)
    : []

  const chapterPanelNode = flowNodes.find((node) => node.type === FlowNodeType.CHAPTER_PANEL)
  const chapters = chapterPanelNode
    ? flowNodes
        .filter((node) => node.parentId === chapterPanelNode.id)
        .map((node) => node.data as ChapterCardData)
        .sort((left, right) => left.index - right.index)
    : []

  const coursePointPanelNode = flowNodes.find((node) => node.type === FlowNodeType.COURSE_POINT_PANEL)
  const coursePoints = coursePointPanelNode
    ? flowNodes
        .filter((node) => node.parentId === coursePointPanelNode.id)
        .map((node) => node.data as CoursePointCardData)
        .sort((left, right) => left.index - right.index)
    : []

  const ksaPanelNode = flowNodes.find((node) => node.type === FlowNodeType.KSA_PANEL)
  const ksaItems = ksaPanelNode
    ? flowNodes
        .filter((node) => node.parentId === ksaPanelNode.id)
        .map((node) => node.data as KsaItemData)
        .sort((left, right) => {
          const categoryOrder: Record<string, number> = { K: 0, S: 1, A: 2 }
          const categoryDiff = categoryOrder[left.category] - categoryOrder[right.category]
          return categoryDiff !== 0 ? categoryDiff : left.index - right.index
        })
    : []

  const courseMatrixNode = flowNodes.find((node) => node.type === FlowNodeType.COURSE_MATRIX)
  const courseMatrix = courseMatrixNode ? (courseMatrixNode.data as CourseMatrixData) : null

  const projectMatrices = flowNodes
    .filter((node) => node.type === FlowNodeType.PROJECT_MATRIX)
    .map((node) => node.data as ProjectMatrixData)
    .sort((left, right) => left.chapter_index - right.chapter_index)

  return {
    courseInfo,
    objectives,
    chapters,
    coursePoints,
    ksaItems,
    courseMatrix,
    projectMatrices,
  }
}

/**
 * 画布抽屉组件集合
 * 统一渲染所有编辑抽屉
 */
export const CanvasDrawers = memo(function CanvasDrawers({
  flowNodes,
  editDialog,
  setEditDialog,
  onEditSave,
  onEditCancel,
  coursePointDrawer,
  isSavingCoursePoints,
  onCoursePointsSave,
  onCoursePointDrawerClose,
  ksaDrawer,
  isSavingKsa,
  onKsaItemsSave,
  onKsaDrawerClose,
  chapterDrawer,
  isSavingChapters,
  onChaptersSave,
  onChapterDrawerClose,
  objectiveDrawer,
  isSavingObjectives,
  onObjectivesSave,
  onObjectiveDrawerClose,
  courseMatrixDrawer,
  isSavingCourseMatrix,
  onCourseMatrixSave,
  onCourseMatrixDrawerClose,
  projectMatrixDrawer,
  isSavingProjectMatrix,
  onProjectMatrixSave,
  onProjectMatrixDrawerClose,
  courseReportDrawer,
  onCourseReportDrawerClose,
  sourceDocumentDrawer,
  isSavingSourceDocument,
  isRegeneratingSourceDocument,
  onSourceDocumentSave,
  onSourceDocumentRegenerate,
  onSourceDocumentDrawerClose,
  graduationSupportDrawer,
  isSavingGraduationSupport,
  onGraduationSupportSave,
  onGraduationSupportDrawerClose,
  canvasElements = [],
  canvasOssKey = null,
  treeData = null,
  onSaveSuccess,
  onUpdateCourseInfo,
  onEnsureLatestCanvasOssKey,
  lockGraduationSupportOrganization = false,
}: CanvasDrawersProps) {
  // 获取课程信息数据
  const courseInfoData = editDialog.nodeData as CourseInfoData
  const courseReportPreviewData = useMemo(() => buildCourseReportPreviewData(flowNodes), [flowNodes])
  const graduationSupportNode = useMemo(
    () => flowNodes.find((node) => node.type === FlowNodeType.GRADUATION_SUPPORT_PANEL),
    [flowNodes]
  )
  const objectiveDrawerDisplayData = useMemo(
    () => buildObjectiveDrawerDisplayData(
      objectiveDrawer.objectives,
      graduationSupportNode ? (graduationSupportNode.data as GraduationSupportData) : null
    ),
    [graduationSupportNode, objectiveDrawer.objectives]
  )

  // 获取可用的课点列表（用于课程矩阵编辑器）
  const availableCoursePoints = flowNodes
    .filter(n => n.type === FlowNodeType.COURSE_POINT)
    .map(n => {
      const data = n.data as unknown as CoursePointCardData
      return {
        id: n.id,
        name: data.name || data.content || "",
        description: typeof data.description === 'string' ? data.description : undefined,
        originalId: data.originalId,
      }
    })

  // 获取可用的KSA列表（用于项目矩阵编辑器）
  const availableKsaItems = flowNodes
    .filter(n => n.type === FlowNodeType.KSA)
    .map(n => {
      const data = n.data as unknown as KsaItemData
      return {
        id: getKsaReferenceId(data) || String(data.id || n.id),
        rawId: String(data.id || ""),
        originalId: data.originalId,
        name: data.content,
        content: data.content,
        category: data.category,
        index: data.index,
        description: data.content,
      }
    })

  return (
    <>
      {/* 课程信息编辑抽屉 */}
      <Sheet
        open={editDialog.open && editDialog.nodeType === FlowNodeType.COURSE_INFO}
        onOpenChange={(open) => setEditDialog(prev => ({ ...prev, open }))}
      >
        <SheetContent side="right" className="w-[800px] sm:max-w-[800px] p-0 overflow-y-auto">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>编辑课程信息</SheetTitle>
          </SheetHeader>
          {editDialog.nodeType === FlowNodeType.COURSE_INFO && (
            <div className="p-6">
              <AddCourseForm
                majorId=""
                isEditMode={true}
                hideChapterSectionInEdit={true}
                allowHourFieldEdit={true}
                initialData={{
                  name: courseInfoData.name || "",
                  courseType: courseInfoData.metadata?.courseType || "必修",
                  courseNatureId: courseInfoData.metadata?.courseNatureId || 0,
                  introduction: courseInfoData.metadata?.introduction || "",
                  // [MOD] 移除 openingDate，由表单自动获取当前学期
                  theoryPeriod: courseInfoData.metadata?.theoryPeriod ?? 0,
                  practicePeriod: courseInfoData.metadata?.practicePeriod ?? 0,
                  teachingClass: courseInfoData.metadata?.teachingClass || "",
                  teachingLocation: courseInfoData.metadata?.teachingLocation || "",
                  teachingTime: courseInfoData.metadata?.teachingTime || "",
                  studentCount: courseInfoData.metadata?.studentCount || 0,
                  credits: courseInfoData.metadata?.credits || 0,
                  mainTextbook: courseInfoData.metadata?.mainTextbook || "",
                  referenceResources: courseInfoData.metadata?.referenceResources || "",
                  attendancePolicy: courseInfoData.metadata?.attendancePolicy || "",
                  assignmentPolicy: courseInfoData.metadata?.assignmentPolicy || "",
                  conductRequirements: courseInfoData.metadata?.conductRequirements || "",
                  practiceRequirements: courseInfoData.metadata?.practiceRequirements || "",
                  teamworkRequirements: courseInfoData.metadata?.teamworkRequirements || "",
                  bonusRequirements: courseInfoData.metadata?.bonusRequirements || "",
                  otherSuggestions: courseInfoData.metadata?.otherSuggestions || "",
                  assessmentMethod: courseInfoData.metadata?.assessmentMethod || "考试",
                  assessmentForm: courseInfoData.metadata?.assessmentForm || "",
                  scoreType: courseInfoData.metadata?.scoreType || "百分制",
                  scoreTable: courseInfoData.metadata?.scoreTable,
                  assessmentDescription: courseInfoData.metadata?.assessmentDescription || "",
                  teachingObjectives: courseInfoData.metadata?.teachingObjectives,
                  coursePoints: courseInfoData.metadata?.coursePoints,
                  chapters: courseInfoData.metadata?.chapters,
                }}
                onCancel={onEditCancel}
                onSubmit={onEditSave}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 课点编辑抽屉 */}
      <Sheet
        open={coursePointDrawer.open}
        onOpenChange={(open) => {
          if (!open && !isSavingCoursePoints) {
            onCoursePointDrawerClose()
          }
        }}
      >
        <SheetContent side="right" className="w-[700px] sm:max-w-[700px] p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <SheetTitle>编辑课点列表</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <CanvasCoursePointEditor
              coursePoints={coursePointDrawer.coursePoints}
              focusPointId={coursePointDrawer.focusPointId}
              focusPointIndex={coursePointDrawer.focusPointIndex}
              onSave={onCoursePointsSave}
              onClose={onCoursePointDrawerClose}
              isSaving={isSavingCoursePoints}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* KSA编辑抽屉 */}
      <Sheet
        open={ksaDrawer.open}
        onOpenChange={(open) => {
          if (!open) {
            onKsaDrawerClose()
          }
        }}
      >
        <SheetContent side="right" className="w-[900px] sm:max-w-[900px] p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <SheetTitle>编辑KSA列表</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <CanvasKsaEditor
              ksaItems={ksaDrawer.ksaItems}
              onSave={onKsaItemsSave}
              onClose={onKsaDrawerClose}
              isSaving={isSavingKsa}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* 章节编辑抽屉 */}
      <Sheet
        open={chapterDrawer.open}
        onOpenChange={(open) => {
          if (!open) {
            onChapterDrawerClose()
          }
        }}
      >
        <SheetContent side="right" className="w-[700px] sm:max-w-[700px] p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <SheetTitle>编辑章节列表</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <CanvasChapterEditor
              chapters={chapterDrawer.chapters}
              onSave={onChaptersSave}
              onClose={onChapterDrawerClose}
              isSaving={isSavingChapters}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* 教学目标编辑抽屉 */}
      <Sheet
        open={objectiveDrawer.open}
        onOpenChange={(open) => {
          if (!open) {
            onObjectiveDrawerClose()
          }
        }}
      >
        <SheetContent side="right" className="w-[700px] sm:max-w-[700px] p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <SheetTitle>编辑教学目标</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <CanvasObjectiveEditor
              objectives={objectiveDrawerDisplayData.objectives}
              objectiveGroups={objectiveDrawerDisplayData.objectiveGroups}
              ungroupedObjectiveIds={objectiveDrawerDisplayData.ungroupedObjectiveIds}
              supportWarnings={objectiveDrawerDisplayData.supportWarnings}
              onSave={onObjectivesSave}
              onClose={onObjectiveDrawerClose}
              isSaving={isSavingObjectives}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* 课程矩阵编辑抽屉 - 从底部弹出 */}
      <Sheet
        open={courseMatrixDrawer.open}
        onOpenChange={(open) => {
          if (!open) {
            onCourseMatrixDrawerClose()
          }
        }}
      >
        <SheetContent side="bottom" className="h-[70vh] p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>编辑课程矩阵</SheetTitle>
          </SheetHeader>
          {courseMatrixDrawer.matrixData && (
            <CanvasCourseMatrixEditor
              matrixData={courseMatrixDrawer.matrixData}
              availableCoursePoints={availableCoursePoints}
              onSave={onCourseMatrixSave}
              onClose={onCourseMatrixDrawerClose}
              isSaving={isSavingCourseMatrix}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* 项目矩阵编辑抽屉 - 从底部弹出 */}
      <Sheet
        open={projectMatrixDrawer.open}
        onOpenChange={(open) => {
          if (!open) {
            onProjectMatrixDrawerClose()
          }
        }}
      >
        <SheetContent side="bottom" className="h-[70vh] p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>编辑项目矩阵</SheetTitle>
          </SheetHeader>
          {projectMatrixDrawer.matrixData && (
            <CanvasProjectMatrixEditor
              matrixData={projectMatrixDrawer.matrixData}
              availableKsaItems={availableKsaItems}
              onSave={onProjectMatrixSave}
              onClose={onProjectMatrixDrawerClose}
              isSaving={isSavingProjectMatrix}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* 开课说明预览抽屉 */}
      <Sheet
        open={courseReportDrawer.open}
        onOpenChange={(open) => {
          if (!open) {
            onCourseReportDrawerClose()
          }
        }}
      >
        <SheetContent side="right" className="w-[800px] sm:max-w-[800px] p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <SheetTitle>开课说明预览</SheetTitle>
          </SheetHeader>
          {courseReportDrawer.open && (
            <div className="flex-1 min-h-0 flex flex-col">
              <CanvasCourseReportPreview
                key={courseReportDrawer.nodeId || "course-report-preview"}
                data={courseReportPreviewData}
                onClose={onCourseReportDrawerClose}
                canvasElements={canvasElements}
                canvasOssKey={canvasOssKey}
                treeData={treeData}
                onSaveSuccess={onSaveSuccess}
                onUpdateCourseInfo={onUpdateCourseInfo}
                onEnsureLatestCanvasOssKey={onEnsureLatestCanvasOssKey}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 源文档编辑抽屉 */}
      <Sheet
        open={sourceDocumentDrawer.open}
        onOpenChange={(open) => {
          if (!open) {
            onSourceDocumentDrawerClose()
          }
        }}
      >
        <SheetContent side="right" className="w-[700px] sm:max-w-[700px] p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>编辑源文档</SheetTitle>
          </SheetHeader>
          {sourceDocumentDrawer.document && (
            <CanvasSourceDocumentEditor
              document={sourceDocumentDrawer.document}
              onSave={onSourceDocumentSave}
              onClose={onSourceDocumentDrawerClose}
              onRegenerate={onSourceDocumentRegenerate}
              isSaving={isSavingSourceDocument}
              isRegenerating={isRegeneratingSourceDocument}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* 专业矩阵编辑抽屉 */}
      <Sheet
        open={graduationSupportDrawer.open}
        onOpenChange={(open) => {
          if (!open) {
            onGraduationSupportDrawerClose()
          }
        }}
      >
        <SheetContent side="right" className="w-[800px] sm:max-w-[800px] p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>编辑专业矩阵</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            {graduationSupportDrawer.data && (
              <CanvasGraduationSupportEditor
                data={graduationSupportDrawer.data}
                onSave={onGraduationSupportSave}
                onClose={onGraduationSupportDrawerClose}
                isSaving={isSavingGraduationSupport}
                lockOrganizationSelection={lockGraduationSupportOrganization}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
})

export default CanvasDrawers

// 导出类型
export type { CourseReportPreviewData }
