/**
 * 项目矩阵表格组件
 * 负责渲染项目矩阵表格和交互
 */

import { Plus, Flag } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/components/ui/accordion"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/shared/components/ui/tooltip"
import { Button } from "@/shared/components/ui/button"
import { SupportLabel } from "@/shared/components/support-label"
import { LoadingState } from "@/shared/components/ui/loading-state"
import type {
  ProjectMatrixData,
  ProjectMatrixGoal,
  ProjectMatrixItem,
  ProjectMatrixItemProjectMatrix,
  ProjectMatrixProjectItem,
} from "@/modules/courses/hooks/use-project-matrix"

interface ProjectMatrixTableProps {
  courseEditable: boolean
  projectMatrixData: ProjectMatrixData | null
  isEditingProjectMatrix: boolean
  focusedCell: string | null
  onOpenTaskObjectivesDialog: (projectId: string, goals: ProjectMatrixGoal[]) => void
  onOpenKsaDialog: (chapterId: string, coursePointId: string, taskId: string) => void
  onFocusCell: (cellId: string | null) => void
}

export function ProjectMatrixTable({
  courseEditable,
  projectMatrixData,
  isEditingProjectMatrix,
  focusedCell,
  onOpenTaskObjectivesDialog,
  onOpenKsaDialog,
  onFocusCell,
}: ProjectMatrixTableProps) {
  const canManageProjectMatrix = courseEditable

  const handleOpenTaskObjectivesDialogWithPermission = (projectId: string, goals: ProjectMatrixGoal[]) => {
    if (!canManageProjectMatrix) return
    onOpenTaskObjectivesDialog(projectId, goals)
  }

  const handleOpenKsaDialogWithPermission = (projectId: string, coursePointId: string, taskId: string) => {
    if (!canManageProjectMatrix) return
    onOpenKsaDialog(projectId, coursePointId, taskId)
  }

  if (!projectMatrixData?.projects || projectMatrixData.projects.length === 0) {
    return (
      <LoadingState
        title="暂无项目数据"
        description="项目矩阵数据加载中或暂无项目信息"
        variant="card"
      />
    )
  }

  return (
    <Accordion type="multiple" className="space-y-3">
      {projectMatrixData.projects.map((projectItem: ProjectMatrixProjectItem, projectIdx: number) => {
        const project = projectItem.project
        const goals = projectItem.goals || []
        const projectId = project.id
        const projectName = project.name || `项目${projectIdx + 1}`

        return (
          <AccordionItem key={String(projectId)} value={String(projectId)} className="border border-border rounded-lg">
            <div className="relative">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-secondary/30 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-medium text-primary">
                    {projectIdx + 1}
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-base font-semibold text-foreground">{projectName}</span>
                  </div>
                </div>
              </AccordionTrigger>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 z-10 flex gap-2">
                {!isEditingProjectMatrix && canManageProjectMatrix && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenTaskObjectivesDialogWithPermission(String(projectId), goals)
                    }}
                    className="gap-2"
                  >
                    <Flag className="w-4 h-4" />
                    任务目标
                  </Button>
                )}
              </div>
            </div>
            <AccordionContent className="px-5 pb-5">
              <div className="border-t border-dashed border-border mb-4" />

              {/* 项目矩阵表格 */}
              {(projectMatrixData?.data?.some(
                (item: ProjectMatrixItem) => item.courseMatrix?.projectId === projectId
              )) ? (
                <div className="border border-border overflow-hidden w-[98%] mx-[1%]">
                  <div className="overflow-x-auto">
                    <table
                      className="w-auto text-xs border-collapse border border-border"
                      style={{ tableLayout: "fixed" }}
                    >
                      <thead>
                        {/* 第一行表头 */}
                        <tr className="bg-secondary/50 border-b border-border">
                          <th
                            rowSpan={2}
                            className="text-center p-2 text-muted-foreground font-medium border-r border-border w-[100px] align-middle"
                          >
                            课点
                          </th>
                          {goals.map((goal: any, goalIdx: number) => (
                            <th
                              key={goal.id || goalIdx}
                              rowSpan={2}
                              className="text-left p-2 text-muted-foreground font-medium border-r border-border align-middle"
                            >
                              <div className="text-xs whitespace-normal break-words">{goal.description}</div>
                            </th>
                          ))}
                          <th
                            rowSpan={2}
                            className="text-center p-2 text-muted-foreground font-medium border-r border-border w-[120px] align-middle"
                          >
                            学法
                          </th>
                          <th
                            rowSpan={2}
                            className="text-center p-2 text-muted-foreground font-medium border-r border-border w-[220px] align-middle"
                          >
                            教法
                          </th>
                          <th
                            rowSpan={2}
                            className="text-center p-2 text-muted-foreground font-medium border-r border-border w-[280px] align-middle"
                          >
                            课点学习产出及测量
                          </th>
                          <th
                            colSpan={3}
                            className="text-center p-2 text-muted-foreground font-medium border-r border-border align-middle"
                          >
                            教学安排
                          </th>
                        </tr>
                        {/* 第二行表头 - 仅教学安排的子列 */}
                        <tr className="bg-secondary/50 border-b border-border">
                          <th className="text-center p-1 text-muted-foreground font-medium border-r border-border w-[70px] align-middle whitespace-nowrap text-xs">
                            开课周数
                          </th>
                          <th className="text-center p-1 text-muted-foreground font-medium border-r border-border w-[70px] align-middle whitespace-nowrap text-xs">
                            理论学时
                          </th>
                          <th className="text-center p-1 text-muted-foreground font-medium w-[70px] align-middle whitespace-nowrap text-xs">
                            实践学时
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectMatrixData?.data
                          ?.filter((item: ProjectMatrixItem) => item.courseMatrix?.projectId === projectId)
                          .map((item: ProjectMatrixItem, rowIdx: number) => (
                            <tr
                              key={item.courseMatrix?.id || rowIdx}
                              className="border-b border-border hover:bg-secondary/20"
                            >
                              <td className="p-2 text-center border-r border-border">
                                <SupportLabel
                                  title={item.courseMatrix?.point?.title || "-"}
                                  desc={item.courseMatrix?.point?.description}
                                  type={item.courseMatrix?.relate?.relate === 0 ? "strong" : "weak"}
                                  size="md"
                                  tipsPosition="right"
                                />
                              </td>
                              {goals.map((goal: ProjectMatrixGoal, goalIdx: number) => {
                                // 查找该教学目标对应的所有projectMatrix
                                const goalProjectMatrices =
                                  item.projectMatrices?.filter(
                                    (pm: ProjectMatrixItemProjectMatrix) => String(pm.taskGoalId) === String(goal.id)
                                  ) || []

                                return (
                                  <td
                                    key={goal.id || goalIdx}
                                    className="p-2 text-center border-r border-border text-foreground"
                                  >
                                    {isEditingProjectMatrix ? (
                                      <div
                                        className={`flex items-center justify-center gap-2 flex-wrap ${
                                          goalProjectMatrices.length === 0 ? "min-h-[32px]" : ""
                                        }`}
                                      >
                                        {goalProjectMatrices.map((pm: ProjectMatrixItemProjectMatrix, pmIdx: number) => (
                                          <SupportLabel
                                            key={pm.id || pmIdx}
                                            title={`${pm.ksa?.title}${pm.ksa?.level}`}
                                            desc={pm.ksa?.description}
                                            type={pm.relate?.relate === 0 ? "strong" : "weak"}
                                            size="md"
                                          />
                                        ))}
                                        {canManageProjectMatrix && (
                                          <button
                                            onClick={() =>
                                              handleOpenKsaDialogWithPermission(
                                                String(projectId),
                                                String(item.courseMatrix?.point?.id ?? ""),
                                                String(goal.id)
                                              )
                                            }
                                            className="w-4 h-4 rounded-full border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-all group flex-shrink-0"
                                            title="添加KSA支撑关系"
                                          >
                                            <Plus className="w-2 h-2 text-primary/60 group-hover:text-primary" />
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center gap-2 flex-wrap min-h-[32px]">
                                        {goalProjectMatrices.length > 0 ? (
                                           goalProjectMatrices.map((pm: ProjectMatrixItemProjectMatrix, pmIdx: number) => (
                                             <SupportLabel
                                               key={pm.id || pmIdx}
                                              title={`${pm.ksa?.title}${pm.ksa?.level}`}
                                              desc={pm.ksa?.description}
                                              type={pm.relate?.relate === 0 ? "strong" : "weak"}
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
                              })}
                              <td className="p-2 text-center border-r border-border text-foreground w-[120px] overflow-hidden">
                                {isEditingProjectMatrix ? (
                                  focusedCell === `study-${item.courseMatrix?.id}` ? (
                                    <textarea
                                      autoFocus
                                      value={item.courseMatrix?.study || ""}
                                      onChange={() => {}}
                                      onBlur={() => onFocusCell(null)}
                                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                                      placeholder="输入学法"
                                      rows={4}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={item.courseMatrix?.study || ""}
                                      onChange={() => {}}
                                      onFocus={() => onFocusCell(`study-${item.courseMatrix?.id}`)}
                                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                      placeholder="输入学法"
                                    />
                                  )
                                ) : (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-xs line-clamp-1 cursor-help">
                                          {item.courseMatrix?.study || "-"}
                                        </span>
                                      </TooltipTrigger>
                                      {item.courseMatrix?.study && (
                                        <TooltipContent side="top" align="center">
                                          {item.courseMatrix.study}
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </td>
                              <td className="p-2 text-center border-r border-border text-foreground w-[220px] overflow-hidden">
                                {isEditingProjectMatrix ? (
                                  focusedCell === `teach-${item.courseMatrix?.id}` ? (
                                    <textarea
                                      autoFocus
                                      value={item.courseMatrix?.teach || ""}
                                      onChange={() => {}}
                                      onBlur={() => onFocusCell(null)}
                                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                                      placeholder="输入教法"
                                      rows={4}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={item.courseMatrix?.teach || ""}
                                      onChange={() => {}}
                                      onFocus={() => onFocusCell(`teach-${item.courseMatrix?.id}`)}
                                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                      placeholder="输入教法"
                                    />
                                  )
                                ) : (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-xs line-clamp-1 cursor-help">
                                          {item.courseMatrix?.teach || "-"}
                                        </span>
                                      </TooltipTrigger>
                                      {item.courseMatrix?.teach && (
                                        <TooltipContent side="top" align="center">
                                          {item.courseMatrix.teach}
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </td>
                              <td className="p-2 text-center border-r border-border text-foreground w-[280px] overflow-hidden">
                                {isEditingProjectMatrix ? (
                                  focusedCell === `product-${item.courseMatrix?.id}` ? (
                                    <textarea
                                      autoFocus
                                      value={item.courseMatrix?.product || ""}
                                      onChange={() => {}}
                                      onBlur={() => onFocusCell(null)}
                                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                                      placeholder="输入学习产出"
                                      rows={6}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={item.courseMatrix?.product || ""}
                                      onChange={() => {}}
                                      onFocus={() => onFocusCell(`product-${item.courseMatrix?.id}`)}
                                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                      placeholder="输入学习产出"
                                    />
                                  )
                                ) : (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-xs line-clamp-1 cursor-help">
                                          {item.courseMatrix?.product || "-"}
                                        </span>
                                      </TooltipTrigger>
                                      {item.courseMatrix?.product && (
                                        <TooltipContent side="top" align="center">
                                          {item.courseMatrix.product}
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </td>
                              {/* 教学安排 - 开课周数 */}
                              <td className="p-1 text-center border-r border-border text-foreground w-[70px]">
                                {isEditingProjectMatrix ? (
                                  <input
                                    type="text"
                                    value={item.courseMatrix?.week || ""}
                                    onChange={() => {}}
                                    className="w-full px-0.5 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    placeholder="周数"
                                  />
                                ) : (
                                  <span className="text-xs">{item.courseMatrix?.week || "-"}</span>
                                )}
                              </td>
                              {/* 教学安排 - 理论学时 */}
                              <td className="p-1 text-center text-foreground w-[70px] border-r border-border">
                                {isEditingProjectMatrix ? (
                                  <input
                                    type="text"
                                    value={item.courseMatrix?.theoryPeriod || ""}
                                    onChange={() => {}}
                                    className="w-full px-0.5 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    placeholder="理论"
                                  />
                                ) : (
                                  <span className="text-xs">{item.courseMatrix?.theoryPeriod || "-"}</span>
                                )}
                              </td>
                              {/* 教学安排 - 实践学时 */}
                              <td className="p-1 text-center text-foreground w-[70px]">
                                {isEditingProjectMatrix ? (
                                  <input
                                    type="text"
                                    value={item.courseMatrix?.practicePeriod || ""}
                                    onChange={() => {}}
                                    className="w-full px-0.5 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    placeholder="实践"
                                  />
                                ) : (
                                  <span className="text-xs">{item.courseMatrix?.practicePeriod || "-"}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        {/* 最后一行 - 教学目标的学习产出及测量评价标准 */}
                        <tr className="bg-secondary/30 border-b border-border font-medium">
                          <td colSpan={goals.length + 7} className="p-3 text-left text-foreground">
                            教学目标的学习产出及测量评价标准
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">暂无教学目标</div>
              )}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
