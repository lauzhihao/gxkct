"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { TreeView } from "@/components/tree-view"
import { DetailPanel } from "@/components/detail-panel"
import { Header } from "@/components/header"
import { LoadingState } from "@/shared/components/ui/loading-state"
import { useTreeData } from "@/shared/hooks/use-tree-data"
import { useLocalStorage } from "@/shared/hooks/use-local-storage"
import { api, getStoredAuthUser, getStoredAuthToken } from "@/lib/api"
import { findStarredNode, getFirstNode } from "@/shared/utils/tree-operations"
import { cn, extractNumericId } from "@/shared/utils/utils"
import type { TreeNode } from "@/types"

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
  const treeDataHook = useTreeData(initialData)
  const hasInitialized = useRef(false)
  const hasLoadedTree = useRef(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const loadTreeData = async () => {
      // 防止在 StrictMode 下重复调用
      if (hasLoadedTree.current) {
        return
      }

      const token = getStoredAuthToken()
      if (!token) {
        router.replace("/login")
        return
      }

      hasLoadedTree.current = true

      console.log("[v0] 开始加载树形数据")
      const response = await api.tree.getTree()
      console.log("[v0] API响应:", response)

      if (response.status === 401) {
        router.replace("/login")
        return
      }

      if (response.data) {
        console.log("[v0] 树形数据加载成功，children数量:", response.data.children?.length || 0)
        setInitialData(response.data)
      } else {
        console.error("[v0] 加载树形数据失败:", response.error)
        setInitialData({
          nodeId: "root",
          nodeName: "根节点",
          nodeType: "root" as const,
          children: [],
        })
      }
      setIsLoading(false)
    }

    loadTreeData()
  }, [router])

  useEffect(() => {
    if (
      hasInitialized.current ||
      !treeDataHook ||
      !treeDataHook.treeData ||
      !treeDataHook.treeData.children ||
      treeDataHook.treeData.children.length === 0
    ) {
      return
    }

    try {
      console.log("[v0] 开始初始化星标节点选择")
      console.log("[v0] treeData children数量:", treeDataHook.treeData.children.length)

      const starredNode = findStarredNode(treeDataHook.treeData)
      console.log("[v0] 找到的星标节点:", starredNode)

      if (starredNode) {
        console.log("[v0] 选中星标节点:", starredNode.nodeName)
        Promise.resolve().then(() => {
          setSelectedNode(starredNode)
          if (starredNode.nodeType === "university") {
            setCurrentSchoolId(extractNumericId(starredNode.nodeId).toString())
          }
        })
      } else {
        console.log("[v0] 没有找到星标节点，使用第一个节点")
        const firstNode = getFirstNode(treeDataHook.treeData)
        console.log("[v0] 第一个节点:", firstNode)

        if (firstNode) {
          treeDataHook.updateNode(firstNode.nodeId, { isStarred: true })
          Promise.resolve().then(() => {
            setSelectedNode(firstNode)
            if (firstNode.nodeType === "university") {
              setCurrentSchoolId(extractNumericId(firstNode.nodeId).toString())
            }
          })
        }
      }

      hasInitialized.current = true
      console.log("[v0] 初始化完成")
    } catch (error) {
      console.error("[v0] 初始化过程中出错:", error)
    }
  }, [treeDataHook, setCurrentSchoolId])

  const effectiveSelectedNode = useMemo(() => {
    if (!selectedNode || !treeDataHook?.findNodeById || !treeDataHook.treeData) {
      return selectedNode
    }

    const treeNode = treeDataHook.findNodeById(treeDataHook.treeData, selectedNode.nodeId)
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
  }, [selectedNode, treeDataHook])

  useEffect(() => {
    console.log("[v0] selectedNode状态变化:", selectedNode)
  }, [selectedNode])

  // 当选中节点变化时，滚动右侧详情面板到顶部
  useEffect(() => {
    if (selectedNode?.nodeId && detailPanelContainerRef.current) {
      detailPanelContainerRef.current.scrollTo({ top: 0, behavior: "instant" })
    }
  }, [selectedNode?.nodeId])

  const handleAddDepartment = (universityId: string, newDepartment: Omit<TreeNode, "id" | "nodeId">) => {
    treeDataHook?.addDepartment(universityId, newDepartment)
  }

  const handleAddMajor = (departmentId: string, newMajor: Omit<TreeNode, "id" | "nodeId">) => {
    treeDataHook?.addMajor(departmentId, newMajor)
  }

  const handleAddCourse = (majorId: string, newCourse: Omit<TreeNode, "id" | "nodeId">) => {
    treeDataHook?.addCourse(majorId, newCourse)
  }

  const handleUpdateNode = (nodeId: string, updates: Partial<TreeNode>) => {
    treeDataHook?.updateNode(nodeId, updates)
  }

  const handleDeleteNode = (nodeId: string) => {
    treeDataHook?.deleteNode(nodeId)
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
      const response = await api.tree.getTree()
      if (!response.data) {
        console.error("[Page] 刷新树形数据失败:", response.error)
        return false
      }

      const latestTree = response.data
      setInitialData(latestTree)
      treeDataHook?.resetData(latestTree)

      setSelectedNode((prevSelectedNode) => {
        if (!prevSelectedNode) {
          return prevSelectedNode
        }

        const selectedByNodeId = findNodeInTree(latestTree, prevSelectedNode.nodeId)
        if (selectedByNodeId) {
          return selectedByNodeId
        }

        if (prevSelectedNode.id) {
          const selectedByNumericId = findNodeInTree(latestTree, prevSelectedNode.id)
          if (selectedByNumericId) {
            return selectedByNumericId
          }
        }

        if (selectedNodePath.length > 1) {
          for (let index = selectedNodePath.length - 2; index >= 0; index -= 1) {
            const fallbackNode = selectedNodePath[index]
            const matchedFallbackNode = findNodeInTree(latestTree, fallbackNode.nodeId)
            if (matchedFallbackNode) {
              return matchedFallbackNode
            }
          }
        }

        const firstNode = getFirstNode(latestTree)
        return firstNode || null
      })

      return true
    } catch (error) {
      console.error("[Page] 刷新树形数据异常:", error)
      return false
    }
  }, [selectedNodePath, treeDataHook])

  if (isLoading || !treeDataHook || !treeDataHook.treeData) {
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
          treeData={treeDataHook.treeData}
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
              treeData={treeDataHook.treeData}
              onNodeSelect={setSelectedNode}
              onSelectedNodePathChange={setSelectedNodePath}
              selectedNode={effectiveSelectedNode}
              onWorkshopCreated={refreshTreeData}
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
              treeData={treeDataHook.treeData}
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
