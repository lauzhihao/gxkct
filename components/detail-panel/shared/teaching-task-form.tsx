"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"
import { useState } from "react"
import type { TeachingSupervisoryTask } from "@/types"

interface TeachingTaskFormProps {
  universityId: string
  onSubmit: (task: Omit<TeachingSupervisoryTask, "id" | "createdAt">) => void
  initialData?: TeachingSupervisoryTask
}

export function TeachingTaskForm({ universityId, onSubmit, initialData }: TeachingTaskFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [startDate, setStartDate] = useState(initialData?.startDate || "")
  const [endDate, setEndDate] = useState(initialData?.endDate || "")
  const [status, setStatus] = useState<"not_started" | "in_progress" | "completed">(
    initialData?.status || "not_started"
  )
  const [creator, setCreator] = useState(initialData?.creator || "")

  const handleSubmit = () => {
    if (!title.trim() || !startDate || !endDate) {
      alert("请填写必填项：任务标题、开始日期、结束日期")
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert("开始日期不能晚于结束日期")
      return
    }

    onSubmit({
      universityId,
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      status,
      creator: creator.trim(),
      updatedAt: new Date().toISOString(),
    })

    // 重置表单
    setTitle("")
    setDescription("")
    setStartDate("")
    setEndDate("")
    setStatus("not_started")
    setCreator("")
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-2 hover:bg-primary/10">
          <Plus className="w-4 h-4 text-primary" />
          <span className="text-primary font-medium">新增任务</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "编辑教学督导任务" : "新增教学督导任务"}</DialogTitle>
          <DialogDescription>
            {initialData ? "修改教学督导任务信息" : "创建新的教学督导任务"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="task-title">
              任务标题 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="task-title"
              placeholder="例如：2025秋季学期教学档案检查"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-description">任务说明</Label>
            <Textarea
              id="task-description"
              placeholder="详细描述任务内容和要求（最多500字）"
              rows={4}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start-date">
                开始日期 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-date">
                结束日期 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="task-status">任务状态</Label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger id="task-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">未开始</SelectItem>
                  <SelectItem value="in_progress">进行中</SelectItem>
                  <SelectItem value="completed">已结束</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="creator">创建人</Label>
              <Input
                id="creator"
                placeholder="输入创建人名称"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" className="gap-2" onClick={handleSubmit}>
            <Plus className="w-4 h-4" />
            {initialData ? "保存修改" : "创建任务"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

