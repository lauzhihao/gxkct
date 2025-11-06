import type { TreeNode } from "@/types"
import { StorageAdapter } from "./storage-adapter"
import type { ApiResponse, BackendResponse } from "./types"
import { handleBackendResponse } from "./response-handler"
import departmentsData from "@/mock-data/departments.json"
import coursesData from "@/mock-data/courses.json"

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

  /**
   * 获取院系的专业列表
   * Mock阶段：所有院系都返回departments.json中的数据
   */
  async getDepartmentMajors(departmentId: string): Promise<ApiResponse<TreeNode[]>> {
    console.log(`[v0] TreeApi.getDepartmentMajors(${departmentId})`)

    // 类型断言为后端响应格式
    const backendResponse = departmentsData as BackendResponse<{
      lang: number
      title: string
      btns: Array<{
        label: string
        path: string
        type: string
        value: string
      }>
      departments: Array<{
        id: number
        collegeId: number
        name: string
        type: number
      }>
      current: {
        id: number
        collegeId: number
        name: string
        type: number
      }
      data: Array<{
        lang: number
        parent: {
          value: string
          label: string
          children: null
        }
        self: {
          value: string
          label: string
          children: null
        }
        auth: null
        manager: Array<{
          value: string
          label: string
          children: null
        }>
        info: null
        cover: null
        btnMenus: Array<{
          label: string
          value: string
          path: string
          type: string
        }>
        coverMenus: Array<{
          label: string
          value: string
          path: string
          type: string
        }>
        props: null
      }>
      datatype: number
    }>

    // 使用统一的响应处理器
    const response = handleBackendResponse(backendResponse)
    if (response.error || !response.data) {
      return { data: null, error: response.error, status: response.status }
    }

    const { data: majorsData } = response.data

    // 将data数组转换为TreeNode数组
    const majors: TreeNode[] = majorsData.map((item) => ({
      id: `major-${item.self.value}`,
      name: item.self.label,
      type: "major" as const,
      children: [], // 专业下的课程暂时为空，后续可以动态加载
      metadata: {
        majorId: item.self.value,
        parentDeptId: item.parent.value,
        parentDeptName: item.parent.label,
        managers: item.manager,
        btnMenus: item.btnMenus,
        coverMenus: item.coverMenus,
        lang: item.lang,
      },
    }))

    console.log(`[v0] TreeApi.getDepartmentMajors() 返回 ${majors.length} 个专业`)

    return { data: majors, error: null, status: 200 }
  }

  /**
   * 获取专业的课程列表
   * Mock阶段：所有专业都返回courses.json中的数据（忽略专业ID匹配）
   * @param majorId 专业ID（从metadata.majorId获取）
   * @returns 课程TreeNode数组
   */
  async getMajorCourses(majorId: string): Promise<ApiResponse<TreeNode[]>> {
    console.log(`[v0] TreeApi.getMajorCourses(${majorId}) 开始加载课程数据 [Mock模式]`)

    // Mock阶段：所有专业都返回courses.json中的数据
    const backendResponse = coursesData as BackendResponse<
      Array<{
        lang: number
        parent: {
          value: string
          label: string
          children: null
        }
        self: {
          value: string
          label: string
          children: null
        }
        auth: null
        manager: Array<{
          value: string
          label: string
          children: null
        }>
        info: null
        cover: null
        btnMenus: Array<{
          label: string
          value: string
          path: string
          type: string
        }>
        coverMenus: Array<{
          label: string
          value: string
          path: string
          type: string
        }>
        props: {
          createTime: string
        } | null
      }>
    >

    // 使用统一的响应处理器
    const response = handleBackendResponse(backendResponse, false) // Mock阶段不显示错误toast
    if (response.error || !response.data) {
      console.log(`[v0] TreeApi.getMajorCourses() 响应处理失败:`, response.error)
      return { data: null, error: response.error, status: response.status }
    }

    const coursesArray = response.data
    console.log(`[v0] TreeApi.getMajorCourses() 原始数据包含 ${coursesArray.length} 个课程`)

    // 将data数组转换为TreeNode数组
    // Mock阶段：为了让所有专业都能显示课程，我们将课程的parentMajorId替换为当前专业ID
    const courses: TreeNode[] = coursesArray.map((item, index) => ({
      id: `course-${majorId}-${item.self.value}-${index}`, // 使用组合ID避免不同专业间的课程ID冲突
      name: item.self.label,
      type: "course" as const,
      children: [], // 课程节点没有子节点
      metadata: {
        courseId: item.self.value,
        parentMajorId: majorId, // Mock阶段：使用当前专业ID
        parentMajorName: `专业-${majorId}`, // Mock阶段：使用占位符
        originalParentMajorId: item.parent.value, // 保留原始专业ID供参考
        originalParentMajorName: item.parent.label, // 保留原始专业名称供参考
        managers: item.manager,
        btnMenus: item.btnMenus,
        coverMenus: item.coverMenus,
        lang: item.lang,
        createTime: item.props?.createTime,
      },
    }))

    console.log(`[v0] TreeApi.getMajorCourses() 返回 ${courses.length} 个课程给专业 ${majorId}`)

    return { data: courses, error: null, status: 200 }
  }
}
