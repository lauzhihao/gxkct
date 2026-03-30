"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/shared/components/ui/button"
import { BookMarked, Plus, Search, FileText, User, X } from "lucide-react"
import { LoadingState } from "@/shared/components/ui/loading-state"
import { cn } from "@/shared/utils/utils"
import { usePermission } from "@/shared/hooks/use-permission"
import type { PermissionAction } from "@/shared/permissions/types"
import type { TreeNode } from "@/types"
import { useMajorCoursePreferences } from "@/modules/majors/hooks/use-major-course-preferences"
import { api } from "@/lib/api"
import { setCourseCacheBatch, type CourseCacheItem } from "@/shared/utils/course-cache"
import { useSemesterStore } from "@/shared/stores/semester-store"
import { useSemesterReadonly } from "@/shared/hooks/use-semester-readonly"

const MANAGE_MAJOR_COURSE_ACTION: PermissionAction = "major.course.create"
const MANAGE_MAJOR_COURSE_CONTEXT = { scope: "major" as const }

interface MajorCoursesProps {
  node: TreeNode
  currentUser: { username: string; role: string } | null
  onNodeSelect?: (node: any) => void
  onAddCourse: () => void
  majorCourses?: Map<string, TreeNode[]>
  departmentId?: string
  refreshKey?: number
  // [MOD] 从父组件传入权限控制，与编辑专业按钮保持一致
  canManageCourse?: boolean
}

export function MajorCourses(props: MajorCoursesProps) {
  const { node, currentUser, onNodeSelect, onAddCourse, refreshKey, canManageCourse } = props
  const [courseSearchTerm, setCourseSearchTerm] = useState("")
  const { showMyCourses, setShowMyCourses } = useMajorCoursePreferences()
  // [MOD] 优先使用从父组件传入的权限，保持与编辑专业按钮一致
  const { can } = usePermission()
  const selectedSemesterId = useSemesterStore((state) => state.selectedSemesterId)
  const isSemesterReadonly = useSemesterReadonly()
  const canManageMajorCourse = !isSemesterReadonly && (canManageCourse ?? can(MANAGE_MAJOR_COURSE_ACTION, MANAGE_MAJOR_COURSE_CONTEXT))

  // 右侧组件内部独立获取课程数据，与左侧树完全隔离
  const [courses, setCourses] = useState<TreeNode[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const setCourseCacheFromItems = useCallback((courseItems: TreeNode[]) => {
    const cacheItems: CourseCacheItem[] = courseItems.map((course) => ({
      courseId: course.id || '',
      courseName: course.nodeName,
      majorName: node.nodeName || node.name || '',
      instructors: (course.manager || []).map((m: { label: string }) => m.label).filter(Boolean),
    })).filter((item: CourseCacheItem) => item.courseId)

    if (cacheItems.length > 0) {
      setCourseCacheBatch(cacheItems)
    }
  }, [node.name, node.nodeName])

  // 当节点变化时，直接调用接口获取课程列表（不通过 api.tree，避免影响左侧树）
  useEffect(() => {
    const fetchCourses = async () => {
      if (!node?.id) {
        setCourses([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const response = await api.tree.getMajorCourses(node.id, selectedSemesterId)
        if (!response.data) {
          setCourses([])
          return
        }

        setCourses(response.data)
        setCourseCacheFromItems(response.data)
      } catch (error) {
        console.error('[MajorCourses] 获取课程列表失败:', error)
        setCourses([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourses()
  }, [node?.id, refreshKey, selectedSemesterId, setCourseCacheFromItems])

  // 获取课程ID
  const getCourseId = (course: TreeNode) => course.id || ''

  // 获取课程名称
  const getCourseName = (course: TreeNode) => course.nodeName

  // 获取讲师数组（从 manager 字段提取 label）
  const getInstructors = (course: TreeNode) => {
    const managers = course.manager || []
    const instructors = managers.map((m) => m.label).filter(Boolean)
    return instructors.length > 0 ? instructors : ["未设置"]
  }

  // 判断讲师是否已设置
  const isInstructorSet = (course: TreeNode) => {
    const managers = course.manager || []
    return managers.length > 0
  }

  const filteredCourses = courses.filter((course) => {
    const courseName = getCourseName(course)
    const matchesSearch = !courseSearchTerm || courseName.toLowerCase().includes(courseSearchTerm.toLowerCase())
    const instructors = getInstructors(course)
    const matchesMyCourses = !showMyCourses || instructors.includes((currentUser?.username) ?? "")
    return matchesSearch && matchesMyCourses
  })

  const handleAddCourse = () => {
    if (!canManageMajorCourse) return
    onAddCourse()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-primary" />
          课程管理
        </h3>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索课程名称..."
              value={courseSearchTerm}
              onChange={(e) => setCourseSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {courseSearchTerm && (
              <button
                onClick={() => setCourseSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="清空搜索"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="my-courses-checkbox"
              checked={showMyCourses}
              onChange={(e) => setShowMyCourses(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="my-courses-checkbox" className="text-sm text-foreground cursor-pointer">
              我的课程
            </label>
          </div>
          {canManageMajorCourse && (
            <Button size="sm" variant="ghost" onClick={handleAddCourse} className="gap-2 hover:bg-primary/10">
              <Plus className="w-4 h-4 text-primary" />
              <span className="text-primary font-medium">开设课程</span>
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingState title="加载课程列表中..." variant="card" />
      ) : !courses || courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-muted-foreground mb-4">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-1">暂未设置课程</p>
            <p className="text-xs text-muted-foreground">{selectedSemesterId === null ? "开始创建课程，完善专业课程体系" : "该学期暂无课程数据"}</p>
          </div>
          {canManageMajorCourse && (
            <Button size="sm" variant="ghost" onClick={handleAddCourse} className="gap-2 hover:bg-primary/10">
              <Plus className="w-4 h-4 text-primary" />
              <span className="text-primary font-medium">开设课程</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-[20px]">
          {filteredCourses.map((course) => (
            <button
              key={getCourseId(course)}
              onClick={() => onNodeSelect && onNodeSelect({
                ...course,
                id: getCourseId(course),
                nodeId: `course_${getCourseId(course)}`,
                name: getCourseName(course),
                nodeName: getCourseName(course),
                type: 'course',
                nodeType: 'course',
                manager: course.manager,
                btnMenus: course.btnMenus,
                coverMenus: course.coverMenus,
                metadata: {
                  ...(course.metadata || {}),
                },
              })}
              className={cn(
                "relative flex flex-col p-5 rounded-xl border transition-all duration-200 min-h-[165px]",
                "bg-white/40 backdrop-blur-md border-primary/20",
                "hover:bg-white/60 hover:shadow-lg hover:scale-105 hover:border-primary/40",
                "group cursor-pointer",
              )}
            >
              <div className="absolute top-3 left-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    "bg-white/50 backdrop-blur-sm",
                    "border border-primary/30",
                    "group-hover:bg-white/70 group-hover:border-primary/50",
                    "transition-all duration-200",
                  )}
                >
                  <FileText className="w-5 h-5 text-primary" />
                </div>
              </div>

              <div className="absolute top-3 right-3">
                <div className="px-2 py-0.5 rounded-full bg-white/60 backdrop-blur-sm border border-primary/30 text-xs font-medium text-primary">
                  课程
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-center px-12">
                  <div className="font-semibold text-foreground text-xl text-center line-clamp-2 leading-tight">
                    {getCourseName(course)}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-3 left-3 flex flex-wrap gap-1 max-w-[calc(100%-24px)]">
                {getInstructors(course).map((instructor: string, idx: number) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center gap-[6px] px-[8px] py-[2px] rounded border",
                      isInstructorSet(course)
                        ? "bg-primary border-primary"
                        : "bg-muted border-muted-foreground/30",
                    )}
                  >
                    <User
                      className={cn(
                        "w-[13px] h-[13px]",
                        isInstructorSet(course) ? "text-white" : "text-muted-foreground",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[13px] font-medium",
                        isInstructorSet(course) ? "text-white" : "text-muted-foreground",
                      )}
                    >
                      {instructor}
                    </span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
