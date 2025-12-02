"use client"

import { Building2, Plus, BookOpen } from "lucide-react"
import { cn, extractNumericId } from "@/shared/utils/utils"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { useState } from "react"
import type { DetailPanelProps } from "@/components/detail-panel/types"
import { StatisticsCards } from "@/modules/departments/components/shared/statistics-cards"
import { Members } from "@/shared/components/members"
import { TeachingQuality } from "@/modules/universities/components/shared/teaching-quality"

export function UniversityDetail({ node, onNodeSelect, onAddDepartment, onSetCurrentSchool, onToggleExpand, currentUser }: DetailPanelProps) {
  const [newDeptName, setNewDeptName] = useState("")
  const [newDeptDesc, setNewDeptDesc] = useState("")
  const [newDeptDirector, setNewDeptDirector] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleCreateDepartment = () => {
    if (!newDeptName.trim() || !onAddDepartment) return

    const universityId = extractNumericId(node.nodeId)
    onAddDepartment(universityId.toString(), {
      nodeName: newDeptName,
      nodeType: "department" as const,
      description: newDeptDesc || undefined,
      children: [],
    })

    setNewDeptName("")
    setNewDeptDesc("")
    setNewDeptDirector("")
    setIsDialogOpen(false)
  }

  return (
    <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{node.nodeName}</h2>
              {node.description && <p className="text-muted-foreground">{node.description}</p>}
            </div>
          </div>
          {onSetCurrentSchool && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSetCurrentSchool(extractNumericId(node.nodeId).toString())}
              className="gap-2 hover:bg-primary/10"
            >
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-primary font-medium">设为当前学校</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs for Overview and Members */}
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full h-10 bg-secondary/50 backdrop-blur-sm border-b border-border rounded-none p-0">
            <TabsTrigger value="overview" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">
              学校概览
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">
              成员管理
            </TabsTrigger>
            <TabsTrigger value="teaching-quality" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">
              教学质量
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <StatisticsCards
              node={node}
              onNodeSelect={onNodeSelect}
              onToggleExpand={onToggleExpand}
              currentUser={currentUser}
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
                      <Button
                        type="submit"
                        className="gap-2"
                        onClick={handleCreateDepartment}
                        disabled={!newDeptName.trim()}
                      >
                        <Plus className="w-4 h-4" />
                        创建院系
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              }
            />
          </TabsContent>

          <TabsContent value="members" className="space-y-6 p-6">
            <Members node={node} />
          </TabsContent>

          <TabsContent value="teaching-quality" className="mt-0">
            <TeachingQuality node={node} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
