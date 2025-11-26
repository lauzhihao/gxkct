"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { MemberSelector } from "@/components/shared/member-selector"

interface QuickCreateMajorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; directors: any[] }) => void
  departmentId: string
}

interface Director {
  id: number
  name: string
  account: string
  auth: string
}

export function QuickCreateMajorDialog({
  open,
  onOpenChange,
  onSubmit,
  departmentId,
}: QuickCreateMajorDialogProps) {
  const [majorName, setMajorName] = useState("")
  const [directors, setDirectors] = useState<Director[]>([])
  const [memberSelectorOpen, setMemberSelectorOpen] = useState(false)

  const handleMemberSelect = (selected: any) => {
    const selectedArray = Array.isArray(selected) ? selected : [selected]
    setDirectors(selectedArray)
  }

  const removeDirector = (directorId: number) => {
    setDirectors(directors.filter((d) => d.id !== directorId))
  }

  const handleSubmit = () => {
    if (!majorName.trim()) {
      alert("请输入专业名称")
      return
    }

    onSubmit({
      name: majorName,
      directors,
    })

    setMajorName("")
    setDirectors([])
    onOpenChange(false)
  }

  const handleCancel = () => {
    setMajorName("")
    setDirectors([])
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>开设专业</DialogTitle>
            <DialogDescription>填写专业基本信息，快速创建新专业</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="major-name">
                专业名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="major-name"
                placeholder="例如：计算机科学与技术"
                value={majorName}
                onChange={(e) => setMajorName(e.target.value.slice(0, 64))}
                maxLength={64}
              />
              <div className="text-xs text-muted-foreground text-right">{majorName.length}/64</div>
            </div>

            <div className="grid gap-2">
              <Label>专业负责人</Label>
              <div className={cn("h-10 rounded-md bg-background px-3 flex items-center justify-between gap-2", "border border-gray-300")}>
                <div className="flex items-center flex-wrap gap-2 flex-1 overflow-hidden">
                  {directors.length > 0 ? (
                    directors.map((director) => (
                      <div key={director.id} className="gap-1 bg-primary/5 border border-primary/20 text-foreground text-sm px-2 py-1 flex items-center">
                        {director.name}
                        <button
                          onClick={() => removeDirector(director.id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">点击右侧加号选择负责人</span>
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
            <Button variant="outline" onClick={handleCancel}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={!majorName.trim()}>
              开设专业
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
        title="选择专业负责人"
        description="请选择一个或多个专业负责人"
      />
    </>
  )
}

