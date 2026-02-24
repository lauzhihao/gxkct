import { Button } from "@/shared/components/ui/button"
import { Spinner } from "@/shared/components/ui/spinner"
import { BookMarked, Check, Flag, Pencil, Settings, X } from "lucide-react"
import { useCourseMatrixContext } from "@/modules/courses/hooks/use-course-matrix-data"

interface CourseMatrixHeaderProps {
  courseEditable: boolean
  onEditTeachingObjectives?: () => void
}

export const CourseMatrixHeader = ({ courseEditable, onEditTeachingObjectives }: CourseMatrixHeaderProps) => {
  const {
    isEditingCourseMatrix,
    isSavingCourseMatrix,
    isLoadingCoursePoints,
    coursePointsList,
    startEditingCourseMatrix,
    handleCancelCourseMatrix,
    handleSaveCourseMatrix,
    handleOpenCoursePointsDialog,
  } = useCourseMatrixContext()
  const handleEditTeachingObjectives = () => {
    if (!courseEditable) return
    onEditTeachingObjectives?.()
  }

  const handleManageCoursePoints = () => {
    if (!courseEditable) return
    handleOpenCoursePointsDialog()
  }

  const handleStartEditingCourseMatrix = () => {
    if (!courseEditable) return
    startEditingCourseMatrix()
  }

  const handleExitEditingCourseMatrix = () => {
    if (!courseEditable) return
    handleCancelCourseMatrix()
  }

  const handleSaveEditingCourseMatrix = () => {
    if (!courseEditable) return
    handleSaveCourseMatrix(false)
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BookMarked className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">课程矩阵</h3>
          <p className="text-xs text-muted-foreground mt-0.5">管理课程的教学目标和课点支撑关系</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {courseEditable && !isEditingCourseMatrix && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleEditTeachingObjectives}
              className="gap-2 bg-transparent"
            >
              <Flag className="w-3.5 h-3.5" />
              教学目标
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleManageCoursePoints}
              disabled={isLoadingCoursePoints || coursePointsList.length === 0}
              className="gap-2 bg-transparent"
            >
              {isLoadingCoursePoints ? (
                <>
                  <Spinner className="w-3.5 h-3.5" />
                  加载中
                </>
              ) : (
                <>
                  <Settings className="w-3.5 h-3.5" />
                  课点管理
                </>
              )}
            </Button>
          </>
        )}
        {courseEditable && !isEditingCourseMatrix ? (
          <Button size="sm" variant="outline" onClick={handleStartEditingCourseMatrix} className="gap-2 bg-transparent">
            <Pencil className="w-3.5 h-3.5" />
            编辑矩阵
          </Button>
        ) : courseEditable ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExitEditingCourseMatrix}
              className="gap-2 bg-transparent"
              disabled={isSavingCourseMatrix}
            >
              <X className="w-3.5 h-3.5" />
              退出
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEditingCourseMatrix}
              className="gap-2"
              disabled={isSavingCourseMatrix}
            >
              {isSavingCourseMatrix ? (
                <>
                  <Spinner className="w-3.5 h-3.5" />
                  保存中
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  保存
                </>
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
