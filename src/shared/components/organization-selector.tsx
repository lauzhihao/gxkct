"use client"

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
import { useOrganizationSelector } from "@/shared/hooks/use-organization-selector"
import type { TreeNode } from "@/types"

const INITIAL_EXPANDED_IDS = ["root"]

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
  const { selectedIds, toggleSelect, getSelectedNodes, clearSelected } = useOrganizationSelector(
    initialSelected,
    mode,
  )

  const handleConfirm = () => {
    if (!treeData) return
    const selectedNodes = getSelectedNodes(treeData)
    onConfirm(selectedNodes)
    onOpenChange(false)
  }

  const handleCancel = () => {
    clearSelected()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <OrganizationTreePanel
          treeData={treeData}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          selectable
          showRoot={false}
          initialExpandedIds={INITIAL_EXPANDED_IDS}
        />

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
