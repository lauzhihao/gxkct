"use client"

import { Building2, Plus, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
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
import { useState } from "react"
import type { DetailPanelProps } from "./types"
import { StatisticsCards } from "./shared/statistics-cards"

export function UniversityDetail({ node, onNodeSelect, onAddDepartment, onSetCurrentSchool }: DetailPanelProps) {
  const [newDeptName, setNewDeptName] = useState("")
  const [newDeptDesc, setNewDeptDesc] = useState("")
  const [newDeptDirector, setNewDeptDirector] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleCreateDepartment = () => {
    if (!newDeptName.trim() || !onAddDepartment) return

    onAddDepartment(node.id, {
      name: newDeptName,
      type: "department" as const,
      description: newDeptDesc || undefined,
      children: [],
    })

    setNewDeptName("")
    setNewDeptDesc("")
    setNewDeptDirector("")
    setIsDialogOpen(false)
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <div className="flex items-start gap-4 p-6 border-b border-border bg-card/30 backdrop-blur-md">
        <div
          className={cn(
            "flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br from-primary/20 to-accent/20",
            "border border-primary/30 shadow-lg",
          )}
        >
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-1">
          <div className="inline-block px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-xs font-medium text-primary mb-2">
            {node.name.includes("工作坊") ? "工作坊" : "学校"}
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{node.name}</h2>
          {node.description && <p className="text-muted-foreground">{node.description}</p>}
        </div>
        {onSetCurrentSchool && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSetCurrentSchool(node.id)}
            className="gap-2 hover:bg-primary/10"
          >
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">设为当前学校</span>
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <StatisticsCards
        node={node}
        onNodeSelect={onNodeSelect}
        headerAction={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="gap-2 hover:bg-primary/10">
                <Plus className="w-4 h-4 text-primary" />
                <span className="text-primary font-medium">新增院系</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>新增院系</DialogTitle>
                <DialogDescription>填写院系基本信息，创建新的院系节点</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="dept-name">院系名称</Label>
                  <Input
                    id="dept-name"
                    placeholder="例如：信息学院"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dept-desc">院系简介</Label>
                  <Textarea
                    id="dept-desc"
                    placeholder="简要描述院系的培养方向和特色"
                    rows={3}
                    value={newDeptDesc}
                    onChange={(e) => setNewDeptDesc(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dept-director">负责人</Label>
                  <Input
                    id="dept-director"
                    placeholder="例如：张教授"
                    value={newDeptDirector}
                    onChange={(e) => setNewDeptDirector(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="gap-2" onClick={handleCreateDepartment} disabled={!newDeptName.trim()}>
                  <Plus className="w-4 h-4" />
                  创建院系
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
    </div>
  )
}
