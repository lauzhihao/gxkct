import type { PermissionAction, PermissionContext, PermissionRoleMeta } from "@/shared/permissions/types"
import { PERMISSION_MATRIX } from "@/shared/permissions/matrix"
import { getPermissionRoleMeta } from "@/shared/permissions/roles"

export function hasPermission(
  permissionId: number | null,
  action: PermissionAction,
  context?: PermissionContext,
): boolean {
  void context

  if (permissionId === null) return false

  const actions = PERMISSION_MATRIX[permissionId] ?? []
  return actions.includes(action)
}

export function getPermissionRole(permissionId: number | null): PermissionRoleMeta {
  return getPermissionRoleMeta(permissionId)
}

export function getAllowedActions(permissionId: number | null): PermissionAction[] {
  if (permissionId === null) return []
  return PERMISSION_MATRIX[permissionId] ?? []
}
