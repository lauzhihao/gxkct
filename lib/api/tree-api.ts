import type { TreeNode } from "@/types"
import { StorageAdapter } from "./storage-adapter"
import type { ApiResponse } from "./types"

export class TreeApi {
  private storage = new StorageAdapter()
  private treeKey = "tree-data"

  async getTree(): Promise<ApiResponse<TreeNode>> {
    console.log("[v0] TreeApi.getTree() 使用键:", this.treeKey)
    const response = await this.storage.get<TreeNode>(this.treeKey)
    console.log(
      "[v0] TreeApi.getTree() 响应:",
      response.error ? `错误: ${response.error}` : `成功，根节点ID: ${response.data?.id}`,
    )
    return response
  }

  async updateTree(tree: TreeNode): Promise<ApiResponse<TreeNode>> {
    return this.storage.set(this.treeKey, tree)
  }

  async getNodeById(id: string): Promise<ApiResponse<TreeNode>> {
    const response = await this.getTree()
    if (response.error || !response.data) {
      return { data: null, error: response.error, status: response.status }
    }

    const findNode = (node: TreeNode, targetId: string): TreeNode | null => {
      if (node.id === targetId) return node
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child, targetId)
          if (found) return found
        }
      }
      return null
    }

    const node = findNode(response.data, id)
    if (!node) {
      return { data: null, error: "Node not found", status: 404 }
    }
    return { data: node, error: null, status: 200 }
  }

  async updateNode(id: string, updates: Partial<TreeNode>): Promise<ApiResponse<TreeNode>> {
    const treeResponse = await this.getTree()
    if (treeResponse.error || !treeResponse.data) {
      return { data: null, error: treeResponse.error, status: treeResponse.status }
    }

    let updatedNode: TreeNode | null = null
    const updateInTree = (node: TreeNode): TreeNode => {
      if (node.id === id) {
        updatedNode = { ...node, ...updates }
        return updatedNode
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateInTree) }
      }
      return node
    }

    const newTree = updateInTree(treeResponse.data)
    await this.updateTree(newTree)

    if (!updatedNode) {
      return { data: null, error: "Node not found", status: 404 }
    }
    return { data: updatedNode, error: null, status: 200 }
  }

  async deleteNode(id: string): Promise<ApiResponse<boolean>> {
    const treeResponse = await this.getTree()
    if (treeResponse.error || !treeResponse.data) {
      return { data: null, error: treeResponse.error, status: treeResponse.status }
    }

    let deleted = false
    const deleteFromTree = (node: TreeNode): TreeNode | null => {
      if (node.id === id) {
        deleted = true
        return null
      }
      if (node.children) {
        node.children = node.children.map(deleteFromTree).filter((n): n is TreeNode => n !== null)
      }
      return node
    }

    const newTree = deleteFromTree(treeResponse.data)
    if (newTree) {
      await this.updateTree(newTree)
    }

    if (!deleted) {
      return { data: null, error: "Node not found", status: 404 }
    }
    return { data: true, error: null, status: 200 }
  }

  async addNode(parentId: string, node: TreeNode): Promise<ApiResponse<TreeNode>> {
    const treeResponse = await this.getTree()
    if (treeResponse.error || !treeResponse.data) {
      return { data: null, error: treeResponse.error, status: treeResponse.status }
    }

    let added = false
    const addToTree = (n: TreeNode): TreeNode => {
      if (n.id === parentId) {
        added = true
        return {
          ...n,
          children: [...(n.children || []), node],
        }
      }
      if (n.children) {
        return { ...n, children: n.children.map(addToTree) }
      }
      return n
    }

    const newTree = addToTree(treeResponse.data)
    await this.updateTree(newTree)

    if (!added) {
      return { data: null, error: "Parent node not found", status: 404 }
    }
    return { data: node, error: null, status: 200 }
  }
}
