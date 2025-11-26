"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, X, Check } from "lucide-react"
import { MemberSelector } from "@/components/shared/member-selector"
import { useToast } from "@/hooks/use-toast"

interface QuickCreateCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; teachers: any[] }) => void
  majorName: string
  departmentId?: string
}

export function QuickCreateCourseDialog({
  open,
  onOpenChange,
  onSubmit,
  majorName,
  departmentId,
}: QuickCreateCourseDialogProps) {
  const { toast } = useToast()
  const [courseName, setCourseName] = useState("")
  const [teachers, setTeachers] = useState<any[]>([])
  const [memberSelectorOpen, setMemberSelectorOpen] = useState(false)
  const courseNameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        courseNameInputRef.current?.focus()
      }, 0)
    }
  }, [open])

  const handleMemberSelect = (selected: any) => {
    const selectedArray = Array.isArray(selected) ? selected : [selected]
    setTeachers(selectedArray)
  }

  const removeTeacher = (teacherId: string) => {
    setTeachers(teachers.filter((t) => t.id !== teacherId))
  }

  const handleSubmit = () => {
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
        description: "请选择至少一位任课老师",
        duration: 3000,
      })
      return
    }

    onSubmit({
      name: courseName,
      teachers,
    })

    setCourseName("")
    setTeachers([])
    onOpenChange(false)
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
              <div className="h-10 rounded-md bg-background px-3 flex items-center justify-between gap-2 border border-gray-300">
                <div className="flex items-center flex-wrap gap-2 flex-1 overflow-hidden">
                  {teachers.length > 0 ? (
                    teachers.map((teacher: any) => (
                      <div key={teacher.id} className="gap-1 bg-primary/5 border border-primary/20 text-foreground text-sm px-2 py-1 flex items-center">
                        {teacher.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeTeacher(teacher.id)
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
                  onClick={() => setMemberSelectorOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} className="gap-2 bg-transparent">
              <X className="w-4 h-4" />
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={!courseName.trim() || teachers.length === 0} className="gap-2">
              <Check className="w-4 h-4" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MemberSelector
        mode="multiple"
        nodeType="department"
        departmentId={departmentId}
        open={memberSelectorOpen}
        onOpenChange={setMemberSelectorOpen}
        onConfirm={handleMemberSelect}
        title="选择任课老师"
        description="请选择该课程的任课老师（可多选）"
      />
    </>
  )
}

