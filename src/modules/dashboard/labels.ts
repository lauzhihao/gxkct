import type { DashboardTier, DepartmentTaskStatus, EvaluationStatus, ResourceCategory, TeacherTodoKind } from "@/modules/dashboard/types"

export const TIER_LABELS: Record<DashboardTier, string> = {
  school: "校级大盘",
  department: "院系",
  major: "专业",
  teacher: "我的课程",
}

export const TIER_ORDER: DashboardTier[] = ["school", "department", "major", "teacher"]

export const RESOURCE_LABELS: Record<ResourceCategory, string> = {
  document: "教学文档",
  video: "视频资源",
  questionBank: "试题库",
  other: "其他",
}

export const SCHOOL_WARNING_LABELS = {
  overdueRectification: "逾期未整改课程",
  ownerMissing: "负责人未设置课程",
  evaluationDueSoon: "30 天内临期评估",
  staleOver60Days: "超 60 天未更新课程",
  zeroResource: "未建立课程档案（零资源）",
} as const

/** 按截止日判定：未完成且截止日在 30 天以外（或没有截止日）为未到期 */
export const DEPARTMENT_TASK_STATUS_LABELS: Record<DepartmentTaskStatus, string> = {
  pending: "未到期",
  dueSoon: "临期",
  overdue: "已逾期",
  completed: "已完成",
}

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  not_started: "未开始",
  in_progress: "进行中",
  completed: "已完成",
}

export const TEACHER_TODO_LABELS: Record<TeacherTodoKind, string> = {
  missingMaterial: "待补材料",
  dueSoon: "临期任务",
}

/**
 * 取不到的指标显示 N/A 时附带的原因。
 * "口径待定义"需要客户先给出判定标准；"系统暂无"是系统里没有记录这类数据；
 * "暂未汇总统计"是数据存在，但现有接口只能逐门课查询，这一层暂不汇总。
 */
export const NA_REASONS = {
  stage: "建设阶段（未开始 / 建设中 / 待评估 / 已达标）口径待定义",
  qualified: "达标口径待定义",
  completion: "建设完成率口径待定义",
  passLine: "评估通过线待定义",
  rectification: "系统暂无整改记录",
  archiveCoverage: "院系建档覆盖率口径待定义",
  newCourse: "系统暂无开课时间",
  yoy: "学期同期对应口径待定义",
  lastUpdated: "系统暂无课程内容更新时间",
  activity: "系统暂无开课时间，资源更新暂未按月汇总统计",
  recentUpdates: "系统暂无课程内容更新记录",
  schoolResources: "全校资源暂未汇总统计",
  departmentResources: "院系层资源暂未汇总统计，可进入专业看板逐门查看",
  comparison: "达标率口径待定义，资源量暂未汇总统计",
  grade: "系统暂无年级数据",
  setupComplete: "“设置完整”口径待定义",
  returned: "系统暂无退回记录",
  matrixLevel: "矩阵分级完成口径待定义",
  resourceRequirement: "专业资源要求未设定",
  evaluationLevel: "评估等级口径待定义",
  rectifyComment: "系统暂无整改意见与时限",
  percentile: "建设进度口径待定义",
  idleActivity: "系统暂无建设活动记录",
  noTeachers: "没有在册教师",
} as const
