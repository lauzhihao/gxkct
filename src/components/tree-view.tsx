"use client"

import React from "react"
import type { ReactElement } from "react"
import { useState, useEffect } from "react"
import {
  ChevronRight,
  ChevronDown,
  Building2,
  GraduationCap,
  BookOpen,
  FileText,
  Search,
  MoreHorizontal,
  X,
  Plus,
  Star,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { cn } from "@/shared/utils/utils"
import { Input } from "@/shared/components/ui/input"
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
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/shared/components/ui/tooltip"
import type { TreeNode } from "@/types"
import { api } from "@/lib/api"
import { useTreeSearch } from "@/shared/hooks/use-tree-search"

function highlightText(text: string, searchTerm: string) {
  if (!searchTerm.trim()) {
    return text
  }

  const lowerText = text.toLowerCase()
  const lowerSearch = searchTerm.toLowerCase()
  const index = lowerText.indexOf(lowerSearch)

  if (index === -1) {
    return text
  }

  const before = text.slice(0, index)
  const match = text.slice(index, index + searchTerm.length)
  const after = text.slice(index + searchTerm.length)

  return (
    <>
      {before}
      <span className="bg-yellow-300/60 text-foreground font-semibold px-0.5 rounded">{match}</span>
      {highlightText(after, searchTerm)}
    </>
  )
}

const getIcon = (type: string) => {
  switch (type) {
    case "university":
      return Building2
    case "department":
      return GraduationCap
    case "major":
      return BookOpen
    case "course":
      return FileText
    default:
      return FileText
  }
}

function hasMatchingDescendant(node: TreeNode, matchingIds: Set<string>): boolean {
  if (matchingIds.has(node.id)) return true
  if (node.children) {
    return node.children.some((child) => hasMatchingDescendant(child, matchingIds))
  }
  return false
}

interface TreeNodeProps {
  node: TreeNode
  level: number
  onSelect: (node: TreeNode) => void
  selectedNodeId: string | null
  expandedNodes: Set<string>
  onToggleExpand: (nodeId: string) => void
  visibleCourseCounts: Map<string, number>
  onLoadMoreCourses: (majorId: string) => void
  searchTerm: string
  isSearching?: boolean
  currentSchoolId: string | null
  onSetCurrentSchool?: (schoolId: string) => void
  onToggleStar?: (nodeId: string) => void
  matchingNodeIds?: Set<string>
  pathNodeIds?: Set<string>
  isFirstMatch?: boolean
  departmentMajors?: Map<string, TreeNode[]>
  majorCourses?: Map<string, TreeNode[]>
  loadedMajorsWithNoCourses?: Set<string>
}

function TreeNodeComponent({
  node,
  level,
  onSelect,
  selectedNodeId,
  expandedNodes,
  onToggleExpand,
  visibleCourseCounts,
  onLoadMoreCourses,
  searchTerm,
  isSearching = false,
  currentSchoolId,
  onSetCurrentSchool,
  onToggleStar,
  matchingNodeIds,
  pathNodeIds,
  isFirstMatch = false,
  departmentMajors,
  majorCourses,
  loadedMajorsWithNoCourses,
}: TreeNodeProps): ReactElement {
  const Icon = getIcon(node.type)

  // 如果是department节点，合并动态加载的专业数据
  let actualChildren = node.children || []
  if (node.type === "department" && departmentMajors?.has(node.id)) {
    const loadedMajors = departmentMajors.get(node.id) || []
    actualChildren = loadedMajors
  }

  // 如果是major节点，合并动态加载的课程数据
  if (node.type === "major") {
    if (majorCourses?.has(node.id)) {
      const loadedCourses = majorCourses.get(node.id) || []
      actualChildren = loadedCourses
    }
  }

  // department节点应该始终显示展开箭头（可能需要动态加载）
  // major节点也应该始终显示展开箭头，除非已加载且确实没有课程
  // 其他节点根据实际children判断
  const hasChildren = node.type === "department"
    ? true  // department节点始终可展开（会动态加载专业）
    : node.type === "major"
      ? !loadedMajorsWithNoCourses?.has(node.id)  // major节点：如果已加载且无课程则不显示箭头
      : (actualChildren && actualChildren.length > 0)

  const isExpanded = expandedNodes.has(node.id)
  const isSelected = selectedNodeId === node.id
  const isStarred = node.isStarred || false

  const nodeRef = React.createRef<HTMLButtonElement>()

  useEffect(() => {
    if (isFirstMatch && nodeRef.current && searchTerm.trim()) {
      setTimeout(() => {
        nodeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
    }
  }, [isFirstMatch, searchTerm])

  let displayChildren = actualChildren
  let showLoadMore = false
  let remainingCount = 0

  if (searchTerm.trim() && hasChildren && matchingNodeIds && pathNodeIds) {
    // 如果当前节点本身是匹配项，显示所有子节点
    if (matchingNodeIds.has(node.id)) {
      // 不过滤，显示所有子节点
    } else {
      // 如果当前节点不是匹配项，只显示包含匹配项的子节点
      displayChildren = displayChildren.filter(
        (child) =>
          matchingNodeIds.has(child.id) || pathNodeIds.has(child.id) || hasMatchingDescendant(child, matchingNodeIds),
      )
    }
  } else if (node.type === "major" && hasChildren) {
    if (!searchTerm.trim()) {
      const visibleCount = visibleCourseCounts.get(node.id) || 5
      const totalCourses = actualChildren.length

      if (totalCourses > visibleCount) {
        displayChildren = actualChildren.slice(0, visibleCount)
        showLoadMore = true
        remainingCount = totalCourses - visibleCount
      }
    }
  }

  const handleClick = () => {
    onSelect(node)
    // department和major节点始终触发展开（会动态加载数据）
    // 其他节点只有在有children时才展开
    if (node.type === "department" || node.type === "major" || hasChildren) {
      onToggleExpand(node.id)
    }
  }

  const handleLoadMore = (e: React.MouseEvent) => {
    e.stopPropagation()
    onLoadMoreCourses(node.id)
  }

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggleStar) {
      onToggleStar(node.id)
    }
  }

  const indentPadding = level * 24

  return (
    <div className="select-none">
      <button
        ref={nodeRef}
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-3 py-3 rounded-lg transition-all duration-200",
          "backdrop-blur-sm border",
          "hover:bg-card/50 hover:border-primary/50 hover:shadow-lg",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          "group",
          isSelected && "bg-primary/10 border-primary/50 shadow-md",
        )}
        style={{ paddingLeft: `${16 + indentPadding}px`, paddingRight: "16px" }}
      >
        {hasChildren && (
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform" />
            )}
          </div>
        )}
        {!hasChildren && <div className="w-4 flex-shrink-0" />}

        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
            "bg-gradient-to-br from-primary/20 to-accent/20",
            "border border-primary/30",
            "group-hover:from-primary/30 group-hover:to-accent/30",
            "transition-all duration-200",
            isSelected && "from-primary/30 to-accent/30 border-primary/50",
          )}
        >
          <Icon className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 text-left min-w-0 overflow-hidden">
          {(node.type === "course" || node.type === "major") ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "font-medium text-foreground group-hover:text-primary transition-colors truncate cursor-pointer",
                      isSelected && "text-primary",
                    )}
                  >
                    {highlightText(node.name, searchTerm)}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" className="max-w-xs">
                  {node.name}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div
              className={cn(
                "font-medium text-foreground group-hover:text-primary transition-colors truncate",
                isSelected && "text-primary",
              )}
            >
              {highlightText(node.name, searchTerm)}
            </div>
          )}
          {node.description && (
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {highlightText(node.description, searchTerm)}
            </div>
          )}
        </div>

        {level === 0 && onToggleStar && (
          <div
            onClick={handleStarClick}
            className={cn(
              "flex-shrink-0 p-1.5 rounded-md transition-all duration-200 cursor-pointer",
              "hover:bg-primary/20",
              isStarred ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500",
            )}
            aria-label={isStarred ? "已设为星标" : "设为星标"}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                handleStarClick(e as any)
              }
            }}
          >
            <Star className={cn("w-5 h-5 transition-all", isStarred && "fill-yellow-500")} />
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {displayChildren.length > 0 ? (
            displayChildren.map((child, index) => (
              <TreeNodeComponent
                key={child.id}
                node={child}
                level={level + 1}
                onSelect={onSelect}
                selectedNodeId={selectedNodeId}
                expandedNodes={expandedNodes}
                onToggleExpand={onToggleExpand}
                visibleCourseCounts={visibleCourseCounts}
                onLoadMoreCourses={onLoadMoreCourses}
                searchTerm={searchTerm}
                isSearching={isSearching}
                currentSchoolId={currentSchoolId || null}
                onSetCurrentSchool={onSetCurrentSchool}
                onToggleStar={onToggleStar}
                matchingNodeIds={matchingNodeIds}
                pathNodeIds={pathNodeIds}
                isFirstMatch={isFirstMatch && index === 0 && matchingNodeIds?.has(child.id)}
                departmentMajors={departmentMajors}
                majorCourses={majorCourses}
                loadedMajorsWithNoCourses={loadedMajorsWithNoCourses}
              />
            ))
          ) : isSearching && (node.type === "department" || node.type === "major") ? (
            <div
              className="text-sm text-muted-foreground py-2"
              style={{ paddingLeft: `${16 + (level + 1) * 24}px` }}
            >
              加载中...
            </div>
          ) : null}

          {showLoadMore && (
            <button
              onClick={handleLoadMore}
              className={cn(
                "w-full flex items-center gap-3 py-3 rounded-lg transition-all duration-200",
                "backdrop-blur-sm border border-dashed border-primary/30",
                "hover:bg-primary/10 hover:border-primary/50",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                "group",
              )}
              style={{ paddingLeft: `${16 + (level + 1) * 24}px`, paddingRight: "16px" }}
            >
              <div className="w-4 flex-shrink-0" />

              <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/30 group-hover:bg-primary/20">
                <MoreHorizontal className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 text-left">
                <div className="font-medium text-primary">更多{remainingCount}门课程</div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface TreeViewProps {
  treeData: TreeNode | null
  onNodeSelect: (node: TreeNode | null) => void
  selectedNode: TreeNode | null
  onAddSchool?: (newSchool: Omit<TreeNode, "id">) => void
  currentSchoolId?: string | null
  onSetCurrentSchool?: (schoolId: string) => void
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onDepartmentMajorsChange?: (majors: Map<string, TreeNode[]>) => void
  onMajorCoursesChange?: (courses: Map<string, TreeNode[]>) => void
  // 添加onToggleExpand回调用于从详情面板触发展开和动态加载
  onToggleExpand?: (nodeId: string) => void
}

// 使用forwardRef暴露handleToggleExpand方法
export const TreeView = React.forwardRef<
  { toggleExpand: (nodeId: string) => void },
  TreeViewProps
>(function TreeViewComponent({
  treeData,
  onNodeSelect,
  selectedNode,
  onAddSchool,
  currentSchoolId,
  onSetCurrentSchool,
  onUpdateNode,
  isCollapsed = false,
  onToggleCollapse,
  onDepartmentMajorsChange,
  onMajorCoursesChange,
  onToggleExpand: onToggleExpandProp,
}: TreeViewProps, ref): ReactElement {
  // 如果treeData为null,返回空状态
  if (!treeData) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <div className="text-muted-foreground">暂无数据</div>
      </div>
    )
  }
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["root"]))
  const [visibleCourseCounts, setVisibleCourseCounts] = useState<Map<string, number>>(new Map())
  const { searchTerm, setSearchTerm, isSearching, searchResults, clearSearch } = useTreeSearch()
  const [isAddSchoolDialogOpen, setIsAddSchoolDialogOpen] = useState(false)
  const [newSchoolName, setNewSchoolName] = useState("")
  const [newSchoolDesc, setNewSchoolDesc] = useState("")
  // 跟踪已加载专业数据的department节点
  const [loadedDepartments, setLoadedDepartments] = useState<Set<string>>(new Set())
  // 存储动态加载的专业数据
  const [departmentMajors, setDepartmentMajors] = useState<Map<string, TreeNode[]>>(new Map())
  // 跟踪已加载课程数据的major节点
  const [loadedMajors, setLoadedMajors] = useState<Set<string>>(new Set())
  // 存储动态加载的课程数据
  const [majorCourses, setMajorCourses] = useState<Map<string, TreeNode[]>>(new Map())
  // 跟踪已加载但没有课程的major节点
  const [loadedMajorsWithNoCourses, setLoadedMajorsWithNoCourses] = useState<Set<string>>(new Set())
  // 跟踪是否正在加载数据（搜索或动态加载）
  const [isDataLoading, setIsDataLoading] = useState(false)

  // 当departmentMajors变化时通知父组件
  useEffect(() => {
    if (onDepartmentMajorsChange) {
      onDepartmentMajorsChange(departmentMajors)
    }
  }, [departmentMajors, onDepartmentMajorsChange])

  // 当majorCourses变化时通知父组件
  useEffect(() => {
    if (onMajorCoursesChange) {
      onMajorCoursesChange(majorCourses)
    }
  }, [majorCourses, onMajorCoursesChange])



  const handleToggleExpand = React.useCallback(async (nodeId: string) => {
    // 检查当前是否已展开
    const isCurrentlyExpanded = expandedNodes.has(nodeId)

    // 切换展开状态
    setExpandedNodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })

    // 只在展开时才加载数据（收起时不需要加载）
    if (isCurrentlyExpanded) {
      return
    }

    // 查找节点（包括动态加载的节点）
    const findNodeById = (node: TreeNode, targetId: string): TreeNode | null => {
      if (node.id === targetId) return node
      if (node.children) {
        for (const child of node.children) {
          const found = findNodeById(child, targetId)
          if (found) return found
        }
      }
      return null
    }

    console.log(`[TreeView] handleToggleExpand: 开始查找nodeId=${nodeId}`)
    console.log(`[TreeView] handleToggleExpand: treeData=`, treeData ? { id: treeData.id, type: treeData.type, childrenCount: treeData.children?.length } : null)
    let node = findNodeById(treeData, nodeId)
    console.log(`[TreeView] handleToggleExpand: 在treeData中找到的node:`, node ? { id: node.id, type: node.type, name: node.name } : null)

    // 如果在treeData中没找到，尝试在动态加载的专业数据中查找
    if (!node) {
      for (const [deptId, majors] of departmentMajors.entries()) {
        const found = majors.find(m => m.id === nodeId)
        if (found) {
          node = found
          console.log(`[TreeView] handleToggleExpand: 在departmentMajors中找到node:`, { id: node.id, type: node.type, name: node.name })
          break
        }
      }
    }

    console.log(`[TreeView] handleToggleExpand: 最终node:`, node ? { id: node.id, type: node.type, name: node.name } : null)
    console.log(`[TreeView] handleToggleExpand: loadedDepartments.has(${nodeId}) =`, loadedDepartments.has(nodeId))

    // 如果是department节点且未加载过专业数据，则加载
    if (node && node.type === "department" && !loadedDepartments.has(nodeId)) {
      console.log(`[TreeView] 开始加载department ${nodeId} 的专业数据`)
      setIsDataLoading(true)
      try {
        const response = await api.tree.getDepartmentMajors(nodeId)
        console.log(`[TreeView] getDepartmentMajors响应:`, response)

        if (response.data && response.data.length > 0) {
          console.log(`[TreeView] 成功加载 ${response.data.length} 个专业`)
          setDepartmentMajors((prev) => {
            const newMap = new Map(prev)
            newMap.set(nodeId, response.data!)
            return newMap
          })
          setLoadedDepartments((prev) => new Set(prev).add(nodeId))
        } else {
          console.log(`[TreeView] 未找到专业数据或加载失败:`, response.error)
        }
      } finally {
        setIsDataLoading(false)
      }
    }

    // 如果是major节点且未加载过课程数据，则加载
    if (node && node.type === "major" && !loadedMajors.has(nodeId)) {
      console.log(`[v0] handleToggleExpand: 开始加载major ${nodeId} 的课程数据`)
      console.log(`[v0] handleToggleExpand: node.metadata =`, node.metadata)
      // 从metadata中获取majorId
      const majorId = (node.metadata as any)?.majorId || nodeId.replace("major-", "")
      console.log(`[v0] handleToggleExpand: 使用majorId = ${majorId}`)

      setIsDataLoading(true)
      try {
        const response = await api.tree.getMajorCourses(majorId)
        console.log(`[v0] handleToggleExpand: API响应 =`, response)

        if (response.data && response.data.length > 0) {
          console.log(`[v0] handleToggleExpand: 成功加载 ${response.data.length} 个课程，准备更新状态`)
          console.log(`[v0] handleToggleExpand: 前3个课程 =`, response.data.slice(0, 3).map(c => ({ id: c.id, name: c.name })))

          setMajorCourses((prev) => {
            const newMap = new Map(prev)
            newMap.set(nodeId, response.data!)
            console.log(`[v0] handleToggleExpand: 更新majorCourses, nodeId=${nodeId}, 课程数=${response.data!.length}`)
            console.log(`[v0] handleToggleExpand: majorCourses.has(${nodeId}) =`, newMap.has(nodeId))
            return newMap
          })
          setLoadedMajors((prev) => new Set(prev).add(nodeId))
          console.log(`[v0] handleToggleExpand: 状态更新完成`)
        } else if (response.data && response.data.length === 0) {
          console.log(`[v0] handleToggleExpand: 该专业没有课程数据`)
          // 标记为已加载但无课程
          setLoadedMajorsWithNoCourses((prev) => new Set(prev).add(nodeId))
          setLoadedMajors((prev) => new Set(prev).add(nodeId))
        } else {
          console.log(`[v0] handleToggleExpand: 加载课程数据失败:`, response.error)
        }
      } finally {
        setIsDataLoading(false)
      }
    }
  }, [treeData, expandedNodes, loadedDepartments, departmentMajors, loadedMajors])

  // 使用useImperativeHandle暴露handleToggleExpand方法给外部调用
  React.useImperativeHandle(ref, () => ({
    toggleExpand: (nodeId: string) => {
      handleToggleExpand(nodeId)
    },
  }), [handleToggleExpand])

  const handleLoadMoreCourses = (majorId: string) => {
    setVisibleCourseCounts((prev) => {
      const newMap = new Map(prev)
      const currentCount = newMap.get(majorId) || 5
      newMap.set(majorId, currentCount + 5)
      return newMap
    })
  }

  const handleCreateSchool = () => {
    if (!newSchoolName.trim() || !onAddSchool) return

    onAddSchool({
      name: newSchoolName,
      type: "university" as const,
      description: newSchoolDesc || undefined,
      children: [],
    })

    setNewSchoolName("")
    setNewSchoolDesc("")
    setIsAddSchoolDialogOpen(false)
  }

  // 处理星标切换，确保只有一个一级节点被星标
  const handleToggleStar = (nodeId: string) => {
    if (!onUpdateNode || !treeData.children) return

    // 找到要切换星标的节点
    const targetNode = treeData.children.find(child => child.id === nodeId)
    if (!targetNode) return

    const isCurrentlyStarred = targetNode.isStarred || false

    // 如果当前节点未被星标，则取消所有其他节点的星标，并设置当前节点为星标
    if (!isCurrentlyStarred) {
      // 取消所有一级节点的星标
      treeData.children.forEach(child => {
        if (child.isStarred) {
          onUpdateNode(child.id, { isStarred: false })
        }
      })
      // 设置当前节点为星标
      onUpdateNode(nodeId, { isStarred: true })
    } else {
      // 如果当前节点已被星标，则取消星标
      onUpdateNode(nodeId, { isStarred: false })
    }
  }

  useEffect(() => {
    if (selectedNode) {
      // 当选中节点时，自动展开其所有父节点
      const findPathToNode = (root: TreeNode, targetId: string, path: string[] = []): string[] | null => {
        if (root.id === targetId) {
          return path
        }
        if (root.children) {
          for (const child of root.children) {
            const result = findPathToNode(child, targetId, [...path, root.id])
            if (result) return result
          }
        }
        return null
      }

      const path = findPathToNode(treeData, selectedNode.id)
      if (path) {
        setExpandedNodes((prev) => {
          const newSet = new Set(prev)
          path.forEach((nodeId) => newSet.add(nodeId))
          newSet.add(selectedNode.id)
          return newSet
        })
      }
    }
  }, [selectedNode, treeData])

  useEffect(() => {
    if (searchTerm.trim() && searchResults.length > 0) {
      const newExpandedNodes = new Set<string>([treeData.id])

      searchResults.forEach(({ path }) => {
        path.forEach((node) => newExpandedNodes.add(node.id))
      })

      setExpandedNodes(newExpandedNodes)
    }
  }, [searchTerm, searchResults, treeData.id])

  // 单独处理搜索结果中需要加载的数据
  useEffect(() => {
    if (searchTerm.trim() && searchResults.length > 0) {
      const nodesToLoad: Array<{ id: string; type: string }> = []

      searchResults.forEach(({ path }) => {
        path.forEach((node) => {
          if ((node.type === "department" || node.type === "major") && !expandedNodes.has(node.id)) {
            nodesToLoad.push({ id: node.id, type: node.type })
          }
        })
      })

      if (nodesToLoad.length > 0) {
        setIsDataLoading(true)
      }

      // 加载需要的数据
      let loadingCount = 0
      const totalToLoad = nodesToLoad.length

      nodesToLoad.forEach(({ id, type }) => {
        if (type === "department" && !loadedDepartments.has(id)) {
          // 异步加载department数据
          ;(async () => {
            try {
              const response = await api.tree.getDepartmentMajors(id)
              if (response.data && response.data.length > 0) {
                setDepartmentMajors((prev) => {
                  const newMap = new Map(prev)
                  newMap.set(id, response.data!)
                  return newMap
                })
                setLoadedDepartments((prev) => new Set(prev).add(id))
              }
            } finally {
              loadingCount++
              if (loadingCount === totalToLoad) {
                setIsDataLoading(false)
              }
            }
          })()
        } else if (type === "major" && !loadedMajors.has(id)) {
          // 异步加载major数据
          ;(async () => {
            try {
              const majorId = id.replace("major-", "")
              const response = await api.tree.getMajorCourses(majorId)
              if (response.data && response.data.length > 0) {
                setMajorCourses((prev) => {
                  const newMap = new Map(prev)
                  newMap.set(id, response.data!)
                  return newMap
                })
                setLoadedMajors((prev) => new Set(prev).add(id))
              } else if (response.data && response.data.length === 0) {
                setLoadedMajorsWithNoCourses((prev) => new Set(prev).add(id))
                setLoadedMajors((prev) => new Set(prev).add(id))
              }
            } finally {
              loadingCount++
              if (loadingCount === totalToLoad) {
                setIsDataLoading(false)
              }
            }
          })()
        }
      })
    }
  }, [searchTerm, searchResults, expandedNodes, loadedDepartments, loadedMajors])



  const matchingNodeIds = React.useMemo(() => {
    if (!searchTerm.trim() || searchResults.length === 0) return undefined
    return new Set(searchResults.map(({ node }) => node.id))
  }, [searchTerm, searchResults])

  const pathNodeIds = React.useMemo(() => {
    if (!searchTerm.trim() || searchResults.length === 0) return undefined
    const paths = new Set<string>()
    searchResults.forEach(({ path }) => {
      path.forEach((node) => paths.add(node.id))
    })
    return paths
  }, [searchTerm, searchResults])

  const firstMatchId = React.useMemo(() => {
    if (!matchingNodeIds || matchingNodeIds.size === 0) return null
    return Array.from(matchingNodeIds)[0]
  }, [matchingNodeIds])

  // 判断节点是否应该显示（搜索时）
  const shouldShowNode = React.useCallback((node: TreeNode): boolean => {
    // 如果没有搜索词，显示所有节点
    if (!searchTerm.trim() || !matchingNodeIds || !pathNodeIds) {
      return true
    }

    // 如果节点本身是匹配项或路径节点，显示
    if (matchingNodeIds.has(node.id) || pathNodeIds.has(node.id)) {
      return true
    }

    // 如果节点有匹配的后代，显示
    if (hasMatchingDescendant(node, matchingNodeIds)) {
      return true
    }

    return false
  }, [searchTerm, matchingNodeIds, pathNodeIds])

  return (
    <>
      {/* 展开/收起按钮 - 压在顶部边框中间 */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-card border border-border rounded-full shadow-md hover:bg-primary hover:border-primary transition-all flex items-center justify-center group"
          aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {isCollapsed ? (
            <ChevronsRight className="text-primary group-hover:text-primary-foreground transition-colors" style={{ width: '21px', height: '21px' }} />
          ) : (
            <ChevronsLeft className="text-primary group-hover:text-primary-foreground transition-colors" style={{ width: '21px', height: '21px' }} />
          )}
        </button>
      )}



      {/* 收起状态下显示搜索图标和一级节点图标 */}
      {isCollapsed && (
        <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl p-2 h-full flex flex-col items-center">
          {/* 搜索图标 */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="w-12 h-12 flex items-center justify-center hover:bg-primary rounded-md transition-all group flex-shrink-0"
              aria-label="展开侧边栏"
            >
              <Search className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors" />
            </button>
          )}

          {/* 分隔线 */}
          {treeData.children && treeData.children.length > 0 && (
            <div className="w-full h-px bg-border my-2 flex-shrink-0" />
          )}

          {/* 一级节点图标列表 - 可滚动区域 */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col items-center gap-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent py-2 px-1">
            {treeData.children?.map((child) => {
              const Icon = getIcon(child.type)
              const isSelected = selectedNode?.id === child.id
              const isStarred = child.isStarred || false

              return (
                <div key={child.id} className="relative flex-shrink-0">
                  <button
                    onClick={() => onNodeSelect(child)}
                    className={cn(
                      "w-12 h-12 flex items-center justify-center rounded-md transition-all group",
                      isSelected
                        ? "bg-primary text-white shadow-md"
                        : "hover:bg-primary text-muted-foreground hover:text-white hover:shadow-md"
                    )}
                    aria-label={child.name}
                    title={child.name}
                  >
                    <Icon className="w-5 h-5 transition-colors" />
                  </button>
                  {isStarred && (
                    <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-yellow-500 rounded-full border border-card shadow-sm" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className={cn("rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl p-6", isCollapsed && "hidden")}>
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="快速查找"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 bg-white/40 backdrop-blur-sm border-primary/20 focus:border-primary/50"
              />
              {searchTerm && !isSearching && (
                <button
                  onClick={() => {
                    setSearchTerm("")
                    clearSearch()
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="清空搜索"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
            </div>

            {onAddSchool && (
              <Dialog open={isAddSchoolDialogOpen} onOpenChange={setIsAddSchoolDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="flex-shrink-0 hover:bg-primary/10 disabled:opacity-100 disabled:cursor-not-allowed"
                    aria-label="新增学校/工作坊"
                    disabled={isDataLoading || isSearching}
                  >
                    {isDataLoading || isSearching ? (
                      <div className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-5 h-5 text-primary" />
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>新增学校/工作坊</DialogTitle>
                    <DialogDescription>填写基本信息，创建新的学校或工作坊节点</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="school-name">名称</Label>
                      <Input
                        id="school-name"
                        placeholder="例如：齐齐哈尔工程学院"
                        value={newSchoolName}
                        onChange={(e) => setNewSchoolName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="school-desc">简介</Label>
                      <Textarea
                        id="school-desc"
                        placeholder="简要描述学校或工作坊的特色"
                        rows={3}
                        value={newSchoolDesc}
                        onChange={(e) => setNewSchoolDesc(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="gap-2" onClick={handleCreateSchool} disabled={!newSchoolName.trim()}>
                      <Plus className="w-4 h-4" />
                      创建
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {treeData.children?.filter(shouldShowNode).map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={0}
              onSelect={onNodeSelect}
              selectedNodeId={selectedNode?.id || null}
              expandedNodes={expandedNodes}
              onToggleExpand={handleToggleExpand}
              visibleCourseCounts={visibleCourseCounts}
              onLoadMoreCourses={handleLoadMoreCourses}
              searchTerm={searchTerm}
              isSearching={isSearching}
              currentSchoolId={currentSchoolId || null}
              onSetCurrentSchool={onSetCurrentSchool}
              onToggleStar={handleToggleStar}
              matchingNodeIds={matchingNodeIds}
              pathNodeIds={pathNodeIds}
              isFirstMatch={child.id === firstMatchId}
              departmentMajors={departmentMajors}
              majorCourses={majorCourses}
              loadedMajorsWithNoCourses={loadedMajorsWithNoCourses}
            />
          ))}
        </div>
      </div>
    </>
  )
})
