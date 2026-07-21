/**
 * 项目矩阵表格组件
 * 负责渲染项目矩阵表格和交互
 */

import { Plus, Flag } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/components/ui/accordion"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/shared/components/ui/tooltip"
import { Button } from "@/shared/components/ui/button"
import { SupportLabel } from "@/shared/components/support-label"
import { Empty, EmptyDescription, EmptyTitle } from "@/shared/components/ui/empty"
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
  onUpdateCourseMatrixField: (
    courseMatrixId: number | undefined,
    field: "study" | "teach" | "product" | "week" | "theoryPeriod" | "practicePeriod",
    value: string,
  ) => void
  onOpenTaskObjectivesDialog: (projectId: string, goals: ProjectMatrixGoal[]) => void
  onOpenKsaDialog: (chapterId: string, coursePointId: string, taskId: string) => void
  onRemoveKsaSupport: (courseMatrixId: number | undefined, taskGoalId: number, ksaId: number) => void
  onFocusCell: (cellId: string | null) => void
}

export function ProjectMatrixTable({
  courseEditable,
  projectMatrixData,
  isEditingProjectMatrix,
  focusedCell,
  onUpdateCourseMatrixField,
  onOpenTaskObjectivesDialog,
  onOpenKsaDialog,
  onRemoveKsaSupport,
  onFocusCell,
}: ProjectMatrixTableProps) {
  const canManageProjectMatrix = courseEditable
  const POINT_COLUMN_WIDTH = 96
  const GOAL_COLUMN_WIDTH = 144
  const STUDY_COLUMN_WIDTH = 120
  const TEACH_COLUMN_WIDTH = 168
  const PRODUCT_COLUMN_WIDTH = 192
  const SCHEDULE_COLUMN_WIDTH = 68

  const hasDisplayText = (value: string | null | undefined): value is string => {
    return typeof value === "string" && value.trim().length > 0
  }

  const renderTooltipText = (value: string | null | undefined) => {
    if (!hasDisplayText(value)) {
      return null
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="line-clamp-1 cursor-help text-sm">{value}</span>
          </TooltipTrigger>
          <TooltipContent side="top" align="center">
            {value}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const handleOpenTaskObjectivesDialogWithPermission = (projectId: string, goals: ProjectMatrixGoal[]) => {
    if (!canManageProjectMatrix) return
    onOpenTaskObjectivesDialog(projectId, goals)
  }

  const handleOpenKsaDialogWithPermission = (projectId: string, coursePointId: string, taskId: string) => {
    if (!canManageProjectMatrix) return
    onOpenKsaDialog(projectId, coursePointId, taskId)
  }

  const handleRemoveKsaSupportWithPermission = (
    courseMatrixId: number | undefined,
    taskGoalId: number,
    ksaId: number | undefined,
  ) => {
    if (!canManageProjectMatrix) return
    if (typeof ksaId !== "number" || !Number.isInteger(ksaId) || ksaId <= 0) return
    onRemoveKsaSupport(courseMatrixId, taskGoalId, ksaId)
  }

  if (!projectMatrixData?.projects || projectMatrixData.projects.length === 0) {
    return (
      <Empty className="rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl min-h-[500px]">
        <EmptyTitle>暂无项目数据</EmptyTitle>
        <EmptyDescription>当前课程还没有项目矩阵内容，请先补充项目章节或任务目标。</EmptyDescription>
      </Empty>
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
                <div className="w-full overflow-hidden rounded-lg border border-border bg-background">
                  <div className="w-full overflow-x-auto">
                    <table
                      className="w-full border-collapse border border-border text-sm"
                      style={{ tableLayout: "fixed" }}
                    >
                      <colgroup>
                        <col style={{ width: POINT_COLUMN_WIDTH }} />
                        {goals.map((goal: ProjectMatrixGoal, goalIdx: number) => (
                          <col key={`goal-column-${goal.id || goalIdx}`} style={{ width: GOAL_COLUMN_WIDTH }} />
                        ))}
                        <col style={{ width: STUDY_COLUMN_WIDTH }} />
                        <col style={{ width: TEACH_COLUMN_WIDTH }} />
                        <col style={{ width: PRODUCT_COLUMN_WIDTH }} />
                        <col style={{ width: SCHEDULE_COLUMN_WIDTH }} />
                        <col style={{ width: SCHEDULE_COLUMN_WIDTH }} />
                        <col style={{ width: SCHEDULE_COLUMN_WIDTH }} />
                      </colgroup>
                      <thead>
                        {/* 第一行表头 */}
                        <tr className="bg-secondary/50 border-b border-border">
                          <th
                            rowSpan={2}
                            className="border-r border-border p-2.5 text-center align-middle font-medium text-muted-foreground"
                          >
                            课点
                          </th>
                          {goals.map((goal: ProjectMatrixGoal, goalIdx: number) => (
                            <th
                              key={goal.id || goalIdx}
                              rowSpan={2}
                              className="border-r border-border p-2.5 text-left align-middle font-medium text-muted-foreground"
                            >
                              <div className="text-sm whitespace-normal break-words leading-relaxed">
                                {goal.description}
                              </div>
                            </th>
                          ))}
                          <th
                            rowSpan={2}
                            className="border-r border-border p-2.5 text-center align-middle font-medium text-muted-foreground"
                          >
                            学法
                          </th>
                          <th
                            rowSpan={2}
                            className="border-r border-border p-2.5 text-center align-middle font-medium text-muted-foreground"
                          >
                            教法
                          </th>
                          <th
                            rowSpan={2}
                            className="border-r border-border p-2.5 text-center align-middle font-medium text-muted-foreground"
                          >
                            课点学习产出及测量
                          </th>
                          <th
                            colSpan={3}
                            className="border-r border-border p-2.5 text-center align-middle font-medium text-muted-foreground"
                          >
                            教学安排
                          </th>
                        </tr>
                        {/* 第二行表头 - 仅教学安排的子列 */}
                        <tr className="bg-secondary/50 border-b border-border">
                          <th className="border-r border-border p-1.5 text-center align-middle text-sm font-medium whitespace-normal break-words leading-tight text-muted-foreground">
                            开课周数
                          </th>
                          <th className="border-r border-border p-1.5 text-center align-middle text-sm font-medium whitespace-normal break-words leading-tight text-muted-foreground">
                            理论学时
                          </th>
                          <th className="p-1.5 text-center align-middle text-sm font-medium whitespace-normal break-words leading-tight text-muted-foreground">
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
                              <td className="border-r border-border p-2.5 text-center">
                                {hasDisplayText(item.courseMatrix?.point?.title) ? (
                                  <SupportLabel
                                    title={item.courseMatrix.point.title}
                                    desc={item.courseMatrix?.point?.description}
                                    type={item.courseMatrix?.relate?.relate === 0 ? "strong" : "weak"}
                                    size="md"
                                    tipsPosition="right"
                                  />
                                ) : null}
                              </td>
                              {goals.map((goal: ProjectMatrixGoal, goalIdx: number) => {
                                // 查找该教学目标对应的所有projectMatrix
                                let goalProjectMatrices: ProjectMatrixItemProjectMatrix[] = []
                                if (item.projectMatrices !== undefined) {
                                  goalProjectMatrices = item.projectMatrices.filter(
                                    (pm: ProjectMatrixItemProjectMatrix) =>
                                      String(pm.taskGoalId) === String(goal.id) && pm.id >= 0
                                  )
                                }

                                return (
                                  <td
                                    key={goal.id || goalIdx}
                                    className="border-r border-border p-2.5 text-center text-foreground"
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
                                            showRemoveButton={canManageProjectMatrix}
                                            onRemove={() =>
                                              handleRemoveKsaSupportWithPermission(
                                                item.courseMatrix?.id,
                                                goal.id,
                                                pm.ksa?.id
                                              )
                                            }
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
                                            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-dashed border-primary/40 transition-all group hover:border-primary hover:bg-primary/10"
                                            title="添加KSA支撑关系"
                                          >
                                            <Plus className="h-2.5 w-2.5 text-primary/60 group-hover:text-primary" />
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
                                        ) : null}
                                      </div>
                                    )}
                                  </td>
                                )
                              })}
                              <td className="overflow-hidden border-r border-border p-2.5 text-center text-foreground">
                                {isEditingProjectMatrix ? (
                                  focusedCell === `study-${item.courseMatrix?.id}` ? (
                                    <textarea
                                      autoFocus
                                      value={item.courseMatrix?.study || ""}
                                      onChange={(e) => onUpdateCourseMatrixField(item.courseMatrix?.id, "study", e.target.value)}
                                      onBlur={() => onFocusCell(null)}
                                       className="w-full resize-none rounded border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                                      placeholder="输入学法"
                                      rows={4}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={item.courseMatrix?.study || ""}
                                      onChange={(e) => onUpdateCourseMatrixField(item.courseMatrix?.id, "study", e.target.value)}
                                      onFocus={() => onFocusCell(`study-${item.courseMatrix?.id}`)}
                                       className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                                      placeholder="输入学法"
                                    />
                                  )
                                ) : (
                                  renderTooltipText(item.courseMatrix?.study)
                                )}
                              </td>
                              <td className="overflow-hidden border-r border-border p-2.5 text-center text-foreground">
                                {isEditingProjectMatrix ? (
                                  focusedCell === `teach-${item.courseMatrix?.id}` ? (
                                    <textarea
                                      autoFocus
                                      value={item.courseMatrix?.teach || ""}
                                      onChange={(e) => onUpdateCourseMatrixField(item.courseMatrix?.id, "teach", e.target.value)}
                                      onBlur={() => onFocusCell(null)}
                                       className="w-full resize-none rounded border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                                      placeholder="输入教法"
                                      rows={4}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={item.courseMatrix?.teach || ""}
                                      onChange={(e) => onUpdateCourseMatrixField(item.courseMatrix?.id, "teach", e.target.value)}
                                      onFocus={() => onFocusCell(`teach-${item.courseMatrix?.id}`)}
                                       className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                                      placeholder="输入教法"
                                    />
                                  )
                                ) : (
                                  renderTooltipText(item.courseMatrix?.teach)
                                )}
                              </td>
                              <td className="overflow-hidden border-r border-border p-2.5 text-center text-foreground">
                                {isEditingProjectMatrix ? (
                                  focusedCell === `product-${item.courseMatrix?.id}` ? (
                                    <textarea
                                      autoFocus
                                      value={item.courseMatrix?.product || ""}
                                      onChange={(e) => onUpdateCourseMatrixField(item.courseMatrix?.id, "product", e.target.value)}
                                      onBlur={() => onFocusCell(null)}
                                       className="w-full resize-none rounded border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                                      placeholder="输入学习产出"
                                      rows={6}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={item.courseMatrix?.product || ""}
                                      onChange={(e) => onUpdateCourseMatrixField(item.courseMatrix?.id, "product", e.target.value)}
                                      onFocus={() => onFocusCell(`product-${item.courseMatrix?.id}`)}
                                       className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                                      placeholder="输入学习产出"
                                    />
                                  )
                                ) : (
                                  renderTooltipText(item.courseMatrix?.product)
                                )}
                              </td>
                              {/* 教学安排 - 开课周数 */}
                              <td className="border-r border-border p-1.5 text-center text-foreground">
                                {isEditingProjectMatrix ? (
                                  <input
                                    type="text"
                                    value={item.courseMatrix?.week || ""}
                                    onChange={(e) => onUpdateCourseMatrixField(item.courseMatrix?.id, "week", e.target.value)}
                                     className="w-full rounded border border-border bg-background px-1 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    placeholder="周数"
                                  />
                                ) : (
                                  <span className="text-sm">
                                    {hasDisplayText(item.courseMatrix?.week) ? item.courseMatrix.week : ""}
                                  </span>
                                )}
                              </td>
                              {/* 教学安排 - 理论学时 */}
                              <td className="border-r border-border p-1.5 text-center text-foreground">
                                {isEditingProjectMatrix ? (
                                  <input
                                    type="text"
                                    value={item.courseMatrix?.theoryPeriod || ""}
                                    onChange={(e) => onUpdateCourseMatrixField(item.courseMatrix?.id, "theoryPeriod", e.target.value)}
                                     className="w-full rounded border border-border bg-background px-1 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    placeholder="理论"
                                  />
                                ) : (
                                  <span className="text-sm">
                                    {hasDisplayText(item.courseMatrix?.theoryPeriod) ? item.courseMatrix.theoryPeriod : ""}
                                  </span>
                                )}
                              </td>
                              {/* 教学安排 - 实践学时 */}
                              <td className="p-1.5 text-center text-foreground">
                                {isEditingProjectMatrix ? (
                                  <input
                                    type="text"
                                    value={item.courseMatrix?.practicePeriod || ""}
                                    onChange={(e) => onUpdateCourseMatrixField(item.courseMatrix?.id, "practicePeriod", e.target.value)}
                                     className="w-full rounded border border-border bg-background px-1 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    placeholder="实践"
                                  />
                                ) : (
                                  <span className="text-sm">
                                    {hasDisplayText(item.courseMatrix?.practicePeriod) ? item.courseMatrix.practicePeriod : ""}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        <tr className="border-b border-border bg-secondary/30 font-medium">
                          <td className="border-r border-border p-4 text-left align-top text-base text-foreground">
                            教学目标的学习产出及测量评价标准
                          </td>
                          {goals.map((goal: ProjectMatrixGoal, goalIdx: number) => (
                            <td
                              key={`goal-product-${goal.id || goalIdx}`}
                              className="border-r border-border p-4 text-left align-top text-sm text-foreground"
                            >
                              <div className="whitespace-normal break-words leading-relaxed">
                                {hasDisplayText(goal.product) ? goal.product : ""}
                              </div>
                            </td>
                          ))}
                          <td className="border-r border-border p-4" />
                          <td className="border-r border-border p-4" />
                          <td className="border-r border-border p-4" />
                          <td className="border-r border-border p-4" />
                          <td className="border-r border-border p-4" />
                          <td className="p-4" />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">暂无课点支撑关系</div>
              )}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
