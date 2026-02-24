export type PermissionAction =
  | "root.college.create"
  | "college.department.create"
  | "department.major.create"
  | "major.detail.edit"
  | "major.course.create"
  | "course.detail.edit"
  | "college.member.create"
  | "college.member.edit"
  | "college.member.delete"
  | "college.member.toggle"
  | "college.member.resetPassword"
  | "department.member.create"
  | "department.member.edit"
  | "department.member.delete"
  | "department.member.toggle"
  | "department.member.resetPassword"
  | "college.qa.create"
  | "college.qa.manage"

export interface PermissionContext {
  scope?: "root" | "college" | "department" | "major" | "course"
}

export type PermissionMatrix = Record<number, PermissionAction[]>

export type PermissionRoleKey =
  | "seniorAdmin"
  | "schoolAdmin"
  | "departmentAdmin"
  | "qualitySupervisor"
  | "qualityInspectorAdmin"
  | "mentor"
  | "majorAdmin"
  | "courseAdmin"
  | "guest"

export interface PermissionRoleMeta {
  key: PermissionRoleKey
  name: string
  description: string
}

export type PermissionRoleMap = Record<number, PermissionRoleMeta>
