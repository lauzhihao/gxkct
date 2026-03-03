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
import { cn, extractNumericId } from "@/shared/utils/utils"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/shared/components/ui/tooltip"
import { Spinner } from "@/shared/components/ui/spinner"
import type { TreeNode } from "@/types"
import { useTreeSearch } from "@/shared/hooks/use-tree-search"
import { useDepartmentMajors } from "@/modules/departments/hooks/use-department-majors"
import { PermissionGate } from "@/shared/components/permission-gate"
import { getCourseCache } from "@/shared/utils/course-cache"
import { WorkshopCreateDialog } from "@/components/workshop-create-dialog"

const CREATE_SCHOOL_ACTION = "root.college.create"
const CREATE_SCHOOL_CONTEXT = { scope: "root" } as const

function highlightText(text: string, searchTerm: string): React.ReactNode {
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

function hasMatchingDescendant(node: TreeNode, matchingIds: Set<string>): boolean {
  if (matchingIds.has(node.nodeId)) return true
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
}: TreeNodeProps): ReactElement {
  // 如果是department节点，合并动态加载的专业数据
  let actualChildren = node.children || []
  if (node.nodeType === "department" && departmentMajors?.has(node.nodeId)) {
    const loadedMajors = departmentMajors.get(node.nodeId) || []
    actualChildren = loadedMajors
  }

  // major节点直接使用 tree 接口返回的 children，不需要额外加载替换

  // department节点应该始终显示展开箭头（可能需要动态加载）
  // major节点和其他节点根据实际children判断
  const hasChildren = node.nodeType === "department"
    ? true  // department节点始终可展开（会动态加载专业）
    : (actualChildren && actualChildren.length > 0)

  const isExpanded = expandedNodes.has(node.nodeId)
  const isSelected = selectedNodeId === node.nodeId
  const isStarred = node.isStarred || false

  const nodeRef = React.useRef<HTMLButtonElement>(null)

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
    if (matchingNodeIds.has(node.nodeId)) {
      // 不过滤，显示所有子节点
    } else {
      // 如果当前节点不是匹配项，只显示包含匹配项的子节点
      displayChildren = displayChildren.filter(
        (child) =>
          matchingNodeIds.has(child.nodeId) || pathNodeIds.has(child.nodeId) || hasMatchingDescendant(child, matchingNodeIds),
      )
    }
  } else if (node.nodeType === "major" && hasChildren) {
    if (!searchTerm.trim()) {
      const visibleCount = visibleCourseCounts.get(node.nodeId) || 5
      const totalCourses = actualChildren.length

      if (totalCourses > visibleCount) {
        displayChildren = actualChildren.slice(0, visibleCount)
        showLoadMore = true
        remainingCount = totalCourses - visibleCount
      }
    }
  }

  const handleClick = () => {
    if (node.nodeType === "course") {
      const courseId = String(node.id || extractNumericId(node.nodeId || ""))
      const courseCache = getCourseCache(courseId)
      const cachedManagers = (courseCache?.instructors || []).map((name) => ({ value: name, label: name }))

      if (cachedManagers.length > 0) {
        const selectedNode: TreeNode = {
          ...node,
          manager: node.manager && node.manager.length > 0 ? node.manager : cachedManagers,
          metadata: {
            ...(node.metadata || {}),
            managers:
              Array.isArray((node.metadata as { managers?: unknown })?.managers) && (node.metadata as { managers?: unknown[] }).managers?.length
                ? (node.metadata as { managers?: unknown[] }).managers
                : cachedManagers,
          },
        }
        onSelect(selectedNode)
      } else {
        onSelect(node)
      }
    } else {
      onSelect(node)
    }

    // department和major节点始终触发展开（会动态加载数据）
    // 其他节点只有在有children时才展开
    if (node.nodeType === "department" || node.nodeType === "major" || hasChildren) {
      onToggleExpand(node.nodeId)
    }
  }

  const handleLoadMore = (e: React.MouseEvent) => {
    e.stopPropagation()
    onLoadMoreCourses(node.nodeId)
  }

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggleStar) {
      onToggleStar(node.nodeId)
    }
  }

  const handleStarToggleFromKeyboard = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      e.stopPropagation()
      if (onToggleStar) {
        onToggleStar(node.nodeId)
      }
    }
  }

  const renderNodeIcon = () => {
    const iconClassName = "w-5 h-5 text-primary"

    switch (node.nodeType) {
      case "university":
        return <Building2 className={iconClassName} />
      case "department":
        return <GraduationCap className={iconClassName} />
      case "major":
        return <BookOpen className={iconClassName} />
      case "course":
      default:
        return <FileText className={iconClassName} />
    }
  }

  const nodeMetaContent = (
    <>
      {(node.nodeType === "course" || node.nodeType === "major") ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "font-medium text-foreground group-hover:text-primary transition-colors truncate cursor-pointer",
                  isSelected && "text-primary",
                )}
              >
                {highlightText(node.nodeName, searchTerm)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" align="center" className="max-w-xs">
              {node.nodeName}
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
          {highlightText(node.nodeName, searchTerm)}
        </div>
      )}
      {node.description && (
        <div className="text-xs text-muted-foreground mt-0.5 truncate">
          {highlightText(node.description, searchTerm)}
        </div>
      )}
    </>
  )

  const starButton =
    level === 0 && onToggleStar
      ? (
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
            onKeyDown={handleStarToggleFromKeyboard}
          >
            <Star className={cn("w-5 h-5 transition-all", isStarred && "fill-yellow-500")} />
          </div>
        )
      : null

  const loadMoreButton =
    showLoadMore
      ? (
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
        )
      : null

  const childrenContent =
    isExpanded
      ? (
          <div className="mt-2 space-y-2">
            {displayChildren.length > 0 ? (
              displayChildren.map((child, index) => (
                <TreeNodeComponent
                  key={`${node.nodeId}-${child.nodeId || index}`}
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
                  isFirstMatch={isFirstMatch && index === 0 && matchingNodeIds?.has(child.nodeId)}
                  departmentMajors={departmentMajors}
                />
              ))
            ) : isSearching && (node.nodeType === "department" || node.nodeType === "major") ? (
              <div
                className="flex items-center gap-2 text-sm text-muted-foreground py-2"
                style={{ paddingLeft: `${16 + (level + 1) * 24}px` }}
              >
                <Spinner className="w-4 h-4" />
                <span>加载中...</span>
              </div>
            ) : null}

            {loadMoreButton}
          </div>
        )
      : null

  const iconNode = renderNodeIcon()
  const indentPadding = level * 24

  const rowContent = (
    <>
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
        {iconNode}
      </div>

      <div className="flex-1 text-left min-w-0 overflow-hidden">{nodeMetaContent}</div>

      {starButton}
    </>
  )

  const nodeButton = (
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
      {rowContent}
    </button>
  )

  const content = (
    <>
      {nodeButton}
      {childrenContent}
    </>
  )

  const treeNodeCard = <div className="select-none">{content}</div>

  return treeNodeCard
}

interface TreeViewProps {
  treeData: TreeNode | null
  onNodeSelect: (node: TreeNode | null) => void
  selectedNode: TreeNode | null
  onSelectedNodePathChange?: (path: TreeNode[]) => void
  onWorkshopCreated?: () => Promise<boolean> | void
  currentSchoolId?: string | null
  onSetCurrentSchool?: (schoolId: string) => void
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onDepartmentMajorsChange?: (majors: Map<string, TreeNode[]>) => void
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
  onSelectedNodePathChange,
  onWorkshopCreated,
  currentSchoolId,
  onSetCurrentSchool,
  onUpdateNode,
  isCollapsed = false,
  onToggleCollapse,
  onDepartmentMajorsChange,
  onToggleExpand,
}: TreeViewProps, ref): ReactElement {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["root"]))
  const [visibleCourseCounts, setVisibleCourseCounts] = useState<Map<string, number>>(new Map())
  const { searchTerm, setSearchTerm, isSearching, searchResults, clearSearch } = useTreeSearch()
  const [isCreateWorkshopDialogOpen, setIsCreateWorkshopDialogOpen] = useState(false)
  const { departmentMajors, loadedDepartments, loadDepartmentMajors } = useDepartmentMajors(onDepartmentMajorsChange)
  // 跟踪是否正在加载数据（搜索或动态加载）
  const [isDataLoading, setIsDataLoading] = useState(false)



  const handleToggleExpand = React.useCallback(async (nodeId: string) => {
    if (!treeData) {
      return
    }

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
      if (node.nodeId === targetId) return node
      if (node.children) {
        for (const child of node.children) {
          const found = findNodeById(child, targetId)
          if (found) return found
        }
      }
      return null
    }

    console.log(`[TreeView] handleToggleExpand: 开始查找nodeId=${nodeId}`)
    console.log(`[TreeView] handleToggleExpand: treeData=`, treeData ? { nodeId: treeData.nodeId, nodeType: treeData.nodeType, childrenCount: treeData.children?.length } : null)
    let node = findNodeById(treeData, nodeId)
    console.log(`[TreeView] handleToggleExpand: 在treeData中找到的node:`, node ? { nodeId: node.nodeId, nodeType: node.nodeType, nodeName: node.nodeName } : null)

    // 如果在treeData中没找到，尝试在动态加载的专业数据中查找
    if (!node) {
      for (const majors of departmentMajors.values()) {
        const found = majors.find(m => m.nodeId === nodeId)
        if (found) {
          node = found
          console.log(`[TreeView] handleToggleExpand: 在departmentMajors中找到node:`, { nodeId: node.nodeId, nodeType: node.nodeType, nodeName: node.nodeName })
          break
        }
      }
    }

    console.log(`[TreeView] handleToggleExpand: 最终node:`, node ? { nodeId: node.nodeId, nodeType: node.nodeType, nodeName: node.nodeName } : null)
    console.log(`[TreeView] handleToggleExpand: loadedDepartments.has(${nodeId}) =`, loadedDepartments.has(nodeId))

    // 如果是department节点且未加载过专业数据，则加载
    if (node && node.nodeType === "department" && !loadedDepartments.has(nodeId)) {
      setIsDataLoading(true)
      try {
        await loadDepartmentMajors(nodeId)
        onToggleExpand?.(nodeId)
      } finally {
        setIsDataLoading(false)
      }
      return
    }

    onToggleExpand?.(nodeId)

    // major节点的课程数据由 tree 接口返回，不需要额外加载
  }, [treeData, expandedNodes, loadedDepartments, departmentMajors, loadDepartmentMajors, onToggleExpand])

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

  // 处理星标切换，确保只有一个一级节点被星标
  const handleToggleStar = (nodeId: string) => {
    const rootChildren = treeData?.children
    if (!onUpdateNode || !rootChildren) return

    // 找到要切换星标的节点
    const targetNode = rootChildren.find(child => child.nodeId === nodeId)
    if (!targetNode) return

    const isCurrentlyStarred = targetNode.isStarred || false

    // 如果当前节点未被星标，则取消所有其他节点的星标，并设置当前节点为星标
    if (!isCurrentlyStarred) {
      // 取消所有一级节点的星标
      rootChildren.forEach(child => {
        if (child.isStarred) {
          onUpdateNode(child.nodeId, { isStarred: false })
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
    if (!treeData) {
      return
    }

    if (selectedNode) {
      // 当选中节点时，自动展开其所有父节点
      const findPathToNode = (root: TreeNode, targetId: string, path: string[] = []): string[] | null => {
        if (root.nodeId === targetId) {
          return path
        }
        if (root.children) {
          for (const child of root.children) {
            const result = findPathToNode(child, targetId, [...path, root.nodeId])
            if (result) return result
          }
        }
        return null
      }

      const path = findPathToNode(treeData, selectedNode.nodeId)
      if (path) {
        setExpandedNodes((prev) => {
          const newSet = new Set(prev)
          path.forEach((nodeId) => newSet.add(nodeId))
          newSet.add(selectedNode.nodeId)
          return newSet
        })
      }
    }
  }, [selectedNode, treeData])

  useEffect(() => {
    if (!treeData) {
      return
    }

    if (searchTerm.trim() && searchResults.length > 0) {
      const newExpandedNodes = new Set<string>([treeData.nodeId])

      searchResults.forEach(({ path }) => {
        path.forEach((node) => newExpandedNodes.add(node.nodeId))
      })

      setExpandedNodes(newExpandedNodes)
    }
  }, [searchTerm, searchResults, treeData])

  // 单独处理搜索结果中需要加载的数据
  useEffect(() => {
    if (!treeData) {
      return
    }

    if (searchTerm.trim() && searchResults.length > 0) {
      const nodesToLoad: Array<{ id: string; type: string }> = []

      searchResults.forEach(({ path }) => {
        path.forEach((node) => {
          if ((node.nodeType === "department" || node.nodeType === "major") && !expandedNodes.has(node.nodeId)) {
            nodesToLoad.push({ id: node.nodeId, type: node.nodeType })
          }
        })
      })

      if (nodesToLoad.length === 0) {
        return
      }

      setIsDataLoading(true)
      let loadingCount = 0
      const totalToLoad = nodesToLoad.length

      // 只加载 department 节点的专业数据，major 节点的课程由 tree 接口返回
      const departmentsToLoad = nodesToLoad.filter(({ id, type }) => type === "department" && !loadedDepartments.has(id))

      if (departmentsToLoad.length === 0) {
        setIsDataLoading(false)
        return
      }

      nodesToLoad.forEach(({ id, type }) => {
        if (type === "department" && !loadedDepartments.has(id)) {
          loadDepartmentMajors(id).finally(() => {
            loadingCount++
            if (loadingCount === totalToLoad) {
              setIsDataLoading(false)
            }
          })
        } else {
          loadingCount++
          if (loadingCount === totalToLoad) {
            setIsDataLoading(false)
          }
        }
      })
    }
  }, [
    searchTerm,
    searchResults,
    expandedNodes,
    loadedDepartments,
    loadDepartmentMajors,
    treeData,
  ])



  // 获取选中节点的完整路径（用于折叠状态显示）
  const selectedNodePath = React.useMemo(() => {
    if (!treeData) return []
    if (!selectedNode || !treeData.children) return []

    const findPathWithNodes = (
      nodes: TreeNode[],
      targetId: string,
      currentPath: TreeNode[]
    ): TreeNode[] | null => {
      for (const node of nodes) {
        const newPath = [...currentPath, node]

        if (node.nodeId === targetId) {
          return newPath
        }

        // 获取子节点（考虑动态加载的数据）
        let children = node.children || []
        if (node.nodeType === "department" && departmentMajors.has(node.nodeId)) {
          children = departmentMajors.get(node.nodeId) || []
        }

        if (children.length > 0) {
          const result = findPathWithNodes(children, targetId, newPath)
          if (result) return result
        }
      }
      return null
    }

    return findPathWithNodes(treeData.children, selectedNode.nodeId, []) || []
  }, [selectedNode, treeData, departmentMajors])

  useEffect(() => {
    onSelectedNodePathChange?.(selectedNodePath)
  }, [onSelectedNodePathChange, selectedNodePath])

  const matchingNodeIds = React.useMemo(() => {
    if (!searchTerm.trim() || searchResults.length === 0) return undefined
    return new Set(searchResults.map(({ node }) => node.nodeId))
  }, [searchTerm, searchResults])

  const pathNodeIds = React.useMemo(() => {
    if (!searchTerm.trim() || searchResults.length === 0) return undefined
    const paths = new Set<string>()
    searchResults.forEach(({ path }) => {
      path.forEach((node) => paths.add(node.nodeId))
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
    if (matchingNodeIds.has(node.nodeId) || pathNodeIds.has(node.nodeId)) {
      return true
    }

    // 如果节点有匹配的后代，显示
    if (hasMatchingDescendant(node, matchingNodeIds)) {
      return true
    }

    return false
  }, [searchTerm, matchingNodeIds, pathNodeIds])

  // 如果treeData为null,返回空状态
  if (!treeData) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <div className="text-muted-foreground">暂无数据</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 收起状态下显示搜索图标和选中路径首字 */}
      {isCollapsed && (
        <div className="rounded-t-xl border border-b-0 border-border bg-card/30 backdrop-blur-md shadow-2xl p-2 flex-1 min-h-0 flex flex-col items-center">
          {/* 搜索图标 - 点击展开侧边栏 */}
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
          {selectedNodePath.length > 0 && (
            <div className="w-full h-px bg-border my-2 flex-shrink-0" />
          )}

          {/* 选中路径首字列表 */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col items-center gap-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent py-2 px-1">
            {selectedNodePath.map((node) => {
              const isCurrentSelected = selectedNode?.nodeId === node.nodeId
              const firstChar = node.nodeName.charAt(0)

              return (
                <TooltipProvider key={node.nodeId}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onNodeSelect(node)}
                        className={cn(
                          "w-10 h-10 flex items-center justify-center rounded-full transition-all text-sm font-medium flex-shrink-0",
                          isCurrentSelected
                            ? "bg-primary text-white shadow-md"
                            : "bg-card/60 text-foreground hover:bg-primary/20 hover:shadow-sm border border-border/50"
                        )}
                        aria-label={node.nodeName}
                      >
                        {firstChar}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center">
                      {node.nodeName}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
        </div>
      )}

      {!isCollapsed && (
      <div className="rounded-t-xl border border-b-0 border-border bg-card/30 backdrop-blur-md shadow-2xl p-6 flex-1 min-h-0 overflow-y-auto">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 h-9">
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
                  <Spinner className="w-4 h-4 text-primary" />
                </div>
              )}
            </div>

            {onWorkshopCreated && (
              <PermissionGate action={CREATE_SCHOOL_ACTION} context={CREATE_SCHOOL_CONTEXT}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="flex-shrink-0 hover:bg-primary/10 disabled:opacity-100 disabled:cursor-not-allowed"
                  aria-label="新增学校/工作坊"
                  disabled={isDataLoading || isSearching}
                  onClick={() => setIsCreateWorkshopDialogOpen(true)}
                >
                  {isDataLoading || isSearching ? (
                    <Spinner className="w-5 h-5 text-primary" />
                  ) : (
                    <Plus className="w-5 h-5 text-primary" />
                  )}
                </Button>
              </PermissionGate>
            )}

            {onWorkshopCreated && (
              <WorkshopCreateDialog
                open={isCreateWorkshopDialogOpen}
                onOpenChange={setIsCreateWorkshopDialogOpen}
                onWorkshopCreated={onWorkshopCreated}
              />
            )}
          </div>

          {/* 搜索无结果提示 */}
          {searchTerm.trim() && !isSearching && searchResults.length === 0 && (
            <div className="mt-2 text-sm text-muted-foreground text-center py-2">
              未找到包含&quot;{searchTerm}&quot;的节点
            </div>
          )}
        </div>

        <div className="space-y-2">
          {treeData.children?.filter(shouldShowNode).map((child) => (
            <TreeNodeComponent
              key={child.nodeId}
              node={child}
              level={0}
              onSelect={onNodeSelect}
              selectedNodeId={selectedNode?.nodeId || null}
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
              isFirstMatch={child.nodeId === firstMatchId}
              departmentMajors={departmentMajors}
            />
          ))}
        </div>
      </div>
      )}

      {/* 展开/收起按钮 - 位于容器底部 */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="w-full h-8 bg-card border border-border border-t-0 rounded-b-xl shadow-md hover:bg-primary hover:border-primary transition-all flex items-center justify-center group flex-shrink-0"
          aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {isCollapsed ? (
            <ChevronsRight className="text-primary group-hover:text-primary-foreground transition-colors" style={{ width: '21px', height: '21px' }} />
          ) : (
            <ChevronsLeft className="text-primary group-hover:text-primary-foreground transition-colors" style={{ width: '21px', height: '21px' }} />
          )}
        </button>
      )}
    </div>
  )
})
