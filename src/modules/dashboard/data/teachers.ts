import type { CardDto, ManagerRef, MemberDto } from "@/modules/dashboard/data/dashboard-api"

/**
 * 教师口径：
 * - 在册教师：成员列表中权限编码为指导老师(1901) / 专业管理员(2001) / 任课教师(3001) 且未停用的账号；
 * - 参与教师：在册教师中至少担任一门（范围内）课程负责人的人；
 * - 零建设教师：在册教师中未担任任何（范围内）课程负责人的人。
 * 课程负责人的 value 是用户邮箱，邮箱为空时为用户 ID（后端 TreeServiceImpl.buildManagerLabelMap）。
 */

const TEACHER_PERMISSION_IDS: ReadonlySet<number> = new Set([1901, 2001, 3001])

export function isRegisteredTeacher(member: MemberDto): boolean {
  return member.permission !== null && TEACHER_PERMISSION_IDS.has(member.permission) && member.disabled !== true
}

function memberKeys(member: MemberDto): string[] {
  const keys = [member.id]
  if (member.account !== null && member.account.trim() !== "") keys.push(member.account)
  return keys
}

export function collectManagerValues(cards: readonly CardDto[]): Set<string> {
  const values = new Set<string>()
  cards.forEach((card) => card.managers.forEach((manager) => values.add(manager.value)))
  return values
}

export interface TeacherParticipation {
  registered: MemberDto[]
  participating: MemberDto[]
  idle: MemberDto[]
}

export function splitTeachers(members: readonly MemberDto[], managerValues: ReadonlySet<string>): TeacherParticipation {
  const registered = members.filter(isRegisteredTeacher)
  const participating: MemberDto[] = []
  const idle: MemberDto[] = []
  registered.forEach((member) => {
    if (memberKeys(member).some((key) => managerValues.has(key))) participating.push(member)
    else idle.push(member)
  })
  return { registered, participating, idle }
}

/** 负责人显示名；账号未填姓名时明确标出，而不是显示邮箱 */
export function managerDisplayName(manager: ManagerRef): string {
  return manager.label !== null && manager.label.trim() !== "" ? manager.label : "（未填写姓名）"
}

export function memberDisplayName(member: MemberDto): string {
  return member.name !== null && member.name.trim() !== "" ? member.name : "（未填写姓名）"
}
