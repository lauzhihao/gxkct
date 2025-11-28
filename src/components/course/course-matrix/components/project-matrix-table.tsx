import { Input } from "@/shared/components/ui/input"
import { cn } from "@/shared/utils/utils"
import { GripVertical, Loader2, Plus, Trash2, BookMarked } from "lucide-react"
import { SupportLabel } from "@/shared/components/support-label"
import { useCourseMatrixContext } from "../hooks/use-course-matrix-data"
import type { ProjectTeachGoal } from "@/lib/api/project-teach-goal-api"

export const ProjectMatrixTable = () => {
  const {
    projectTeachGoalData,
    isLoadingProjectTeachGoal,
    isEditingCourseMatrix,
    courseMatrixData,
    coursePointTitleMap,
    handleAddCoursePoint,
    handleRemoveCoursePoint,
    handleAddProject,
    handleDeleteProject,
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

  if (
    !projectTeachGoalData ||
    !projectTeachGoalData.goals ||
    projectTeachGoalData.goals.length === 0 ||
    !projectTeachGoalData.projects ||
    projectTeachGoalData.projects.length === 0
  ) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-50" />
        {isLoadingProjectTeachGoal ? (
          <>
            <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin" />
            <p className="text-sm mb-2">加载中</p>
          </>
        ) : (
          <>
            <p className="text-sm mb-2">暂无课程矩阵数据</p>
            <p className="text-xs">请先在课程信息中添加教学目标和章节信息</p>
          </>
        )}
      </div>
    )
  }

  const secondLevelHeaderCount = projectTeachGoalData.goals.reduce((count, goal) => {
    const children = goal.children && goal.children.length > 0 ? goal.children : []
    return count + children.length
  }, 0)

  const secondLevelColWidth = 500
  const totalWidth = 60 + secondLevelColWidth * secondLevelHeaderCount

  return (
    <div className="overflow-x-auto">
      <table className="text-base border-collapse" style={{ width: totalWidth, tableLayout: "auto" }}>
        <thead>
          <tr className="border-b border-border bg-primary/10">
            <th
              className="text-center p-3 text-muted-foreground font-medium border-r border-border whitespace-nowrap"
              style={{ width: "60px" }}
              rowSpan={2}
            >
              序号
            </th>
            <th
              className="text-center p-3 text-muted-foreground font-medium border-r border-border whitespace-nowrap"
              rowSpan={2}
              style={{ minWidth: "300px" }}
            >
              项目/章节
            </th>
            {projectTeachGoalData.goals.map((goal, idx) => {
              const children = goal.children && goal.children.length > 0 ? goal.children : []
              return children.length > 0 ? (
                <th
                  key={goal.id || idx}
                  colSpan={children.length}
                  className="text-center p-3 text-muted-foreground font-medium border-r border-border bg-primary/10"
                  style={{ width: `${secondLevelColWidth * children.length}px` }}
                >
                  <div className="break-words">{goal.description || `目标${idx + 1}`}</div>
                </th>
              ) : null
            })}
          </tr>
          <tr className="border-b border-border bg-primary/5">
            {projectTeachGoalData.goals.map((goal: ProjectTeachGoal) => {
              const children = goal.children && goal.children.length > 0 ? goal.children : []
              return children.map((child, childIdx) => (
                <th
                  key={`${goal.id}-${childIdx}`}
                  className="text-center p-3 text-muted-foreground font-medium border-r border-border bg-primary/5"
                  style={{ width: `${secondLevelColWidth}px` }}
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
              draggable={isEditingCourseMatrix}
              onDragStart={() => handleDragStart(project.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, projectIdx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, projectIdx)}
              className={cn(
                "border-b border-border transition-colors",
                isEditingCourseMatrix ? "cursor-move hover:bg-blue-50/50" : "hover:bg-white/50",
                dragOverIndex === projectIdx && draggedProjectId ? "bg-blue-100/50" : ""
              )}
            >
              <td className="p-3 text-center border-r border-border bg-secondary/20 font-medium">{projectIdx + 1}</td>
              <td className="p-3 border-r border-border bg-white/80 whitespace-nowrap" style={{ minWidth: "300px" }}>
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
                        setEditingProjectNames((prev) => ({
                          ...prev,
                          [project.id]: e.target.value,
                        }))
                      }
                      placeholder="输入项目/章节名称"
                      className="h-9 flex-1"
                    />
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="flex-shrink-0 p-1 text-muted-foreground hover:text-red-600 transition-colors"
                      title="删除项目"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation()
                        handleDragStart(project.id)
                      }}
                      className="flex-shrink-0 p-1 text-muted-foreground hover:text-primary transition-colors cursor-grab active:cursor-grabbing"
                      title="拖动调整顺序"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-base text-foreground">{project.name}</div>
                )}
              </td>
              {projectTeachGoalData.goals.map((goal: ProjectTeachGoal) => {
                const children = goal.children && goal.children.length > 0 ? goal.children : []
                return children.map((child: ProjectTeachGoal, childIdx: number) => {
                  const key = `${project.id}-${child.id}`
                  const coursePoints = courseMatrixData[key] || []

                  return (
                    <td key={`${goal.id}-${childIdx}`} className="p-3 text-center border-r border-border" style={{ width: "500px" }}>
                      {isEditingCourseMatrix ? (
                        <div className="flex flex-col items-center gap-2">
                          {coursePoints.length > 0 && (
                            <div className="flex flex-wrap gap-2 justify-center">
                              {coursePoints.map((cp) => (
                                <div key={cp.id} className="relative group/label">
                                  <SupportLabel
                                    title={coursePointTitleMap.get(cp.id) || cp.name || cp.id}
                                    desc={cp.description}
                                    type={cp.support}
                                    showRemoveButton
                                    onRemove={() =>
                                      handleRemoveCoursePoint(String(goal.id), String(child.id), String(project.id), cp.id)
                                    }
                                    size="md"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => handleAddCoursePoint(String(goal.id), String(child.id), String(project.id))}
                            className="w-4 h-4 rounded-full border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-all group"
                          >
                            <Plus className="w-2 h-2 text-primary/60 group-hover:text-primary" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 justify-center">
                          {coursePoints.length > 0 ? (
                            coursePoints.map((cp) => (
                              <SupportLabel
                                key={cp.id}
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
          {isEditingCourseMatrix && (
            <tr className="border-b border-border hover:bg-white/50 transition-colors">
              <td className="p-3 text-center border-r border-border bg-secondary/20" style={{ width: "60px" }}></td>
              <td className="p-3 text-center border-r border-border bg-white/80" style={{ minWidth: "300px" }}>
                <button
                  onClick={handleAddProject}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/10 transition-all group"
                >
                  <Plus className="w-4 h-4 text-primary/60 group-hover:text-primary" />
                </button>
              </td>
              {Array.from({ length: secondLevelHeaderCount }).map((_, idx) => (
                <td key={`add-row-${idx}`} className="p-3 text-center border-r border-border" style={{ width: "500px" }}></td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
