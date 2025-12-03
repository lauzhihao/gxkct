"use client"

import React, { useState, useEffect } from "react"
import type { ReactElement } from "react"
import {
  ChevronRight,
  ChevronDown,
  Building2,
  GraduationCap,
  BookOpen,
  FileText,
  Search,
  X,
} from "lucide-react"
import { cn } from "@/shared/utils/utils"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import type { TreeNode } from "@/types"
import { useTreeSearch } from "@/shared/hooks/use-tree-search"
import { useDepartmentMajors } from "@/modules/departments/hooks/use-department-majors"
import { useMajorCourses } from "@/modules/majors/hooks/use-major-courses"
import { useOrganizationSelector } from "@/shared/hooks/use-organization-selector"

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

interface OrganizationSelectorNodeProps {
  node: TreeNode
  level: number
  expandedNodes: Set<string>
  onToggleExpand: (nodeId: string) => void
  isSelected: (nodeId: string) => boolean
  onToggleSelect: (nodeId: string) => void
  searchTerm: string
  departmentMajors?: Map<string, TreeNode[]>
  majorCourses?: Map<string, TreeNode[]>
  loadedMajorsWithNoCourses?: Set<string>
}

function OrganizationSelectorNode({
  node,
  level,
  expandedNodes,
  onToggleExpand,
  isSelected,
  onToggleSelect,
  searchTerm,
  departmentMajors,
  majorCourses,
  loadedMajorsWithNoCourses,
}: OrganizationSelectorNodeProps): ReactElement {
  const Icon = getIcon(node.type)

  // 合并动态加载的子节点
  let actualChildren = node.children || []
  if (node.type === "department" && departmentMajors?.has(node.id)) {
    actualChildren = departmentMajors.get(node.id) || []
  }
  if (node.type === "major" && majorCourses?.has(node.id)) {
    actualChildren = majorCourses.get(node.id) || []
  }

  const hasChildren = node.type === "department"
    ? true
    : node.type === "major"
      ? !loadedMajorsWithNoCourses?.has(node.id)
      : (actualChildren && actualChildren.length > 0)

  const isExpanded = expandedNodes.has(node.id)
  const checked = isSelected(node.id)
  const indentPadding = level * 24

  const handleCheckChange = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleSelect(node.id)
  }

  const handleClick = () => {
    if (hasChildren) {
      onToggleExpand(node.id)
    }
  }

  return (
    <div className="select-none">
      <button
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-3 py-2 rounded-lg transition-all duration-200",
          "hover:bg-primary/10",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          "group",
        )}
        style={{ paddingLeft: `${16 + indentPadding}px`, paddingRight: "16px" }}
      >
        {hasChildren && (
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        )}
        {!hasChildren && <div className="w-4 flex-shrink-0" />}

        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/30"
          onClick={handleCheckChange}
        >
          <Checkbox
            checked={checked}
            onCheckedChange={() => onToggleSelect(node.id)}
            className="cursor-pointer"
          />
        </div>

        <div className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
          <Icon className="w-4 h-4 text-primary" />
        </div>

        <div className="flex-1 text-left min-w-0 overflow-hidden">
          <div className="font-medium text-foreground group-hover:text-primary transition-colors truncate text-sm">
            {node.name}
          </div>
        </div>
      </button>

      {isExpanded && actualChildren.length > 0 && (
        <div className="mt-1 space-y-1">
          {actualChildren.map((child) => (
            <OrganizationSelectorNode
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              isSelected={isSelected}
              onToggleSelect={onToggleSelect}
              searchTerm={searchTerm}
              departmentMajors={departmentMajors}
              majorCourses={majorCourses}
              loadedMajorsWithNoCourses={loadedMajorsWithNoCourses}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export interface OrganizationSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  treeData: TreeNode | null
  onConfirm: (selectedNodes: TreeNode[]) => void
  mode?: "single" | "multiple"
  title?: string
  description?: string
  initialSelected?: Set<string>
}

export function OrganizationSelector({
  open,
  onOpenChange,
  treeData,
  onConfirm,
  mode = "multiple",
  title = "选择组织架构",
  description = "选择要操作的组织架构节点",
  initialSelected,
}: OrganizationSelectorProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["root"]))
  const { searchTerm, setSearchTerm, isSearching, clearSearch } = useTreeSearch()
  const { departmentMajors, loadedDepartments, loadDepartmentMajors } = useDepartmentMajors()
  const { majorCourses, loadedMajors, loadedMajorsWithNoCourses, loadMajorCourses } = useMajorCourses()
  const { selectedIds, toggleSelect, getSelectedNodes, clearSelected } = useOrganizationSelector(
    initialSelected,
    mode,
  )

  const handleToggleExpand = async (nodeId: string) => {
    const isCurrentlyExpanded = expandedNodes.has(nodeId)

    setExpandedNodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })

    if (isCurrentlyExpanded) return

    // 查找节点
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

    let node = treeData ? findNodeById(treeData, nodeId) : null

    if (!node) {
      for (const [, majors] of departmentMajors.entries()) {
        const found = majors.find((m) => m.id === nodeId)
        if (found) {
          node = found
          break
        }
      }
    }

    if (node && node.type === "department" && !loadedDepartments.has(nodeId)) {
      await loadDepartmentMajors(nodeId)
    }

    if (node && node.type === "major" && !loadedMajors.has(nodeId)) {
      const majorId = node.id || nodeId.replace("major-", "")
      await loadMajorCourses(nodeId, majorId)
    }
  }

  const handleConfirm = () => {
    if (!treeData) return
    const selectedNodes = getSelectedNodes(treeData)
    onConfirm(selectedNodes)
    onOpenChange(false)
  }

  const handleCancel = () => {
    clearSearch()
    clearSelected()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索组织架构..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            {searchTerm && !isSearching && (
              <button
                onClick={() => clearSearch()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* 树形结构 */}
          <ScrollArea className="flex-1 border rounded-lg p-4">
            {treeData ? (
              <div className="space-y-1">
                {treeData.children?.map((child) => (
                  <OrganizationSelectorNode
                    key={child.id}
                    node={child}
                    level={0}
                    expandedNodes={expandedNodes}
                    onToggleExpand={handleToggleExpand}
                    isSelected={(id) => selectedIds.has(id)}
                    onToggleSelect={toggleSelect}
                    searchTerm={searchTerm}
                    departmentMajors={departmentMajors}
                    majorCourses={majorCourses}
                    loadedMajorsWithNoCourses={loadedMajorsWithNoCourses}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">暂无数据</div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
            确认 ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
