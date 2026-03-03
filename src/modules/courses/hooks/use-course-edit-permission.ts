"use client"

import { useMemo } from "react"
import type { TreeNode } from "@/types"
import { getStoredAuthUser } from "@/lib/api/auth-config"
import { usePermission } from "@/shared/hooks/use-permission"
import type { PermissionAction } from "@/shared/permissions/types"
import { getCourseCache } from "@/shared/utils/course-cache"

const COURSE_EDIT_ACTION: PermissionAction = "course.detail.edit"
const COURSE_EDIT_CONTEXT = { scope: "course" as const }

interface CourseManagerLike {
  value?: string
  label?: string
}

interface CourseNodeMetadataWithManagers {
  managers?: CourseManagerLike[]
}

export function useCourseEditPermission(courseNode?: TreeNode | null): boolean {
  const { can } = usePermission()

  const currentUserIdentitySet = useMemo(() => {
    const authUser = getStoredAuthUser()
    const identities = [authUser?.email, authUser?.userName, authUser?.id]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean)
    return new Set(identities)
  }, [])

  const courseManagers = useMemo(() => {
    const directManagers = courseNode?.manager ?? []
    const metadataManagers = ((courseNode?.metadata as CourseNodeMetadataWithManagers | undefined)?.managers ?? [])
    const courseId = String(courseNode?.id || "")
    const cacheManagers = getCourseCache(courseId)?.instructors?.map((name) => ({
      value: name,
      label: name,
    })) ?? []

    const mergedManagers = [...directManagers, ...metadataManagers, ...cacheManagers]
    const uniqueManagers = new Map<string, CourseManagerLike>()

    mergedManagers.forEach((manager) => {
      const managerValue = String(manager?.value ?? "").trim()
      const managerLabel = String(manager?.label ?? "").trim()
      const key = `${managerValue}-${managerLabel}`
      if (managerValue || managerLabel) {
        uniqueManagers.set(key, manager)
      }
    })

    return Array.from(uniqueManagers.values())
  }, [courseNode?.id, courseNode?.manager, courseNode?.metadata])

  const isCourseOwner = useMemo(() => {
    if (currentUserIdentitySet.size === 0 || courseManagers.length === 0) {
      return false
    }

    return courseManagers.some((manager) => {
      const managerValue = String(manager?.value ?? "").trim().toLowerCase()
      const managerLabel = String(manager?.label ?? "").trim().toLowerCase()
      return currentUserIdentitySet.has(managerValue) || currentUserIdentitySet.has(managerLabel)
    })
  }, [courseManagers, currentUserIdentitySet])

  return can(COURSE_EDIT_ACTION, COURSE_EDIT_CONTEXT) && isCourseOwner
}
