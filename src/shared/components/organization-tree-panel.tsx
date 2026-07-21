"use client"

import { useEffect, useMemo, useState } from "react"
import type { KeyboardEvent, MouseEvent, ReactElement } from "react"
import { BookOpen, Building2, ChevronDown, ChevronRight, FileText, GraduationCap, Search, X } from "lucide-react"
import { cn } from "@/shared/utils/utils"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Input } from "@/shared/components/ui/input"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Spinner } from "@/shared/components/ui/spinner"
import { useTreeSearch } from "@/shared/hooks/use-tree-search"
import { useDepartmentMajors } from "@/modules/departments/hooks/use-department-majors"
import { useMajorCourses } from "@/modules/majors/hooks/use-major-courses"
import type { NodeType, TreeNode } from "@/types"

const EMPTY_INITIAL_EXPANDED_IDS: string[] = []
const EMPTY_EXCLUDE_NODES: TreeNode[] = []
const UNSET_NODE_NAME = "暂未设置"

interface RuntimeTreeNodeRecord {
  [key: string]: unknown
  self?: {
    value?: unknown
    label?: unknown
    name?: unknown
  }
}

const getIcon = (type: NodeType) => {
  switch (type) {
    case "university":
      return Building2
    case "department":
      return GraduationCap
    case "major":
      return BookOpen
    case "course":
      return FileText
    case "root":
      return Building2
    default:
      return FileText
  }
}

function getTreeNodeId(node: TreeNode): string {
  if (node.id) return node.id
  if (node.nodeId) return node.nodeId
  return resolveTreeNodeId(node)
}

function getTreeNodeName(node: TreeNode): string {
  if (node.name) return node.name
  if (node.nodeName) return node.nodeName
  return resolveTreeNodeName(node)
}

function getTreeNodeType(node: TreeNode): NodeType {
  if (node.type) return node.type
  if (node.nodeType) return node.nodeType
  return resolveTreeNodeType(node)
}

function getStaticChildren(node: TreeNode): TreeNode[] {
  if (!node.children) return []
  return node.children
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmedValue = value.trim()
  if (trimmedValue.length === 0) return null
  return trimmedValue
}

function readStringOrNumber(value: unknown): string | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null
    return String(value)
  }
  return readNonEmptyString(value)
}

function getRuntimeRecord(node: TreeNode): RuntimeTreeNodeRecord {
  return node as unknown as RuntimeTreeNodeRecord
}

function resolveTreeNodeType(node: TreeNode): NodeType {
  if (node.type) return node.type
  if (node.nodeType) return node.nodeType
  throw new Error("组织节点缺少类型")
}

function resolveTreeNodeName(node: TreeNode): string {
  const record = getRuntimeRecord(node)

  const name = readNonEmptyString(node.name)
  if (name) return name

  const nodeName = readNonEmptyString(node.nodeName)
  if (nodeName) return nodeName

  const selfLabel = readNonEmptyString(record.self?.label)
  if (selfLabel) return selfLabel

  const selfName = readNonEmptyString(record.self?.name)
  if (selfName) return selfName

  const label = readNonEmptyString(record.label)
  if (label) return label

  const courseName = readNonEmptyString(record.courseName)
  if (courseName) return courseName

  const courseUnitName = readNonEmptyString(record.courseUnitName)
  if (courseUnitName) return courseUnitName

  const majorName = readNonEmptyString(record.majorName)
  if (majorName) return majorName

  const deptName = readNonEmptyString(record.deptName)
  if (deptName) return deptName

  const collegeName = readNonEmptyString(record.collegeName)
  if (collegeName) return collegeName

  return UNSET_NODE_NAME
}

function resolveTreeNodeId(node: TreeNode): string {
  const record = getRuntimeRecord(node)

  const id = readNonEmptyString(node.id)
  if (id) return id

  const nodeId = readNonEmptyString(node.nodeId)
  if (nodeId) return nodeId

  const selfValue = readStringOrNumber(record.self?.value)
  if (selfValue) return selfValue

  const value = readStringOrNumber(record.value)
  if (value) return value

  const courseId = readStringOrNumber(record.courseId)
  if (courseId) return courseId

  throw new Error("组织节点缺少可用ID")
}

function normalizeTreeNodeForDisplay(node: TreeNode): TreeNode {
  const nodeType = resolveTreeNodeType(node)
  const nodeName = resolveTreeNodeName(node)
  const id = resolveTreeNodeId(node)
  const nodeId = readNonEmptyString(node.nodeId)

  return {
    ...node,
    nodeId: nodeId ? nodeId : `${nodeType}_${id}`,
    id,
    nodeName,
    name: nodeName,
    nodeType,
    type: nodeType,
  }
}

function normalizeTreeNodesForDisplay(nodes: TreeNode[]): TreeNode[] {
  const normalizedNodes: TreeNode[] = []

  for (const node of nodes) {
    normalizedNodes.push(normalizeTreeNodeForDisplay(node))
  }

  return normalizedNodes
}

function extractNumericPart(value: string): string | null {
  const match = value.match(/\d+/)
  if (!match) return null
  const [numericPart] = match
  if (numericPart.length === 0) return null
  return numericPart
}

function getExcludeKeys(node: TreeNode): string[] {
  const nodeType = getTreeNodeType(node)
  const keys: string[] = []

  const nodeId = readNonEmptyString(node.nodeId)
  if (nodeId) {
    keys.push(`${nodeType}:nodeId:${nodeId}`)
    const numericNodeId = extractNumericPart(nodeId)
    if (numericNodeId) {
      keys.push(`${nodeType}:numeric:${numericNodeId}`)
    }
  }

  const id = readNonEmptyString(node.id)
  if (id) {
    keys.push(`${nodeType}:id:${id}`)
    const numericId = extractNumericPart(id)
    if (numericId) {
      keys.push(`${nodeType}:numeric:${numericId}`)
    }
  }

  return keys
}

function isExcludedNode(node: TreeNode, excludeKeys: Set<string>): boolean {
  const keys = getExcludeKeys(node)
  return keys.some((key) => excludeKeys.has(key))
}

interface OrganizationTreeNodeProps {
  node: TreeNode
  level: number
  expandedNodes: Set<string>
  onToggleExpand: (nodeId: string) => void
  selectedIds: Set<string>
  onToggleSelect?: (
    nodeId: string,
    cascadeIds: string[],
    checked: boolean | "indeterminate",
    node: TreeNode,
    cascadeNodes: TreeNode[],
  ) => void
  searchTerm: string
  selectable: boolean
  readOnly: boolean
  enableDynamicLoading: boolean
  isNodeSelectable?: (node: TreeNode) => boolean
  cascadeSelection: boolean
  departmentMajors: Map<string, TreeNode[]>
  majorCourses: Map<string, TreeNode[]>
  loadedMajors: Set<string>
  loadMajorCourses: (nodeId: string, majorId: string) => Promise<TreeNode[]>
  loadedMajorsWithNoCourses: Set<string>
  excludeKeys: Set<string>
  disabled: boolean
  renderNodeSuffix?: (node: TreeNode) => ReactElement | null
}

function OrganizationTreeNode({
  node,
  level,
  expandedNodes,
  onToggleExpand,
  selectedIds,
  onToggleSelect,
  searchTerm,
  selectable,
  readOnly,
  enableDynamicLoading,
  isNodeSelectable,
  cascadeSelection,
  departmentMajors,
  majorCourses,
  loadedMajors,
  loadMajorCourses,
  loadedMajorsWithNoCourses,
  excludeKeys,
  disabled,
  renderNodeSuffix,
}: OrganizationTreeNodeProps): ReactElement {
  const nodeType = getTreeNodeType(node)
  const nodeId = getTreeNodeId(node)
  const nodeName = getTreeNodeName(node)
  const Icon = getIcon(nodeType)

  let actualChildren = normalizeTreeNodesForDisplay(getStaticChildren(node))
  if (enableDynamicLoading && nodeType === "department" && departmentMajors.has(nodeId)) {
    const loadedMajors = departmentMajors.get(nodeId)
    if (loadedMajors) {
      actualChildren = normalizeTreeNodesForDisplay(loadedMajors)
    }
  }
  if (enableDynamicLoading && nodeType === "major" && majorCourses.has(nodeId)) {
    const loadedCourses = majorCourses.get(nodeId)
    if (loadedCourses) {
      actualChildren = normalizeTreeNodesForDisplay(loadedCourses)
    }
  }
  actualChildren = actualChildren.filter((child) => !isExcludedNode(child, excludeKeys))

  let hasChildren = actualChildren.length > 0
  if (enableDynamicLoading && nodeType === "department") {
    hasChildren = true
  }
  if (enableDynamicLoading && nodeType === "major" && !loadedMajorsWithNoCourses.has(nodeId)) {
    hasChildren = true
  }

  const selectableChildren = actualChildren.filter((child) => {
    if (!isNodeSelectable) return true
    return isNodeSelectable(child)
  })
  const selectableChildIds = selectableChildren.map((child) => getTreeNodeId(child))
  const selectedChildCount = selectableChildIds.filter((childId) => selectedIds.has(childId)).length
  const hasSelectableChildren = selectableChildIds.length > 0
  const isFullySelectedByChildren = hasSelectableChildren && selectedChildCount === selectableChildIds.length
  const isPartiallySelectedByChildren = hasSelectableChildren && selectedChildCount > 0 && selectedChildCount < selectableChildIds.length
  const isExpanded = expandedNodes.has(nodeId)
  let checked: boolean | "indeterminate" = selectedIds.has(nodeId)
  if (cascadeSelection && nodeType === "major" && hasSelectableChildren) {
    if (isFullySelectedByChildren) {
      checked = true
    } else if (isPartiallySelectedByChildren) {
      checked = "indeterminate"
    } else {
      checked = false
    }
  }
  const indentPadding = level * 24
  const nodeSuffix = renderNodeSuffix ? renderNodeSuffix(node) : null
  let canSelect = selectable && !readOnly && !disabled
  if (canSelect && isNodeSelectable) {
    canSelect = isNodeSelectable(node)
  }

  const handleCheckboxClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  const handleCheckboxKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  const handleCheckedChange = async () => {
    if (disabled) return
    if (!canSelect) return
    let cascadeIds = cascadeSelection ? selectableChildIds : []
    let cascadeNodes = cascadeSelection ? selectableChildren : []
    if (
      cascadeSelection &&
      checked === false &&
      nodeType === "major" &&
      enableDynamicLoading &&
      !loadedMajors.has(nodeId)
    ) {
      const loadedCourses = await loadMajorCourses(nodeId, getTreeNodeId(node))
      cascadeNodes = loadedCourses
        .filter((course) => !isExcludedNode(course, excludeKeys))
        .filter((course) => {
          if (!isNodeSelectable) return true
          return isNodeSelectable(course)
        })
      cascadeIds = cascadeNodes.map((course) => getTreeNodeId(course))
    }
    onToggleSelect?.(nodeId, cascadeIds, checked, node, cascadeNodes)
  }

  const handleClick = () => {
    if (disabled) return
    if (nodeType === "course") {
      void handleCheckedChange()
      return
    }
    if (hasChildren) {
      onToggleExpand(nodeId)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    handleClick()
  }

  const handleNameClick = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled) return
    if (nodeType !== "course") return
    event.stopPropagation()
    void handleCheckedChange()
  }

  return (
    <div className="select-none">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg py-2 transition-all duration-200",
          "hover:bg-primary/10",
          "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/50",
          disabled && "cursor-not-allowed opacity-70 hover:bg-transparent",
        )}
        style={{ paddingLeft: `${16 + indentPadding}px`, paddingRight: "16px" }}
      >
        {hasChildren ? (
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ) : (
          <div className="w-4 flex-shrink-0" />
        )}

        {canSelect && (
          <Checkbox
            checked={checked}
            onClick={handleCheckboxClick}
            onKeyDown={handleCheckboxKeyDown}
            onCheckedChange={handleCheckedChange}
            className="flex-shrink-0 cursor-pointer"
          />
        )}

        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
          <Icon className="h-4 w-4 text-primary" />
        </div>

        <div className="min-w-0 flex-1 overflow-hidden text-left" onClick={handleNameClick}>
          <div className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
            {nodeName}
          </div>
        </div>

        {renderNodeSuffix && (
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
            {nodeSuffix}
          </div>
        )}
      </div>

      {isExpanded && actualChildren.length > 0 && (
        <div className="mt-1 space-y-1">
          {actualChildren.map((child) => (
            <OrganizationTreeNode
              key={getTreeNodeId(child)}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              searchTerm={searchTerm}
              selectable={selectable}
              readOnly={readOnly}
              enableDynamicLoading={enableDynamicLoading}
              isNodeSelectable={isNodeSelectable}
              cascadeSelection={cascadeSelection}
              departmentMajors={departmentMajors}
              majorCourses={majorCourses}
              loadedMajors={loadedMajors}
              loadMajorCourses={loadMajorCourses}
              loadedMajorsWithNoCourses={loadedMajorsWithNoCourses}
              excludeKeys={excludeKeys}
              disabled={disabled}
              renderNodeSuffix={renderNodeSuffix}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export interface OrganizationTreePanelProps {
  treeData: TreeNode | null
  selectedIds?: Set<string>
  onToggleSelect?: (
    nodeId: string,
    cascadeIds: string[],
    checked: boolean | "indeterminate",
    node: TreeNode,
    cascadeNodes: TreeNode[],
  ) => void
  selectable?: boolean
  readOnly?: boolean
  showRoot?: boolean
  showSearch?: boolean
  enableDynamicLoading?: boolean
  isNodeSelectable?: (node: TreeNode) => boolean
  cascadeSelection?: boolean
  initialExpandedIds?: string[]
  excludeNodes?: TreeNode[]
  emptyText?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
  renderNodeSuffix?: (node: TreeNode) => ReactElement | null
}

export function OrganizationTreePanel({
  treeData,
  selectedIds,
  onToggleSelect,
  selectable = false,
  readOnly = false,
  showRoot = false,
  showSearch = true,
  enableDynamicLoading = true,
  isNodeSelectable,
  cascadeSelection = false,
  initialExpandedIds,
  excludeNodes,
  emptyText = "暂无数据",
  searchPlaceholder = "搜索组织架构...",
  className,
  disabled = false,
  renderNodeSuffix,
}: OrganizationTreePanelProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const { searchTerm, setSearchTerm, isSearching, clearSearch } = useTreeSearch()
  const { departmentMajors, loadedDepartments, loadDepartmentMajors } = useDepartmentMajors()
  const { majorCourses, loadedMajors, loadedMajorsWithNoCourses, loadMajorCourses } = useMajorCourses()
  const controlledSelectedIds = selectedIds instanceof Set ? selectedIds : new Set<string>()
  const initialExpandedKey = initialExpandedIds ? initialExpandedIds.join("\u0001") : ""
  const excludeNodeList = excludeNodes ? excludeNodes : EMPTY_EXCLUDE_NODES
  const stableInitialExpandedIds = useMemo(() => {
    if (initialExpandedKey.length === 0) return EMPTY_INITIAL_EXPANDED_IDS
    return initialExpandedKey.split("\u0001")
  }, [initialExpandedKey])
  const excludeKeys = useMemo(() => {
    return new Set(excludeNodeList.flatMap((node) => getExcludeKeys(node)))
  }, [excludeNodeList])

  useEffect(() => {
    const nextExpanded = new Set<string>()
    if (stableInitialExpandedIds.length > 0) {
      stableInitialExpandedIds.forEach((id) => nextExpanded.add(id))
    }
    if (showRoot && treeData) {
      nextExpanded.add(getTreeNodeId(treeData))
    }
    setExpandedNodes(nextExpanded)
  }, [initialExpandedKey, showRoot, stableInitialExpandedIds, treeData])

  const findNodeById = (node: TreeNode, targetId: string): TreeNode | null => {
    if (getTreeNodeId(node) === targetId) return node
    const children = getStaticChildren(node)
    for (const child of children) {
      const found = findNodeById(child, targetId)
      if (found) return found
    }
    return null
  }

  const handleToggleExpand = async (nodeId: string) => {
    if (disabled) return
    const isCurrentlyExpanded = expandedNodes.has(nodeId)

    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })

    if (isCurrentlyExpanded) return
    if (!enableDynamicLoading) return
    if (!treeData) return

    let node = findNodeById(treeData, nodeId)
    if (!node) {
      for (const [, majors] of departmentMajors.entries()) {
        const found = majors.find((major) => getTreeNodeId(major) === nodeId)
        if (found) {
          node = found
          break
        }
      }
    }

    if (node && getTreeNodeType(node) === "department" && !loadedDepartments.has(nodeId)) {
      await loadDepartmentMajors(nodeId)
    }

    if (node && getTreeNodeType(node) === "major" && !loadedMajors.has(nodeId)) {
      await loadMajorCourses(nodeId, getTreeNodeId(node))
    }
  }

  const renderNodes = () => {
    if (!treeData) {
      return <div className="py-8 text-center text-muted-foreground">{emptyText}</div>
    }

    if (showRoot) {
      if (isExcludedNode(treeData, excludeKeys)) {
        return <div className="py-8 text-center text-muted-foreground">{emptyText}</div>
      }

      return (
        <OrganizationTreeNode
          node={treeData}
          level={0}
          expandedNodes={expandedNodes}
          onToggleExpand={handleToggleExpand}
          selectedIds={controlledSelectedIds}
          onToggleSelect={onToggleSelect}
          searchTerm={searchTerm}
          selectable={selectable}
          readOnly={readOnly}
          enableDynamicLoading={enableDynamicLoading}
          isNodeSelectable={isNodeSelectable}
          cascadeSelection={cascadeSelection}
          departmentMajors={departmentMajors}
          majorCourses={majorCourses}
          loadedMajors={loadedMajors}
          loadMajorCourses={loadMajorCourses}
          loadedMajorsWithNoCourses={loadedMajorsWithNoCourses}
          excludeKeys={excludeKeys}
          disabled={disabled}
          renderNodeSuffix={renderNodeSuffix}
        />
      )
    }

    const children = normalizeTreeNodesForDisplay(getStaticChildren(treeData))
      .filter((child) => !isExcludedNode(child, excludeKeys))
    if (children.length === 0) {
      return <div className="py-8 text-center text-muted-foreground">{emptyText}</div>
    }

    return children.map((child) => (
      <OrganizationTreeNode
        key={getTreeNodeId(child)}
        node={child}
        level={0}
        expandedNodes={expandedNodes}
        onToggleExpand={handleToggleExpand}
        selectedIds={controlledSelectedIds}
        onToggleSelect={onToggleSelect}
        searchTerm={searchTerm}
        selectable={selectable}
        readOnly={readOnly}
        enableDynamicLoading={enableDynamicLoading}
        isNodeSelectable={isNodeSelectable}
        cascadeSelection={cascadeSelection}
        departmentMajors={departmentMajors}
        majorCourses={majorCourses}
        loadedMajors={loadedMajors}
        loadMajorCourses={loadMajorCourses}
        loadedMajorsWithNoCourses={loadedMajorsWithNoCourses}
        excludeKeys={excludeKeys}
        disabled={disabled}
        renderNodeSuffix={renderNodeSuffix}
      />
    ))
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4", className)}>
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            disabled={disabled}
            className="pl-9"
          />
          {searchTerm && !isSearching && (
            <button
              type="button"
              onClick={() => clearSearch()}
              disabled={disabled}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground",
                disabled && "cursor-not-allowed opacity-60 hover:text-muted-foreground",
              )}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner className="h-4 w-4" />
            </div>
          )}
        </div>
      )}

      <ScrollArea className="min-h-[320px] flex-1 rounded-lg border p-4">{renderNodes()}</ScrollArea>
    </div>
  )
}
