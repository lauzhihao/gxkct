"use client"

import { memo } from "react"
import type { Node } from "@xyflow/react"
import { FlowNodeType } from "../flow/utils/types"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"
import { AddCourseForm } from "../add-course-form"
import { CanvasCoursePointEditor } from "../canvas-course-point-editor"
import { CanvasKsaEditor } from "../canvas-ksa-editor"
import { CanvasChapterEditor } from "../canvas-chapter-editor"
import { CanvasObjectiveEditor } from "../canvas-objective-editor"
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
import type { CourseReportPreviewData } from "../canvas-course-report-preview"

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
  onCoursePointsSave: (coursePoints: CoursePointCardData[]) => void
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

  // 开课报告预览抽屉状态和处理函数
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
  onUpdateCourseInfo?: (updates: { courseId?: number; majorId?: number }) => void
  lockGraduationSupportOrganization?: boolean
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
  lockGraduationSupportOrganization = false,
}: CanvasDrawersProps) {
  // 获取课程信息数据
  const courseInfoData = editDialog.nodeData as CourseInfoData

  // 获取可用的课点列表（用于课程矩阵编辑器）
  const availableCoursePoints = flowNodes
    .filter(n => n.type === FlowNodeType.COURSE_POINT)
    .map(n => {
      const data = n.data as unknown as CoursePointCardData
      return {
        id: n.id,
        name: data.name || data.content || "",
        description: typeof data.description === 'string' ? data.description : undefined,
      }
    })

  // 获取可用的KSA列表（用于项目矩阵编辑器）
  const availableKsaItems = flowNodes
    .filter(n => n.type === FlowNodeType.KSA)
    .map(n => ({
      id: n.id,
      name: (n.data as unknown as KsaItemData).content,
      category: (n.data as unknown as KsaItemData).category,
      index: (n.data as unknown as KsaItemData).index,
      description: (n.data as unknown as KsaItemData).content,
    }))

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
                initialData={{
                  name: courseInfoData.name || "",
                  courseType: courseInfoData.metadata?.courseType || "必修",
                  courseNatureId: courseInfoData.metadata?.courseNatureId || 0,
                  introduction: courseInfoData.metadata?.introduction || "",
                  openingDate: courseInfoData.metadata?.openingDate || "",
                  theoryPeriod: courseInfoData.metadata?.theoryPeriod || 0,
                  practicePeriod: courseInfoData.metadata?.practicePeriod || 0,
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
          if (!open) {
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
          <div className="flex-1 overflow-hidden">
            <CanvasObjectiveEditor
              objectives={objectiveDrawer.objectives}
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

      {/* 开课报告预览抽屉 */}
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
            <SheetTitle>开课报告预览</SheetTitle>
          </SheetHeader>
          {courseReportDrawer.data && (
            <div className="flex-1 min-h-0 flex flex-col">
              <CanvasCourseReportPreview
                data={courseReportDrawer.data}
                onClose={onCourseReportDrawerClose}
                canvasElements={canvasElements}
                canvasOssKey={canvasOssKey}
                treeData={treeData}
                onSaveSuccess={onSaveSuccess}
                onUpdateCourseInfo={onUpdateCourseInfo}
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
