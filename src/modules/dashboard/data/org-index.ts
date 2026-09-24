import type { TreeNodeDto } from "@/modules/dashboard/data/dashboard-api"

/**
 * 把权限内的组织树拍平成院系 / 专业 / 课程三张表。
 * 节点 ID 形如 dept_12、major_34、course_56（后端视图 vw_organization_tree），这里只保留数字部分。
 */

export interface OrgDepartment {
  id: string
  name: string
}

export interface OrgMajor {
  id: string
  name: string
  departmentId: string
}

export interface OrgCourse {
  id: string
  name: string
  majorId: string
}

export interface OrgIndex {
  departments: OrgDepartment[]
  majors: OrgMajor[]
  courses: OrgCourse[]
  departmentById: Map<string, OrgDepartment>
  majorById: Map<string, OrgMajor>
}

const NODE_PREFIX = {
  department: "dept_",
  major: "major_",
  course: "course_",
} as const

function stripPrefix(nodeId: string, prefix: string): string {
  if (!nodeId.startsWith(prefix)) {
    throw new Error(`Unexpected node id ${nodeId}, expected prefix ${prefix}`)
  }
  return nodeId.slice(prefix.length)
}

export function buildOrgIndex(roots: TreeNodeDto[]): OrgIndex {
  const departments: OrgDepartment[] = []
  const majors: OrgMajor[] = []
  const courses: OrgCourse[] = []

  const visit = (node: TreeNodeDto) => {
    if (node.nodeType === "department") {
      departments.push({ id: stripPrefix(node.nodeId, NODE_PREFIX.department), name: node.nodeName })
    } else if (node.nodeType === "major") {
      majors.push({
        id: stripPrefix(node.nodeId, NODE_PREFIX.major),
        name: node.nodeName,
        departmentId: stripPrefix(node.parentId, NODE_PREFIX.department),
      })
    } else if (node.nodeType === "course") {
      courses.push({
        id: stripPrefix(node.nodeId, NODE_PREFIX.course),
        name: node.nodeName,
        majorId: stripPrefix(node.parentId, NODE_PREFIX.major),
      })
    }
    node.children.forEach(visit)
  }
  roots.forEach(visit)

  return {
    departments,
    majors,
    courses,
    departmentById: new Map(departments.map((department) => [department.id, department])),
    majorById: new Map(majors.map((major) => [major.id, major])),
  }
}

export function requireDepartment(index: OrgIndex, departmentId: string): OrgDepartment {
  const department = index.departmentById.get(departmentId)
  if (department === undefined) {
    throw new Error(`Department ${departmentId} not in permitted tree`)
  }
  return department
}

export function requireMajor(index: OrgIndex, majorId: string): OrgMajor {
  const major = index.majorById.get(majorId)
  if (major === undefined) {
    throw new Error(`Major ${majorId} not in permitted tree`)
  }
  return major
}

/** 设计稿口径：专业 / 院系名称重复的只统计一次 */
export function countDistinctNames(items: readonly { name: string }[]): number {
  return new Set(items.map((item) => item.name.trim())).size
}
