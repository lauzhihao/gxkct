"use client"

import { useState, useEffect } from "react"
import { Building2, ChevronRight } from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/shared/components/ui/breadcrumb"
import { LoadingState } from "@/shared/components/ui/loading-state"
import type { TeachingSupervisoryTask, Long } from "@/types"
import { courseTeachingTasksApi, type CollegeDeptEvaluationItem } from "@/modules/courses/api/courseTeachingTasksApi"
import { MajorEvaluationList } from "./MajorEvaluationList"

interface DeptEvaluationListProps {
  task: TeachingSupervisoryTask
  collegeId: Long
  collegeName?: string
  onBack: () => void
}

export function DeptEvaluationList({ task, collegeId, collegeName, onBack }: DeptEvaluationListProps) {
  const [depts, setDepts] = useState<CollegeDeptEvaluationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDept, setSelectedDept] = useState<CollegeDeptEvaluationItem | null>(null)

  const taskId = (task.taskId ?? task.id) as Long

  // 加载院系列表
  useEffect(() => {
    if (!taskId || !collegeId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    let cancelled = false

    const loadDepts = async () => {
      try {
        const response = await courseTeachingTasksApi.getDeptsByTaskAndCollege(taskId, collegeId)
        if (!cancelled && response.data) {
          setDepts(response.data)
        }
      } catch (error) {
        if (!cancelled) {
          console.error("加载院系列表失败:", error)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadDepts()

    return () => {
      cancelled = true
    }
  }, [taskId, collegeId])

  // 处理返回
  const handleBackFromMajorList = () => {
    setSelectedDept(null)
  }

  // 渲染面包屑导航
  const renderBreadcrumb = () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            href="#"
            onClick={(e) => {
              e.preventDefault()
              onBack()
            }}
            className="text-muted-foreground hover:text-primary cursor-pointer"
          >
            {task.title}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight className="w-4 h-4" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          {selectedDept ? (
            <BreadcrumbLink
              href="#"
              onClick={(e) => {
                e.preventDefault()
                handleBackFromMajorList()
              }}
              className="text-muted-foreground hover:text-primary cursor-pointer"
            >
              {collegeName || "学校"}
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage className="text-primary">{collegeName || "学校"}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {selectedDept && (
          <>
            <BreadcrumbSeparator>
              <ChevronRight className="w-4 h-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-primary">{selectedDept.deptName}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )

  // 如果选中了院系，显示专业列表
  if (selectedDept) {
    return (
      <MajorEvaluationList
        task={task}
        deptId={selectedDept.deptId}
        deptName={selectedDept.deptName}
        onBack={handleBackFromMajorList}
        parentBreadcrumb={{ taskTitle: task.title, collegeName }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      {renderBreadcrumb()}

      {/* 院系卡片网格 */}
      {isLoading ? (
        <LoadingState variant="card" />
      ) : depts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">该学校下暂无院系数据</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {depts.map((dept, index) => (
            <button
              key={`${dept.deptId}-${index}`}
              type="button"
              onClick={() => setSelectedDept(dept)}
              className="rounded-lg border border-border bg-card/50 p-4 text-left hover:border-primary/50 hover:bg-accent/5 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-3">
                    {dept.deptName}
                  </h4>
                  {/* 专业、课程和平均 */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">专业</div>
                      <div className="text-sm font-bold text-primary">
                        {dept.majorCount ?? 0}
                      </div>
                    </div>
                    <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">课程</div>
                      <div className="text-sm font-bold text-primary">
                        {dept.courseCount ?? 0}
                      </div>
                    </div>
                    <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">平均</div>
                      <div className="text-sm font-bold text-primary">
                        {dept.avgDeptScore != null ? dept.avgDeptScore.toFixed(1) : "-"}
                      </div>
                    </div>
                  </div>
                  {/* 进度统计 */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">已完成</div>
                      <div className="text-sm font-bold text-green-600">
                        {dept.completedCount ?? 0}
                      </div>
                    </div>
                    <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">进行中</div>
                      <div className="text-sm font-bold text-blue-600">
                        {dept.inProgressCount ?? 0}
                      </div>
                    </div>
                    <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">未开始</div>
                      <div className="text-sm font-bold text-foreground">
                        {dept.notStartedCount ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
