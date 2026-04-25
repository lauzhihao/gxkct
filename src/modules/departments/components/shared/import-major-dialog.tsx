"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowRight, Upload } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { OrganizationTreePanel } from "@/shared/components/organization-tree-panel"
import type { TreeNode } from "@/types"

const EMPTY_SELECTED_IDS = new Set<string>()
const SOURCE_INITIAL_EXPANDED_IDS = ["root"]

interface ImportMajorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  treeData: TreeNode | null
  currentDepartment: TreeNode
}

type TargetTreeState =
  | {
      status: "ready"
      tree: TreeNode
      school: TreeNode
      department: TreeNode
    }
  | {
      status: "error"
      message: string
    }

function getPanelNodeId(node: TreeNode): string {
  if (node.id) return node.id
  if (node.nodeId) return node.nodeId
  throw new Error("组织节点缺少可用ID")
}

function getNodeKey(node: TreeNode): string {
  if (node.id) return node.id
  if (node.nodeId) return node.nodeId
  throw new Error("组织节点缺少可用ID")
}

function isSameBusinessNode(candidate: TreeNode, target: TreeNode): boolean {
  if (candidate.nodeId === target.nodeId) return true
  if (candidate.id) {
    if (target.id) {
      if (candidate.id === target.id && candidate.nodeType === target.nodeType) return true
    }
  }
  return false
}

function findNodePath(root: TreeNode, target: TreeNode): TreeNode[] | null {
  if (isSameBusinessNode(root, target)) return [root]

  if (!root.children) return null

  for (const child of root.children) {
    const childPath = findNodePath(child, target)
    if (childPath) {
      return [root, ...childPath]
    }
  }

  return null
}

function findNodeByKey(root: TreeNode, targetKey: string): TreeNode | null {
  if (getNodeKey(root) === targetKey) return root
  if (root.nodeId === targetKey) return root
  if (root.id === targetKey) return root

  if (!root.children) return null

  for (const child of root.children) {
    const foundNode = findNodeByKey(child, targetKey)
    if (foundNode) return foundNode
  }

  return null
}

function buildTargetTree(treeData: TreeNode | null, currentDepartment: TreeNode): TargetTreeState {
  if (!treeData) {
    return { status: "error", message: "无法获取组织树数据，暂不能绘制导入目标。" }
  }

  if (currentDepartment.nodeType !== "department") {
    return { status: "error", message: "当前节点不是院系，暂不能导入专业。" }
  }

  const path = findNodePath(treeData, currentDepartment)
  if (!path) {
    return { status: "error", message: "无法在组织树中定位当前院系。" }
  }

  const school = path.find((item) => item.nodeType === "university")
  if (!school) {
    return { status: "error", message: "无法在组织树中定位当前学校。" }
  }

  const targetDepartment = { ...currentDepartment, children: [] }
  const targetSchool = { ...school, children: [targetDepartment] }

  return {
    status: "ready",
    tree: targetSchool,
    school: targetSchool,
    department: targetDepartment,
  }
}

function isImportableSourceNode(node: TreeNode): boolean {
  if (node.nodeType === "major") return true
  if (node.nodeType === "course") return true
  return false
}

function isSelectedOrIndeterminate(checked: boolean | "indeterminate"): boolean {
  if (checked === true) return true
  if (checked === "indeterminate") return true
  return false
}

function isCourseParentMatched(parentId: string, majorKey: string, major: TreeNode): boolean {
  if (parentId === majorKey) return true
  if (major.id) {
    if (parentId === major.id) return true
  }
  if (parentId === major.nodeId) return true
  return false
}

function collectNodesWithMajorContext(treeData: TreeNode | null, selectedNodes: TreeNode[]): TreeNode[] {
  const nodesByKey = new Map<string, TreeNode>()

  selectedNodes.forEach((node) => {
    if (node.nodeType === "course") {
      if (!node.parentId) {
        throw new Error("课程节点缺少所属专业ID")
      }
      if (!treeData) {
        throw new Error("无法获取来源树数据，不能定位课程所属专业")
      }

      const parentMajor = findNodeByKey(treeData, node.parentId)
      if (!parentMajor) {
        throw new Error("无法定位课程所属专业")
      }
      if (parentMajor.nodeType !== "major") {
        throw new Error("课程节点所属父级不是专业")
      }
      nodesByKey.set(getNodeKey(parentMajor), parentMajor)
    }
    nodesByKey.set(getNodeKey(node), node)
  })

  return Array.from(nodesByKey.values())
}

function buildTargetTreeWithTransferredNodes(targetTreeState: TargetTreeState, transferredNodes: TreeNode[]): TreeNode | null {
  if (targetTreeState.status === "error") return null

  const majorMap = new Map<string, TreeNode>()
  const looseCourses: TreeNode[] = []

  transferredNodes.forEach((node) => {
    if (node.nodeType === "major") {
      majorMap.set(getNodeKey(node), { ...node, children: [] })
    }
  })

  transferredNodes.forEach((node) => {
    if (node.nodeType !== "course") return

    let attached = false
    if (node.parentId) {
      for (const [majorKey, major] of majorMap.entries()) {
        if (isCourseParentMatched(node.parentId, majorKey, major)) {
          const currentChildren = major.children ? major.children : []
          major.children = [...currentChildren, { ...node, children: [] }]
          attached = true
          break
        }
      }
    }

    if (!attached) {
      looseCourses.push({ ...node, children: [] })
    }
  })

  const targetDepartment: TreeNode = {
    ...targetTreeState.department,
    children: [...Array.from(majorMap.values()), ...looseCourses],
  }

  return {
    ...targetTreeState.school,
    children: [targetDepartment],
  }
}

export function ImportMajorDialog({ open, onOpenChange, treeData, currentDepartment }: ImportMajorDialogProps) {
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set())
  const [selectedSourceNodes, setSelectedSourceNodes] = useState<Map<string, TreeNode>>(new Map())
  const [transferredNodes, setTransferredNodes] = useState<TreeNode[]>([])
  const sourceExcludeNodes = useMemo(() => [currentDepartment], [currentDepartment])

  const resetDialogState = useCallback(() => {
    setSelectedSourceIds(new Set())
    setSelectedSourceNodes(new Map())
    setTransferredNodes([])
  }, [])

  useEffect(() => {
    if (open) {
      resetDialogState()
    }
  }, [open, resetDialogState])

  const targetTreeState = useMemo(() => {
    return buildTargetTree(treeData, currentDepartment)
  }, [currentDepartment, treeData])

  const targetExpandedIds = useMemo(() => {
    if (targetTreeState.status === "error") return []
    const transferredMajorIds = transferredNodes
      .filter((node) => node.nodeType === "major")
      .map((node) => getNodeKey(node))
    return [getPanelNodeId(targetTreeState.school), getPanelNodeId(targetTreeState.department), ...transferredMajorIds]
  }, [targetTreeState, transferredNodes])

  const targetTree = useMemo(() => {
    return buildTargetTreeWithTransferredNodes(targetTreeState, transferredNodes)
  }, [targetTreeState, transferredNodes])

  const handleToggleSource = (
    nodeId: string,
    cascadeIds: string[],
    checked: boolean | "indeterminate",
    node: TreeNode,
    cascadeNodes: TreeNode[],
  ) => {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev)

      if (cascadeIds.length > 0) {
        if (isSelectedOrIndeterminate(checked)) {
          next.delete(nodeId)
          cascadeIds.forEach((cascadeId) => next.delete(cascadeId))
        } else {
          next.add(nodeId)
          cascadeIds.forEach((cascadeId) => next.add(cascadeId))
        }
        return next
      }

      if (checked === true) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })

    setSelectedSourceNodes((prev) => {
      const next = new Map(prev)

      if (cascadeIds.length > 0) {
        if (isSelectedOrIndeterminate(checked)) {
          next.delete(nodeId)
          cascadeIds.forEach((cascadeId) => next.delete(cascadeId))
        } else {
          next.set(nodeId, node)
          cascadeNodes.forEach((cascadeNode) => next.set(getNodeKey(cascadeNode), cascadeNode))
        }
        return next
      }

      if (checked === true) {
        next.delete(nodeId)
      } else {
        next.set(nodeId, node)
      }
      return next
    })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetDialogState()
    }
    onOpenChange(nextOpen)
  }

  const handleTransferToTarget = () => {
    const selectedNodes = Array.from(selectedSourceNodes.values()).filter((node) => selectedSourceIds.has(getNodeKey(node)))
    const nodesToTransfer = collectNodesWithMajorContext(treeData, selectedNodes)
    setTransferredNodes((prev) => {
      const next = new Map<string, TreeNode>()
      prev.forEach((node) => next.set(getNodeKey(node), node))
      nodesToTransfer.forEach((node) => next.set(getNodeKey(node), node))
      return Array.from(next.values())
    })
    setSelectedSourceIds(new Set())
    setSelectedSourceNodes(new Map())
  }

  const handleConfirm = () => {
    handleOpenChange(false)
  }

  const isConfirmDisabled = targetTreeState.status === "error" ? true : transferredNodes.length === 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[88vh] !w-[70vw] !max-w-[70vw] flex-col">
        <DialogHeader>
          <DialogTitle>导入专业</DialogTitle>
          <DialogDescription>从其他院系复制完整专业、下属课程和课程关联数据到当前院系。</DialogDescription>
        </DialogHeader>

        {targetTreeState.status === "error" ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {targetTreeState.message}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <section className="flex min-h-0 flex-col gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">来源院系专业</h3>
                <p className="mt-1 text-sm text-muted-foreground">勾选需要复制的专业或课程，当前院系已从来源树中排除。</p>
              </div>
              <OrganizationTreePanel
                treeData={treeData}
                selectedIds={selectedSourceIds}
                onToggleSelect={handleToggleSource}
                selectable
                showRoot={false}
                isNodeSelectable={isImportableSourceNode}
                cascadeSelection
                excludeNodes={sourceExcludeNodes}
                initialExpandedIds={SOURCE_INITIAL_EXPANDED_IDS}
                emptyText="暂无可导入的来源专业"
              />
            </section>

            <div className="flex items-center justify-center px-1 lg:pt-16">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleTransferToTarget}
                disabled={selectedSourceIds.size === 0}
                className="h-10 w-10 rounded-full border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
              >
                <ArrowRight className="h-5 w-5 rotate-90 lg:rotate-0" />
              </Button>
            </div>

            <section className="flex min-h-0 flex-col gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">导入目标</h3>
                <p className="mt-1 text-sm text-muted-foreground">目标固定为当前学校下的当前院系。</p>
              </div>
              <OrganizationTreePanel
                treeData={targetTree}
                selectedIds={EMPTY_SELECTED_IDS}
                readOnly
                showRoot
                showSearch={false}
                enableDynamicLoading={false}
                initialExpandedIds={targetExpandedIds}
                emptyText="暂无目标院系"
              />
            </section>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            确认导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
