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

function buildEmptyTreeData(): TreeNode {
  return {
    nodeId: "root",
    nodeName: "根节点",
    nodeType: "university" as const,
    children: [],
  }
}

/**
 * 初始化用户数据
 */
function initializeUsers() {
  return
}

/**
 * 初始化课程矩阵数据
 */
function initializeCourseMatrices() {
  return
}

/**
 * 初始化项目矩阵数据
 */
function initializeProjectMatrices() {
  return
}

/**
 * 初始化课程资源数据
 */
function initializeCourseResources() {
  return
}

/**
 * 初始化教学督导任务数据
 */
function initializeTeachingTasks() {
  return
}

/**
 * 检查数据是否已初始化
 */
export function isDataInitialized(): boolean {
  return localStorage.getItem(STORAGE_KEYS.INITIALIZED) === "true"
}

/**
 * 初始化所有Mock数据到localStorage
 * 注意：树形数据现在从API动态获取，不再在这里初始化
 */
export function initializeMockData(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TREE_DATA, JSON.stringify(buildEmptyTreeData()))

    initializeUsers()
    initializeCourseMatrices()
    initializeProjectMatrices()
    initializeCourseResources()
    initializeTeachingTasks()

    localStorage.setItem(STORAGE_KEYS.INITIALIZED, "true")
  } catch (error) {
    throw error
  }
}

/**
 * 重置所有数据（清除localStorage并重新初始化）
 */
export function resetMockData(): void {
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

  initializeMockData()
}

/**
 * 获取树形数据的存储键
 */
export function getTreeDataStorageKey(): string {
  return STORAGE_KEYS.TREE_DATA
}
