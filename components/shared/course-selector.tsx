"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Loader2, ChevronLeft, ChevronRight, Plus, X } from "lucide-react"
import { api } from "@/lib/api"
import type { TreeNode } from "@/types"
import { cn } from "@/lib/utils"
import { MemberSelector } from "./member-selector"
import { useToast } from "@/hooks/use-toast"

interface CourseSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  majorId: string
  majorName: string
  departmentId?: string
  onSaveCourses: (courses: Array<{ course: TreeNode; supportLevel: "strong" | "weak" }>) => void
}

interface QuickCreateCourse {
  name: string
  teachers: any[]
}

export function CourseSelector({ open, onOpenChange, majorId, majorName, departmentId, onSaveCourses }: CourseSelectorProps) {
  const { toast } = useToast()
  const [courses, setCourses] = useState<TreeNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSupport, setSelectedSupport] = useState<Record<string, "strong" | "weak">>({})
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false)
  const [quickCreateCourse, setQuickCreateCourse] = useState<QuickCreateCourse>({ name: "", teachers: [] })
  const [isMemberSelectorOpen, setIsMemberSelectorOpen] = useState(false)
  const courseNameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && majorId) {
      setSearchTerm("")
      setSelectedSupport({})
      setCurrentPage(1)
      loadCourses()
    }
  }, [open, majorId])

  useEffect(() => {
    if (isQuickCreateOpen) {
      setTimeout(() => {
        courseNameInputRef.current?.focus()
      }, 0)
    }
  }, [isQuickCreateOpen])

  const loadCourses = async () => {
    setIsLoading(true)
    try {
      const response = await api.tree.getMajorCourses(majorId)
      if (response.data) {
        setCourses(response.data)
      }
    } catch (error) {
      console.error("加载课程失败:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCourses = courses.filter((course) =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredCourses.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const displayedCourses = filteredCourses.slice(startIndex, startIndex + pageSize)

  const getTeacherName = (index: number) => {
    const teachers = ["张教授", "李主任", "王老师", "刘院长", "陈教授", "赵老师", "孙主任", "周教授", "吴老师"]
    return teachers[index % teachers.length]
  }

  const handleSave = () => {
    const selectedCourses = Object.entries(selectedSupport).map((entry) => {
      const courseId = entry[0]
      const supportLevel = entry[1]
      const course = courses.find((c) => c.id === courseId)
      return {
        course: course!,
        supportLevel,
      }
    })
    onSaveCourses(selectedCourses)
    onOpenChange(false)
    setSearchTerm("")
    setSelectedSupport({})
  }

  const handleCancel = () => {
    onOpenChange(false)
    setSearchTerm("")
    setSelectedSupport({})
  }

  const handleQuickCreateSave = () => {
    if (!quickCreateCourse.name.trim()) {
      toast({
        variant: "destructive",
        title: "验证失败",
        description: "请输入课程名称",
        duration: 3000,
      })
      return
    }

    if (quickCreateCourse.teachers.length === 0) {
      toast({
        variant: "destructive",
        title: "验证失败",
        description: "请选择至少一位任课老师",
        duration: 3000,
      })
      return
    }

    // 创建新课程对象
    const newCourse: TreeNode = {
      id: `course-${Date.now()}`,
      name: quickCreateCourse.name,
      type: "course",
      metadata: {
        teachers: quickCreateCourse.teachers,
      },
    }

    // 添加到课程列表
    setCourses([newCourse, ...courses])

    // 重置快速创建表单
    setQuickCreateCourse({ name: "", teachers: [] })
    setIsQuickCreateOpen(false)

    toast({
      variant: "success",
      title: "创建成功",
      description: `课程 "${quickCreateCourse.name}" 已开设`,
      duration: 3000,
    })
  }

  const handleMemberSelect = (selected: any) => {
    const selectedArray = Array.isArray(selected) ? selected : [selected]
    setQuickCreateCourse({ ...quickCreateCourse, teachers: selectedArray })
    setIsMemberSelectorOpen(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[70vw] max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-4 pb-2">
            <DialogTitle>支撑关系</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col px-6 py-3">
            <div className="relative mb-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索课程名称..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10 border-2 border-primary/30 focus:border-primary"
                />
              </div>
              <Button
                size="sm"
                onClick={() => setIsQuickCreateOpen(true)}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                开设课程
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8 flex-1">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground flex-1 flex flex-col items-center justify-center gap-3">
                <div>{courses.length === 0 ? "暂无课程数据" : "未找到匹配的课程"}</div>
                {courses.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    您也可以
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setIsQuickCreateOpen(true)}
                      className="px-1 h-auto text-primary"
                    >
                      开设课程
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                {displayedCourses.map((course, index) => (
                  <div key={course.id} className="p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{course.name}</h4>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                            {getTeacherName(index)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => setSelectedSupport({ ...selectedSupport, [course.id]: "strong" })}
                          className={cn(
                            "text-xs font-medium transition-all whitespace-nowrap",
                            selectedSupport[course.id] === "strong"
                              ? "bg-orange-500 text-white border-orange-500 hover:bg-orange-600"
                              : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                          )}
                        >
                          强支撑
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setSelectedSupport({ ...selectedSupport, [course.id]: "weak" })}
                          className={cn(
                            "text-xs font-medium transition-all whitespace-nowrap",
                            selectedSupport[course.id] === "weak"
                              ? "bg-green-500 text-white border-green-500 hover:bg-green-600"
                              : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                          )}
                        >
                          弱支撑
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-6 py-1">
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-muted-foreground min-w-[60px] text-center">
                  第 {currentPage} / {totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={handleCancel}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={Object.keys(selectedSupport).length === 0}>
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isQuickCreateOpen} onOpenChange={setIsQuickCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>开设课程</DialogTitle>
            <DialogDescription>填写课程基本信息，快速创建新课程</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">所属专业</label>
              <Input
                placeholder="所属专业"
                value={majorName}
                readOnly
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">课程名称</label>
              <div className="relative">
                <Input
                  ref={courseNameInputRef}
                  placeholder="请输入课程名称"
                  value={quickCreateCourse.name}
                  onChange={(e) => setQuickCreateCourse({ ...quickCreateCourse, name: e.target.value.slice(0, 64) })}
                  maxLength={64}
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  {quickCreateCourse.name.length}/64
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">任课老师</label>
              <div className={cn("h-10 rounded-md bg-background px-3 flex items-center justify-between gap-2", "border border-gray-300")}>
                <div className="flex items-center flex-wrap gap-2 flex-1 overflow-hidden">
                  {quickCreateCourse.teachers.length > 0 ? (
                    quickCreateCourse.teachers.map((teacher: any) => (
                      <div key={teacher.id} className="gap-1 bg-primary/5 border border-primary/20 text-foreground text-sm px-2 py-1 flex items-center">
                        {teacher.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setQuickCreateCourse({
                              ...quickCreateCourse,
                              teachers: quickCreateCourse.teachers.filter((t: any) => t.id !== teacher.id),
                            })
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">点击右侧加号选择老师</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={() => setIsMemberSelectorOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuickCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleQuickCreateSave}>
              开设
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MemberSelector
        open={isMemberSelectorOpen}
        onOpenChange={setIsMemberSelectorOpen}
        nodeType="department"
        departmentId={departmentId}
        mode="multiple"
        onConfirm={handleMemberSelect}
        title="选择任课老师"
        description="请选择该课程的任课老师（可多选）"
      />
    </>
  )
}

