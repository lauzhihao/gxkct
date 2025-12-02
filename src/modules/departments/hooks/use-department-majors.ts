import { useCallback, useEffect, useState } from "react"
import type { TreeNode } from "@/types"

export interface UseDepartmentMajorsResult {
  departmentMajors: Map<string, TreeNode[]>
  loadedDepartments: Set<string>
  loadDepartmentMajors: (departmentId: string) => Promise<void>
}

/**
 * 该hook已弃用，因为tree接口现在返回完整的树结构（包括所有departments和majors）
 * 不再需要动态加载。保留此hook以保持兼容性，但实际上不做任何操作。
 */
export function useDepartmentMajors(
  onChange?: (majors: Map<string, TreeNode[]>) => void,
): UseDepartmentMajorsResult {
  const [departmentMajors] = useState<Map<string, TreeNode[]>>(new Map())
  const [loadedDepartments] = useState<Set<string>>(new Set())

  useEffect(() => {
    onChange?.(departmentMajors)
  }, [departmentMajors, onChange])

  const loadDepartmentMajors = useCallback(
    async () => {
      // No-op: tree接口已返回完整树结构，不需要再动态加载
    },
    [],
  )

  return {
    departmentMajors,
    loadedDepartments,
    loadDepartmentMajors,
  }
}
