import universitiesData from "@/mock-data/universities.json"
import departmentsData from "@/mock-data/departments.json"
import coursesData from "@/mock-data/courses.json"
import collegesData from "@/mock-data/colleges.json"
import usersData from "@/mock-data/users.json"
import courseMatricesData from "@/mock-data/course-matrices.json"
import projectMatricesData from "@/mock-data/project-matrices.json"
import courseResourcesData from "@/mock-data/course-resources.json"
import teachingTasksData from "@/mock-data/teaching-tasks.json"
import type { TreeNode, TeachingSupervisoryTask } from "@/types"
import type { BackendResponse } from "./types"

const STORAGE_PREFIX = "education-api-"

const STORAGE_KEYS = {
  TREE_DATA: `${STORAGE_PREFIX}tree-data`,
  USERS: `${STORAGE_PREFIX}users`,
  COURSE_MATRICES: `${STORAGE_PREFIX}course-matrices`,
  PROJECT_MATRICES: `${STORAGE_PREFIX}project-matrices`,
  COURSE_RESOURCES: `${STORAGE_PREFIX}course-resources`,
  INITIALIZED: `${STORAGE_PREFIX}data-initialized`,
}

/**
 * 从colleges.json适配数据到树形结构
 */
function buildTreeDataFromColleges(): TreeNode {
  // 类型断言为后端响应格式
  const backendResponse = collegesData as BackendResponse<{
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
    current?: any
  }>

  // 检查响应是否成功
  if (backendResponse.code !== "0" || !backendResponse.data) {
    console.error("[v0] colleges.json数据格式错误或code非0")
    return {
      id: "root",
      name: "根节点",
      type: "university" as const,
      children: [],
      metadata: {},
    }
  }

  const { colleges } = backendResponse.data

  // 过滤出collegeType为"1"的数据
  const filteredColleges = colleges.filter((item) => item.college.collegeType === "1")

  console.log(`[v0] colleges.json总数: ${colleges.length}, 过滤后(collegeType=1): ${filteredColleges.length}`)

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

/**
 * 构建树形结构数据（旧版本，使用分离的JSON文件）
 * 注意：专业数据不再从majors.json加载，而是通过API动态加载
 * 专业的metadata格式使用major-detail.json的格式
 */
function buildTreeDataLegacy(): TreeNode {
  const universities = (universitiesData as any[]).map((univ) => {
    // 查找该大学/工作坊下的所有院系
    const univDepartments = (departmentsData as any[])
      .filter((dept) => dept.universityId === univ.id)
      .map((dept) => {
        // 院系下的专业将通过API动态加载，这里不再预加载
        // 直接使用院系的完整数据，保留所有字段
        return {
          ...dept,
          children: [], // 专业将通过getDepartmentMajors API动态加载
        }
      })

    // 直接使用大学/工作坊的完整数据，保留所有字段
    return {
      ...univ,
      children: univDepartments,
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

/**
 * 构建树形结构数据
 * 优先使用colleges.json，如果不存在则使用旧版本的分离JSON文件
 */
function buildTreeData(): TreeNode {
  try {
    // 优先使用colleges.json
    return buildTreeDataFromColleges()
  } catch (error) {
    console.warn("[v0] 使用colleges.json失败，回退到旧版本数据:", error)
    return buildTreeDataLegacy()
  }
}

/**
 * 初始化用户数据
 */
function initializeUsers() {
  const usersMap = usersData as Record<string, any[]>

  Object.entries(usersMap).forEach(([nodeId, users]) => {
    localStorage.setItem(`${STORAGE_PREFIX}users-${nodeId}`, JSON.stringify(users))
  })
}

/**
 * 初始化课程矩阵数据
 */
function initializeCourseMatrices() {
  const matricesMap = courseMatricesData as Record<string, any>

  Object.entries(matricesMap).forEach(([courseId, matrixData]) => {
    localStorage.setItem(`${STORAGE_PREFIX}courseMatrix-${courseId}`, JSON.stringify(matrixData))
  })
}

/**
 * 初始化项目矩阵数据
 */
function initializeProjectMatrices() {
  const matricesMap = projectMatricesData as Record<string, any>

  Object.entries(matricesMap).forEach(([courseId, matrixData]) => {
    localStorage.setItem(`${STORAGE_PREFIX}projectMatrix-${courseId}`, JSON.stringify(matrixData))
  })
}

/**
 * 初始化课程资源数据
 */
function initializeCourseResources() {
  const resourcesMap = courseResourcesData as Record<string, any>
  console.log("[v0] 初始化课程资源数据，数据键:", Object.keys(resourcesMap))

  Object.entries(resourcesMap).forEach(([courseId, resourceData]) => {
    const key = `${STORAGE_PREFIX}courseResources-${courseId}`
    localStorage.setItem(key, JSON.stringify(resourceData))
    console.log(`[v0] 已存储课程资源: ${key}`)
  })

  console.log("[v0] 课程资源数据初始化完成")
}

/**
 * 初始化教学督导任务数据
 */
function initializeTeachingTasks() {
  const backendResponse = teachingTasksData as BackendResponse<TeachingSupervisoryTask[]>

  if (backendResponse.code !== "0" || !backendResponse.data) {
    console.warn("[v0] 教学督导任务数据格式错误或code非0")
    return
  }

  // 按universityId分组存储任务
  const tasksMap: Record<string, TeachingSupervisoryTask[]> = {}

  backendResponse.data.forEach((task) => {
    if (!tasksMap[task.universityId]) {
      tasksMap[task.universityId] = []
    }
    tasksMap[task.universityId].push(task)
  })

  // 存储到localStorage
  Object.entries(tasksMap).forEach(([universityId, tasks]) => {
    localStorage.setItem(`${STORAGE_PREFIX}teaching-tasks-${universityId}`, JSON.stringify(tasks))
  })
}

/**
 * 检查数据是否已初始化
 */
export function isDataInitialized(): boolean {
  return localStorage.getItem(STORAGE_KEYS.INITIALIZED) === "true"
}

/**
 * 初始化所有Mock数据到localStorage
 */
export function initializeMockData(): void {
  console.log("[v0] 开始初始化Mock数据...")

  try {
    // 构建并存储树形数据
    const treeData = buildTreeData()
    console.log("[v0] 构建的树形数据: 根节点包含", treeData.children?.length || 0, "个子节点")
    console.log("[v0] 存储树形数据到键:", STORAGE_KEYS.TREE_DATA)
    localStorage.setItem(STORAGE_KEYS.TREE_DATA, JSON.stringify(treeData))

    // 验证数据是否真的存储了
    const storedData = localStorage.getItem(STORAGE_KEYS.TREE_DATA)
    console.log("[v0] 验证存储的数据:", storedData ? `${storedData.substring(0, 100)}...` : "null")
    console.log("[v0] 树形数据已初始化")

    // 初始化用户数据
    initializeUsers()
    console.log("[v0] 用户数据已初始化")

    // 初始化课程矩阵数据
    initializeCourseMatrices()
    console.log("[v0] 课程矩阵数据已初始化")

    // 初始化项目矩阵数据
    initializeProjectMatrices()
    console.log("[v0] 项目矩阵数据已初始化")

    // 初始化课程资源数据
    initializeCourseResources()
    console.log("[v0] 课程资源数据已初始化")

    // 初始化教学督导任务数据
    initializeTeachingTasks()
    console.log("[v0] 教学督导任务数据已初始化")

    // 标记为已初始化
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, "true")
    console.log("[v0] Mock数据初始化完成")
  } catch (error) {
    console.error("[v0] Mock数据初始化失败:", error)
    throw error
  }
}

/**
 * 重置所有数据（清除localStorage并重新初始化）
 */
export function resetMockData(): void {
  console.log("[v0] 重置Mock数据...")

  // 清除所有相关的localStorage数据
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })

  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (
      key &&
      (key.startsWith(`${STORAGE_PREFIX}users-`) ||
        key.startsWith(`${STORAGE_PREFIX}courseMatrix-`) ||
        key.startsWith(`${STORAGE_PREFIX}projectMatrix-`) ||
        key.startsWith(`${STORAGE_PREFIX}courseResources-`) ||
        key.startsWith(`${STORAGE_PREFIX}teaching-tasks-`))
    ) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key))

  // 重新初始化
  initializeMockData()
}

/**
 * 获取树形数据的存储键
 */
export function getTreeDataStorageKey(): string {
  return STORAGE_KEYS.TREE_DATA
}
