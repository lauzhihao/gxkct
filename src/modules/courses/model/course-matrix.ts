import type { TreeNode } from "@/types"
import type { CourseGoal } from "@/lib/api/course-goals-api"
import type { CoursePoint as ApiCoursePoint } from "@/lib/api/course-points-api"
import type { ProjectTeachGoalData } from "@/lib/api/project-teach-goal-api"
import type { ReactNode, Dispatch, SetStateAction } from "react"

type Setter<T> = Dispatch<SetStateAction<T>>

export type SupportStrength = "strong" | "weak"

export type CourseMatrixRecord = Record<string, Array<{ id: string; name: string; description: string; support: SupportStrength }>>

export interface SelectedMatrixCell {
  objectiveId: string
  pointId: string
  chapterId: string
}

export interface UseCourseMatrixDataParams {
  node: TreeNode
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
  majorId?: string | number
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
  handleAddCoursePoint: (objectiveId: string, pointId: string, chapterId: string) => void
  handleToggleCoursePointSelection: (coursePointId: string, support: SupportStrength) => void
  handleConfirmCoursePointSelection: () => void
  handleRemoveCoursePoint: (objectiveId: string, pointId: string, chapterId: string, coursePointId: string) => void
  projectTeachGoalData: ProjectTeachGoalData | null
  isLoadingProjectTeachGoal: boolean
  handleAddProject: () => void
  handleDeleteProject: (projectId: string | number) => void
  editingProjectNames: Record<string, string>
  setEditingProjectNames: Setter<Record<string, string>>
  draggedProjectId: string | null
  dragOverIndex: number | null
  handleDragStart: (projectId: string | number) => void
  handleDragEnd: () => void
  handleDragOver: (event: React.DragEvent<Element>, index: number) => void
  handleDragLeave: () => void
  handleDrop: (event: React.DragEvent<Element>, index: number) => void
  isShowCoursePointsDialog: boolean
  setIsShowCoursePointsDialog: Setter<boolean>
  handleCoursePointsDialogOpenChange: (open: boolean) => void
  handleOpenCoursePointsDialog: () => void
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
  isSavingEditingCoursePoint: boolean
  setIsSavingEditingCoursePoint: Setter<boolean>
  handleAddNewCoursePoint: () => void
  handleSaveNewCoursePoint: () => Promise<void>
  handleDeleteSelectedCoursePoints: () => Promise<void>
  courseGoals: CourseGoal[]
  majorIndicators: Array<{ requirementId: string; indicatorIndex: number; content: string }>
  isLoadingMajorIndicators: boolean
  teachingObjectiveIndicatorMap: Record<string, string[]>
  isLoadingTeachingObjectiveIndicators: boolean
  isAutoSavePaused: boolean
  setIsAutoSavePaused: Setter<boolean>
}

export interface CourseMatrixProviderProps {
  value: CourseMatrixContextValue
  children: ReactNode
}
