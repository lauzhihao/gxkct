import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { TreeNode } from "@/types"

export interface UseDepartmentMajorsResult {
  departmentMajors: Map<string, TreeNode[]>
  loadedDepartments: Set<string>
  loadDepartmentMajors: (departmentId: string) => Promise<void>
}

export function useDepartmentMajors(
  onChange?: (majors: Map<string, TreeNode[]>) => void,
): UseDepartmentMajorsResult {
  const [departmentMajors, setDepartmentMajors] = useState<Map<string, TreeNode[]>>(new Map())
  const [loadedDepartments, setLoadedDepartments] = useState<Set<string>>(new Set())

  useEffect(() => {
    onChange?.(departmentMajors)
  }, [departmentMajors, onChange])

  const loadDepartmentMajors = useCallback(
    async (departmentId: string) => {
      if (loadedDepartments.has(departmentId)) return

      const response = await api.tree.getDepartmentMajors(departmentId)
      if (response.data && response.data.length > 0) {
        setDepartmentMajors((prev) => {
          const next = new Map(prev)
          next.set(departmentId, response.data!)
          return next
        })
        setLoadedDepartments((prev) => new Set(prev).add(departmentId))
      }
    },
    [loadedDepartments],
  )

  return {
    departmentMajors,
    loadedDepartments,
    loadDepartmentMajors,
  }
}
