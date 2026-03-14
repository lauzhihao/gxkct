import type { TaskMember, TreeNode } from "@/types"
import { buildApiUrl } from "./config"
import { StorageAdapter } from "./storage-adapter"
import type { ApiResponse } from "./types"
import { getStoredAuthToken, getStoredAuthUser } from "./auth-config"

interface DownloadTemplateData {
  blob: Blob
  filename: string
  mimeType: string
}

interface MajorDetailRequireChild {
  id: number
  description?: string
}

interface MajorDetailRequireVO {
  id: number
  description?: string
  children?: MajorDetailRequireChild[]
}

interface BackendResponse<T> {
  code: string | number
  message: string
  data: T
}

interface PageInfo<T> {
  list?: T[]
}

interface CourseUnitPageData {
  pageInfo?: PageInfo<TreeNode>
}

function buildAuthHeaders(): Headers {
  const headers = new Headers()
  const authToken = getStoredAuthToken()
  if (authToken && authToken.trim() !== "") {
    headers.set("authToken", authToken)
  }
  return headers
}

function parseContentDispositionFilename(contentDisposition: string | null, fallbackFilename: string): string {
  if (!contentDisposition) {
    return fallbackFilename
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match && utf8Match[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const normalMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  if (normalMatch && normalMatch[1]) {
    return normalMatch[1]
  }

  return fallbackFilename
}

function isSuccessCode(code: string | number | undefined): boolean {
  return code === "0" || code === 0
}

/**
 * 从 nodeId 中提取数字 ID
 * 例如："dept_266" -> "266", "course_2334" -> "2334"
 */
function extractNumericIdFromNodeId(nodeId: string): string {
  const match = nodeId.match(/\d+/)
  return match ? match[0] : nodeId
}

/**
 * 递归为树节点添加兼容属性
 * 将 nodeId 解析为 id，nodeName 映射为 name，nodeType 映射为 type
 */
function addCompatibilityProps(node: TreeNode): TreeNode {
  const enhancedNode: TreeNode = {
    ...node,
    id: extractNumericIdFromNodeId(node.nodeId ?? ""),
    name: node.nodeName,
    type: node.nodeType,
  }

  if (enhancedNode.children && enhancedNode.children.length > 0) {
    enhancedNode.children = enhancedNode.children.map(addCompatibilityProps)
  }

  return enhancedNode
}

interface DepartmentMember extends TaskMember {
  relative?: number
}

interface UniversityMember {
  id: number
  account: string
  name: string
  belong: string
  relative: number
  auth: string
  permission: number
  old: boolean
  disabled: boolean
}

export class TreeApi {
  private storage = new StorageAdapter()
  private treeKey = "tree-data"

  async getTree(keywords?: string): Promise<ApiResponse<TreeNode>> {
    try {
      const queryParams = new URLSearchParams()

      if (keywords) {
        queryParams.set("keywords", keywords)
      }

      const authUser = getStoredAuthUser()
      if (typeof authUser?.collegeId === "number") {
        queryParams.set("rid", String(authUser.collegeId))
      }

      const query = queryParams.toString() ? `?${queryParams.toString()}` : ""
      const response = await this.storage.getFromApi<TreeNode[]>(`/api/v5/tree${query}`)

      if (response.error || !response.data) {
        return { data: null, error: response.error, status: response.status }
      }

      // 为所有节点添加兼容属性（id, name, type）
      const enhancedChildren = response.data.map(addCompatibilityProps)

      // 始终创建虚拟根节点来包含所有返回的节点
      const rootNode: TreeNode = {
        nodeId: "root",
        nodeName: "根节点",
        nodeType: "root",
        id: "root",
        name: "根节点",
        type: "root",
        children: enhancedChildren,
        metadata: {},
      }

      // 缓存到localStorage以便离线使用
      await this.storage.set(this.treeKey, rootNode)

      return { data: rootNode, error: null, status: 200 }
    } catch (error) {
      return { data: null, error: String(error), status: 500 }
    }
  }

  async updateTree(tree: TreeNode): Promise<ApiResponse<TreeNode | null>> {
    return this.storage.set(this.treeKey, tree)
  }

  async getNodeById(id: string): Promise<ApiResponse<TreeNode>> {
    const response = await this.getTree()
    if (response.error || !response.data) {
      return { data: null, error: response.error, status: response.status }
    }

    const findNode = (node: TreeNode, targetId: string): TreeNode | null => {
      if (node.nodeId === targetId) return node
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
      if (node.nodeId === id) {
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
      if (node.nodeId === id) {
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
      if (n.nodeId === parentId) {
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
   * 获取专业的详细信息（按需加载）
   * 调用 /api/major/v2.0/detail 接口获取专业详情
   * @param majorId 专业ID
   * @returns 专业详情数据
   */
  async getMajorDetail(majorId: string): Promise<ApiResponse<any>> {
    console.log(`[TreeApi] getMajorDetail(${majorId}) 开始加载专业详情`)

    try {
      const detailResponse = await this.storage.getFromApi<any>(
        `/api/major/v2.0/detail?majorid=${majorId}`
      )

      if (detailResponse.error || !detailResponse.data) {
        console.warn(`[TreeApi] 获取专业 ${majorId} 的详细信息失败:`, detailResponse.error)
        return { data: null, error: detailResponse.error, status: detailResponse.status }
      }

      console.log(`[TreeApi] getMajorDetail(${majorId}) 加载成功`)
      return { data: detailResponse.data, error: null, status: 200 }
    } catch (error) {
      console.error(`[TreeApi] 获取专业详情异常:`, error)
      return { data: null, error: String(error), status: 500 }
    }
  }

  async downloadRequireTemplate(lang: string | number): Promise<ApiResponse<DownloadTemplateData | null>> {
    try {
      const url = buildApiUrl(`/api/major/v2.0/download/require?lang=${encodeURIComponent(String(lang))}`)
      const response = await fetch(url, {
        method: "POST",
        headers: buildAuthHeaders(),
      })

      if (!response.ok) {
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const contentType = response.headers.get("content-type")
      const blob = await response.blob()
      const filename = parseContentDispositionFilename(
        response.headers.get("content-disposition"),
        "毕业要求指标点模板.xlsx"
      )

      return {
        data: {
          blob,
          filename,
          mimeType: contentType && contentType.trim() !== ""
            ? contentType
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        error: null,
        status: response.status,
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "下载毕业要求模板失败",
        status: 500,
      }
    }
  }

  async resolveRequires(majorId: string, file: File): Promise<ApiResponse<MajorDetailRequireVO[] | null>> {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(buildApiUrl(`/api/major/v2.0/resolverequires?majorid=${majorId}`), {
        method: "POST",
        headers: buildAuthHeaders(),
        body: formData,
      })

      if (!response.ok) {
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const backend = await response.json() as BackendResponse<MajorDetailRequireVO[]>
      if (!isSuccessCode(backend.code)) {
        return {
          data: null,
          error: backend.message,
          status: response.status,
        }
      }

      if (!Array.isArray(backend.data)) {
        return {
          data: null,
          error: "毕业要求上传结果格式错误",
          status: response.status,
        }
      }

      return {
        data: backend.data,
        error: null,
        status: response.status,
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "上传毕业要求表失败",
        status: 500,
      }
    }
  }

  /**
   * 搜索树中的节点
   * 返回匹配的节点及其完整路径
   */
  async searchTree(keyword: string): Promise<ApiResponse<Array<{ node: TreeNode; path: TreeNode[] }>>> {
    console.log(`[v0] TreeApi.searchTree(${keyword}) 开始远程搜索`)

    // 使用远程搜索：将关键字传递给后端
    const treeResponse = await this.getTree(keyword)
    if (treeResponse.error || !treeResponse.data) {
      return { data: null, error: treeResponse.error, status: treeResponse.status }
    }

    const tree = structuredClone(treeResponse.data)

    // 收集所有匹配的节点及其路径
    const results: Array<{ node: TreeNode; path: TreeNode[] }> = []
    const lowerKeyword = keyword.toLowerCase()

    const collectResults = (node: TreeNode, path: TreeNode[] = []): void => {
      const currentPath = [...path, node]

      // 检查当前节点是否匹配关键字
      if (
        node.nodeName.toLowerCase().includes(lowerKeyword) ||
        node.description?.toLowerCase().includes(lowerKeyword)
      ) {
        results.push({ node, path: currentPath })
      }

      // 递归处理子节点
      if (node.children) {
        node.children.forEach((child) => collectResults(child, currentPath))
      }
    }

    collectResults(tree)
    console.log(`[v0] TreeApi.searchTree() 远程搜索找到 ${results.length} 个匹配结果`)

    return { data: results, error: null, status: 200 }
  }

  /**
   * 获取专业下的课程列表（按需加载）- 用于左侧树导航
   * 调用 /api/major/v2.0/courseunitlist 接口获取课程列表
   * @param majorId 专业ID
   * @returns 课程节点数组
   */
  async getMajorCourses(majorId: string): Promise<ApiResponse<TreeNode[] | null>> {
    const resolvedMajorId = extractNumericIdFromNodeId(majorId)
    const numericMajorId = Number.parseInt(resolvedMajorId, 10)

    if (!Number.isFinite(numericMajorId)) {
      const errorMessage = `无效的专业ID: ${majorId}`
      console.warn(`[TreeApi] ${errorMessage}`)
      return { data: null, error: errorMessage, status: 400 }
    }

    console.log(`[TreeApi] getMajorCourses(${numericMajorId}) 开始加载课程列表`)

    try {
      // [MOD] courseunitlist 后端要求分页结构，且 majorId 必须为数字
      const response = await this.storage.postToApi<CourseUnitPageData>(
        `/api/major/v2.0/courseunitlist`,
        {
          majorId: numericMajorId,
          pageNum: 1,
          pageSize: 40,
        }
      )

      if (response.error || !response.data) {
        console.warn(`[TreeApi] 获取专业 ${numericMajorId} 的课程列表失败:`, response.error)
        return { data: null, error: response.error, status: response.status }
      }

      const courseList = response.data.pageInfo?.list
      if (!Array.isArray(courseList)) {
        const errorMessage = "课程列表响应缺少 pageInfo.list"
        console.warn(`[TreeApi] ${errorMessage}:`, response.data)
        return { data: null, error: errorMessage, status: 500 }
      }

      // 为所有课程节点添加兼容属性（id, name, type）
      const enhancedCourses = courseList.map(addCompatibilityProps)

      console.log(`[TreeApi] getMajorCourses(${numericMajorId}) 加载成功，共 ${enhancedCourses.length} 门课程`)
      return { data: enhancedCourses, error: null, status: 200 }
    } catch (error) {
      console.error(`[TreeApi] 获取课程列表异常:`, error)
      return { data: null, error: String(error), status: 500 }
    }
  }

  /**
   * 获取学校的成员列表
   * 通过 /api/v5/manage/users 获取真实成员数据
   * @param universityId 学校ID（可带有前缀的字符串）
   * @returns 成员数组
   */
  async getUniversityUsers(universityId: string): Promise<ApiResponse<UniversityMember[] | null>> {
    const resolvedUniversityId = extractNumericIdFromNodeId(universityId)
    console.log(`[TreeApi] getUniversityUsers(${resolvedUniversityId}) 开始加载成员数据`)

    try {
      const response = await this.storage.getFromApi<UniversityMember[]>(
        `/api/v5/manage/users?collegeId=${resolvedUniversityId}`
      )

      if (response.error || !response.data) {
        console.warn(`[TreeApi] 获取学校成员失败:`, response.error)
        return { data: null, error: response.error, status: response.status }
      }

      console.log(`[TreeApi] getUniversityUsers(${resolvedUniversityId}) 返回 ${response.data.length} 个成员`)
      return { data: response.data, error: null, status: 200 }
    } catch (error) {
      console.error(`[TreeApi] getUniversityUsers(${resolvedUniversityId}) 错误:`, error)
      return { data: null, error: String(error), status: 500 }
    }
  }

  /**
   * 获取院系的成员列表
   * 通过 /api/v5/manage/users 获取院系成员数据
   * @param departmentId 院系ID（可带有前缀的字符串）
   * @returns 成员数组
   */
  async getDepartmentUsers(departmentId: string): Promise<ApiResponse<DepartmentMember[] | null>> {
    const resolvedDepartmentId = extractNumericIdFromNodeId(departmentId)
    console.log(`[TreeApi] getDepartmentUsers(${resolvedDepartmentId}) 开始加载成员数据`)

    try {
      const authUser = getStoredAuthUser()
      if (typeof authUser?.collegeId !== "number") {
        console.warn("[TreeApi] 获取院系成员失败: 缺少有效的 collegeId")
        return { data: null, error: "Missing collegeId for department users request", status: 400 }
      }

      const response = await this.storage.getFromApi<DepartmentMember[]>(
        `/api/v5/manage/users?collegeId=${authUser.collegeId}&departmentId=${resolvedDepartmentId}`
      )

      if (response.error || !response.data) {
        console.warn(`[TreeApi] 获取院系成员失败:`, response.error)
        return { data: null, error: response.error, status: response.status }
      }

      console.log(
        `[TreeApi] getDepartmentUsers(${resolvedDepartmentId}) 返回 ${response.data.length} 个成员`
      )

      return { data: response.data, error: null, status: 200 }
    } catch (error) {
      console.error(`[TreeApi] getDepartmentUsers(${resolvedDepartmentId}) 错误:`, error)
      return { data: null, error: String(error), status: 500 }
    }
  }

  /**
   * 创建院系
   * 通过 /api/v3/manage/updateDepartment 创建新院系
   * @param collegeId 学校ID
   * @param name 院系名称
   * @returns 创建结果
   */
  async createDepartment(collegeId: string, name: string): Promise<ApiResponse<any>> {
    const resolvedCollegeId = extractNumericIdFromNodeId(collegeId)
    console.log(`[TreeApi] createDepartment(${resolvedCollegeId}, ${name}) 开始创建院系`)

    try {
      const response = await this.storage.postToApi<any>(
        `/api/v3/manage/updateDepartment`,
        {
          id: 0,
          collegeid: parseInt(resolvedCollegeId, 10),
          name,
          del: 0,
        }
      )

      if (response.error) {
        console.warn(`[TreeApi] 创建院系失败:`, response.error)
        return { data: null, error: response.error, status: response.status }
      }

      console.log(`[TreeApi] createDepartment 创建成功`)
      return { data: response.data, error: null, status: 200 }
    } catch (error) {
      console.error(`[TreeApi] createDepartment 错误:`, error)
      return { data: null, error: String(error), status: 500 }
    }
  }
}
