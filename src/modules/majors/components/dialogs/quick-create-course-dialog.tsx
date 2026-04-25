"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Plus, X, Check } from "lucide-react"
import { Spinner } from "@/shared/components/ui/spinner"
import { MemberSelector } from "@/shared/components/member-selector"
import { useToast } from "@/shared/hooks/use-toast"
import { buildApiUrl } from "@/lib/api/config"
import { getStoredAuthToken } from "@/lib/api/auth-config"
import { useSemesterStore } from "@/shared/stores/semester-store"
import type { TaskMember } from "@/types"

interface QuickCreateCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  majorId: string
  majorName: string
  departmentId?: string
}

export function QuickCreateCourseDialog({
  open,
  onOpenChange,
  onSuccess,
  majorId,
  majorName,
  departmentId,
}: QuickCreateCourseDialogProps) {
  const { toast } = useToast()
  const selectedSemesterId = useSemesterStore((state) => state.selectedSemesterId)
  const semesterList = useSemesterStore((state) => state.semesterList)
  const [courseName, setCourseName] = useState("")
  const [teachers, setTeachers] = useState<any[]>([])
  const [memberSelectorOpen, setMemberSelectorOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const courseNameInputRef = useRef<HTMLInputElement>(null)

  // 从 localStorage 获取当前学校 ID，用于获取全部成员
  const currentUniversityId = useMemo(() => {
    if (typeof window === "undefined") return undefined
    const stored = localStorage.getItem("education-current-school")
    return stored ? JSON.parse(stored) : undefined
  }, [])

  // 获取当前学期的显示名称
  const selectedSemesterDisplay = useMemo(() => {
    if (!selectedSemesterId || !semesterList || semesterList.length === 0) {
      return null
    }
    const semester = semesterList.find((s) => s.id === selectedSemesterId)
    return semester?.name || null
  }, [selectedSemesterId, semesterList])

  // 每次对话框打开时清空表单并聚焦输入框
  useEffect(() => {
    if (open) {
      setCourseName("")
      setTeachers([])
      setTimeout(() => {
        courseNameInputRef.current?.focus()
      }, 0)
    }
  }, [open])

  // 多选模式下，设置选中的教师列表
  // [MOD] 与 MemberSelector.onConfirm 的联合类型对齐（单选 / 多选）
  const handleMemberSelect = (selected: TaskMember | TaskMember[]) => {
    setTeachers(Array.isArray(selected) ? selected : [selected])
  }

  // 移除指定索引的教师
  const removeTeacher = (index: number) => {
    setTeachers((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!courseName.trim()) {
      toast({
        variant: "destructive",
        title: "验证失败",
        description: "请输入课程名称",
        duration: 3000,
      })
      return
    }

    if (teachers.length === 0) {
      toast({
        variant: "destructive",
        title: "验证失败",
        description: "请至少选择一名任课老师",
        duration: 3000,
      })
      return
    }

    if (typeof selectedSemesterId !== "number" || !Number.isFinite(selectedSemesterId)) {
      toast({
        variant: "destructive",
        title: "验证失败",
        description: "未获取到学期信息，无法创建课程",
        duration: 3000,
      })
      return
    }

    const majorIdMatch = majorId.match(/\d+/)
    if (!majorIdMatch) {
      toast({
        variant: "destructive",
        title: "验证失败",
        description: "专业ID无效，无法创建课程",
        duration: 3000,
      })
      return
    }

    const numericMajorId = Number.parseInt(majorIdMatch[0], 10)
    if (Number.isNaN(numericMajorId)) {
      toast({
        variant: "destructive",
        title: "验证失败",
        description: "专业ID无效，无法创建课程",
        duration: 3000,
      })
      return
    }

    // 构建教师ID数组
    const numericTeacherIds: number[] = []
    for (const t of teachers) {
      const teacherIdValue = t.id
      if (typeof teacherIdValue !== "number" && typeof teacherIdValue !== "string") {
        toast({
          variant: "destructive",
          title: "验证失败",
          description: `任课老师"${t.name}"的ID无效，无法创建课程`,
          duration: 3000,
        })
        return
      }

      const numericTeacherId = Number.parseInt(String(teacherIdValue), 10)
      if (Number.isNaN(numericTeacherId)) {
        toast({
          variant: "destructive",
          title: "验证失败",
          description: `任课老师"${t.name}"的ID无效，无法创建课程`,
          duration: 3000,
        })
        return
      }
      numericTeacherIds.push(numericTeacherId)
    }

    setIsSubmitting(true)
    try {
      const url = buildApiUrl("/api/v5/tree/course")
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "Content-Type": "application/json",
      }
      const authToken = getStoredAuthToken()
      if (authToken) {
        headers["authToken"] = authToken
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          majorId: numericMajorId,
          name: courseName.trim(),
          teacherIds: numericTeacherIds,
          semesterId: selectedSemesterId,
          // 开课学期字段
          openingSemesterId: selectedSemesterId,
          openingSemesterDisplay: selectedSemesterDisplay,
        }),
      })

      const result = await response.json()
      if (result.code === "0" || result.code === 0) {
        toast({
          title: "创建成功",
          description: `课程"${courseName}"已成功创建`,
          duration: 3000,
        })
        setCourseName("")
        setTeachers([])
        onOpenChange(false)
        onSuccess()
      } else {
        toast({
          variant: "destructive",
          title: "创建失败",
          description: result.msg || "请稍后重试",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error("[QuickCreateCourseDialog] 创建课程失败:", error)
      toast({
        variant: "destructive",
        title: "创建失败",
        description: "网络错误，请稍后重试",
        duration: 3000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setCourseName("")
    setTeachers([])
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
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
              <label className="text-sm font-medium mb-2 block">
                课程名称 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  ref={courseNameInputRef}
                  placeholder="请输入课程名称"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value.slice(0, 64))}
                  maxLength={64}
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  {courseName.length}/64
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                任课老师 <span className="text-red-500">*</span>
              </label>
              <div className="min-h-10 rounded-md bg-background px-3 py-2 flex items-center justify-between gap-2 border border-gray-300">
                <div className="flex items-center flex-wrap gap-2 flex-1 overflow-hidden">
                  {teachers.length > 0 ? (
                    teachers.map((teacher, index) => (
                      <div key={index} className="gap-1 bg-primary/5 border border-primary/20 text-foreground text-sm px-2 py-1 flex items-center">
                        {teacher.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeTeacher(index)
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
                  className="h-8 w-8 p-0 flex-shrink-0 hover:bg-primary [&:hover>svg]:text-white"
                  onClick={() => setMemberSelectorOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} className="gap-2 bg-transparent" disabled={isSubmitting}>
              <X className="w-4 h-4" />
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={!courseName.trim() || teachers.length === 0 || isSubmitting} className="gap-2">
              {isSubmitting ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MemberSelector
        mode="multiple"
        nodeType="department"
        departmentId={departmentId}
        universityId={currentUniversityId}
        open={memberSelectorOpen}
        onOpenChange={setMemberSelectorOpen}
        onConfirm={handleMemberSelect}
        title="选择任课老师"
        description="请选择该课程的任课老师（支持多选）"
      />
    </>
  )
}
