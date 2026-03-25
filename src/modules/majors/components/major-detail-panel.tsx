"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import type { TreeNode, TreeNodeMenuItem } from "@/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Button } from "@/shared/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Checkbox } from "@/shared/components/ui/checkbox"
import AddCourseForm from "@/components/add-course-form"
import { AddMajorForm } from "@/modules/majors/components/forms/add-major-form"
import { MajorBasicInfo } from "@/modules/majors/components/major/major-basic-info"
import { MajorMatrix } from "@/modules/majors/components/major/major-matrix"
import { MajorCourses } from "@/modules/majors/components/major/major-courses"
import { TeachingQualityStats } from "@/modules/majors/components/shared/teaching-quality-stats"
import { QuickCreateCourseDialog } from "@/modules/majors/components/dialogs/quick-create-course-dialog"
import { majorApiService } from "@/modules/majors/api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import React from "react"
import { useActivePageTracker } from "@/shared/hooks/use-active-page-tracker"
import { usePermission } from "@/shared/hooks/use-permission"
import type { PermissionAction } from "@/shared/permissions/types"
import { extractNumericId } from "@/shared/utils/utils"
import { getMajorCache } from "@/shared/utils/major-cache"

const MAJOR_TABS = {
  courses: "课程管理",
  details: "专业详情",
  matrix: "专业矩阵",
  "teaching-quality": "质量评价",
} as const

const MANAGE_MAJOR_COURSE_ACTION: PermissionAction = "major.course.create"

interface NodeMetadataWithManagers {
  source?: string
  btnMenus?: TreeNodeMenuItem[]
  coverMenus?: TreeNodeMenuItem[]
}

function hasMenuPermission(menus: TreeNodeMenuItem[] | null | undefined, target: string): boolean {
  return Array.isArray(menus) && menus.some((menu) => menu.value === target)
}

function resolveDepartmentId(node: TreeNode, treeData?: TreeNode): string {
  const parentDepartmentId = extractNumericId(node.parentId ?? "")
  if (parentDepartmentId > 0) {
    return String(parentDepartmentId)
  }

  if (!treeData?.children || treeData.children.length === 0) {
    return ""
  }

  const findDepartmentByMajorNode = (currentNode: TreeNode): string => {
    if (currentNode.nodeType === "department") {
      const children = currentNode.children ?? []
      const containsMajor = children.some((child) => child.nodeId === node.nodeId)
      if (containsMajor) {
        return extractNumericId(currentNode.nodeId).toString()
      }
    }

    for (const child of currentNode.children ?? []) {
      const resolvedId = findDepartmentByMajorNode(child)
      if (resolvedId) {
        return resolvedId
      }
    }

    return ""
  }

  return findDepartmentByMajorNode(treeData)
}

type MajorTabKey = keyof typeof MAJOR_TABS
const DEFAULT_MAJOR_TAB: MajorTabKey = "courses"

// 学期选择器子组件 - 使用 React.memo 防止不必要的重新渲染
const SemesterSelector = React.memo(({
  value,
  onChange,
  semesters,
  onAddSemester,
  generateDefaultSemesterName,
  canManageMajorCourse
}: {
  value: string
  onChange: (value: string) => void
  semesters: Array<{ value: string; label: string }>
  onAddSemester: (semesterName: string, shouldSwitch?: boolean) => void
  generateDefaultSemesterName: () => string
  canManageMajorCourse: boolean
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [newSemesterName, setNewSemesterName] = React.useState("")
  const [shouldSwitchImmediately, setShouldSwitchImmediately] = React.useState(false)

  const handleOpenDialog = () => {
    if (!canManageMajorCourse) return
    setNewSemesterName(generateDefaultSemesterName())
    setShouldSwitchImmediately(false)
    setIsAddDialogOpen(true)
  }

  const handleConfirmAdd = () => {
    if (!canManageMajorCourse) return
    if (newSemesterName.trim()) {
      onAddSemester(newSemesterName, shouldSwitchImmediately)
      setIsAddDialogOpen(false)
      setNewSemesterName("")
      setShouldSwitchImmediately(false)
    }
  }

  const handleCancel = () => {
    setIsAddDialogOpen(false)
    setNewSemesterName("")
    setShouldSwitchImmediately(false)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {semesters.map((semester) => (
              <SelectItem
                key={semester.value}
                value={semester.value}
                className={value === semester.value ? "[&_svg]:text-white" : ""}
              >
                {semester.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canManageMajorCourse && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 hover:bg-primary/10"
            onClick={handleOpenDialog}
            title="添加新学期"
          >
            <Plus className="w-4 h-4 text-primary" />
          </Button>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新学期</DialogTitle>
            <DialogDescription>请输入新学期的名称，可选择立即切换到该学期。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="semester-name">学期名称</Label>
              <Input
                id="semester-name"
                value={newSemesterName}
                onChange={(e) => setNewSemesterName(e.target.value)}
                placeholder="请输入学期名称"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSemesterName.trim()) {
                    handleConfirmAdd()
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="switch-immediately"
                checked={shouldSwitchImmediately}
                onCheckedChange={(checked) => setShouldSwitchImmediately(checked as boolean)}
              />
              <Label htmlFor="switch-immediately" className="font-normal cursor-pointer">
                立即切换
              </Label>
              {shouldSwitchImmediately && (
                <p className="text-xs text-red-500 whitespace-nowrap">
                  切换到该学期后其他学期数据将设置为"只读"，请确认。
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              取消
            </Button>
            <Button
              onClick={handleConfirmAdd}
              disabled={!newSemesterName.trim()}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})
SemesterSelector.displayName = "SemesterSelector"

interface MajorDetailProps {
  node: TreeNode
  onUpdate: () => void
  onAddCourse?: (majorId: string, newCourse: any) => void
  onDeleteCourse: (courseId: string) => void
  onUpdateNode?: (nodeId: string, updates: any) => void
  onDeleteNode?: (nodeId: string) => void
  onNodeSelect?: (node: any) => void
  currentUser: { username: string; role: string } | null
  majorCourses?: Map<string, TreeNode[]>
  treeData?: TreeNode
  onTreeRefresh?: () => Promise<boolean> | boolean
}

export function MajorDetail(props: MajorDetailProps) {
  const {
    node,
    onAddCourse,
    onUpdateNode,
    onNodeSelect,
    currentUser,
    majorCourses,
    treeData,
    onTreeRefresh,
  } = props
  const [isAddingCourse, setIsAddingCourse] = useState(false)
  const [isEditingMajor, setIsEditingMajor] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isQuickCreateCourseOpen, setIsQuickCreateCourseOpen] = useState(false)
  const [isDeletingMajor, setIsDeletingMajor] = useState(false)
  const [coursesRefreshKey, setCoursesRefreshKey] = useState(0)
  const [selectedSemester, setSelectedSemester] = useState("2024-spring")
  const [semesters, setSemesters] = useState([
    { value: "2024-spring", label: "2024年春季学期" },
    { value: "2024-fall", label: "2024年秋季学期" },
    { value: "2025-spring", label: "2025年春季学期" },
    { value: "2025-fall", label: "2025年秋季学期" },
  ])
  const [isConfirmingSemesterChange, setIsConfirmingSemesterChange] = useState(false)
  const [pendingSemesterValue, setPendingSemesterValue] = useState<string | null>(null)
  const { setActivePage } = useActivePageTracker()
  const { can } = usePermission()
  const currentMajorId = useMemo(() => {
    if (typeof node.id === "string" && node.id) {
      return node.id
    }

    if (typeof node.nodeId === "string" && node.nodeId) {
      return extractNumericId(node.nodeId).toString()
    }

    return ""
  }, [node.id, node.nodeId])
  const cachedMajor = useMemo(() => getMajorCache(currentMajorId), [currentMajorId])

  const metadataSource = (node.metadata as NodeMetadataWithManagers | undefined)?.source
  const resolvedSource = typeof metadataSource === "string" && metadataSource
    ? metadataSource
    : cachedMajor?.source
  const isVirtualMajorFromSwitchDpt = resolvedSource === "course-level-switchDpt"

  const resolvedBtnMenus = useMemo(() => {
    if (Array.isArray(node.btnMenus)) {
      return node.btnMenus
    }

    const metadataBtnMenus = (node.metadata as NodeMetadataWithManagers | undefined)?.btnMenus
    if (Array.isArray(metadataBtnMenus)) {
      return metadataBtnMenus
    }

    return cachedMajor?.btnMenus ?? []
  }, [cachedMajor?.btnMenus, node.btnMenus, node.metadata])
  const canEditMajor = !isVirtualMajorFromSwitchDpt && hasMenuPermission(resolvedBtnMenus, "majoredit")
  const canDeleteMajor = !isVirtualMajorFromSwitchDpt && hasMenuPermission(resolvedBtnMenus, "majordel")
  const canManageMajorCourse = can(MANAGE_MAJOR_COURSE_ACTION, { scope: "major" })
  const departmentId = useMemo(() => resolveDepartmentId(node, treeData), [node, treeData])

  useEffect(() => {
    if (!node) return
    setActivePage(DEFAULT_MAJOR_TAB, MAJOR_TABS[DEFAULT_MAJOR_TAB])
  }, [node, setActivePage])

  const handleTabChange = (value: string) => {
    const tabKey = value as MajorTabKey
    const label = MAJOR_TABS[tabKey] ?? value
    setActivePage(value, label)
  }

  // 生成默认学期名称
  const generateDefaultSemesterName = useCallback(() => {
    if (semesters.length === 0) return ""

    // 获取最后一个学期
    const lastSemester = semesters[semesters.length - 1]
    const lastLabel = lastSemester.label

    // 解析最后一个学期的年份和季节
    const yearMatch = lastLabel.match(/(\d{4})年/)
    const isFall = lastLabel.includes("秋季")

    if (!yearMatch) return ""

    const lastYear = parseInt(yearMatch[1])
    let newYear = lastYear
    let newSeason = "春季"

    // 如果最后一个是秋季，则下一个是明年春季；否则是同年秋季
    if (isFall) {
      newYear = lastYear + 1
      newSeason = "春季"
    } else {
      newSeason = "秋季"
    }

    return `${newYear}年${newSeason}学期`
  }, [semesters])

  // 处理添加新学期
  const handleAddSemester = useCallback((semesterName: string, shouldSwitch: boolean = false) => {
    if (!canManageMajorCourse) return
    // 生成学期值（基于名称）
    const yearMatch = semesterName.match(/(\d{4})年/)
    const isFall = semesterName.includes("秋季")

    if (!yearMatch) return

    const year = parseInt(yearMatch[1])
    const season = isFall ? "fall" : "spring"
    const newValue = `${year}-${season}`

    // 检查是否已存在
    if (semesters.some(s => s.value === newValue)) {
      return
    }

    // 先添加新学期
    setSemesters((prev) => [...prev, { value: newValue, label: semesterName }])

    // 如果勾选了立即切换，则切换到新学期
    if (shouldSwitch) {
      setSelectedSemester(newValue)
    }
  }, [canManageMajorCourse, semesters])

  // 学期选择处理器 - 使用 useCallback 避免重复创建
  const handleSemesterChange = useCallback((value: string) => {
    // 如果选择的学期与当前学期相同，不做任何操作
    if (value === selectedSemester) {
      return
    }
    // 所有学期切换都需要确认
    setPendingSemesterValue(value)
    setIsConfirmingSemesterChange(true)
  }, [selectedSemester])

  // 确认切换学期处理器
  const handleConfirmSemesterChange = useCallback(() => {
    if (pendingSemesterValue) {
      setSelectedSemester(pendingSemesterValue)
    }
    setIsConfirmingSemesterChange(false)
    setPendingSemesterValue(null)
  }, [pendingSemesterValue])

  // 取消切换学期处理器
  const handleCancelSemesterChange = useCallback(() => {
    setIsConfirmingSemesterChange(false)
    setPendingSemesterValue(null)
  }, [])

  // 获取待切换学期的标签
  const getPendingSemesterLabel = useCallback(() => {
    if (!pendingSemesterValue) return ""
    const semester = semesters.find(s => s.value === pendingSemesterValue)
    return semester?.label || pendingSemesterValue
  }, [pendingSemesterValue, semesters])

  // 当节点改变时，退出编辑模式
  useEffect(() => {
    setIsEditingMajor(false)
    setIsAddingCourse(false)
    setIsDeleteDialogOpen(false)
    setIsQuickCreateCourseOpen(false)
  }, [node?.id])

  const handleDeleteNode = async (nodeId: string) => {
    if (!canDeleteMajor) return
    setIsDeletingMajor(true)

    try {
      const response = await majorApiService.deleteMajor(nodeId)
      if (response.error) {
        throw new Error(response.error)
      }

      setIsDeleteDialogOpen(false)
      await onTreeRefresh?.()
    } catch (error) {
      console.error("[MajorDetail] 删除专业失败:", error)
    } finally {
      setIsDeletingMajor(false)
    }
  }

  const handleEditMajorFormSubmit = (majorData: any) => {
    if (!canEditMajor) return
    const currentNodeId = node.id ?? node.nodeId
    if (onUpdateNode && currentNodeId) {
      onUpdateNode(currentNodeId, majorData)
      setIsEditingMajor(false)
    }
  }

  const handleAddCourseSubmit = (data: any) => {
    if (!canManageMajorCourse) return
    const currentNodeId = node.id ?? node.nodeId
    if (onAddCourse && currentNodeId) {
      onAddCourse(currentNodeId, data)
    }
    setIsAddingCourse(false)
  }

  // 课程创建成功后的回调，刷新课程列表
  const handleQuickCreateCourseSuccess = () => {
    // 新增课程成功后，先局部刷新当前专业课程列表，确保右侧列表立即可见新课程
    setCoursesRefreshKey((prev) => prev + 1)
    void onTreeRefresh?.()
  }

  const handleOpenEditMajor = () => {
    if (!canEditMajor) return
    setIsEditingMajor(true)
  }

  const handleOpenQuickCreateCourse = () => {
    if (!canManageMajorCourse) return
    setIsQuickCreateCourseOpen(true)
  }

  const handleQuickCreateCourseOpenChange = (open: boolean) => {
    if (open && !canManageMajorCourse) return
    setIsQuickCreateCourseOpen(open)
  }

  if (isEditingMajor && node.type === "major") {
    return (
      <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl p-6">
        <AddMajorForm
          departmentId={departmentId}
          onCancel={() => setIsEditingMajor(false)}
          onSubmit={handleEditMajorFormSubmit}
          initialData={node}
          isEditMode={true}
        />
      </div>
    )
  }

  if (isAddingCourse) {
    const currentNodeId = node.id ?? node.nodeId
    if (!currentNodeId) return null
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-secondary/20">
        <AddCourseForm majorId={currentNodeId} onSubmit={handleAddCourseSubmit} onCancel={() => setIsAddingCourse(false)} />
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-3 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground mb-2">{node.name}</h2>
                {node.description && <p className="text-muted-foreground mb-3">{node.description}</p>}
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end flex-shrink-0">
              <div className="flex gap-2 justify-end">
                {onUpdateNode && canEditMajor && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleOpenEditMajor}
                    className="gap-2 hover:bg-primary/10"
                  >
                    <Pencil className="w-4 h-4 text-primary" />
                  </Button>
                )}
                {canDeleteMajor && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={isDeletingMajor}
                    className="gap-2 hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
              <SemesterSelector
                value={selectedSemester}
                onChange={handleSemesterChange}
                semesters={semesters}
                onAddSemester={handleAddSemester}
                generateDefaultSemesterName={generateDefaultSemesterName}
                canManageMajorCourse={canManageMajorCourse}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="courses" className="w-full" onValueChange={handleTabChange}>
            <TabsList className="w-full h-10 bg-secondary/50 backdrop-blur-sm border-b border-border rounded-none p-0">
              <TabsTrigger value="courses" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">
                课程管理
              </TabsTrigger>
              <TabsTrigger value="details" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">
                专业详情
              </TabsTrigger>
              <TabsTrigger value="matrix" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">
                专业矩阵
              </TabsTrigger>
              <TabsTrigger value="teaching-quality" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">
                质量评价
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4 px-6">
              <MajorBasicInfo node={node} />
            </TabsContent>

            <TabsContent value="matrix" className="space-y-4 mt-4 px-6">
              <MajorMatrix node={node} onUpdateNode={onUpdateNode} />
            </TabsContent>

            <TabsContent value="courses" className="space-y-4 mt-4 px-6">
              <MajorCourses
                node={node}
                currentUser={currentUser}
                onNodeSelect={onNodeSelect}
                onAddCourse={handleOpenQuickCreateCourse}
                majorCourses={majorCourses}
                departmentId={departmentId}
                refreshKey={coursesRefreshKey}
                canManageCourse={canEditMajor}
              />
            </TabsContent>

            <TabsContent value="teaching-quality" className="space-y-6 p-6">
              <TeachingQualityStats node={node} nodeType="major" treeData={treeData} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <QuickCreateCourseDialog
        open={isQuickCreateCourseOpen}
        onOpenChange={handleQuickCreateCourseOpenChange}
        onSuccess={handleQuickCreateCourseSuccess}
        majorId={node.id ?? node.nodeId ?? ""}
        majorName={node.name ?? node.nodeName ?? ""}
        departmentId={departmentId}
      />

      <AlertDialog open={isConfirmingSemesterChange} onOpenChange={setIsConfirmingSemesterChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>切换学期确认</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要切换到{getPendingSemesterLabel()}吗？往期数据将会设置为只读。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSemesterChange}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSemesterChange}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除专业"{node.name}"吗？
              <br />
              此操作将同时删除该专业下的所有课程，且
              <span className="text-destructive font-medium">不可撤销</span>
              。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingMajor}>取消</AlertDialogCancel>
            {canDeleteMajor && (
              <AlertDialogAction
                onClick={() => handleDeleteNode(node.id ?? node.nodeId ?? "")}
                disabled={isDeletingMajor}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeletingMajor ? "删除中..." : "确认删除"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
