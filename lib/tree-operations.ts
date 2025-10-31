import type { TreeNode } from "@/types"

export function findNodeById(node: TreeNode, targetId: string): TreeNode | null {
  if (node.id === targetId) return node
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, targetId)
      if (found) return found
    }
  }
  return null
}

export function findParentNode(root: TreeNode, targetId: string): TreeNode | null {
  if (!root.children) return null

  for (const child of root.children) {
    if (child.id === targetId) return root
    const found = findParentNode(child, targetId)
    if (found) return found
  }
  return null
}

export function updateNodeInTree(node: TreeNode, targetId: string, updates: Partial<TreeNode>): boolean {
  if (node.id === targetId) {
    Object.assign(node, updates)
    return true
  }
  if (node.children) {
    for (const child of node.children) {
      if (updateNodeInTree(child, targetId, updates)) return true
    }
  }
  return false
}

export function deleteNodeFromTree(node: TreeNode, targetId: string): boolean {
  if (node.children) {
    const index = node.children.findIndex((child) => child.id === targetId)
    if (index !== -1) {
      node.children.splice(index, 1)
      return true
    }
    for (const child of node.children) {
      if (deleteNodeFromTree(child, targetId)) return true
    }
  }
  return false
}

export function addNodeToTree(node: TreeNode, parentId: string, newNode: TreeNode): boolean {
  if (node.id === parentId) {
    if (!node.children) node.children = []
    node.children.push(newNode)
    return true
  }
  if (node.children) {
    for (const child of node.children) {
      if (addNodeToTree(child, parentId, newNode)) return true
    }
  }
  return false
}

export function generateNodeId(type: string): string {
  return `${type}-${Date.now()}`
}

export function getAllNodesOfType(node: TreeNode, type: string): TreeNode[] {
  const results: TreeNode[] = []

  if (node.type === type) {
    results.push(node)
  }

  if (node.children) {
    for (const child of node.children) {
      results.push(...getAllNodesOfType(child, type))
    }
  }

  return results
}

export function countNodesByType(node: TreeNode): Record<string, number> {
  const counts: Record<string, number> = {}

  function traverse(n: TreeNode) {
    counts[n.type] = (counts[n.type] || 0) + 1
    if (n.children) {
      n.children.forEach(traverse)
    }
  }

  traverse(node)
  return counts
}

export function searchNodes(
  node: TreeNode,
  searchTerm: string,
  searchFields: (keyof TreeNode)[] = ["name"],
): TreeNode[] {
  const results: TreeNode[] = []
  const lowerSearchTerm = searchTerm.toLowerCase()

  function traverse(n: TreeNode) {
    const matches = searchFields.some((field) => {
      const value = n[field]
      return typeof value === "string" && value.toLowerCase().includes(lowerSearchTerm)
    })

    if (matches) {
      results.push(n)
    }

    if (n.children) {
      n.children.forEach(traverse)
    }
  }

  traverse(node)
  return results
}

export function findStarredNode(node: TreeNode): TreeNode | null {
  if (node.isStarred) return node

  if (node.children) {
    for (const child of node.children) {
      const found = findStarredNode(child)
      if (found) return found
    }
  }

  return null
}

export function getFirstLeafNode(node: TreeNode): TreeNode {
  // 如果有子节点，递归查找第一个叶子节点
  if (node.children && node.children.length > 0) {
    return getFirstLeafNode(node.children[0])
  }

  // 如果没有子节点，返回当前节点
  return node
}

export function getFirstNode(node: TreeNode): TreeNode {
  // 如果有子节点，返回第一个子节点
  if (node.children && node.children.length > 0) {
    return node.children[0]
  }

  // 如果没有子节点，返回当前节点
  return node
}
