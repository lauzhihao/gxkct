"use client"

import { GraduationCap, Pencil, Trash2, Plus } from "lucide-react"
import { cn, extractNumericId } from "@/shared/utils/utils"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { useEffect, useState } from "react"
import type { DetailPanelProps } from "@/components/detail-panel/types"
import { StatisticsCards } from "./shared/statistics-cards"
import { Members } from "@/shared/components/members"
import { TeachingQualityStats } from "@/modules/majors/components/shared/teaching-quality-stats"
import { QuickCreateMajorDialog } from "@/modules/departments/components/shared/quick-create-major-dialog"
import { useActivePageTracker } from "@/shared/hooks/use-active-page-tracker"

const DEPARTMENT_TABS = {
  overview: "院系概览",
  members: "成员管理",
  "teaching-quality": "质量评价",
} as const

type DepartmentTabKey = keyof typeof DEPARTMENT_TABS
const DEFAULT_DEPARTMENT_TAB: DepartmentTabKey = "overview"

export function DepartmentDetail({ node, onNodeSelect, onAddMajor, onUpdateNode, onDeleteNode, currentUser }: DetailPanelProps) {
  const [newDeptName, setNewDeptName] = useState("")
  const [newDeptDesc, setNewDeptDesc] = useState("")
  const [newDeptDirector, setNewDeptDirector] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditingDepartment, setIsEditingDepartment] = useState(false)
  const [isQuickCreateMajorOpen, setIsQuickCreateMajorOpen] = useState(false)
  // 用于创建专业后自动填充搜索框
  const [majorSearchFilter, setMajorSearchFilter] = useState<string | undefined>(undefined)
  // 用于触发重新获取专业列表
  const [refreshMajorsKey, setRefreshMajorsKey] = useState(0)
  const { setActivePage } = useActivePageTracker()

  useEffect(() => {
    if (!node) return
    setActivePage(DEFAULT_DEPARTMENT_TAB, DEPARTMENT_TABS[DEFAULT_DEPARTMENT_TAB])
  }, [node?.nodeId, setActivePage])

  const handleTabChange = (value: string) => {
    const tabKey = value as DepartmentTabKey
    const label = DEPARTMENT_TABS[tabKey] ?? value
    setActivePage(value, label)
  }

  const handleEditDepartment = () => {
    if (!node) return
    setNewDeptName(node.nodeName)
    setNewDeptDesc(node.description || "")
    setNewDeptDirector("")
    setIsEditingDepartment(true)
    setIsDialogOpen(true)
  }

  const handleSaveDepartment = () => {
    if (!newDeptName.trim() || !onUpdateNode || !node) return

    onUpdateNode(node.nodeId, {
      nodeName: newDeptName,
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
    if (node?.nodeId === nodeId) {
      onNodeSelect?.(null)
    }
  }

  const handleQuickCreateMajor = (data: { name: string; directors: any[] }) => {
    if (onAddMajor && node) {
      const departmentId = extractNumericId(node.nodeId).toString()
      onAddMajor(departmentId, {
        nodeName: data.name,
        nodeType: "major" as const,
        children: [] as import("@/types").TreeNode[],
        metadata: {
          directors: data.directors.map((d) => d.name),
          director: data.directors.map((d) => d.name).join("、"),
        },
      })
    }
    // 创建成功后，自动填充搜索框并刷新专业列表
    setMajorSearchFilter(data.name)
    setRefreshMajorsKey((prev) => prev + 1)
    setIsQuickCreateMajorOpen(false)
  }

  return (
    <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{node?.nodeName}</h2>
              {node?.description && <p className="text-muted-foreground">{node.description}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleEditDepartment} className="gap-2 hover:bg-primary/10">
              <Pencil className="w-4 h-4 text-primary" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs for Overview and Members */}
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="overview" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="w-full h-10 bg-secondary/50 backdrop-blur-sm border-b border-border rounded-none p-0">
            <TabsTrigger value="overview" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">
              院系概览
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">
              成员管理
            </TabsTrigger>
            <TabsTrigger value="teaching-quality" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">
              质量评价
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            {node && (
              <StatisticsCards
                node={node}
                onNodeSelect={onNodeSelect}
                currentUser={currentUser}
                initialMajorSearch={majorSearchFilter}
                refreshKey={refreshMajorsKey}
                headerAction={
                  <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsQuickCreateMajorOpen(true)}
                  className="gap-2 hover:bg-primary/10"
                >
                  <Plus className="w-4 h-4 text-primary" />
                  <span className="text-primary font-medium">开设专业</span>
                </Button>
                }
              />
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-6 p-6">
            {node && <Members node={node} />}
          </TabsContent>

          <TabsContent value="teaching-quality" className="space-y-6 p-6">
            {node && <TeachingQualityStats node={node} nodeType="department" />}
          </TabsContent>
        </Tabs>
      </div>

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

      {/* Quick Create Major Dialog */}
      {node && (
        <QuickCreateMajorDialog
          open={isQuickCreateMajorOpen}
          onOpenChange={setIsQuickCreateMajorOpen}
          onSubmit={handleQuickCreateMajor}
          departmentId={extractNumericId(node.nodeId).toString()}
        />
      )}
    </div>
  )
}
