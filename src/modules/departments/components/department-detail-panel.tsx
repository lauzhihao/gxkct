"use client"

import { GraduationCap, Pencil, Plus, Upload } from "lucide-react"
import { extractNumericId } from "@/shared/utils/utils"
import { api, getCurrentUserId } from "@/lib/api"
import { useToast } from "@/shared/hooks/use-toast"
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
import { ImportMajorDialog } from "@/modules/departments/components/shared/import-major-dialog"
import { useActivePageTracker } from "@/shared/hooks/use-active-page-tracker"
import { PermissionGate } from "@/shared/components/permission-gate"
import { usePermission } from "@/shared/hooks/use-permission"
import type { PermissionAction } from "@/shared/permissions/types"
import { clearMajorCacheForDepartment } from "@/shared/utils/major-cache"
import { useSemesterStore } from "@/shared/stores/semester-store"

const DEPARTMENT_TABS = {
  overview: "院系概览",
  members: "成员管理",
  "teaching-quality": "质量评价",
} as const

const EDIT_DEPARTMENT_ACTION: PermissionAction = "college.department.create"
const CREATE_MAJOR_ACTION: PermissionAction = "department.major.create"
const IMPORT_MAJOR_ALLOWED_USER_ID = 40

type DepartmentTabKey = keyof typeof DEPARTMENT_TABS
const DEFAULT_DEPARTMENT_TAB: DepartmentTabKey = "overview"

export function DepartmentDetail({
  node,
  treeData,
  onNodeSelect,
  onAddMajor,
  onUpdateNode,
  onDeleteNode,
  currentUser,
  onTreeRefresh,
}: DetailPanelProps) {
  const [newDeptName, setNewDeptName] = useState("")
  const [newDeptDesc, setNewDeptDesc] = useState("")
  const [newDeptDirector, setNewDeptDirector] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isQuickCreateMajorOpen, setIsQuickCreateMajorOpen] = useState(false)
  const [isImportMajorOpen, setIsImportMajorOpen] = useState(false)
  const [canViewImportMajor, setCanViewImportMajor] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  // 用于创建专业后自动填充搜索框
  const [majorSearchFilter, setMajorSearchFilter] = useState<string | undefined>(undefined)
  // 用于触发重新获取专业列表
  const [refreshMajorsKey, setRefreshMajorsKey] = useState(0)
  const { setActivePage } = useActivePageTracker()
  const { can, isSemesterReadonly } = usePermission()
  const { toast } = useToast()
  const selectedSemesterId = useSemesterStore((state) => state.selectedSemesterId)

  useEffect(() => {
    if (!node) return
    setActivePage(DEFAULT_DEPARTMENT_TAB, DEPARTMENT_TABS[DEFAULT_DEPARTMENT_TAB])
  }, [node, setActivePage])

  useEffect(() => {
    setCanViewImportMajor(getCurrentUserId() === IMPORT_MAJOR_ALLOWED_USER_ID)
  }, [])

  const handleTabChange = (value: string) => {
    const tabKey = value as DepartmentTabKey
    const label = DEPARTMENT_TABS[tabKey] ?? value
    setActivePage(value, label)
  }

  const handleEditDepartment = () => {
    if (isSemesterReadonly || !can(EDIT_DEPARTMENT_ACTION, { scope: "college" })) return
    if (!node) return
    setNewDeptName(node.nodeName)
    setNewDeptDesc(node.description || "")
    setNewDeptDirector("")
    setIsDialogOpen(true)
  }

  const handleSaveDepartment = async () => {
    if (isSemesterReadonly || !can(EDIT_DEPARTMENT_ACTION, { scope: "college" })) return
    if (!newDeptName.trim() || !node) return
    if (!node.parentId) {
      toast({ title: "保存失败", description: "无法获取所属学校信息", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      const response = await api.tree.updateDepartment(node.nodeId, node.parentId, newDeptName.trim())

      if (response.error) {
        toast({ title: "保存失败", description: response.error, variant: "destructive" })
        return
      }

      onUpdateNode?.(node.nodeId, {
        nodeName: newDeptName,
        description: newDeptDesc || undefined,
      })

      toast({ title: "保存成功", description: `院系"${newDeptName}"已更新` })

      setNewDeptName("")
      setNewDeptDesc("")
      setNewDeptDirector("")
      setIsDialogOpen(false)

      await Promise.resolve(onTreeRefresh?.())
    } catch (error) {
      toast({ title: "保存失败", description: String(error), variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleQuickCreateMajor = (data: { name: string; directors: Array<{ name: string }> }) => {
    if (isSemesterReadonly || !can(CREATE_MAJOR_ACTION, { scope: "department" })) return
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
    if (node?.id) {
      // 创建成功后主动清理当前院系的专业缓存，避免后续详情读取旧元数据。
      clearMajorCacheForDepartment(node.id, selectedSemesterId)
    }
    // 创建成功后，自动填充搜索框并刷新专业列表
    setMajorSearchFilter(data.name)
    setRefreshMajorsKey((prev) => prev + 1)
    void onTreeRefresh?.()
    setIsQuickCreateMajorOpen(false)
  }

  const handleOpenQuickCreateMajor = () => {
    if (isSemesterReadonly || !can(CREATE_MAJOR_ACTION, { scope: "department" })) return
    setIsQuickCreateMajorOpen(true)
  }

  const handleOpenImportMajor = () => {
    if (isSemesterReadonly) return
    if (getCurrentUserId() !== IMPORT_MAJOR_ALLOWED_USER_ID) return
    if (!can(CREATE_MAJOR_ACTION, { scope: "department" })) return
    setIsImportMajorOpen(true)
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
            <PermissionGate action={EDIT_DEPARTMENT_ACTION} context={{ scope: "college" }}>
              <Button size="sm" variant="ghost" onClick={handleEditDepartment} className="gap-2 hover:bg-primary/10">
                <Pencil className="w-4 h-4 text-primary" />
              </Button>
            </PermissionGate>
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
                onUpdateNode={onUpdateNode}
                onDeleteNode={onDeleteNode}
                onTreeRefresh={onTreeRefresh}
                headerAction={
                  <PermissionGate action={CREATE_MAJOR_ACTION} context={{ scope: "department" }}>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleOpenQuickCreateMajor}
                        className="gap-2 hover:bg-primary/10"
                      >
                        <Plus className="w-4 h-4 text-primary" />
                        <span className="text-primary font-medium">新开专业</span>
                      </Button>
                      {canViewImportMajor && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleOpenImportMajor}
                          className="gap-2 hover:bg-primary/10"
                        >
                          <Upload className="w-4 h-4 text-primary" />
                          <span className="text-primary font-medium">导入专业</span>
                        </Button>
                      )}
                    </div>
                  </PermissionGate>
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
            <Button type="submit" className="gap-2" onClick={handleSaveDepartment} disabled={!newDeptName.trim() || isSaving}>
              <Pencil className="w-4 h-4" />
              {isSaving ? "保存中..." : "保存修改"}
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

      {node && (
        <ImportMajorDialog
          open={isImportMajorOpen}
          onOpenChange={setIsImportMajorOpen}
          treeData={treeData}
          currentDepartment={node}
        />
      )}
    </div>
  )
}
