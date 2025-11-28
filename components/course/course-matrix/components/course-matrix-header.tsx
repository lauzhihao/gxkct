import { Button } from "@/components/ui/button"
import { BookMarked, Check, Flag, Loader2, Pencil, Settings, X } from "lucide-react"
import { useCourseMatrixContext } from "../hooks/use-course-matrix-data"

interface CourseMatrixHeaderProps {
  onEditTeachingObjectives?: () => void
}

export const CourseMatrixHeader = ({ onEditTeachingObjectives }: CourseMatrixHeaderProps) => {
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
        {!isEditingCourseMatrix && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEditTeachingObjectives?.()}
              className="gap-2 bg-transparent"
            >
              <Flag className="w-3.5 h-3.5" />
              教学目标
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenCoursePointsDialog}
              disabled={isLoadingCoursePoints || coursePointsList.length === 0}
              className="gap-2 bg-transparent"
            >
              {isLoadingCoursePoints ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
        {!isEditingCourseMatrix ? (
          <Button size="sm" variant="outline" onClick={startEditingCourseMatrix} className="gap-2 bg-transparent">
            <Pencil className="w-3.5 h-3.5" />
            编辑矩阵
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelCourseMatrix}
              className="gap-2 bg-transparent"
              disabled={isSavingCourseMatrix}
            >
              <X className="w-3.5 h-3.5" />
              退出
            </Button>
            <Button
              size="sm"
              onClick={() => handleSaveCourseMatrix(false)}
              className="gap-2"
              disabled={isSavingCourseMatrix}
            >
              {isSavingCourseMatrix ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
        )}
      </div>
    </div>
  )
}
