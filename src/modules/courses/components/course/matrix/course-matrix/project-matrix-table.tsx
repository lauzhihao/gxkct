import { Input } from "@/shared/components/ui/input"
import { LoadingState } from "@/shared/components/ui/loading-state"
import { cn } from "@/shared/utils/utils"
import { GripVertical, Plus, BookMarked } from "lucide-react"
import { SupportLabel } from "@/shared/components/support-label"
import { useCourseMatrixContext } from "@/modules/courses/hooks/use-course-matrix-data"
import type { CourseGoal } from "@/lib/api/course-goals-api"

interface ProjectMatrixTableProps {
  courseEditable: boolean
}

export const ProjectMatrixTable = ({ courseEditable }: ProjectMatrixTableProps) => {

  const {
    projectTeachGoalData,
    courseGoals,
    isLoadingProjectTeachGoal,
    isEditingCourseMatrix,
    courseMatrixData,
    coursePointTitleMap,
    handleAddCoursePoint,
    handleRemoveCoursePoint,
    handleAddProject,
    draggedProjectId,
    dragOverIndex,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    editingProjectNames,
    setEditingProjectNames,
  } = useCourseMatrixContext()

  const handleAddProjectWithPermission = () => {
    if (!courseEditable) return
    handleAddProject()
  }

  const handleAddCoursePointWithPermission = (projectId: string, childId: string) => {
    if (!courseEditable) return
    handleAddCoursePoint(projectId, childId)
  }

  const handleRemoveCoursePointWithPermission = (projectId: string, childId: string, coursePointId: string) => {
    if (!courseEditable) return
    handleRemoveCoursePoint(projectId, childId, coursePointId)
  }

  if (isLoadingProjectTeachGoal) {
    return <LoadingState title="加载中" />
  }

  if (
    !projectTeachGoalData ||
    !courseGoals ||
    courseGoals.length === 0 ||
    !projectTeachGoalData.projects ||
    projectTeachGoalData.projects.length === 0
  ) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <>
          <p className="text-sm mb-2">暂无课程矩阵数据</p>
          <p className="text-xs">请先设置教学目标和项目/章节</p>
        </>
      </div>
    )
  }

  const secondLevelHeaderCount = courseGoals.reduce((count, goal) => {
    const children = goal.children && goal.children.length > 0 ? goal.children : []
    return count + children.length
  }, 0)

  const sequenceColWidth = 60
  const projectColMinWidth = 300
  const secondLevelColMinWidth = 240
  const contentMinWidth = sequenceColWidth + projectColMinWidth + secondLevelColMinWidth * secondLevelHeaderCount

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full table-fixed text-base border-collapse" style={{ minWidth: `${contentMinWidth}px` }}>
        <colgroup>
          <col style={{ width: `${sequenceColWidth}px` }} />
          <col style={{ width: `${projectColMinWidth}px` }} />
          {Array.from({ length: secondLevelHeaderCount }).map((_, idx) => (
            <col key={`course-point-col-${idx}`} style={{ width: `${secondLevelColMinWidth}px` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-primary/10">
            <th
              className="text-center p-3 text-muted-foreground font-medium border-r border-border whitespace-nowrap"
              style={{ width: `${sequenceColWidth}px` }}
              rowSpan={2}
            >
              序号
            </th>
            <th
              className="text-center p-3 text-muted-foreground font-medium border-r border-border whitespace-nowrap"
              rowSpan={2}
              style={{ minWidth: `${projectColMinWidth}px` }}
            >
              项目/章节
            </th>
            {courseGoals.map((goal, idx) => {
              const children = goal.children && goal.children.length > 0 ? goal.children : []
              return children.length > 0 ? (
                <th
                  key={goal.id || idx}
                  colSpan={children.length}
                  className="text-center p-3 text-muted-foreground font-medium border-r border-border bg-primary/10"
                  style={{ minWidth: `${secondLevelColMinWidth * children.length}px` }}
                >
                  <div className="break-words">{goal.description || `目标${idx + 1}`}</div>
                </th>
              ) : null
            })}
          </tr>
          <tr className="border-b border-border bg-primary/5">
            {courseGoals.map((goal: CourseGoal) => {
              const children = goal.children && goal.children.length > 0 ? goal.children : []
              return children.map((child, childIdx) => (
                <th
                  key={`${goal.id}-${childIdx}`}
                  className="text-center p-3 text-muted-foreground font-medium border-r border-border bg-primary/5"
                  style={{ minWidth: `${secondLevelColMinWidth}px` }}
                >
                  <div className="text-sm leading-relaxed break-words">{child.description || `子目标${childIdx + 1}`}</div>
                </th>
              ))
            })}
          </tr>
        </thead>
        <tbody>
          {projectTeachGoalData.projects.map((project, projectIdx) => (
            <tr
              key={project.id}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => {
                if (!courseEditable) return
                handleDragOver(e, projectIdx)
              }}
              onDragLeave={(e) => handleDragLeave(e)}
              onDrop={(e) => {
                if (!courseEditable) return
                handleDrop(e, projectIdx)
              }}
              className={cn(
                "border-b border-border transition-colors",
                isEditingCourseMatrix ? "cursor-move hover:bg-blue-50/50" : "hover:bg-white/50",
                dragOverIndex === projectIdx && draggedProjectId ? "bg-blue-100/50" : ""
              )}
            >
              <td className="p-3 text-center border-r border-border bg-secondary/20 font-medium">{projectIdx + 1}</td>
              <td className="p-3 border-r border-border bg-white/80 whitespace-nowrap" style={{ minWidth: `${projectColMinWidth}px` }}>
                {isEditingCourseMatrix ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={
                        editingProjectNames[project.id] !== undefined
                          ? editingProjectNames[project.id]
                          : project.name
                      }
                      onChange={(e) =>
                        courseEditable &&
                        setEditingProjectNames((prev) => ({
                          ...prev,
                          [project.id]: e.target.value,
                        }))
                      }
                      placeholder="输入项目/章节名称"
                      className="h-9 flex-1"
                      disabled={!courseEditable}
                    />
                    {courseEditable && (
                      <button
                        draggable
                        onDragStart={(e) => {
                          if (!courseEditable) return
                          e.stopPropagation()
                          handleDragStart(e, project.id)
                        }}
                        className="flex-shrink-0 p-1 text-muted-foreground hover:text-primary transition-colors cursor-grab active:cursor-grabbing"
                        title="拖动调整顺序"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-base text-foreground">{project.name}</div>
                )}
              </td>
              {courseGoals.map((goal: CourseGoal) => {
                const children = goal.children && goal.children.length > 0 ? goal.children : []
                return children.map((child: CourseGoal, childIdx: number) => {
                  const key = `${project.id}-${child.id}`
                  const coursePoints = courseMatrixData[key] || []

                  return (
                    <td key={`${goal.id}-${childIdx}`} className="p-3 text-center border-r border-border" style={{ minWidth: `${secondLevelColMinWidth}px` }}>
                      {isEditingCourseMatrix ? (
                        <div className="flex flex-col items-center gap-2">
                          {coursePoints.length > 0 && (
                            <div className="flex flex-wrap gap-2 justify-center">
                              {coursePoints.map((cp, cpIdx) => (
                                <div
                                  key={cp.matrixItemId > 0 ? `matrix-${cp.matrixItemId}` : `point-${cp.id}-${cpIdx}`}
                                  className="relative group/label"
                                >
                                  <SupportLabel
                                    title={coursePointTitleMap.get(cp.id) || cp.name || cp.id}
                                    desc={cp.description}
                                    type={cp.support}
                                    showRemoveButton={courseEditable}
                                    onRemove={() =>
                                      handleRemoveCoursePointWithPermission(String(project.id), String(child.id), cp.id)
                                    }
                                    size="md"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {courseEditable && (
                            <button
                              onClick={() => handleAddCoursePointWithPermission(String(project.id), String(child.id))}
                              className="w-4 h-4 rounded-full border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-all group"
                            >
                              <Plus className="w-2 h-2 text-primary/60 group-hover:text-primary" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 justify-center">
                          {coursePoints.length > 0 ? (
                            coursePoints.map((cp, cpIdx) => (
                              <SupportLabel
                                key={cp.matrixItemId > 0 ? `matrix-${cp.matrixItemId}` : `point-${cp.id}-${cpIdx}`}
                                title={coursePointTitleMap.get(cp.id) || cp.name || cp.id}
                                desc={cp.description}
                                type={cp.support}
                                size="md"
                              />
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      )}
                    </td>
                  )
                })
              })}
            </tr>
          ))}
           {isEditingCourseMatrix && courseEditable && (
            <tr className="border-b border-border hover:bg-white/50 transition-colors">
              <td className="p-3 text-center border-r border-border bg-secondary/20" style={{ width: `${sequenceColWidth}px` }}></td>
              <td className="p-3 text-center border-r border-border bg-white/80" style={{ minWidth: `${projectColMinWidth}px` }}>
                <button
                  onClick={handleAddProjectWithPermission}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/10 transition-all group"
                >
                  <Plus className="w-4 h-4 text-primary/60 group-hover:text-primary" />
                </button>
              </td>
              {Array.from({ length: secondLevelHeaderCount }).map((_, idx) => (
                <td key={`add-row-${idx}`} className="p-3 text-center border-r border-border" style={{ minWidth: `${secondLevelColMinWidth}px` }}></td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
