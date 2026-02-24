"use client"

import { Building2, Plus, BookOpen } from "lucide-react"
import { extractNumericId } from "@/shared/utils/utils"
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
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useToast } from "@/shared/hooks/use-toast"
import type { DetailPanelProps } from "@/components/detail-panel/types"
import { StatisticsCards } from "@/modules/departments/components/shared/statistics-cards"
import { Members } from "@/shared/components/members"
import { TeachingQuality } from "@/modules/universities/components/shared/teaching-quality"
import { useActivePageTracker } from "@/shared/hooks/use-active-page-tracker"
import { usePermission } from "@/shared/hooks/use-permission"

const UNIVERSITY_TABS = {
  overview: "学校概览",
  members: "成员管理",
  "teaching-quality": "质量评价",
} as const

type UniversityTabKey = keyof typeof UNIVERSITY_TABS
const DEFAULT_UNIVERSITY_TAB: UniversityTabKey = "overview"

export function UniversityDetail({ node, onNodeSelect, onSetCurrentSchool, currentUser }: DetailPanelProps) {
  const [newDeptName, setNewDeptName] = useState("")
  const [newDeptDesc, setNewDeptDesc] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const { canManage } = usePermission()
  const { setActivePage } = useActivePageTracker()
  const { toast } = useToast()

  useEffect(() => {
    if (!node) return
    setActivePage(DEFAULT_UNIVERSITY_TAB, UNIVERSITY_TABS[DEFAULT_UNIVERSITY_TAB])
  }, [node, node?.nodeId, setActivePage])

  const handleTabChange = (value: string) => {
    const tabKey = value as UniversityTabKey
    const label = UNIVERSITY_TABS[tabKey] ?? value
    setActivePage(value, label)
  }

  const handleCreateDepartment = async () => {
    if (!newDeptName.trim() || !node) return

    setIsCreating(true)
    try {
      const universityId = extractNumericId(node.nodeId)
      const response = await api.tree.createDepartment(universityId.toString(), newDeptName.trim())

      if (response.error) {
        toast({
          title: "创建失败",
          description: response.error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "创建成功",
        description: `院系"${newDeptName}"已创建`,
      })

      setNewDeptName("")
      setNewDeptDesc("")
      setIsDialogOpen(false)

      // 刷新页面以更新树数据
      window.location.reload()
    } catch (error) {
      toast({
        title: "创建失败",
        description: String(error),
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
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
              <h2 className="text-2xl font-bold text-foreground mb-2">{node?.nodeName}</h2>
              {node?.description && <p className="text-muted-foreground">{node.description}</p>}
            </div>
          </div>
          {onSetCurrentSchool && node && (
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
        <Tabs defaultValue="overview" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="w-full h-10 bg-secondary/50 backdrop-blur-sm border-b border-border rounded-none p-0">
            <TabsTrigger value="overview" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">
              学校概览
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
                headerAction={
                canManage &&
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
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        className="gap-2"
                        onClick={handleCreateDepartment}
                        disabled={!newDeptName.trim() || isCreating}
                      >
                        <Plus className="w-4 h-4" />
                        {isCreating ? "创建中..." : "创建院系"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              }
            />
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-6 p-6">
            {node && <Members node={node} />}
          </TabsContent>

          <TabsContent value="teaching-quality" className="mt-0">
            {node && <TeachingQuality node={node} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
