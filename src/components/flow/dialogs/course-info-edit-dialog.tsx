"use client"

import { useState, useEffect } from "react"
import { BookOpen } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import type { CourseInfoData } from "@/components/canvas-elements/types"

export interface CourseInfoEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeId: string
  data: CourseInfoData
  onSave: (nodeId: string, data: CourseInfoData) => void
}

/**
 * 课程信息编辑弹窗
 */
export function CourseInfoEditDialog({
  open,
  onOpenChange,
  nodeId,
  data,
  onSave,
}: CourseInfoEditDialogProps) {
  // 本地表单状态
  const [formData, setFormData] = useState<CourseInfoData>(data)

  // 同步外部数据变化
  useEffect(() => {
    setFormData(data)
  }, [data])

  const handleFieldChange = (field: keyof CourseInfoData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    onSave(nodeId, formData)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setFormData(data) // 重置为原始数据
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-sky-600" />
            编辑课程基本信息
          </DialogTitle>
          <DialogDescription>
            修改课程的基本信息，完成后点击保存
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* 课程名称 */}
          <div className="grid gap-2">
            <Label htmlFor="course_name">课程名称</Label>
            <Input
              id="course_name"
              value={formData.course_name || ""}
              onChange={(e) => handleFieldChange("course_name", e.target.value)}
              placeholder="请输入课程名称"
            />
          </div>

          {/* 课程层次 */}
          <div className="grid gap-2">
            <Label htmlFor="course_level">课程层次</Label>
            <Input
              id="course_level"
              value={formData.course_level || ""}
              onChange={(e) => handleFieldChange("course_level", e.target.value)}
              placeholder="如：本科、研究生"
            />
          </div>

          {/* 授课对象 */}
          <div className="grid gap-2">
            <Label htmlFor="target_audience">授课对象</Label>
            <Input
              id="target_audience"
              value={formData.target_audience || ""}
              onChange={(e) => handleFieldChange("target_audience", e.target.value)}
              placeholder="如：计算机专业大三学生"
            />
          </div>

          {/* 学时信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="total_theory_hours">理论学时</Label>
              <Input
                id="total_theory_hours"
                type="number"
                min={0}
                value={formData.total_theory_hours || 0}
                onChange={(e) => handleFieldChange("total_theory_hours", parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="total_practice_hours">实践学时</Label>
              <Input
                id="total_practice_hours"
                type="number"
                min={0}
                value={formData.total_practice_hours || 0}
                onChange={(e) => handleFieldChange("total_practice_hours", parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          {/* 课程简介 */}
          <div className="grid gap-2">
            <Label htmlFor="description">课程简介</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              placeholder="请输入课程简介..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CourseInfoEditDialog
