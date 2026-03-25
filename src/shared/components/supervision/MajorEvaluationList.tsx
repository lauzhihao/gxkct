"use client"

import { useState, useEffect } from "react"
import { GraduationCap, ChevronRight } from "lucide-react"
import { LoadingState } from "@/shared/components/ui/loading-state"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/shared/components/ui/breadcrumb"
import type { TeachingSupervisoryTask, Long } from "@/types"
import { courseTeachingTasksApi, type DeptMajorEvaluationItem } from "@/modules/courses/api/courseTeachingTasksApi"
import { CourseEvaluationList } from "./CourseEvaluationList"

interface ParentBreadcrumb {
  taskTitle: string
  collegeName?: string
}

interface MajorEvaluationListProps {
  task: TeachingSupervisoryTask
  deptId: Long
  deptName?: string
  onBack: () => void
  parentBreadcrumb?: ParentBreadcrumb
  onSaveSuccess?: () => void
}

export function MajorEvaluationList({ task, deptId, deptName, onBack, parentBreadcrumb, onSaveSuccess }: MajorEvaluationListProps) {
  const [majors, setMajors] = useState<DeptMajorEvaluationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMajor, setSelectedMajor] = useState<DeptMajorEvaluationItem | null>(null)

  const taskId = (task.taskId ?? task.id) as Long

  // 加载专业列表
  useEffect(() => {
    if (!taskId || !deptId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    let cancelled = false

    const loadMajors = async () => {
      try {
        const response = await courseTeachingTasksApi.getMajorsByTaskAndDept(taskId, deptId)
        if (!cancelled && response.data) {
          setMajors(response.data)
        }
      } catch (error) {
        if (!cancelled) {
          console.error("加载专业列表失败:", error)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadMajors()

    return () => {
      cancelled = true
    }
  }, [taskId, deptId])

  // 处理返回
  const handleBackFromCourseList = () => {
    setSelectedMajor(null)
  }

  // 渲染面包屑导航
  const renderBreadcrumb = () => (
    <Breadcrumb>
      <BreadcrumbList>
        {/* 任务标题 */}
        <BreadcrumbItem>
          <BreadcrumbLink
            href="#"
            onClick={(e) => {
              e.preventDefault()
              onBack()
            }}
            className="text-muted-foreground hover:text-primary cursor-pointer"
          >
            {parentBreadcrumb?.taskTitle || task.title}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight className="w-4 h-4" />
        </BreadcrumbSeparator>
        {/* 学校名称（如果从学校级别进入） */}
        {parentBreadcrumb?.collegeName && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  onBack()
                }}
                className="text-muted-foreground hover:text-primary cursor-pointer"
              >
                {parentBreadcrumb.collegeName}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="w-4 h-4" />
            </BreadcrumbSeparator>
          </>
        )}
        {/* 院系名称 */}
        <BreadcrumbItem>
          {selectedMajor ? (
            <BreadcrumbLink
              href="#"
              onClick={(e) => {
                e.preventDefault()
                handleBackFromCourseList()
              }}
              className="text-muted-foreground hover:text-primary cursor-pointer"
            >
              {deptName || "院系"}
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage className="text-primary">{deptName || "院系"}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {/* 专业名称 */}
        {selectedMajor && (
          <>
            <BreadcrumbSeparator>
              <ChevronRight className="w-4 h-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-primary">{selectedMajor.majorName}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )

  // 如果选中了专业，显示课程列表
  if (selectedMajor) {
    return (
      <CourseEvaluationList
        task={task}
        majorId={selectedMajor.majorId}
        majorName={selectedMajor.majorName}
        onBack={handleBackFromCourseList}
        parentBreadcrumb={{ taskTitle: task.title, collegeName: parentBreadcrumb?.collegeName, deptName }}
        onSaveSuccess={onSaveSuccess}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      {renderBreadcrumb()}

        {/* 专业卡片网格 */}
        {isLoading ? (
          <LoadingState variant="card" />
        ) : majors.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">该院系下暂无专业数据</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {majors.map((major, index) => (
              <button
                key={`${major.majorId}-${index}`}
                type="button"
                onClick={() => setSelectedMajor(major)}
                className="rounded-lg border border-border bg-card/50 p-4 text-left hover:border-primary/50 hover:bg-accent/5 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-3">
                      {major.majorName}
                    </h4>
                    {/* 课程和平均 */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                        <div className="text-xs text-muted-foreground mb-0.5">课程</div>
                        <div className="text-sm font-bold text-primary">
                          {major.courseCount ?? 0}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                        <div className="text-xs text-muted-foreground mb-0.5">平均</div>
                        <div className="text-sm font-bold text-primary">
                          {major.avgDeptScore != null ? major.avgDeptScore.toFixed(1) : "-"}
                        </div>
                      </div>
                    </div>
                    {/* 进度统计 */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                        <div className="text-xs text-muted-foreground mb-0.5">已完成</div>
                        <div className="text-sm font-bold text-green-600">
                          {major.completedCount ?? 0}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                        <div className="text-xs text-muted-foreground mb-0.5">进行中</div>
                        <div className="text-sm font-bold text-blue-600">
                          {major.inProgressCount ?? 0}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                        <div className="text-xs text-muted-foreground mb-0.5">未开始</div>
                        <div className="text-sm font-bold text-foreground">
                          {major.notStartedCount ?? 0}
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
