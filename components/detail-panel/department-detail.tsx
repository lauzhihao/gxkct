"use client"

import { GraduationCap, Pencil, Trash2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import type { DetailPanelProps } from "./types"
import { StatisticsCards } from "./shared/statistics-cards"
import { AddMajorForm } from "@/components/add-major-form"

export function DepartmentDetail({ node, onNodeSelect, onAddMajor, onUpdateNode, onDeleteNode }: DetailPanelProps) {
  const [newDeptName, setNewDeptName] = useState("")
  const [newDeptDesc, setNewDeptDesc] = useState("")
  const [newDeptDirector, setNewDeptDirector] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditingDepartment, setIsEditingDepartment] = useState(false)
  const [isAddingMajor, setIsAddingMajor] = useState(false)

  const handleEditDepartment = () => {
    setNewDeptName(node.name)
    setNewDeptDesc(node.description || "")
    setNewDeptDirector("")
    setIsEditingDepartment(true)
    setIsDialogOpen(true)
  }

  const handleSaveDepartment = () => {
    if (!newDeptName.trim() || !onUpdateNode) return

    onUpdateNode(node.id, {
      name: newDeptName,
      description: newDeptDesc || undefined,
    })

    setNewDeptName("")
    setNewDeptDesc("")
    setNewDeptDirector("")
    setIsDialogOpen(false)
    setIsEditingDepartment(false)
  }

  const handleDeleteNode = (nodeId: string) => {
    if (onDeleteNode) {
      onDeleteNode(nodeId)
    }
    if (node?.id === nodeId) {
      onNodeSelect?.(null)
    }
  }

  const handleAddMajor = (majorData: any) => {
    if (onAddMajor) {
      onAddMajor(node.id, majorData)
    }
    setIsAddingMajor(false)
  }

  if (isAddingMajor) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-secondary/20">
        {/* AddMajorForm as full page content */}
        <div className="flex-1 overflow-auto p-6">
          <AddMajorForm departmentId={node.id} onCancel={() => setIsAddingMajor(false)} onSubmit={handleAddMajor} />
        </div>
      </div>
    )
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
          <GraduationCap className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-1">
          <div className="inline-block px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-xs font-medium text-primary mb-2">
            院系
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{node.name}</h2>
          {node.description && <p className="text-muted-foreground">{node.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={handleEditDepartment} className="gap-2 hover:bg-primary/10">
            <Pencil className="w-4 h-4 text-primary" />
          </Button>
          {onDeleteNode && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDeleteNode(node.id)}
              className="gap-2 hover:bg-red-500/10 text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards with Add Major button */}
      <StatisticsCards
        node={node}
        onNodeSelect={onNodeSelect}
        headerAction={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsAddingMajor(true)}
            className="gap-2 hover:bg-primary/10"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">新增专业</span>
          </Button>
        }
      />

      {/* Edit Department Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑院系</DialogTitle>
            <DialogDescription>修改院系基本信息</DialogDescription>
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
            <Button type="submit" className="gap-2" onClick={handleSaveDepartment} disabled={!newDeptName.trim()}>
              <Pencil className="w-4 h-4" />
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
