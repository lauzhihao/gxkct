"use client"

import { useState, useCallback } from "react"
import type { TreeNode } from "@/types"

export interface UseOrganizationSelectorResult {
  selectedIds: Set<string>
  toggleSelect: (nodeId: string) => void
  setSelected: (nodeIds: Set<string>) => void
  clearSelected: () => void
  getSelectedNodes: (treeData: TreeNode) => TreeNode[]
  isSelected: (nodeId: string) => boolean
}

export function useOrganizationSelector(
  initialSelected?: Set<string>,
  mode: "single" | "multiple" = "multiple",
): UseOrganizationSelectorResult {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(initialSelected || new Set())

  const toggleSelect = useCallback(
    (nodeId: string) => {
      setSelectedIds((prev) => {
        const newSet = new Set(prev)
        if (mode === "single") {
          // 单选模式：清空其他选项，只保留当前选项
          newSet.clear()
          newSet.add(nodeId)
        } else {
          // 多选模式：切换选中状态
          if (newSet.has(nodeId)) {
            newSet.delete(nodeId)
          } else {
            newSet.add(nodeId)
          }
        }
        return newSet
      })
    },
    [mode],
  )

  const setSelected = useCallback((nodeIds: Set<string>) => {
    setSelectedIds(new Set(nodeIds))
  }, [])

  const clearSelected = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback(
    (nodeId: string) => {
      return selectedIds.has(nodeId)
    },
    [selectedIds],
  )

  // 从树中提取选中的节点
  const getSelectedNodes = useCallback(
    (treeData: TreeNode): TreeNode[] => {
      const result: TreeNode[] = []

      const traverse = (node: TreeNode) => {
        if (selectedIds.has(node.id)) {
          result.push(node)
        }
        if (node.children) {
          node.children.forEach(traverse)
        }
      }

      traverse(treeData)
      return result
    },
    [selectedIds],
  )

  return {
    selectedIds,
    toggleSelect,
    setSelected,
    clearSelected,
    getSelectedNodes,
    isSelected,
  }
}

