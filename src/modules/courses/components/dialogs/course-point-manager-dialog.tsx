import { useMemo, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Check, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react"
import { LoadingState } from "@/shared/components/ui/loading-state"
import { Spinner } from "@/shared/components/ui/spinner"
import { useCourseMatrixContext } from "@/modules/courses/hooks/use-course-matrix-data"
import { matchesCoursePointKeyword, sortCoursePointsByTitle } from "@/modules/courses/utils/course-matrix-utils"
import type { CoursePoint as ApiCoursePoint } from "@/lib/api/course-points-api"

export const CoursePointManagerDialog = () => {
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<
    { type: "single"; count: 1; coursePointId: number } | { type: "batch"; count: number } | null
  >(null)

  const {
    isShowCoursePointsDialog,
    handleCoursePointsDialogOpenChange,
    coursePointsSearch,
    setCoursePointsSearch,
    handleAddNewCoursePoint,
    isSavingNewCoursePoint,
    isSmartParsingCoursePoints,
    isSmartParseExpanded,
    setIsSmartParseExpanded,
    smartParseInput,
    setSmartParseInput,
    smartParseSummary,
    coursePointFooterMessage,
    coursePointsList,
    setCoursePointsList,
    isLoadingCoursePoints,
    editingCoursePointId,
    setEditingCoursePointId,
    editingCoursePointData,
    setEditingCoursePointData,
    selectedCoursePointIds,
    setSelectedCoursePointIds,
    isDeletingCoursePoints,
    deletingCoursePointId,
    newCoursePoint,
    setNewCoursePoint,
    isSavingEditingCoursePoint,
    handleSaveNewCoursePoint,
    handleSmartParseCoursePoints,
    handleDeleteSelectedCoursePoints,
    handleUpdateCoursePoint,
    handleDeleteSingleCoursePoint,
  } = useCourseMatrixContext()

  const filteredCoursePoints = useMemo(() => coursePointsList.filter((cp) => matchesCoursePointKeyword(cp, coursePointsSearch)), [coursePointsList, coursePointsSearch])

  const displayCoursePoints = useMemo(() => {
    const sortedCoursePoints = sortCoursePointsByTitle(filteredCoursePoints)

    if (!newCoursePoint?.id) {
      return sortedCoursePoints
    }

    const newCoursePointIndex = sortedCoursePoints.findIndex((coursePoint) => coursePoint.id === newCoursePoint.id)
    if (newCoursePointIndex <= 0) {
      return sortedCoursePoints
    }

    const nextCoursePoints = [...sortedCoursePoints]
    const [tempCoursePoint] = nextCoursePoints.splice(newCoursePointIndex, 1)
    if (!tempCoursePoint) {
      return sortedCoursePoints
    }

    nextCoursePoints.unshift(tempCoursePoint)
    return nextCoursePoints
  }, [filteredCoursePoints, newCoursePoint?.id])

  // [MOD] 委托给 context handler，不再直接调用 API
  const handleSingleDelete = (coursePointId: number) => {
    setDeleteConfirmTarget({ type: "single", count: 1, coursePointId })
  }

  // [MOD] 委托给 context handler，不再直接调用 API
  const handleSubmitEdit = async (coursePoint: { id: number }) => {
    if (newCoursePoint && coursePoint.id === newCoursePoint.id) {
      await handleSaveNewCoursePoint()
      return
    }
    await handleUpdateCoursePoint(coursePoint.id, editingCoursePointData)
  }

  const handleCancelEdit = (coursePoint: ApiCoursePoint) => {
    if (newCoursePoint && coursePoint.id === newCoursePoint.id) {
      setCoursePointsList((prev) => prev.filter((cp) => cp.id !== coursePoint.id))
      setNewCoursePoint(null)
    } else {
      setEditingCoursePointData({})
    }
    setEditingCoursePointId(null)
  }

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCoursePointIds(new Set(filteredCoursePoints.map((cp) => cp.id)))
    } else {
      setSelectedCoursePointIds(new Set())
    }
  }

  const closeDialog = () => {
    handleCoursePointsDialogOpenChange(false)
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) {
      return
    }

    if (deleteConfirmTarget.type === "single") {
      await handleDeleteSingleCoursePoint(deleteConfirmTarget.coursePointId)
    } else {
      await handleDeleteSelectedCoursePoints()
    }

    setDeleteConfirmTarget(null)
  }

  return (
    <>
      <Dialog open={isShowCoursePointsDialog} onOpenChange={handleCoursePointsDialogOpenChange}>
        <DialogContent
          className="!max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0"
          onEscapeKeyDown={(event) => {
            event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            event.preventDefault()
          }}
          onInteractOutside={(event) => {
            event.preventDefault()
          }}
        >
        <DialogHeader className="border-b border-border px-6 py-4 flex-shrink-0">
          <DialogTitle>课点管理</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-3 flex-shrink-0 bg-background">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder="搜索课点..."
                value={coursePointsSearch}
                onChange={(e) => setCoursePointsSearch(e.target.value)}
                disabled={editingCoursePointId !== null || isDeletingCoursePoints || isSmartParsingCoursePoints || deletingCoursePointId !== null}
                className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 flex-shrink-0"
              onClick={handleAddNewCoursePoint}
              disabled={isSavingNewCoursePoint || editingCoursePointId !== null || isDeletingCoursePoints || isSmartParsingCoursePoints || deletingCoursePointId !== null}
            >
              <Plus className="w-4 h-4" />
              新增课点
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 flex-shrink-0"
              onClick={() => setIsSmartParseExpanded((prev) => !prev)}
              disabled={editingCoursePointId !== null || isDeletingCoursePoints || isSmartParsingCoursePoints || deletingCoursePointId !== null}
            >
              <Sparkles className="w-4 h-4" />
              批量新增
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {isSmartParseExpanded ? (
            <div className="flex-1 px-6 pb-6">
              <div className="flex h-full flex-col gap-3 rounded-lg border border-dashed border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">按换行符或英文分号分隔，系统会按输入顺序自动生成新的课点序号。</p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSmartParseInput("")
                        setIsSmartParseExpanded(false)
                      }}
                      disabled={isSmartParsingCoursePoints}
                    >
                      返回列表
                    </Button>
                    <Button size="sm" onClick={handleSmartParseCoursePoints} disabled={isSmartParsingCoursePoints}>
                      {isSmartParsingCoursePoints ? <Spinner className="w-4 h-4" /> : null}
                      解析并新增
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={smartParseInput}
                  onChange={(event) => setSmartParseInput(event.target.value)}
                  placeholder="请输入课点描述，每行一个。"
                  className="min-h-[280px] flex-1 resize-none"
                  disabled={isSmartParsingCoursePoints}
                />
              </div>
            </div>
          ) : isLoadingCoursePoints ? (
            <LoadingState title="加载中..." className="flex-1" />
          ) : coursePointsList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm flex-1 flex items-center justify-center">
              暂无课点数据
            </div>
          ) : (
            <div className="flex flex-col overflow-hidden flex-1">
              <div className="overflow-x-auto border-b border-border flex-shrink-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-3 text-center text-sm font-medium text-foreground w-12">
                          <input
                            type="checkbox"
                            checked={selectedCoursePointIds.size === filteredCoursePoints.length && filteredCoursePoints.length > 0}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            className="w-4 h-4 cursor-pointer"
                            disabled={editingCoursePointId !== null || isDeletingCoursePoints || isSmartParsingCoursePoints || deletingCoursePointId !== null}
                          />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground w-[150px]">课点名称</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">课点描述</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-foreground w-24">操作</th>
                    </tr>
                  </thead>
                </table>
              </div>
              <div className="overflow-y-auto flex-1">
                <table className="w-full">
                  <tbody>
                    {displayCoursePoints.map((coursePoint) => (
                      <tr key={coursePoint.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 text-center w-12">
                          <input
                            type="checkbox"
                            checked={selectedCoursePointIds.has(coursePoint.id)}
                           onChange={(e) => {
                              const newSelected = new Set(selectedCoursePointIds)
                              if (e.target.checked) {
                                newSelected.add(coursePoint.id)
                              } else {
                                newSelected.delete(coursePoint.id)
                              }
                              setSelectedCoursePointIds(newSelected)
                            }}
                            disabled={editingCoursePointId !== null || isDeletingCoursePoints || isSmartParsingCoursePoints || deletingCoursePointId !== null}
                            className="w-4 h-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm w-[150px]">
                          {editingCoursePointId === coursePoint.id && newCoursePoint?.id === coursePoint.id ? (
                            <Input
                              type="text"
                              value={editingCoursePointData.title || coursePoint.title}
                              onChange={(e) =>
                                setEditingCoursePointData((prev) => ({
                                  ...prev,
                                  title: e.target.value,
                                }))
                              }
                              className="h-8"
                            />
                          ) : (
                            <span>{coursePoint.title}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {editingCoursePointId === coursePoint.id ? (
                            <Input
                              type="text"
                              value={editingCoursePointData.description || coursePoint.description}
                              onChange={(e) =>
                                setEditingCoursePointData((prev) => ({
                                  ...prev,
                                  description: e.target.value,
                                }))
                              }
                              className="h-8"
                            />
                          ) : (
                            coursePoint.description
                          )}
                        </td>
                        <td className="px-4 py-3 text-center w-24">
                          <div className="flex items-center justify-center gap-2">
                            {editingCoursePointId === coursePoint.id ? (
                              <>
                                <button
                                  onClick={() => handleSubmitEdit(coursePoint)}
                                  disabled={
                                    isSavingNewCoursePoint ||
                                    isSmartParsingCoursePoints ||
                                    isSavingEditingCoursePoint ||
                                    !editingCoursePointData.description?.trim()
                                  }
                                  className="p-1 text-muted-foreground hover:text-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="提交"
                                >
                                  {isSavingNewCoursePoint || isSavingEditingCoursePoint ? (
                                    <Spinner className="w-4 h-4" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleCancelEdit(coursePoint)}
                                  disabled={isSavingNewCoursePoint || isSmartParsingCoursePoints || isSavingEditingCoursePoint}
                                  className="p-1 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="取消"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingCoursePointId(coursePoint.id)
                                    setEditingCoursePointData(coursePoint)
                                  }}
                                  disabled={editingCoursePointId !== null || isDeletingCoursePoints || isSmartParsingCoursePoints || deletingCoursePointId !== null}
                                  className="p-1 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="编辑"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleSingleDelete(coursePoint.id)}
                                  disabled={editingCoursePointId !== null || isDeletingCoursePoints || isSmartParsingCoursePoints || deletingCoursePointId !== null}
                                  className="p-1 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="删除"
                                >
                                  {deletingCoursePointId === coursePoint.id ? (
                                    <Spinner className="w-4 h-4" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setDeleteConfirmTarget({ type: "batch", count: selectedCoursePointIds.size })}
              disabled={selectedCoursePointIds.size === 0 || isDeletingCoursePoints || isSmartParsingCoursePoints}
              className="gap-2"
            >
              {isDeletingCoursePoints ? <Spinner className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
              删除 ({selectedCoursePointIds.size})
            </Button>
            <div className="flex-1 px-4 text-center text-sm text-primary">
              {coursePointFooterMessage ? (
                <span className={coursePointFooterMessage.tone === "error" ? "text-destructive" : "text-primary"}>{coursePointFooterMessage.text}</span>
              ) : smartParseSummary
                ? `本次共解析${smartParseSummary.totalCount}个课点，新增${smartParseSummary.addedCount}个，重复${smartParseSummary.duplicateCount}个。`
                : null}
            </div>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isDeletingCoursePoints || deletingCoursePointId !== null || isSavingNewCoursePoint || isSmartParsingCoursePoints || isSavingEditingCoursePoint}
            >
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmTarget !== null} onOpenChange={(open) => {
        if (!open) {
          setDeleteConfirmTarget(null)
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription className="space-y-1 whitespace-pre-line">
              {deleteConfirmTarget
                ? `确定要删除选中的${deleteConfirmTarget.count}个课点吗？\n课程矩阵中引用的该课点将立即失效。\n该操作不可逆。`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingCoursePoints || deletingCoursePointId !== null}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmDelete()
              }}
              disabled={isDeletingCoursePoints || deletingCoursePointId !== null}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
