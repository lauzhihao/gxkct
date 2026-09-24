import type { DashboardTier } from "@/modules/dashboard/types"

/**
 * 按权限编码推断本人所在层级，分段规则与后端 AuthServiceV4Impl 一致：
 * >3000 课程级、>2000 专业级、>1000 院系级、>0 学校级；<=0 在后端不属于任何层级，这里只开放本人课程。
 * 专业负责人在后端是 3xxx 加一条 course_id=0 的任课关系，前端拿不到该关系，按任课教师处理。
 */
export function resolveOwnTier(permissionId: number | null): DashboardTier {
  if (permissionId === null || permissionId <= 0) return "teacher"
  if (permissionId > 3000) return "teacher"
  if (permissionId > 2000) return "major"
  if (permissionId > 1000) return "department"
  return "school"
}

/** 可查看的层级：本级及以下的管理层级；任课教师只看本人课程。第一个为默认层级 */
export function resolveAllowedTiers(permissionId: number | null): DashboardTier[] {
  const ownTier = resolveOwnTier(permissionId)
  if (ownTier === "school") return ["school", "department", "major"]
  if (ownTier === "department") return ["department", "major"]
  if (ownTier === "major") return ["major"]
  return ["teacher"]
}

/** 返回地址只接受站内路径，拒绝协议相对地址，避免被拼成站外跳转 */
export function resolveReturnPath(rawFrom: string | null): string {
  if (rawFrom === null) return "/"
  if (!rawFrom.startsWith("/") || rawFrom.startsWith("//")) return "/"
  if (rawFrom.startsWith("/dashboard")) return "/"
  return rawFrom
}
