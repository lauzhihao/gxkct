import type { TreeNode } from "@/types"
import { StorageAdapter } from "./storage-adapter"
import type { ApiResponse } from "./types"
import { getCurrentUserId } from "./auth-config"

export class TreeApi {
  private storage = new StorageAdapter()
  private treeKey = "tree-data"

  async getTree(): Promise<ApiResponse<TreeNode>> {
    console.log("[TreeApi] getTree() 开始加载树形数据")

    // 获取userId
    const userId = getCurrentUserId()
    if (!userId) {
      console.error("[TreeApi] 未获取到userId")
      return { data: null, error: "未获取到userId", status: 401 }
    }

    console.log(`[TreeApi] 从API获取colleges数据，userId: ${userId}`)
    const collegesResponse = await this.storage.getFromApi<{
      colleges: Array<{
        college: {
          id: number
          name: string
          image: string
          collegeType: string
        }
        departments: Array<{
          id: number
          collegeId: number
          name: string
          type: string | null
        }>
        permissionId: number
        relativeId: number
      }>
    }>(`/api/manage/allavailablecollege?userId=${userId}`)

    if (collegesResponse.error || !collegesResponse.data) {
      console.error("[TreeApi] API调用失败:", collegesResponse.error)
      return { data: null, error: collegesResponse.error, status: collegesResponse.status }
    }

    // 将API数据转换为树形结构
    const treeData = this.buildTreeFromColleges(collegesResponse.data)
    console.log("[TreeApi] 树形数据构建成功，根节点包含", treeData.children?.length || 0, "个子节点")

    // 缓存到localStorage以便离线使用
    await this.storage.set(this.treeKey, treeData)

    return { data: treeData, error: null, status: 200 }
  }

  /**
   * 将colleges API数据转换为树形结构
   */
  private buildTreeFromColleges(data: {
    colleges: Array<{
      college: {
        id: number
        name: string
        image: string
        collegeType: string
      }
      departments: Array<{
        id: number
        collegeId: number
        name: string
        type: string | null
      }>
      permissionId: number
      relativeId: number
    }>
  }): TreeNode {
    const { colleges } = data

    // 过滤出collegeType为"1"的数据
    const filteredColleges = colleges.filter((item) => item.college.collegeType === "1")

    console.log(`[TreeApi] colleges总数: ${colleges.length}, 过滤后(collegeType=1): ${filteredColleges.length}`)

    // 使用Map去重，以college.id为键
    const collegeMap = new Map<number, {
      college: any
      departments: any[]
      permissionId: number
      relativeId: number
    }>()

    filteredColleges.forEach((item) => {
      const collegeId = item.college.id
      if (!collegeMap.has(collegeId)) {
        collegeMap.set(collegeId, item)
      } else {
        // 如果已存在，合并departments（去重）
        const existing = collegeMap.get(collegeId)!
        const existingDeptIds = new Set(existing.departments.map(d => d.id))
        const newDepts = item.departments.filter(d => !existingDeptIds.has(d.id))
        existing.departments.push(...newDepts)
      }
    })

    // 将去重后的colleges数据转换为树形结构
    const universities = Array.from(collegeMap.values()).map((item) => {
      const { college, departments } = item

      // 将departments转换为子节点
      const deptNodes = departments.map((dept) => ({
        id: String(dept.id),
        name: dept.name,
        type: "department" as const,
        children: [],
        metadata: {
          collegeId: dept.collegeId,
          deptType: dept.type,
        },
      }))

      // 创建大学/工作坊节点
      return {
        id: String(college.id),
        name: college.name,
        type: "university" as const,
        children: deptNodes,
        metadata: {
          image: college.image,
          collegeType: college.collegeType,
          permissionId: item.permissionId,
          relativeId: item.relativeId,
        },
      }
    })

    return {
      id: "root",
      name: "根节点",
      type: "university" as const,
      children: universities,
      metadata: {},
    }
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
   * 调用 /api/v4/webpage/home/switchDpt 接口获取指定院系的专业
   */
  async getDepartmentMajors(departmentId: string): Promise<ApiResponse<TreeNode[]>> {
    console.log(`[TreeApi] getDepartmentMajors(${departmentId}) 开始加载专业数据`)

    // 调用API获取指定院系的专业数据
    const majorsResponse = await this.storage.getFromApi<{
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
    }>(`/api/v4/webpage/home/switchDpt?dptId=${departmentId}&lang=80101`)

    if (majorsResponse.error || !majorsResponse.data) {
      console.error(`[TreeApi] 获取专业列表API失败:`, majorsResponse.error)
      return { data: null, error: majorsResponse.error, status: majorsResponse.status }
    }

    const { data: majorsData } = majorsResponse.data
    console.log(`[TreeApi] getDepartmentMajors() API返回 ${majorsData.length} 个专业，departmentId=${departmentId}`)

    // 为每个专业获取详细信息
    const majors: TreeNode[] = await Promise.all(
      majorsData.map(async (item) => {
        let detailData: any = {}

        // 调用API获取该专业的详细信息
        try {
          const majorDetailResponse = await this.storage.getFromApi<any>(
            `/api/major/v2.0/detail?majorid=${item.self.value}`
          )
          if (majorDetailResponse.data) {
            detailData = majorDetailResponse.data
          }
        } catch (error) {
          console.warn(`[TreeApi] 获取专业 ${item.self.value} 的详细信息失败:`, error)
        }

        return {
          id: `major-${item.self.value}`,
          name: item.self.label,
          type: "major" as const,
          children: [],
          metadata: {
            code: detailData.majorClass || "",
            majorLevel: detailData.majorLevel || "",
            majorClass: detailData.majorClass || "",
            feature: detailData.feature || "",
            careerLevel: detailData.careerLevel || "",
            demandType: detailData.demandType || "",
            demandArea: detailData.demandArea || "",
            professionsVOS: detailData.professionsVOS || [],
            position: detailData.position || "",
            requiresVOS: detailData.requiresVOS || [],
            majorId: item.self.value,
            parentDeptId: item.parent.value,
            parentDeptName: item.parent.label,
            managers: item.manager,
            btnMenus: item.btnMenus,
            coverMenus: item.coverMenus,
            lang: item.lang,
          },
        }
      })
    )

    console.log(`[TreeApi] getDepartmentMajors() 返回 ${majors.length} 个专业`)
    return { data: majors, error: null, status: 200 }
  }

  /**
   * 获取专业的课程列表
   * 调用 /api/v4/webpage/majorindex/courses 接口获取课程数据
   * @param majorId 专业ID（从metadata.majorId获取）
   * @param deptName 部门名称（可选）
   * @param collegeName 学院名称（可选）
   * @returns 课程TreeNode数组
   */
  async getMajorCourses(majorId: string, deptName?: string, collegeName?: string): Promise<ApiResponse<TreeNode[]>> {
    console.log(`[TreeApi] getMajorCourses(${majorId}) 开始加载课程数据`)

    // 调用API获取课程数据
    const coursesResponse = await this.storage.getFromApi<
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
    >(`/api/v4/webpage/majorindex/courses?majorId=${majorId}&lang=80101`)

    if (coursesResponse.error || !coursesResponse.data) {
      console.error(`[TreeApi] 获取课程列表API失败:`, coursesResponse.error)
      return { data: null, error: coursesResponse.error, status: coursesResponse.status }
    }

    const allCoursesArray = coursesResponse.data
    console.log(`[TreeApi] getMajorCourses() 从API获取 ${allCoursesArray.length} 个课程`)

    // 将data数组转换为TreeNode数组
    const courses: TreeNode[] = allCoursesArray.map((item, index) => {
      // 从 manager 数组中提取讲师名称，过滤掉"未记录"
      const allManagerLabels = item.manager?.map((m: any) => m.label) || []
      const instructors = allManagerLabels.filter((label: string) => label && label !== "未记录")

      // 判断是否所有讲师都是"未记录"（包括空数组的情况）
      const hasUnrecordedOnly = allManagerLabels.length > 0 && instructors.length === 0

      return {
        id: `course-${majorId}-${item.self.value}-${index}`,
        name: item.self.label,
        type: "course" as const,
        children: [],
        metadata: {
          courseId: item.self.value,
          parentMajorId: majorId,
          parentMajorName: item.parent.label,
          parentDeptName: deptName, // 部门名称
          collegeName: collegeName, // 学院名称
          managers: item.manager,
          instructors: instructors, // 讲师名称数组（已过滤"未记录"）
          hasUnrecordedOnly: hasUnrecordedOnly, // 标记是否全部为"未记录"
          btnMenus: item.btnMenus,
          coverMenus: item.coverMenus,
          lang: item.lang,
          createTime: item.props?.createTime,
        },
      }
    })

    console.log(`[TreeApi] getMajorCourses() 返回 ${courses.length} 个课程给专业 ${majorId}`)
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
