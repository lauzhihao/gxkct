import { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Search } from "lucide-react"
import { useCourseMatrixContext } from "@/modules/courses/hooks/use-course-matrix-data"
import { matchesCoursePointKeyword, sortCoursePointsByTitle } from "@/modules/courses/utils/course-matrix-utils"

export const CoursePointSelectionDialog = () => {
  const {
    isAddCoursePointDialogOpen,
    setIsAddCoursePointDialogOpen,
    coursePointsList,
    coursePointsSearchInDialog,
    setCoursePointsSearchInDialog,
    selectedCoursePoints,
    handleToggleCoursePointSelection,
    handleConfirmCoursePointSelection,
    setSelectedMatrixCell,
    setSelectedCoursePoints,
  } = useCourseMatrixContext()

  const filteredCoursePoints = useMemo(
    () => coursePointsList.filter((cp) => matchesCoursePointKeyword(cp, coursePointsSearchInDialog)),
    [coursePointsList, coursePointsSearchInDialog]
  )

  return (
    <Dialog
      open={isAddCoursePointDialogOpen}
      onOpenChange={(open) => {
        setIsAddCoursePointDialogOpen(open)
      }}
    >
      <DialogContent className="!max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="border-b border-border px-6 py-4 flex-shrink-0">
          <DialogTitle>设置课点支撑度</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-3 flex-shrink-0 bg-background border-b border-border">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="搜索课点..."
              value={coursePointsSearchInDialog}
              onChange={(e) => setCoursePointsSearchInDialog(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            {coursePointsList && coursePointsList.length > 0 ? (
              sortCoursePointsByTitle(filteredCoursePoints).map((coursePoint, idx) => {
                const cpId = String(coursePoint.id)
                const cpTitle = coursePoint.title || `课点 ${idx + 1}`
                const isStrongSelected = selectedCoursePoints[cpId] === "strong"
                const isWeakSelected = selectedCoursePoints[cpId] === "weak"

                return (
                  <div
                    key={cpId}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{cpTitle}</div>
                        {coursePoint.description && (
                          <div className="text-xs text-muted-foreground truncate">{coursePoint.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant={isStrongSelected ? "default" : "outline"}
                        onClick={() => handleToggleCoursePointSelection(cpId, "strong")}
                        className={`gap-1 ${isStrongSelected ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" : ""}`}
                      >
                        强支撑
                      </Button>
                      <Button
                        size="sm"
                        variant={isWeakSelected ? "default" : "outline"}
                        onClick={() => handleToggleCoursePointSelection(cpId, "weak")}
                        className={`gap-1 ${isWeakSelected ? "bg-green-500 hover:bg-green-600 text-white border-green-500" : ""}`}
                      >
                        弱支撑
                      </Button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">暂无课点数据</div>
            )}
          </div>
        </div>

        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => {
              setIsAddCoursePointDialogOpen(false)
              setSelectedMatrixCell(null)
              setSelectedCoursePoints({})
            }}
          >
            取消
          </Button>
          <Button
            onClick={() => {
              handleConfirmCoursePointSelection()
            }}
            disabled={Object.keys(selectedCoursePoints).length === 0}
          >
            确认
            {Object.keys(selectedCoursePoints).length > 0 && (
              <span className="ml-1">({Object.keys(selectedCoursePoints).length})</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
