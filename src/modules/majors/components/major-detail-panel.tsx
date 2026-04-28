"use client"

import { useState, useEffect, useMemo } from "react"
import type { TreeNode, TreeNodeMenuItem } from "@/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Button } from "@/shared/components/ui/button"
import { GraduationCap, Pencil, Trash2 } from "lucide-react"
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
import { getMajorCache, removeMajorCache } from "@/shared/utils/major-cache"
import { useSemesterStore } from "@/shared/stores/semester-store"

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
    onDeleteNode,
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
  const { setActivePage } = useActivePageTracker()
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

  const { can, isSemesterReadonly } = usePermission()
  const selectedSemesterId = useSemesterStore((state) => state.selectedSemesterId)
  const canEditMajor = !isSemesterReadonly && !isVirtualMajorFromSwitchDpt && hasMenuPermission(resolvedBtnMenus, "majoredit")
  const canDeleteMajor = !isSemesterReadonly && !isVirtualMajorFromSwitchDpt && hasMenuPermission(resolvedBtnMenus, "majordel")
  const canManageMajorCourse = can(MANAGE_MAJOR_COURSE_ACTION, { scope: "major" })
  const canCreateCourseInMajor =
    !isSemesterReadonly &&
    !isVirtualMajorFromSwitchDpt &&
    [
      hasMenuPermission(resolvedBtnMenus, "majoredit"),
      canManageMajorCourse,
    ].some(Boolean)
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
      if (typeof selectedSemesterId !== "number" || !Number.isFinite(selectedSemesterId)) {
        throw new Error("当前学期ID不能为空")
      }

      const response = await majorApiService.deleteMajor(selectedSemesterId, nodeId)
      if (response.error) {
        throw new Error(response.error)
      }

      removeMajorCache(nodeId)
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
    if (!canCreateCourseInMajor) return
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
    if (!canCreateCourseInMajor) return
    setIsQuickCreateCourseOpen(true)
  }

  const handleQuickCreateCourseOpenChange = (open: boolean) => {
    if (open && !canCreateCourseInMajor) return
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
              {onUpdateNode && canEditMajor && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleOpenEditMajor}
                  className="gap-2 px-3 whitespace-nowrap hover:bg-primary/10"
                >
                  <Pencil className="w-4 h-4 text-primary" />
                  <span className="text-primary font-medium">编辑专业</span>
                </Button>
              )}
              {canDeleteMajor && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={isDeletingMajor}
                  className="gap-2 px-3 whitespace-nowrap hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                  <span className="text-destructive font-medium">删除专业</span>
                </Button>
              )}
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
                canManageCourse={canCreateCourseInMajor}
                onUpdateNode={onUpdateNode}
                onDeleteNode={onDeleteNode}
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
