"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Spinner } from "@/shared/components/ui/spinner"
import { MemberSelector } from "@/shared/components/member-selector"
import { api } from "@/lib/api"
import { showError, showSuccess } from "@/shared/utils/toast-utils"
import type { TaskMember, TreeNode, TreeNodeManager } from "@/types"

interface CourseTeacher {
  id: number | string
  name: string
  account: string
  auth: string
  hasPersistableId: boolean
}

interface CourseSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: TreeNode | null
  majorName: string
  departmentId?: string
  selectedSemesterId: number | null
  onSaved: (courseId: string, updates: { courseName?: string; managers?: TreeNodeManager[] }) => void
  onDeleted: (courseId: string) => void
}

const parsePositiveInteger = (value: string | number | null | undefined, fieldName: string): number => {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName}缺失`)
  }

  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${fieldName}无效`)
  }

  return parsed
}

const resolveCourseId = (course: TreeNode): string => {
  if (typeof course.id === "string" && course.id.trim().length > 0) {
    return course.id
  }
  if (typeof course.nodeId === "string" && course.nodeId.trim().length > 0) {
    const match = course.nodeId.match(/\d+/)
    if (match && match[0].trim().length > 0) {
      return match[0]
    }
  }
  throw new Error("课程ID缺失")
}

const resolveCourseName = (course: TreeNode): string => {
  if (typeof course.nodeName === "string" && course.nodeName.trim().length > 0) {
    return course.nodeName
  }
  if (typeof course.name === "string" && course.name.trim().length > 0) {
    return course.name
  }
  throw new Error("课程名称缺失")
}

const buildInitialTeachers = (course: TreeNode): CourseTeacher[] => {
  const managers = Array.isArray(course.manager) ? course.manager : []
  return managers.map((manager, index) => {
    if (typeof manager.label !== "string" || manager.label.trim().length === 0) {
      throw new Error("任课老师姓名缺失")
    }

    const numericTeacherId = Number.parseInt(String(manager.value), 10)
    const hasPersistableId = Number.isFinite(numericTeacherId) && numericTeacherId > 0

    return {
      id: hasPersistableId ? numericTeacherId : `existing-teacher-${index}`,
      account: "",
      name: manager.label,
      auth: "任课老师",
      hasPersistableId,
    }
  })
}

const buildManagers = (teachers: CourseTeacher[]): TreeNodeManager[] => teachers.map((teacher) => ({
  value: String(teacher.id),
  label: teacher.name,
}))

export function CourseSettingsDialog({
  open,
  onOpenChange,
  course,
  majorName,
  departmentId,
  selectedSemesterId,
  onSaved,
  onDeleted,
}: CourseSettingsDialogProps) {
  const [courseName, setCourseName] = useState("")
  const [initialCourseName, setInitialCourseName] = useState("")
  const [teachers, setTeachers] = useState<CourseTeacher[]>([])
  const [teachersTouched, setTeachersTouched] = useState(false)
  const [memberSelectorOpen, setMemberSelectorOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const courseNameInputRef = useRef<HTMLInputElement>(null)

  const currentUniversityId = useMemo(() => {
    if (typeof window === "undefined") {
      return undefined
    }

    const stored = localStorage.getItem("education-current-school")
    if (stored === null || stored.trim().length === 0) {
      return undefined
    }

    try {
      const parsed = JSON.parse(stored) as unknown
      if (typeof parsed === "string" && parsed.trim().length > 0) {
        return parsed
      }
      if (typeof parsed === "number" && Number.isFinite(parsed)) {
        return String(parsed)
      }
    } catch (error) {
      console.error("[CourseSettingsDialog] 当前学校ID解析失败:", error)
    }

    return undefined
  }, [])

  useEffect(() => {
    if (!open || course === null) {
      setCourseName("")
      setInitialCourseName("")
      setTeachers([])
      setTeachersTouched(false)
      setConfirmDeleteOpen(false)
      return
    }

    try {
      const resolvedCourseName = resolveCourseName(course)
      setCourseName(resolvedCourseName)
      setInitialCourseName(resolvedCourseName)
      setTeachers(buildInitialTeachers(course))
      setTeachersTouched(false)
      setTimeout(() => {
        courseNameInputRef.current?.focus()
      }, 0)
    } catch (error) {
      const message = error instanceof Error ? error.message : "课程数据无效"
      showError(message, "无法打开课程设置")
      onOpenChange(false)
    }
  }, [course, onOpenChange, open])

  const handleMemberSelect = (selected: TaskMember | TaskMember[]) => {
    const selectedTeachers = Array.isArray(selected) ? selected : [selected]
    setTeachers(selectedTeachers.map((teacher) => ({
      id: teacher.id,
      account: teacher.account,
      name: teacher.name,
      auth: teacher.auth,
      hasPersistableId: true,
    })))
    setTeachersTouched(true)
  }

  const removeTeacher = (index: number) => {
    setTeachers((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
    setTeachersTouched(true)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleSave = async () => {
    if (course === null) {
      showError("课程数据缺失，无法保存", "保存失败")
      return
    }
    if (courseName.trim().length === 0) {
      showError("请输入课程名称", "验证失败")
      return
    }
    if (teachers.length === 0) {
      showError("请至少选择一名任课老师", "验证失败")
      return
    }

    let numericCourseId: number
    let teacherIds: number[] | undefined

    try {
      numericCourseId = parsePositiveInteger(resolveCourseId(course), "课程ID")
      if (teachersTouched) {
        teacherIds = teachers.map((teacher) => {
          if (!teacher.hasPersistableId) {
            throw new Error(`任课老师"${teacher.name}"缺少可保存的ID，请重新选择任课老师`)
          }
          return parsePositiveInteger(teacher.id, `任课老师"${teacher.name}"的ID`)
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "课程设置数据无效"
      showError(message, "验证失败")
      return
    }

    const trimmedCourseName = courseName.trim()
    const nameChanged = trimmedCourseName !== initialCourseName
    if (!nameChanged && teacherIds === undefined) {
      showError("没有需要保存的课程设置", "保存失败")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await api.courseDetail.updateCourseSettings({
        courseId: numericCourseId,
        ...(nameChanged ? { name: trimmedCourseName } : {}),
        ...(teacherIds !== undefined ? { teacherIds } : {}),
      })

      if (response.error) {
        showError(response.error, "保存失败")
        return
      }

      const savedUpdates: { courseName?: string; managers?: TreeNodeManager[] } = {}
      if (nameChanged) {
        savedUpdates.courseName = trimmedCourseName
      }
      if (teacherIds !== undefined) {
        savedUpdates.managers = buildManagers(teachers)
      }

      const resolvedCourseId = resolveCourseId(course)
      onSaved(resolvedCourseId, savedUpdates)
      showSuccess("课程设置已更新", "保存成功")
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存课程设置失败"
      console.error("[CourseSettingsDialog] 保存课程设置失败:", error)
      showError(message, "保存失败")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (course === null) {
      showError("课程数据缺失，无法删除", "删除失败")
      return
    }
    if (typeof selectedSemesterId !== "number" || !Number.isFinite(selectedSemesterId)) {
      showError("未获取到学期信息，无法删除课程", "删除失败")
      return
    }

    let courseId: string
    try {
      courseId = resolveCourseId(course)
      parsePositiveInteger(courseId, "课程ID")
    } catch (error) {
      const message = error instanceof Error ? error.message : "课程ID无效"
      showError(message, "删除失败")
      return
    }

    setIsDeleting(true)
    try {
      const response = await api.courseDetail.deleteCourse(selectedSemesterId, courseId)

      if (response.error) {
        showError(response.error, "删除课程失败")
        return
      }

      showSuccess("课程已删除", "删除成功")
      setConfirmDeleteOpen(false)
      onDeleted(courseId)
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除课程失败"
      console.error("[CourseSettingsDialog] 删除课程失败:", error)
      showError(message, "删除课程失败")
    } finally {
      setIsDeleting(false)
    }
  }

  const resolvedCourseName = (() => {
    if (course === null) {
      return ""
    }
    try {
      return resolveCourseName(course)
    } catch {
      return ""
    }
  })()

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>课程设置</DialogTitle>
            <DialogDescription>调整课程基本信息与任课老师</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">所属专业</label>
              <Input value={majorName} readOnly />
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
                  onChange={(event) => setCourseName(event.target.value.slice(0, 64))}
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
                      <div key={teacher.id} className="gap-1 bg-primary/5 border border-primary/20 text-foreground text-sm px-2 py-1 flex items-center">
                        {teacher.name}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            removeTeacher(index)
                          }}
                          className="ml-1 hover:text-destructive"
                          aria-label={`移除${teacher.name}`}
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

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(true)}
              className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={isSubmitting || isDeleting || course === null}
            >
              <Trash2 className="w-4 h-4" />
              删除课程
            </Button>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel} className="gap-2 bg-transparent" disabled={isSubmitting || isDeleting}>
                <X className="w-4 h-4" />
                取消
              </Button>
              <Button onClick={handleSave} disabled={courseName.trim().length === 0 || teachers.length === 0 || isSubmitting || isDeleting} className="gap-2">
                {isSubmitting ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                保存
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除课程</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除课程"<span className="font-semibold text-foreground">{resolvedCourseName}</span>"吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        initialSelectedMembers={teachers
          .filter((teacher) => teacher.hasPersistableId)
          .map((teacher) => ({
            id: parsePositiveInteger(teacher.id, `任课老师"${teacher.name}"的ID`),
            account: teacher.account,
            name: teacher.name,
            auth: teacher.auth,
          }))}
      />
    </>
  )
}
