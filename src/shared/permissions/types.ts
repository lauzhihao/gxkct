export type PermissionAction =
  | "root.college.create"
  | "college.department.create"
  | "department.major.create"
  | "major.course.create"
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
  | "major.member.create"
  | "major.member.edit"
  | "major.member.delete"
  | "major.member.toggle"
  | "major.member.resetPassword"
  | "course.member.create"
  | "course.member.edit"
  | "course.member.delete"
  | "course.member.toggle"
  | "course.member.resetPassword"
  | "college.teachingTask.create"
  | "college.teachingTask.manage"

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
