import { useCallback, useEffect, useState } from "react"
import { majorApiService } from "@/modules/majors/api"
import type { TreeNode } from "@/types"

interface TreeNodeLikeRecord {
  [key: string]: unknown
  self?: {
    value?: unknown
    label?: unknown
    name?: unknown
  }
}

export interface UseMajorCoursesResult {
  majorCourses: Map<string, TreeNode[]>
  loadedMajors: Set<string>
  loadedMajorsWithNoCourses: Set<string>
  loadMajorCourses: (nodeId: string, majorId: string) => Promise<TreeNode[]>
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmedValue = value.trim()
  if (trimmedValue.length === 0) return null
  return trimmedValue
}

function readStringOrNumber(value: unknown): string | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null
    return String(value)
  }
  return readNonEmptyString(value)
}

function resolveCourseNodeId(course: TreeNodeLikeRecord): string {
  const nodeId = readNonEmptyString(course.nodeId)
  if (nodeId) return nodeId

  const id = readStringOrNumber(course.id)
  if (id) return `course_${id}`

  const selfValue = readStringOrNumber(course.self?.value)
  if (selfValue) return `course_${selfValue}`

  throw new Error("课程节点缺少可用ID")
}

function resolveCourseId(course: TreeNodeLikeRecord, nodeId: string): string {
  const id = readStringOrNumber(course.id)
  if (id) return id

  const selfValue = readStringOrNumber(course.self?.value)
  if (selfValue) return selfValue

  const match = nodeId.match(/\d+/)
  if (match) return match[0]

  throw new Error("课程节点缺少数字ID")
}

function resolveCourseName(course: TreeNodeLikeRecord): string {
  const nodeName = readNonEmptyString(course.nodeName)
  if (nodeName) return nodeName

  const name = readNonEmptyString(course.name)
  if (name) return name

  const selfLabel = readNonEmptyString(course.self?.label)
  if (selfLabel) return selfLabel

  const selfName = readNonEmptyString(course.self?.name)
  if (selfName) return selfName

  const label = readNonEmptyString(course.label)
  if (label) return label

  const courseName = readNonEmptyString(course.courseName)
  if (courseName) return courseName

  const courseUnitName = readNonEmptyString(course.courseUnitName)
  if (courseUnitName) return courseUnitName

  throw new Error("课程节点缺少名称")
}

function normalizeLoadedCourse(course: TreeNode, parentNodeId: string): TreeNode {
  const courseRecord = course as unknown as TreeNodeLikeRecord
  const nodeId = resolveCourseNodeId(courseRecord)
  const id = resolveCourseId(courseRecord, nodeId)
  const nodeName = resolveCourseName(courseRecord)

  return {
    ...course,
    nodeId,
    id,
    nodeName,
    name: nodeName,
    nodeType: "course",
    type: "course",
    parentId: parentNodeId,
    children: [],
  }
}

export function useMajorCourses(
  onChange?: (courses: Map<string, TreeNode[]>) => void,
): UseMajorCoursesResult {
  const [majorCourses, setMajorCourses] = useState<Map<string, TreeNode[]>>(new Map())
  const [loadedMajors, setLoadedMajors] = useState<Set<string>>(new Set())
  const [loadedMajorsWithNoCourses, setLoadedMajorsWithNoCourses] = useState<Set<string>>(new Set())

  useEffect(() => {
    onChange?.(majorCourses)
  }, [majorCourses, onChange])

  const loadMajorCourses = useCallback(
    async (nodeId: string, majorId: string) => {
      if (loadedMajors.has(nodeId)) {
        const cachedCourses = majorCourses.get(nodeId)
        if (cachedCourses) return cachedCourses
        return []
      }

      const response = await majorApiService.getMajorCourses(majorId)
      if (Array.isArray(response.data) && response.data.length > 0) {
        const normalizedCourses = response.data.map((course) => normalizeLoadedCourse(course, nodeId))
        setMajorCourses((prev) => {
          const next = new Map(prev)
          next.set(nodeId, normalizedCourses)
          return next
        })
        setLoadedMajors((prev) => new Set(prev).add(nodeId))
        return normalizedCourses
      } else if (Array.isArray(response.data) && response.data.length === 0) {
        setLoadedMajorsWithNoCourses((prev) => new Set(prev).add(nodeId))
        setLoadedMajors((prev) => new Set(prev).add(nodeId))
        return []
      }
      return []
    },
    [loadedMajors, majorCourses],
  )

  return {
    majorCourses,
    loadedMajors,
    loadedMajorsWithNoCourses,
    loadMajorCourses,
  }
}
