import type { PermissionRoleMap, PermissionRoleMeta } from "@/shared/permissions/types"
import type { NodeType } from "@/types"

const UNKNOWN_ROLE: PermissionRoleMeta = {
  key: "guest",
  name: "未知角色",
  description: "未匹配到角色配置，默认按无权限处理",
}

export const PERMISSION_ROLES: PermissionRoleMap = {
  1: {
    key: "schoolAdmin",
    name: "学校管理员",
    description: "学校级管理员，可管理院系、成员与教学任务",
  },
  1001: {
    key: "departmentAdmin",
    name: "院系管理员",
    description: "院系级管理员，可管理院系成员与专业信息",
  },
  1031: {
    key: "qualitySupervisor",
    name: "质量督导员",
    description: "质量督导角色，负责教学任务督导管理",
  },
  1039: {
    key: "qualityInspectorAdmin",
    name: "质检管理员",
    description: "质检管理角色，负责教学任务创建与管理",
  },
  1901: {
    key: "mentor",
    name: "指导老师",
    description: "指导教师角色，默认不开放组织成员管理操作",
  },
  2001: {
    key: "majorAdmin",
    name: "专业管理员",
    description: "专业级管理员，可管理专业成员与课程信息",
  },
  3001: {
    key: "courseAdmin",
    name: "课程管理员",
    description: "课程级管理员，可管理课程相关成员与教学内容",
  },
  88: {
    key: "seniorAdmin",
    name: "高级管理员",
    description: "高级管理员，拥有完整管理权限",
  },
}

export interface MemberRoleConfig {
  roles: string[]
  defaultRole: string
  labels: Record<string, string>
}

export const MEMBER_ROLE_CONFIG_BY_NODE_TYPE: Record<NodeType, MemberRoleConfig> = {
  university: {
    roles: ["学校管理员"],
    defaultRole: "学校管理员",
    labels: {
      学校管理员: "学校管理员",
    },
  },
  department: {
    roles: ["院系管理员", "专业管理员", "指导老师"],
    defaultRole: "院系管理员",
    labels: {
      院系管理员: "院系管理员",
      专业管理员: "专业管理员",
      指导老师: "指导老师",
    },
  },
  major: {
    roles: ["专业管理员", "指导老师"],
    defaultRole: "专业管理员",
    labels: {
      专业管理员: "专业管理员",
      指导老师: "指导老师",
    },
  },
  course: {
    roles: ["课程管理员", "指导老师"],
    defaultRole: "课程管理员",
    labels: {
      课程管理员: "课程管理员",
      指导老师: "指导老师",
    },
  },
  root: {
    roles: ["高级管理员"],
    defaultRole: "高级管理员",
    labels: {
      高级管理员: "高级管理员",
    },
  },
}

export function getMemberRoleConfig(nodeType: NodeType): MemberRoleConfig {
  return MEMBER_ROLE_CONFIG_BY_NODE_TYPE[nodeType] ?? MEMBER_ROLE_CONFIG_BY_NODE_TYPE.major
}

const DISPLAY_PERMISSION_ROLE_IDS: number[] = [1, 1001, 1031, 1039, 1901, 2001, 3001, 88]

export function getAllPermissionRoleNames(): string[] {
  return DISPLAY_PERMISSION_ROLE_IDS
    .map((permissionId) => PERMISSION_ROLES[permissionId]?.name)
    .filter((name): name is string => Boolean(name))
}

export function getPermissionRoleMeta(permissionId: number | null): PermissionRoleMeta {
  if (permissionId === null) return UNKNOWN_ROLE
  return PERMISSION_ROLES[permissionId] ?? UNKNOWN_ROLE
}
