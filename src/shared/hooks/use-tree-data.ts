"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import type { TreeNode } from "@/types"
import {
  findNodeById as findNode,
  updateNodeInTree,
  deleteNodeFromTree,
  addNodeToTree,
  generateNodeId,
} from "@/shared/utils/tree-operations"

export function useTreeData(initialData: TreeNode | null) {
  const [treeData, setTreeData] = useState<TreeNode | null>(() => initialData || null)
  const isInitialMount = useRef(true)

  // 当initialData变化时更新treeData
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (initialData) {
      console.log("[v0] useTreeData: initialData更新,设置treeData")
      setTreeData(initialData)
    }
  }, [initialData])

  const findNodeById = useCallback((node: TreeNode, targetId: string): TreeNode | null => {
    return findNode(node, targetId)
  }, [])

  const updateTree = useCallback((updater: (data: TreeNode) => TreeNode) => {
    setTreeData((prevData) => {
      if (!prevData) return null
      const newData = structuredClone(prevData)
      return updater(newData)
    })
  }, [])

  const addNode = useCallback(
    (parentId: string, newNode: Omit<TreeNode, "id" | "nodeId">, type: string) => {
      updateTree((data) => {
        const newId = generateNodeId(type)
        const nodeToAdd: TreeNode = {
          id: newId,
          nodeId: newId,
          ...newNode,
        }
        addNodeToTree(data, parentId, nodeToAdd)
        return data
      })
    },
    [updateTree],
  )

  const updateNode = useCallback(
    (nodeId: string, updates: Partial<TreeNode>) => {
      updateTree((data) => {
        updateNodeInTree(data, nodeId, updates)
        return data
      })
    },
    [updateTree],
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      updateTree((data) => {
        deleteNodeFromTree(data, nodeId)
        return data
      })
    },
    [updateTree],
  )

  const addSchool = useCallback(
    (newSchool: Omit<TreeNode, "id" | "nodeId">) => {
      updateTree((data) => {
        if (!data.children) data.children = []
        const newId = generateNodeId("univ")
        data.children.push({
          id: newId,
          nodeId: newId,
          ...newSchool,
        })
        return data
      })
    },
    [updateTree],
  )

  const addDepartment = useCallback(
    (universityId: string, newDepartment: Omit<TreeNode, "id" | "nodeId">) => {
      addNode(universityId, newDepartment, "dept")
    },
    [addNode],
  )

  const addMajor = useCallback(
    (departmentId: string, newMajor: Omit<TreeNode, "id" | "nodeId">) => {
      addNode(departmentId, newMajor, "major")
    },
    [addNode],
  )

  const addCourse = useCallback(
    (majorId: string, newCourse: Omit<TreeNode, "id" | "nodeId">) => {
      addNode(majorId, newCourse, "course")
    },
    [addNode],
  )

  const resetData = useCallback((initialData: TreeNode | null) => {
    setTreeData(initialData)
  }, [])

  return {
    treeData,
    findNodeById,
    addSchool,
    addDepartment,
    addMajor,
    addCourse,
    updateNode,
    deleteNode,
    resetData,
  }
}
