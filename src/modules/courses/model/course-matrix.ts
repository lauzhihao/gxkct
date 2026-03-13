import type { TreeNode } from "@/types"
import type { CourseGoal } from "@/lib/api/course-goals-api"
import type { CoursePoint as ApiCoursePoint } from "@/lib/api/course-points-api"
import type { ProjectTeachGoalData } from "@/lib/api/project-teach-goal-api"
import type { ReactNode, Dispatch, SetStateAction, DragEvent } from "react"

type Setter<T> = Dispatch<SetStateAction<T>>

export type SupportStrength = "strong" | "weak"

export interface TeachingObjectiveMajorIndicator {
  indicatorId: string
  requirementId: string
  requirementDescription: string
  indicatorDescription: string
  supportLevel: SupportStrength
}

export interface CourseMatrixPointItem {
  id: string
  matrixItemId: number
  name: string
  description: string
  support: SupportStrength
}

export type CourseMatrixRecord = Record<string, CourseMatrixPointItem[]>

export interface SelectedMatrixCell {
  projectId: string
  graduateRequireId: string
}

export interface TeachingObjectiveFilterData {
  majorIndicators: TeachingObjectiveMajorIndicator[]
  isLoadingMajorIndicators: boolean
  teachingObjectiveIndicatorMap: Record<string, string[]>
  isLoadingTeachingObjectiveIndicators: boolean
}

export interface CoursePointSmartParseSummary {
  totalCount: number
  addedCount: number
  duplicateCount: number
}

export interface CoursePointFooterMessage {
  text: string
  tone: "default" | "error"
}

export interface UseCourseMatrixDataParams {
  node: TreeNode
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
  majorId?: string | number
  refreshToken?: number
}

export interface CourseMatrixContextValue {
  node: TreeNode
  majorId?: string | number
  isEditingCourseMatrix: boolean
  startEditingCourseMatrix: () => void
  handleSaveCourseMatrix: (isAutoSave?: boolean) => Promise<void>
  handleCancelCourseMatrix: () => void
  courseMatrixData: CourseMatrixRecord
  coursePointTitleMap: Map<string, string>
  isSavingCourseMatrix: boolean
  isAddCoursePointDialogOpen: boolean
  setIsAddCoursePointDialogOpen: Setter<boolean>
  selectedMatrixCell: SelectedMatrixCell | null
  setSelectedMatrixCell: Setter<SelectedMatrixCell | null>
  selectedCoursePoints: Record<string, SupportStrength>
  setSelectedCoursePoints: Setter<Record<string, SupportStrength>>
  handleAddCoursePoint: (projectId: string, graduateRequireId: string) => void
  handleToggleCoursePointSelection: (coursePointId: string, support: SupportStrength) => void
  handleConfirmCoursePointSelection: () => void
  handleRemoveCoursePoint: (projectId: string, graduateRequireId: string, coursePointId: string) => void
  projectTeachGoalData: ProjectTeachGoalData | null
  isLoadingProjectTeachGoal: boolean
  handleAddProject: () => void
  handleDeleteProject: (projectId: string | number) => void
  editingProjectNames: Record<string, string>
  setEditingProjectNames: Setter<Record<string, string>>
  draggedProjectId: string | null
  dragOverIndex: number | null
  handleDragStart: (event: DragEvent<Element>, projectId: string | number) => void
  handleDragEnd: () => void
  handleDragOver: (event: DragEvent<Element>, index: number) => void
  handleDragLeave: (event: DragEvent<Element>) => void
  handleDrop: (event: DragEvent<Element>, index: number) => void
  isShowCoursePointsDialog: boolean
  setIsShowCoursePointsDialog: Setter<boolean>
  handleCoursePointsDialogOpenChange: (open: boolean) => void
  handleOpenCoursePointsDialog: () => void
  resetCoursePointsDialogState: () => void
  coursePointsList: ApiCoursePoint[]
  setCoursePointsList: Setter<ApiCoursePoint[]>
  isLoadingCoursePoints: boolean
  coursePointsSearch: string
  setCoursePointsSearch: Setter<string>
  coursePointsSearchInDialog: string
  setCoursePointsSearchInDialog: Setter<string>
  editingCoursePointId: number | null
  setEditingCoursePointId: Setter<number | null>
  editingCoursePointData: Partial<ApiCoursePoint>
  setEditingCoursePointData: Setter<Partial<ApiCoursePoint>>
  selectedCoursePointIds: Set<number>
  setSelectedCoursePointIds: Setter<Set<number>>
  isDeletingCoursePoints: boolean
  setIsDeletingCoursePoints: Setter<boolean>
  deletingCoursePointId: number | null
  setDeletingCoursePointId: Setter<number | null>
  newCoursePoint: Partial<ApiCoursePoint> | null
  setNewCoursePoint: Setter<Partial<ApiCoursePoint> | null>
  isSavingNewCoursePoint: boolean
  isSmartParsingCoursePoints: boolean
  isSmartParseExpanded: boolean
  setIsSmartParseExpanded: Setter<boolean>
  smartParseInput: string
  setSmartParseInput: Setter<string>
  smartParseSummary: CoursePointSmartParseSummary | null
  coursePointFooterMessage: CoursePointFooterMessage | null
  isSavingEditingCoursePoint: boolean
  setIsSavingEditingCoursePoint: Setter<boolean>
  handleAddNewCoursePoint: () => void
  handleSaveNewCoursePoint: () => Promise<void>
  handleSmartParseCoursePoints: () => Promise<void>
  handleDeleteSelectedCoursePoints: () => Promise<void>
  handleUpdateCoursePoint: (coursePointId: number, data: Partial<ApiCoursePoint>) => Promise<void>
  handleDeleteSingleCoursePoint: (coursePointId: number) => Promise<void>
  courseGoals: CourseGoal[]
  majorIndicators: TeachingObjectiveMajorIndicator[]
  isLoadingMajorIndicators: boolean
  teachingObjectiveIndicatorMap: Record<string, string[]>
  isLoadingTeachingObjectiveIndicators: boolean
}

export interface CourseMatrixProviderProps {
  value: CourseMatrixContextValue
  children: ReactNode
}
