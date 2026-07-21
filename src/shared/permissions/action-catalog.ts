import type { PermissionAction } from "@/shared/permissions/types"

export const PERMISSION_ACTION_CATALOG: Record<PermissionAction, string> = {
  "root.college.create": "在根级新增学校",
  "college.department.create": "在学校下新增院系",
  "department.major.create": "在院系下新增专业",
  "major.detail.edit": "专业详情编辑",
  "major.course.create": "在专业下新增课程",
  "course.detail.edit": "课程详情编辑",
  "college.member.create": "学校成员新增",
  "college.member.edit": "学校成员编辑",
  "college.member.delete": "学校成员删除",
  "college.member.toggle": "学校成员启用/禁用",
  "college.member.resetPassword": "学校成员重置密码",
  "department.member.create": "院系成员新增",
  "department.member.edit": "院系成员编辑",
  "department.member.delete": "院系成员删除",
  "department.member.toggle": "院系成员启用/禁用",
  "department.member.resetPassword": "院系成员重置密码",
  "college.qa.create": "学校质量评价新增",
  "college.qa.manage": "学校质量评价管理",
}
