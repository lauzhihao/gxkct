import type { TreeNode } from "@/types"
import { getStoredAuthUser } from "@/lib/api/auth-config"

interface CourseManagerLike {
  value?: string
  label?: string
}

interface CourseMetadataWithManagers {
  managers?: CourseManagerLike[]
}

export interface CourseOwnershipTarget {
  id?: string | number | null
  manager?: CourseManagerLike[] | null
  metadata?: Record<string, unknown> | null
}

function normalizeIdentityValue(value: string | number | null | undefined): string {
  return String(value ?? "").trim().toLowerCase()
}

export function buildCurrentUserIdentitySet(): Set<string> {
  const authUser = getStoredAuthUser()
  const identities = [authUser?.email, authUser?.userName, authUser?.id]
    .map(normalizeIdentityValue)
    .filter(Boolean)

  return new Set(identities)
}

export function resolveCourseManagers(courseTarget?: CourseOwnershipTarget | TreeNode | null): CourseManagerLike[] {
  const directManagers = Array.isArray(courseTarget?.manager) ? courseTarget.manager : []
  // [MOD] 先把 metadata.managers 提到本地变量再做 Array.isArray 窄化，避免重复访问导致 TS 推断含 undefined
  const metadataManagersRaw = (courseTarget?.metadata as CourseMetadataWithManagers | undefined)?.managers
  const metadataManagers: CourseManagerLike[] = Array.isArray(metadataManagersRaw) ? metadataManagersRaw : []

  const mergedManagers = [...directManagers, ...metadataManagers]
  const uniqueManagers = new Map<string, CourseManagerLike>()

  mergedManagers.forEach((manager) => {
    const managerValue = String(manager?.value ?? "").trim()
    const managerLabel = String(manager?.label ?? "").trim()
    const key = `${managerValue}-${managerLabel}`

    if (managerValue.length > 0 || managerLabel.length > 0) {
      uniqueManagers.set(key, manager)
    }
  })

  return Array.from(uniqueManagers.values())
}

export function isCurrentUserCourseOwner(courseTarget?: CourseOwnershipTarget | TreeNode | null): boolean {
  const currentUserIdentitySet = buildCurrentUserIdentitySet()
  const courseManagers = resolveCourseManagers(courseTarget)

  if (currentUserIdentitySet.size === 0 || courseManagers.length === 0) {
    return false
  }

  return courseManagers.some((manager) => {
    const managerValue = normalizeIdentityValue(manager?.value)
    const managerLabel = normalizeIdentityValue(manager?.label)
    return currentUserIdentitySet.has(managerValue) || currentUserIdentitySet.has(managerLabel)
  })
}
