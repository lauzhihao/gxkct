"use client"

import { useState, useEffect, useCallback } from "react"
import { BookOpen, ChevronRight } from "lucide-react"
import { LoadingState } from "@/shared/components/ui/loading-state"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/shared/components/ui/breadcrumb"
import type { TeachingSupervisoryTask, Long } from "@/types"
import { courseTeachingTasksApi, type MajorCourseEvaluationItem } from "@/modules/courses/api/courseTeachingTasksApi"
import { EvaluationDetail } from "./EvaluationDetail"

interface ParentBreadcrumb {
  taskTitle: string
  collegeName?: string
  deptName?: string
}

interface CourseEvaluationListProps {
  task: TeachingSupervisoryTask
  majorId: Long
  majorName?: string
  semesterId?: number | null
  onBack: () => void
  parentBreadcrumb?: ParentBreadcrumb
  onSaveSuccess?: () => void
}

export function CourseEvaluationList({ task, majorId, majorName, semesterId, onBack, parentBreadcrumb, onSaveSuccess }: CourseEvaluationListProps) {
  const [courses, setCourses] = useState<MajorCourseEvaluationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<MajorCourseEvaluationItem | null>(null)

  const taskId = (task.taskId ?? task.id) as Long

  // 加载课程列表
  const loadCourses = useCallback(async () => {
    if (!taskId || !majorId) return
    setIsLoading(true)
    try {
      const response = await courseTeachingTasksApi.getCoursesByTaskAndMajor(taskId, majorId, semesterId)
      if (response.data) {
        setCourses(response.data)
      } else {
        setCourses([])
      }
    } catch (error) {
      console.error("加载课程列表失败:", error)
      setCourses([])
    } finally {
      setIsLoading(false)
    }
  }, [majorId, semesterId, taskId])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  // 处理返回 — 退出评分详情并刷新列表
  const handleBackFromDetail = () => {
    setSelectedCourse(null)
    loadCourses()
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
        {/* 院系名称（如果从院系级别进入） */}
        {parentBreadcrumb?.deptName && (
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
                {parentBreadcrumb.deptName}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="w-4 h-4" />
            </BreadcrumbSeparator>
          </>
        )}
        {/* 专业名称 */}
        <BreadcrumbItem>
          {selectedCourse ? (
            <BreadcrumbLink
              href="#"
              onClick={(e) => {
                e.preventDefault()
                handleBackFromDetail()
              }}
              className="text-muted-foreground hover:text-primary cursor-pointer"
            >
              {majorName || "专业"}
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage className="text-primary">{majorName || "专业"}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {/* 课程名称 */}
        {selectedCourse && (
          <>
            <BreadcrumbSeparator>
              <ChevronRight className="w-4 h-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-primary">{selectedCourse.courseName}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )

  // 如果选中了课程，显示评分详情
  if (selectedCourse) {
    return (
        <EvaluationDetail
          taskId={taskId}
          courseId={selectedCourse.courseId}
          courseName={selectedCourse.courseName}
          semesterId={semesterId}
          onBack={handleBackFromDetail}
          breadcrumb={renderBreadcrumb()}
          onSaveSuccess={onSaveSuccess}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      {renderBreadcrumb()}

      {/* 课程卡片网格 */}
        {isLoading ? (
          <LoadingState variant="card" />
        ) : courses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{semesterId === null ? "该专业下暂无课程数据" : "该学期暂无课程数据"}</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {courses.map((course) => (
              <button
                key={course.courseId}
                type="button"
                onClick={() => setSelectedCourse(course)}
                className="rounded-lg border border-border bg-card/50 p-4 text-left hover:border-primary/50 hover:bg-accent/5 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-3">
                      {course.courseName}
                    </h4>
                    {/* 三种评分展示 */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                        <div className="text-xs text-muted-foreground mb-0.5">自评</div>
                        <div className="text-sm font-bold text-foreground">
                          {course.selfTotalScore ?? "-"}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                        <div className="text-xs text-muted-foreground mb-0.5">专业</div>
                        <div className="text-sm font-bold text-foreground">
                          {course.deptTotalScore ?? "-"}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                        <div className="text-xs text-muted-foreground mb-0.5">院校</div>
                        <div className="text-sm font-bold text-foreground">
                          {course.schoolTotalScore ?? "-"}
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
