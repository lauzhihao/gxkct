"use client"

import { useMemo } from "react"
import type { TreeNode } from "@/types"
import { getStoredAuthUser } from "@/lib/api/auth-config"
import { usePermission } from "@/shared/hooks/use-permission"
import type { PermissionAction } from "@/shared/permissions/types"

const COURSE_EDIT_ACTION: PermissionAction = "course.detail.edit"
const COURSE_EDIT_CONTEXT = { scope: "course" as const }

export function useCourseEditPermission(courseNode?: TreeNode | null): boolean {
  const { can } = usePermission()

  const currentUserAccount = useMemo(() => getStoredAuthUser()?.email?.trim().toLowerCase() ?? "", [])
  const courseManagers = useMemo(() => courseNode?.manager ?? [], [courseNode?.manager])
  const isCourseOwner = useMemo(() => {
    if (!currentUserAccount || courseManagers.length === 0) {
      return false
    }

    return courseManagers.some((manager) => String(manager?.value ?? "").trim().toLowerCase() === currentUserAccount)
  }, [courseManagers, currentUserAccount])

  return can(COURSE_EDIT_ACTION, COURSE_EDIT_CONTEXT) && isCourseOwner
}
