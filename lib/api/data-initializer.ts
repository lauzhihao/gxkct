import universitiesData from "@/mock-data/universities.json"
import departmentsData from "@/mock-data/departments.json"
import majorsData from "@/mock-data/majors.json"
import coursesData from "@/mock-data/courses.json"
import usersData from "@/mock-data/users.json"
import courseMatricesData from "@/mock-data/course-matrices.json"
import projectMatricesData from "@/mock-data/project-matrices.json"
import courseResourcesData from "@/mock-data/course-resources.json"
import type { TreeNode } from "@/types"

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
 * 构建树形结构数据
 * 直接使用JSON文件中的完整数据结构，保留所有字段
 */
function buildTreeData(): TreeNode {
  const universities = (universitiesData as any[]).map((univ) => {
    // 查找该大学/工作坊下的所有院系
    const univDepartments = (departmentsData as any[])
      .filter((dept) => dept.universityId === univ.id)
      .map((dept) => {
        // 查找该院系下的所有专业
        const deptMajors = (majorsData as any[])
          .filter((major) => major.departmentId === dept.id)
          .map((major) => {
            // 查找该专业下的所有课程
            const majorCourses = (coursesData as any[])
              .filter((course) => course.majorId === major.id)
              .map((course) => ({
                // 直接使用课程的完整数据，保留所有字段
                ...course,
                children: course.children || [],
              }))

            // 直接使用专业的完整数据，保留所有字段
            return {
              ...major,
              children: majorCourses,
            }
          })

        // 直接使用院系的完整数据，保留所有字段
        return {
          ...dept,
          children: deptMajors,
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

  Object.entries(resourcesMap).forEach(([courseId, resourceData]) => {
    localStorage.setItem(`${STORAGE_PREFIX}courseResources-${courseId}`, JSON.stringify(resourceData))
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
        key.startsWith(`${STORAGE_PREFIX}courseResources-`))
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
