import type { TreeNode } from "@/types"
import { StorageAdapter } from "./storage-adapter"
import type { ApiResponse, BackendResponse } from "./types"
import { handleBackendResponse } from "./response-handler"
import departmentsData from "@/mock-data/departments.json"
import coursesData from "@/mock-data/courses.json"
import majorDetailData from "@/mock-data/major-detail.json"
import deptUsersData from "@/mock-data/deptUsers.json"

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
   * 根据departmentId过滤departments.json中的数据
   */
  async getDepartmentMajors(departmentId: string): Promise<ApiResponse<TreeNode[]>> {
    console.log(`[v0] TreeApi.getDepartmentMajors(${departmentId})`)

    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500))

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

    const { data: allMajorsData } = response.data

    // 根据departmentId过滤专业数据
    // departmentId 是字符串格式，需要与 parent.value 比较
    const filteredMajorsData = allMajorsData.filter((item) => item.parent.value === departmentId)
    console.log(`[v0] TreeApi.getDepartmentMajors() 过滤结果: 总共 ${allMajorsData.length} 个专业，院系 ${departmentId} 有 ${filteredMajorsData.length} 个专业`)

    // 从major-detail.json获取详细数据格式
    const majorDetailResponse = majorDetailData as BackendResponse<any>
    const detailData = majorDetailResponse.data || {}

    // 将过滤后的data数组转换为TreeNode数组，使用major-detail.json的metadata格式
    const majors: TreeNode[] = filteredMajorsData.map((item) => ({
      id: `major-${item.self.value}`,
      name: item.self.label,
      type: "major" as const,
      children: [], // 专业下的课程暂时为空，后续可以动态加载
      metadata: {
        // 基本信息字段（使用major-detail.json格式）
        code: detailData.majorClass || "",
        majorLevel: detailData.majorLevel || "",
        majorClass: detailData.majorClass || "",
        feature: detailData.feature || "",

        // 职业信息字段
        careerLevel: detailData.careerLevel || "",
        demandType: detailData.demandType || "",
        demandArea: detailData.demandArea || "",
        professionsVOS: detailData.professionsVOS || [],

        // 培养信息字段
        position: detailData.position || "",

        // 毕业要求字段
        requiresVOS: detailData.requiresVOS || [],

        // 保留原有的管理字段
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
   * 根据majorId过滤courses.json中的数据
   * @param majorId 专业ID（从metadata.majorId获取）
   * @returns 课程TreeNode数组
   */
  async getMajorCourses(majorId: string): Promise<ApiResponse<TreeNode[]>> {
    console.log(`[v0] TreeApi.getMajorCourses(${majorId}) 开始加载课程数据`)

    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500))

    // 获取courses.json数据
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

    const allCoursesArray = response.data
    console.log(`[v0] TreeApi.getMajorCourses() 原始数据包含 ${allCoursesArray.length} 个课程`)

    // 根据majorId过滤课程数据
    // majorId 是字符串格式，需要与 parent.value 比较
    const filteredCoursesArray = allCoursesArray.filter((item) => item.parent.value === majorId)
    console.log(`[v0] TreeApi.getMajorCourses() 过滤结果: 专业 ${majorId} 有 ${filteredCoursesArray.length} 个课程`)

    // 将过滤后的data数组转换为TreeNode数组
    const courses: TreeNode[] = filteredCoursesArray.map((item, index) => ({
      id: `course-${majorId}-${item.self.value}-${index}`, // 使用组合ID避免不同专业间的课程ID冲突
      name: item.self.label,
      type: "course" as const,
      children: [], // 课程节点没有子节点
      metadata: {
        courseId: item.self.value,
        parentMajorId: majorId,
        parentMajorName: item.parent.label,
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

  /**
   * 搜索树中的节点（包括未加载的数据）
   * 返回匹配的节点及其完整路径
   */
  async searchTree(keyword: string): Promise<ApiResponse<Array<{ node: TreeNode; path: TreeNode[] }>>> {
    console.log(`[v0] TreeApi.searchTree(${keyword}) 开始搜索`)

    const treeResponse = await this.getTree()
    if (treeResponse.error || !treeResponse.data) {
      return { data: null, error: treeResponse.error, status: treeResponse.status }
    }

    const tree = structuredClone(treeResponse.data)

    // 加载所有未加载的数据到克隆的树中（不影响原树）
    console.log(`[v0] TreeApi.searchTree() 开始加载所有未加载的数据`)
    await this.loadAllUnloadedData(tree)

    const results: Array<{ node: TreeNode; path: TreeNode[] }> = []
    const lowerKeyword = keyword.toLowerCase()

    const search = (node: TreeNode, path: TreeNode[] = []): void => {
      const currentPath = [...path, node]

      // 检查当前节点是否匹配
      if (
        node.name.toLowerCase().includes(lowerKeyword) ||
        node.description?.toLowerCase().includes(lowerKeyword)
      ) {
        results.push({ node, path: currentPath })
      }

      // 递归搜索子节点
      if (node.children) {
        node.children.forEach((child) => search(child, currentPath))
      }
    }

    search(tree)
    console.log(`[v0] TreeApi.searchTree() 找到 ${results.length} 个匹配结果`)

    return { data: results, error: null, status: 200 }
  }

  /**
   * 获取院系的成员列表
   * 根据departmentId从deptUsers.json中过滤数据
   * @param departmentId 院系ID（字符串格式）
   * @returns 成员数组
   */
  async getDepartmentUsers(departmentId: string): Promise<ApiResponse<any[]>> {
    console.log(`[v0] TreeApi.getDepartmentUsers(${departmentId}) 开始加载成员数据`)

    try {
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 300))

      const backendResponse = deptUsersData as BackendResponse<any>

      // 使用统一的响应处理器
      const response = handleBackendResponse(backendResponse, false)
      if (response.error || !response.data) {
        console.log(`[v0] TreeApi.getDepartmentUsers() 响应处理失败:`, response.error)
        return { data: null, error: response.error, status: response.status }
      }

      const deptData = response.data

      // 检查departmentId是否与data.id匹配
      // departmentId是字符串，data.id是数字，需要转换后比较
      const deptIdNum = parseInt(departmentId, 10)
      if (isNaN(deptIdNum) || deptData.id !== deptIdNum) {
        console.log(`[v0] TreeApi.getDepartmentUsers() 院系ID不匹配: 查询${departmentId}，数据中的ID为${deptData.id}`)
        return { data: [], error: null, status: 200 }
      }

      // 合并guiders和users数组
      const allUsers = [
        ...(deptData.guiders || []),
        ...(deptData.users || [])
      ]

      console.log(`[v0] TreeApi.getDepartmentUsers() 返回 ${allUsers.length} 个成员（系部管理员: ${deptData.guiders?.length || 0}, 其他成员: ${deptData.users?.length || 0}）`)

      return { data: allUsers, error: null, status: 200 }
    } catch (error) {
      console.error(`[v0] TreeApi.getDepartmentUsers() 错误:`, error)
      return { data: null, error: String(error), status: 500 }
    }
  }

  /**
   * 加载所有未加载的数据（department的专业和major的课程）
   * 注意：这个方法会修改传入的node对象，所以调用前应该先克隆
   */
  private async loadAllUnloadedData(node: TreeNode): Promise<void> {
    if (!node.children) return

    for (const child of node.children) {
      // 如果是department节点，加载其专业
      if (child.type === "department") {
        console.log(`[v0] TreeApi.loadAllUnloadedData() 加载department ${child.id} 的专业`)
        const majorsResponse = await this.getDepartmentMajors(child.id)
        if (majorsResponse.data && majorsResponse.data.length > 0) {
          child.children = majorsResponse.data
          console.log(`[v0] TreeApi.loadAllUnloadedData() 成功加载 ${majorsResponse.data.length} 个专业`)

          // 递归加载每个major的课程
          for (const major of majorsResponse.data) {
            if (major.type === "major") {
              await this.loadAllUnloadedData(major)
            }
          }
        }
      }
      // 如果是major节点，加载其课程
      else if (child.type === "major") {
        const majorId = child.metadata?.majorId || child.id.replace("major-", "")
        console.log(`[v0] TreeApi.loadAllUnloadedData() 加载major ${child.id} 的课程`)
        const coursesResponse = await this.getMajorCourses(majorId)
        if (coursesResponse.data && coursesResponse.data.length > 0) {
          child.children = coursesResponse.data
          console.log(`[v0] TreeApi.loadAllUnloadedData() 成功加载 ${coursesResponse.data.length} 个课程`)
        }
      }
      // 递归处理其他节点
      else {
        await this.loadAllUnloadedData(child)
      }
    }
  }
}
