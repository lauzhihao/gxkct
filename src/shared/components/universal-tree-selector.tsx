"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Search, ChevronRight, ChevronDown } from "lucide-react"
import { Spinner } from "@/shared/components/ui/spinner"
import { cn } from "@/shared/utils/utils"
import type { NodeType, TreeNode } from "@/types"
import { api } from "@/lib/api"

const typeLabels: Record<NodeType, string> = {
  root: "根节点",
  university: "学校",
  department: "院系",
  major: "专业",
  course: "课程",
}

interface UniversalTreeSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (selected: TreeNode | TreeNode[]) => void
  mode?: "single" | "multiple"
  title?: string
  description?: string
  treeData?: TreeNode | null
  filterTypes?: NodeType[]
  initialSelectedIds?: string[]
  rootType?: "university" | "department" | "major"
  rootId?: string | number
}

const DEFAULT_ROOT_ID = "root"

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

function highlightText(text: string, keyword: string): ReactNode {
  if (!keyword.trim()) return text
  const regex = new RegExp(`(${escapeRegExp(keyword.trim())})`, "gi")
  const normalized = keyword.trim().toLowerCase()
  return text.split(regex).map((part, index) =>
    part.toLowerCase() === normalized ? (
      <mark key={`${part}-${index}`} className="bg-primary/10 text-primary px-0.5">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  )
}

function findNodeById(node: TreeNode | null, targetId: string): TreeNode | null {
  if (!node) return null
  if (node.nodeId === targetId) return node
  if (!node.children) return null
  for (const child of node.children) {
    const found = findNodeById(child, targetId)
    if (found) return found
  }
  return null
}

function filterTree(
  node: TreeNode,
  keyword: string,
  getChildren: (node: TreeNode) => TreeNode[],
  pathMatches: Set<string>,
): TreeNode | null {
  const lower = keyword.toLowerCase()
  const matches = node.nodeName.toLowerCase().includes(lower)
  const children = getChildren(node)
  if (children.length === 0) {
    if (matches) {
      pathMatches.add(node.nodeId)
      return node
    }
    return null
  }
  const filteredChildren = children
    .map((child) => filterTree(child, keyword, getChildren, pathMatches))
    .filter((child): child is TreeNode => child !== null)
  if (matches || filteredChildren.length > 0 || pathMatches.has(node.nodeId)) {
    pathMatches.add(node.nodeId)
    return { ...node, children: filteredChildren }
  }
  return null
}

export function UniversalTreeSelector({
  open,
  onOpenChange,
  onConfirm,
  mode = "multiple",
  title = "选择组织节点",
  description = "请选择一个或多个组织节点",
  treeData,
  filterTypes,
  initialSelectedIds = [],
  rootId = DEFAULT_ROOT_ID,
}: UniversalTreeSelectorProps) {
  const [internalTree, setInternalTree] = useState<TreeNode | null>(treeData || null)
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [searchResults, setSearchResults] = useState<TreeNode | null>(null)
  const [searchMatchedIds, setSearchMatchedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (treeData) {
      setInternalTree(treeData)
    }
  }, [treeData])

  useEffect(() => {
    const loadTree = async () => {
      if (!open || treeData || internalTree) return
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.tree.getTree()
        if (response.data) {
          setInternalTree(response.data)
        } else if (response.error) {
          setError(response.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载组织数据失败")
      } finally {
        setIsLoading(false)
      }
    }

    loadTree()
  }, [open, treeData, internalTree])

  useEffect(() => {
    if (open) {
      setSearchQuery("")
      setSelectedIds(initialSelectedIds)
      setSearchResults(null)
      setSearchMatchedIds(new Set())
    }
  }, [open, initialSelectedIds])

  const normalizedRootId = String(rootId ?? DEFAULT_ROOT_ID)

  const displayRoot = useMemo(() => {
    if (!internalTree) return null
    // 如果 internalTree 本身就是虚拟根节点（nodeType="root"），直接使用它
    if (internalTree.nodeType === "root") {
      return internalTree
    }
    // 否则尝试查找指定的节点
    const targetNode = findNodeById(internalTree, normalizedRootId)
    return targetNode || internalTree
  }, [internalTree, normalizedRootId])

  useEffect(() => {
    if (open && displayRoot) {
      setExpandedIds(new Set([displayRoot.nodeId]))
    }
  }, [open, displayRoot])

  const getChildren = useCallback(
    (node: TreeNode): TreeNode[] => {
      // 直接使用节点本身的 children（树已完全加载）
      return node.children || []
    },
    [],
  )

  // 基于本地树数据进行搜索过滤
  const handleSearch = useCallback(() => {
    const keyword = searchQuery.trim()

    if (!keyword) {
      setSearchResults(null)
      setSearchMatchedIds(new Set())
      return
    }

    if (!displayRoot) return

    const matchedPathIds = new Set<string>()
    const filtered = filterTree(displayRoot, keyword, getChildren, matchedPathIds)

    if (filtered) {
      setSearchResults(filtered)
      setSearchMatchedIds(matchedPathIds)
    } else {
      setSearchResults(null)
      setSearchMatchedIds(new Set())
    }
  }, [searchQuery, displayRoot, getChildren])

  const { filteredTree, matchedIds } = useMemo(() => {
    // 如果有搜索结果，使用搜索结果；否则使用原始树
    const rootToUse = searchResults || displayRoot
    if (!rootToUse) return { filteredTree: null, matchedIds: new Set<string>() }

    const allowedTypes = filterTypes ? new Set(filterTypes) : null
    const applyFilter = (
      node: TreeNode,
      isRootNode = false,
      useActualChildren = true,
    ): TreeNode | null => {
      const typeAllowed = allowedTypes ? allowedTypes.has(node.nodeType) : true
      if (!typeAllowed && !isRootNode) {
        const keptChildren = (useActualChildren ? getChildren(node) : node.children || [])
          .map((child) => applyFilter(child, false, useActualChildren))
          .filter((child): child is TreeNode => child !== null)
        return keptChildren.length > 0 ? { ...node, children: keptChildren } : null
      }
      const children = useActualChildren ? getChildren(node) : node.children || []
      if (children.length > 0) {
        const normalizedChildren = children
          .map((child) => applyFilter(child, false, useActualChildren))
          .filter((child): child is TreeNode => child !== null)
        return { ...node, children: normalizedChildren }
      }
      return node
    }

    const matchedPathIds = searchResults ? searchMatchedIds : new Set<string>()
    return { filteredTree: applyFilter(rootToUse, true), matchedIds: matchedPathIds }
  }, [displayRoot, filterTypes, searchResults, getChildren, searchMatchedIds])

  useEffect(() => {
    if (searchResults) {
      // 有搜索结果时，展开搜索结果的根节点
      setExpandedIds(new Set([searchResults.nodeId]))
    } else if (!searchQuery.trim()) {
      setExpandedIds((prev) => (prev.size === 0 && displayRoot ? new Set([displayRoot.nodeId]) : prev))
    }
  }, [searchResults, displayRoot, searchQuery])

  useEffect(() => {
    if (open && displayRoot && !searchQuery.trim()) {
      setExpandedIds(new Set([displayRoot.nodeId]))
    }
  }, [open, displayRoot, searchQuery])

  const collectDescendantIds = useCallback((node: TreeNode): string[] => {
    const ids = [node.nodeId]
    getChildren(node).forEach((child) => {
      ids.push(...collectDescendantIds(child))
    })
    return ids
  }, [getChildren])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const isFullySelected = useCallback((node: TreeNode, set: Set<string>): boolean => {
    return collectDescendantIds(node).every((id) => set.has(id))
  }, [collectDescendantIds])

  const isPartiallySelected = useCallback((node: TreeNode, set: Set<string>): boolean => {
    const ids = collectDescendantIds(node)
    const selectedCount = ids.filter((id) => set.has(id)).length
    return selectedCount > 0 && selectedCount < ids.length
  }, [collectDescendantIds])

  const handleSelect = (node: TreeNode) => {
    if (mode === "single") {
      setSelectedIds([node.nodeId])
      return
    }

    setSelectedIds((prev) => {
      const selectedSet = new Set(prev)
      const descendantIds = collectDescendantIds(node)
      const shouldDeselect = descendantIds.every((id) => selectedSet.has(id))

      if (shouldDeselect) {
        descendantIds.forEach((id) => selectedSet.delete(id))
      } else {
        descendantIds.forEach((id) => selectedSet.add(id))
      }
      return Array.from(selectedSet)
    })
  }

  const handleToggleExpand = (node: TreeNode) => {
    // 树数据在弹窗打开时已经一次性加载，此处仅更新本地展开状态
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(node.nodeId)) {
        next.delete(node.nodeId)
      } else {
        next.add(node.nodeId)
      }
      return next
    })
  }

  const collectSelectedNodes = (node: TreeNode | null, selected: Set<string>, acc: TreeNode[]) => {
    if (!node) return
    if (selected.has(node.nodeId)) {
      acc.push(node)
    }
    getChildren(node).forEach((child) => collectSelectedNodes(child, selected, acc))
  }

  const handleConfirm = () => {
    const result: TreeNode[] = []
    collectSelectedNodes(displayRoot, new Set(selectedIds), result)
    if (mode === "single") {
      onConfirm(result[0] || null)
    } else {
      onConfirm(result)
    }
    onOpenChange(false)
  }

  const handleCancel = () => {
    setSearchQuery("")
    setSelectedIds(initialSelectedIds)
    setSearchMatchedIds(new Set())
    onOpenChange(false)
  }

  const shouldShowToggle = (node: TreeNode, childrenCount: number): boolean => {
    // 课程节点：只有有子节点时才显示折叠按钮
    if (node.nodeType === "course") {
      return childrenCount > 0
    }
    // 院系及其他类型节点统一根据子节点数量判断
    return childrenCount > 0
  }

  const renderTree = (node: TreeNode, level = 0): ReactNode => {
    const actualChildren = getChildren(node)

    // 对于虚拟根节点（type="root"），直接渲染其 children，不渲染节点本身
    if (node.nodeType === "root" && level === 0) {
      return (
        <div key={node.nodeId} className="space-y-1">
          {actualChildren.map((child) => renderTree(child, level))}
        </div>
      )
    }

    const searchActive = Boolean(searchResults)
    const autoExpanded = searchActive ? matchedIds.has(node.nodeId) : displayRoot?.nodeId === node.nodeId
    const userExpanded = expandedIds.has(node.nodeId)
    const isExpanded = autoExpanded || userExpanded
    const filteredChildren = node.children || []
    const childrenToRender = searchActive && !userExpanded ? filteredChildren : actualChildren
    const shouldRenderChildren = childrenToRender.length > 0 && (isExpanded || searchActive)
    const indent = level * 16
    const content = (
      <div key={node.nodeId} className="space-y-1">
        <div
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1 text-sm",
            selectedIds.includes(node.nodeId) ? "bg-primary/10" : "hover:bg-muted/50",
          )}
          style={{ paddingLeft: `${indent}px` }}
        >
          {shouldShowToggle(node, actualChildren.length) ? (
            <button
              type="button"
              className="text-muted-foreground"
              onClick={() => handleToggleExpand(node)}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {mode === "single" ? (
            <RadioGroupItem value={node.nodeId} id={`node-${node.nodeId}`} onClick={() => handleSelect(node)} />
          ) : (
            <Checkbox
              id={`node-${node.nodeId}`}
              checked={
                isFullySelected(node, selectedSet)
                  ? true
                  : isPartiallySelected(node, selectedSet)
                    ? "indeterminate"
                    : false
              }
              onCheckedChange={() => handleSelect(node)}
            />
          )}

          <label
            htmlFor={`node-${node.nodeId}`}
            className="cursor-pointer flex-1 truncate"
            onClick={() => handleSelect(node)}
          >
            {highlightText(node.nodeName, searchQuery)}
          </label>
          <span className="text-xs text-muted-foreground">{typeLabels[node.nodeType] || node.nodeType}</span>
        </div>
        {shouldRenderChildren && (
          <div className="space-y-1">
            {childrenToRender.map((child) => renderTree(child, level + 1))}
          </div>
        )}
      </div>
    )
    return content
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Input
              placeholder="搜索节点或路径..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch()
                }
              }}
              className="pl-9 pr-9"
            />
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleSearch()}
            >
              <Search className="w-4 h-4" />
            </button>
            {searchQuery && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearchQuery("")
                  setSearchResults(null)
                  setSearchMatchedIds(new Set())
                }}
              >
                ×
              </button>
            )}
          </div>

          <ScrollArea className="h-96 border rounded-lg p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="w-5 h-5" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">{error}</div>
            ) : filteredTree ? (
              mode === "single" ? (
                <RadioGroup value={selectedIds[0] || ""} onValueChange={(val) => {
                  const node = findNodeById(filteredTree, val)
                  if (node) handleSelect(node)
                }}>
                  {renderTree(filteredTree)}
                </RadioGroup>
              ) : (
                renderTree(filteredTree)
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">暂无符合条件的节点</div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.length === 0}>
            {mode === "single" ? "确认" : `确认 (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
