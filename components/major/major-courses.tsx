"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { BookMarked, Plus, Search, FileText, User, Award, Clock, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TreeNode } from "@/types"
import { api } from "@/lib/api"

interface MajorCoursesProps {
  node: TreeNode
  currentUser: { username: string; role: string } | null
  onNodeSelect?: (node: any) => void
  onAddCourse: () => void
  majorCourses?: Map<string, TreeNode[]>
  departmentId?: string
}

export function MajorCourses({ node, currentUser, onNodeSelect, onAddCourse, majorCourses, departmentId }: MajorCoursesProps) {
  const [courseSearchTerm, setCourseSearchTerm] = useState("")
  const [showMyCourses, setShowMyCourses] = useState(false)

  useEffect(() => {
    const loadPreference = async () => {
      const response = await api.preferences.getPreference(`showMyCourses_${node.id}`)
      if (response.data !== null) {
        setShowMyCourses(response.data as boolean)
      }
    }
    loadPreference()
  }, [node.id])

  useEffect(() => {
    api.preferences.setPreference(`showMyCourses_${node.id}`, showMyCourses)
  }, [showMyCourses, node.id])

  // 优先使用动态加载的课程数据，如果没有则使用node.children中的课程
  const courses = majorCourses?.has(node.id)
    ? majorCourses.get(node.id) || []
    : node.children?.filter((child) => child.type === "course") || []

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = !courseSearchTerm || course.name.toLowerCase().includes(courseSearchTerm.toLowerCase())
    const matchesMyCourses = !showMyCourses || course.metadata?.instructor?.includes(currentUser?.username || "")
    return matchesSearch && matchesMyCourses
  })

  // 获取讲师名称，如果没有则返回"未设置"
  const getInstructorName = (course: any) => {
    const instructors = course.metadata?.instructors || []
    return instructors.length > 0 ? instructors.join(", ") : "未设置"
  }

  // 判断讲师是否已设置（有有效的讲师名称）
  const isInstructorSet = (course: any) => {
    const instructors = course.metadata?.instructors || []
    return instructors.length > 0
  }

  // 判断是否全部为"未记录"
  const isUnrecordedOnly = (course: any) => {
    return course.metadata?.hasUnrecordedOnly === true
  }

  return (
    <div className="rounded-lg border border-border bg-white/40 backdrop-blur-md p-6 space-y-4">
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
          <Button size="sm" variant="ghost" onClick={onAddCourse} className="gap-2 hover:bg-primary/10">
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">开设课程</span>
          </Button>
        </div>
      </div>

      {!courses || courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-muted-foreground mb-4">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-1">暂未设置课程</p>
            <p className="text-xs text-muted-foreground">开始创建课程，完善专业课程体系</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onAddCourse} className="gap-2 hover:bg-primary/10">
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">开设课程</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredCourses.map((course: any, index: number) => (
            <button
              key={course.id}
              onClick={() => onNodeSelect && onNodeSelect(course)}
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
                    {course.name}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-3 left-3">
                <div
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
                      "text-[13px] font-medium line-clamp-1",
                      isInstructorSet(course) ? "text-white" : "text-muted-foreground",
                    )}
                  >
                    {getInstructorName(course)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
