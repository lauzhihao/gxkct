"use client"

import { useState, useEffect, useRef } from "react"
import { TreeView } from "@/components/tree-view"
import { DetailPanel } from "@/components/detail-panel"
import { Header } from "@/components/header"
import { useTreeData } from "@/hooks/use-tree-data"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { api } from "@/lib/api"
import { findStarredNode, getFirstNode } from "@/lib/tree-operations"
import { cn } from "@/lib/utils"
import type { TreeNode } from "@/types"

const CURRENT_SCHOOL_STORAGE_KEY = "education-current-school"
const TREE_COLLAPSED_STORAGE_KEY = "education-tree-collapsed"

export default function Page() {
  const [isLoading, setIsLoading] = useState(true)
  const [initialData, setInitialData] = useState<TreeNode | null>(null)
  const [currentSchoolId, setCurrentSchoolId] = useLocalStorage<string | null>(CURRENT_SCHOOL_STORAGE_KEY, null)
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [isTreeCollapsed, setIsTreeCollapsed] = useLocalStorage<boolean>(TREE_COLLAPSED_STORAGE_KEY, false)
  const [departmentMajors, setDepartmentMajors] = useState<Map<string, TreeNode[]>>(new Map())
  const [majorCourses, setMajorCourses] = useState<Map<string, TreeNode[]>>(new Map())
  // 添加ref来存储TreeView的handleToggleExpand方法
  const treeViewRef = useRef<{ toggleExpand: (nodeId: string) => void }>(null)
  const treeDataHook = useTreeData(initialData)
  const hasInitialized = useRef(false)

  useEffect(() => {
    const loadTreeData = async () => {
      console.log("[v0] 开始加载树形数据")
      const response = await api.tree.getTree()
      console.log("[v0] API响应:", response)

      if (response.data) {
        console.log("[v0] 树形数据加载成功，children数量:", response.data.children?.length || 0)
        setInitialData(response.data)
      } else {
        console.error("[v0] 加载树形数据失败:", response.error)
        setInitialData({
          id: "root",
          name: "根节点",
          type: "university" as const,
          children: [],
        })
      }
      setIsLoading(false)
    }

    loadTreeData()
  }, [])

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
        console.log("[v0] 选中星标节点:", starredNode.name)
        setSelectedNode(starredNode)

        if (starredNode.type === "university") {
          setCurrentSchoolId(starredNode.id)
        }
      } else {
        console.log("[v0] 没有找到星标节点，使用第一个节点")
        const firstNode = getFirstNode(treeDataHook.treeData)
        console.log("[v0] 第一个节点:", firstNode)

        if (firstNode) {
          treeDataHook.updateNode(firstNode.id, { isStarred: true })
          setSelectedNode(firstNode)

          if (firstNode.type === "university") {
            setCurrentSchoolId(firstNode.id)
          }
        }
      }

      hasInitialized.current = true
      console.log("[v0] 初始化完成")
    } catch (error) {
      console.error("[v0] 初始化过程中出错:", error)
    }
  }, [treeDataHook, setCurrentSchoolId])

  useEffect(() => {
    if (selectedNode && treeDataHook?.findNodeById && treeDataHook.treeData) {
      const updatedNode = treeDataHook.findNodeById(treeDataHook.treeData, selectedNode.id)
      if (updatedNode) {
        setSelectedNode(updatedNode)
      }
    }
  }, [treeDataHook?.treeData, selectedNode, treeDataHook?.findNodeById])

  useEffect(() => {
    console.log("[v0] selectedNode状态变化:", selectedNode)
  }, [selectedNode])

  const findParentId = (node: TreeNode, targetId: string, parentId?: string): string | null => {
    if (node.id === targetId) {
      return parentId || null
    }

    if (node.children) {
      for (const child of node.children) {
        const found = findParentId(child, targetId, node.id)
        if (found) {
          return found
        }
      }
    }

    return null
  }

  const handleAddSchool = (newSchool: Omit<TreeNode, "id">) => {
    treeDataHook?.addSchool(newSchool)
  }

  const handleAddDepartment = (universityId: string, newDepartment: Omit<TreeNode, "id">) => {
    treeDataHook?.addDepartment(universityId, newDepartment)
  }

  const handleAddMajor = (departmentId: string, newMajor: Omit<TreeNode, "id">) => {
    treeDataHook?.addMajor(departmentId, newMajor)
  }

  const handleAddCourse = (majorId: string, newCourse: Omit<TreeNode, "id">) => {
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

  console.log("[v0] 渲染Page组件，isLoading:", isLoading, "selectedNode:", selectedNode)

  if (isLoading || !treeDataHook || !treeDataHook.treeData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[oklch(0.97_0.005_240)] via-[oklch(0.96_0.005_240)] to-[oklch(0.95_0.008_240)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.97_0.005_240)] via-[oklch(0.96_0.005_240)] to-[oklch(0.95_0.008_240)] px-[0.5%] py-6 md:py-8 overflow-x-hidden">
      <div className="w-full">
        <Header onResetData={handleResetData} />

        <div className="flex gap-6 relative">
          <div
            className={cn(
              "flex-shrink-0 transition-all duration-300 ease-in-out relative overflow-visible",
              isTreeCollapsed ? "w-[70px]" : "w-[23%]"
            )}
          >
            <TreeView
              ref={treeViewRef}
              treeData={treeDataHook.treeData}
              onNodeSelect={setSelectedNode}
              selectedNode={selectedNode}
              onAddSchool={handleAddSchool}
              currentSchoolId={currentSchoolId}
              onSetCurrentSchool={handleSetCurrentSchool}
              onUpdateNode={handleUpdateNode}
              isCollapsed={isTreeCollapsed}
              onToggleCollapse={handleToggleTreeCollapse}
              onDepartmentMajorsChange={setDepartmentMajors}
              onMajorCoursesChange={setMajorCourses}
            />
          </div>
          <div
            className={cn(
              "flex-shrink-0 transition-all duration-300 ease-in-out",
              isTreeCollapsed ? "w-[calc(100%-70px-1.5rem)]" : "w-[77%]"
            )}
          >
            <DetailPanel
              node={selectedNode}
              treeData={treeDataHook.treeData}
              onNodeSelect={setSelectedNode}
              onAddDepartment={handleAddDepartment}
              onAddMajor={handleAddMajor}
              onAddCourse={handleAddCourse}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              departmentMajors={departmentMajors}
              majorCourses={majorCourses}
              // 传入handleToggleExpand回调
              onToggleExpand={handleToggleExpand}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
