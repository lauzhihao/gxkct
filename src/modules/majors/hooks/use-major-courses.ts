import { useCallback, useEffect, useState } from "react"
import { majorCoursesApi } from "@/modules/majors/api/majorCoursesApi"
import type { TreeNode } from "@/types"

export interface UseMajorCoursesResult {
  majorCourses: Map<string, TreeNode[]>
  loadedMajors: Set<string>
  loadedMajorsWithNoCourses: Set<string>
  loadMajorCourses: (nodeId: string, majorId: string) => Promise<void>
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
      if (loadedMajors.has(nodeId)) return

      const response = await majorCoursesApi.getMajorCourses(majorId)
      if (response.data && response.data.length > 0) {
        setMajorCourses((prev) => {
          const next = new Map(prev)
          next.set(nodeId, response.data!)
          return next
        })
        setLoadedMajors((prev) => new Set(prev).add(nodeId))
      } else if (response.data && response.data.length === 0) {
        setLoadedMajorsWithNoCourses((prev) => new Set(prev).add(nodeId))
        setLoadedMajors((prev) => new Set(prev).add(nodeId))
      }
    },
    [loadedMajors],
  )

  return {
    majorCourses,
    loadedMajors,
    loadedMajorsWithNoCourses,
    loadMajorCourses,
  }
}
