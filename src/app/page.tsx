"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { TreeView } from "@/components/tree-view"
import { DetailPanel } from "@/components/detail-panel"
import { Header } from "@/components/header"
import { LoadingState } from "@/shared/components/ui/loading-state"
import { useTreeData } from "@/shared/hooks/use-tree-data"
import { useLocalStorage } from "@/shared/hooks/use-local-storage"
import { api, getStoredAuthUser, getStoredAuthToken, getStoredSemesterContext } from "@/lib/api"
import { findStarredNode, getFirstNode } from "@/shared/utils/tree-operations"
import { cn, extractNumericId } from "@/shared/utils/utils"
import type { TreeNode } from "@/types"
import { useSemesterStore } from "@/shared/stores/semester-store"

const CURRENT_SCHOOL_STORAGE_KEY = "education-current-school"
const TREE_COLLAPSED_STORAGE_KEY = "education-tree-collapsed"

const findNodeInTree = (node: TreeNode, targetId: string): TreeNode | null => {
  if (node.nodeId === targetId || node.id === targetId) {
    return node
  }

  if (!node.children || node.children.length === 0) {
    return null
  }

  for (const child of node.children) {
    const found = findNodeInTree(child, targetId)
    if (found) {
      return found
    }
  }

  return null
}

export default function Page() {
  const [isLoading, setIsLoading] = useState(true)
  const [initialData, setInitialData] = useState<TreeNode | null>(null)
  const [currentSchoolId, setCurrentSchoolId] = useLocalStorage<string | null>(CURRENT_SCHOOL_STORAGE_KEY, null)
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [selectedNodePath, setSelectedNodePath] = useState<TreeNode[]>([])
  const [isTreeCollapsed, setIsTreeCollapsed] = useLocalStorage<boolean>(TREE_COLLAPSED_STORAGE_KEY, true)
  const [departmentMajors, setDepartmentMajors] = useState<Map<string, TreeNode[]>>(new Map())
  const [currentUser] = useState<{ username: string; role: string } | null>(() => {
    const authUser = getStoredAuthUser()
    if (!authUser) {
      return null
    }
    return {
      username: authUser.userName,
      role: "teacher",
    }
  })
  // 添加ref来存储TreeView的handleToggleExpand方法
  const treeViewRef = useRef<{ toggleExpand: (nodeId: string) => void }>(null)
  // 添加ref来引用右侧详情面板容器，用于滚动控制
  const detailPanelContainerRef = useRef<HTMLDivElement>(null)
  const treeRequestIdRef = useRef(0)
  const selectedNodePathRef = useRef<TreeNode[]>([])
  const {
    treeData,
    findNodeById,
    addDepartment,
    addMajor,
    addCourse,
    updateNode,
    deleteNode,
    resetData: resetTreeData,
  } = useTreeData(initialData)
  const router = useRouter()
  const pathname = usePathname()
  const selectedSemesterId = useSemesterStore((state) => state.selectedSemesterId)
  const initializeFromStoredContext = useSemesterStore((state) => state.initializeFromStoredContext)

  const resolveNextSelectedNode = useCallback((latestTree: TreeNode, previousSelectedNode: TreeNode | null): TreeNode | null => {
    const latestSelectedNodePath = selectedNodePathRef.current

    if (previousSelectedNode) {
      const selectedByNodeId = findNodeInTree(latestTree, previousSelectedNode.nodeId)
      if (selectedByNodeId) {
        return selectedByNodeId
      }

      if (previousSelectedNode.id) {
        const selectedByNumericId = findNodeInTree(latestTree, previousSelectedNode.id)
        if (selectedByNumericId) {
          return selectedByNumericId
        }
      }

      if (latestSelectedNodePath.length > 1) {
        for (let index = latestSelectedNodePath.length - 2; index >= 0; index -= 1) {
          const fallbackNode = latestSelectedNodePath[index]
          const matchedFallbackNode = findNodeInTree(latestTree, fallbackNode.nodeId)
          if (matchedFallbackNode) {
            return matchedFallbackNode
          }
        }
      }
    }

    const starredNode = findStarredNode(latestTree)
    if (starredNode) {
      return starredNode
    }

    const firstNode = getFirstNode(latestTree)
    return firstNode || null
  }, [])

  useEffect(() => {
    initializeFromStoredContext(getStoredSemesterContext())
  }, [initializeFromStoredContext])

  useEffect(() => {
    selectedNodePathRef.current = selectedNodePath
  }, [selectedNodePath])

  useEffect(() => {
    const loadTreeData = async () => {
      const requestId = ++treeRequestIdRef.current
      const token = getStoredAuthToken()
      if (!token) {
        router.replace("/login")
        return
      }

      setIsLoading(true)

      console.log("[v0] 开始加载树形数据")
      const response = await api.tree.getTree(undefined, selectedSemesterId)
      console.log("[v0] API响应:", response)

      if (treeRequestIdRef.current !== requestId) {
        return
      }

      if (response.status === 401) {
        router.replace("/login")
        return
      }

      if (response.data) {
        console.log("[v0] 树形数据加载成功，children数量:", response.data.children?.length || 0)
        const latestTree = response.data
        setInitialData(latestTree)
        resetTreeData(latestTree)
        setSelectedNode((prevSelectedNode) => {
          return resolveNextSelectedNode(latestTree, prevSelectedNode)
        })
      } else {
        console.error("[v0] 加载树形数据失败:", response.error)
        const emptyTree: TreeNode = {
          nodeId: "root",
          nodeName: "根节点",
          nodeType: "root" as const,
          children: [],
        }
        setInitialData(emptyTree)
        resetTreeData(emptyTree)
        setSelectedNode(null)
      }
      setIsLoading(false)
    }

    void loadTreeData()
  }, [resetTreeData, resolveNextSelectedNode, router, selectedSemesterId])

  const effectiveSelectedNode = useMemo(() => {
    if (!selectedNode || !treeData) {
      return selectedNode
    }

    const treeNode = findNodeById(treeData, selectedNode.nodeId)
    if (!treeNode) {
      return selectedNode
    }

    return {
      ...treeNode,
      btnMenus: Array.isArray(selectedNode.btnMenus) && selectedNode.btnMenus.length > 0 ? selectedNode.btnMenus : treeNode.btnMenus,
      coverMenus: Array.isArray(selectedNode.coverMenus) && selectedNode.coverMenus.length > 0 ? selectedNode.coverMenus : treeNode.coverMenus,
      manager: Array.isArray(selectedNode.manager) && selectedNode.manager.length > 0 ? selectedNode.manager : treeNode.manager,
      metadata: {
        ...(treeNode.metadata || {}),
        ...(selectedNode.metadata || {}),
      },
    }
  }, [findNodeById, selectedNode, treeData])

  useEffect(() => {
    console.log("[v0] selectedNode状态变化:", selectedNode)
  }, [selectedNode])

  useEffect(() => {
    if (selectedNode?.nodeType !== "university") {
      return
    }

    setCurrentSchoolId(extractNumericId(selectedNode.nodeId).toString())
  }, [selectedNode?.nodeId, selectedNode?.nodeType, setCurrentSchoolId])

  // 当选中节点变化时，滚动右侧详情面板到顶部
  useEffect(() => {
    if (selectedNode?.nodeId && detailPanelContainerRef.current) {
      detailPanelContainerRef.current.scrollTo({ top: 0, behavior: "instant" })
    }
  }, [selectedNode?.nodeId])

  const handleAddDepartment = (universityId: string, newDepartment: Omit<TreeNode, "id" | "nodeId">) => {
    addDepartment(universityId, newDepartment)
  }

  const handleAddMajor = (departmentId: string, newMajor: Omit<TreeNode, "id" | "nodeId">) => {
    addMajor(departmentId, newMajor)
  }

  const handleAddCourse = (majorId: string, newCourse: Omit<TreeNode, "id" | "nodeId">) => {
    addCourse(majorId, newCourse)
  }

  const handleUpdateNode = (nodeId: string, updates: Partial<TreeNode>) => {
    updateNode(nodeId, updates)
  }

  const handleDeleteNode = (nodeId: string) => {
    deleteNode(nodeId)
  }

  const handleSetCurrentSchool = (schoolId: string) => {
    setCurrentSchoolId(schoolId)
  }

  const handleResetData = () => {
    if (confirm("确定要重置所有数据到初始状态吗？此操作不可撤销。")) {
      window.location.reload()
    }
  }

  const handleToggleTreeCollapse = () => {
    setIsTreeCollapsed((prev) => !prev)
  }

  // 创建handleToggleExpand函数，用于从详情面板触发树形节点的展开和动态加载
  const handleToggleExpand = (nodeId: string) => {
    if (treeViewRef.current) {
      treeViewRef.current.toggleExpand(nodeId)
    }
  }

  const refreshTreeData = useCallback(async (): Promise<boolean> => {
    try {
      const requestId = ++treeRequestIdRef.current
      const response = await api.tree.getTree(undefined, selectedSemesterId)
      if (treeRequestIdRef.current !== requestId) {
        return false
      }

      if (!response.data) {
        console.error("[Page] 刷新树形数据失败:", response.error)
        setIsLoading(false)
        return false
      }

      const latestTree = response.data
      setInitialData(latestTree)
      resetTreeData(latestTree)

      setSelectedNode((prevSelectedNode) => {
        return resolveNextSelectedNode(latestTree, prevSelectedNode)
      })
      setIsLoading(false)

      return true
    } catch (error) {
      console.error("[Page] 刷新树形数据异常:", error)
      setIsLoading(false)
      return false
    }
  }, [resetTreeData, resolveNextSelectedNode, selectedSemesterId])

  if (isLoading || !treeData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[oklch(0.97_0.005_240)] via-[oklch(0.96_0.005_240)] to-[oklch(0.95_0.008_240)]">
        <LoadingState title="加载中..." className="h-screen" />
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[oklch(0.97_0.005_240)] via-[oklch(0.96_0.005_240)] to-[oklch(0.95_0.008_240)] px-6 py-6 md:py-8 overflow-hidden flex flex-col">
      <div className="w-full flex flex-col flex-1 min-h-0">
        <Header
          onResetData={handleResetData}
          isTreeCollapsed={isTreeCollapsed}
          currentPath={pathname ?? undefined}
          selectedNodeName={effectiveSelectedNode?.nodeName}
          treeData={treeData}
        />

        <div className="flex gap-3 relative w-full flex-1 min-h-0">
          <div
            className={cn(
              "flex-shrink-0 transition-all duration-300 ease-in-out relative",
              isTreeCollapsed ? "w-[70px]" : "w-[calc(23%-0.375rem)]"
            )}
          >
            <TreeView
              ref={treeViewRef}
              treeData={treeData}
              onNodeSelect={setSelectedNode}
              onSelectedNodePathChange={setSelectedNodePath}
              selectedNode={effectiveSelectedNode}
              onWorkshopCreated={refreshTreeData}
              selectedSemesterId={selectedSemesterId}
              currentSchoolId={currentSchoolId}
              onSetCurrentSchool={handleSetCurrentSchool}
              onUpdateNode={handleUpdateNode}
              isCollapsed={isTreeCollapsed}
              onToggleCollapse={handleToggleTreeCollapse}
              onDepartmentMajorsChange={setDepartmentMajors}
            />
          </div>
          <div
            ref={detailPanelContainerRef}
            className={cn(
              "flex-shrink-0 transition-all duration-300 ease-in-out overflow-y-auto",
              isTreeCollapsed ? "w-[calc(100%-70px-0.75rem)]" : "w-[calc(77%-0.375rem)]"
            )}
          >
            <DetailPanel
              node={effectiveSelectedNode}
              treeData={treeData}
              selectedNodePath={selectedNodePath}
              onNodeSelect={setSelectedNode}
              onTreeRefresh={refreshTreeData}
              onAddDepartment={handleAddDepartment}
              onAddMajor={handleAddMajor}
              onAddCourse={handleAddCourse}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              departmentMajors={departmentMajors}
              currentUser={currentUser}
              // 传入handleToggleExpand回调
              onToggleExpand={handleToggleExpand}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
