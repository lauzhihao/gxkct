import type { PermissionRoleMap, PermissionRoleMeta } from "@/shared/permissions/types"

const UNKNOWN_ROLE: PermissionRoleMeta = {
  key: "guest",
  name: "未知角色",
  description: "未匹配到角色配置，默认按无权限处理",
}

export const PERMISSION_ROLES: PermissionRoleMap = {
  1: {
    key: "systemAdmin",
    name: "系统管理员",
    description: "平台级管理员，可管理学校、成员和教学任务",
  },
}

export function getPermissionRoleMeta(permissionId: number | null): PermissionRoleMeta {
  if (permissionId === null) return UNKNOWN_ROLE
  return PERMISSION_ROLES[permissionId] ?? UNKNOWN_ROLE
}
