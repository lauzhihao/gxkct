import type {
  CourseStage,
  DashboardTier,
  DepartmentTaskStatus,
  EvaluationStatus,
  ResourceCategory,
  TeacherTodoKind,
} from "@/modules/dashboard/types"

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

export const STAGE_LABELS: Record<CourseStage, string> = {
  notStarted: "未开始",
  building: "建设中",
  awaitingEvaluation: "待评估",
  qualified: "已达标",
}

/** 各建设阶段的判定，进度分布里逐行列出 */
export const STAGE_RULES: Record<CourseStage, string> = {
  notStarted: "5 项都没做",
  building: "5 项做了一部分",
  awaitingEvaluation: "5 项做完，还没有学校评价出分",
  qualified: "5 项做完，已有学校评价出分",
}

/** 口径说明，页面脚注与悬停提示共用（判定逻辑见 data/course-status.ts） */
export const DEFINITIONS = {
  qualified: "达标：大纲、教案、课件三项齐备",
  completion: "完成率：每门课 5 项（大纲、教案、课件、KSA 课点、专业矩阵支撑点）完成的比例，专业、院系取课程平均",
  stage:
    "阶段：5 项都没做为未开始；做了部分为建设中；5 项做完、还没有学校评价出分为待评估；5 项做完且已出分为已达标（评价未达合格线的另计待整改）",
  passLine: "合格线：学校评价得分率（总分 ÷ 各评价标准满分之和）达到 60%，五级制相当于平均 C 级及以上",
  score: "得分取学校评价（最后一级）的总分",
  setup: "设置完整：课程定位、简介、标准都已填写，且学时大于 0",
  idle: "零建设教师：在册教师中近 60 天没有课程建设操作（创建、编辑、复制课程）的人",
  activity: "按自然月统计：新增课程为课程创建时间落在该月、不是由学期复制产生的课程；编辑次数来自课程操作日志",
} as const

/**
 * 取不到的指标显示 N/A 时附带的原因：系统里没有这类数据，或当前账号看不到对比所需的数据。
 */
export const NA_REASONS = {
  grade: "系统暂无年级数据",
  returned: "系统暂无退回记录",
  resourceRequirement: "专业资源要求未设定",
  rectificationDeadline: "系统没有整改时限，无法判断是否逾期",
  courseUpdateMissing: "未取到该课程的信息保存时间",
  noTeachers: "没有在册教师",
  noCourses: "没有课程",
  noPreviousSemester: "没有更早的学期可对比",
  noLastYearSemester: "没有去年同学期的数据",
  lastYearEmpty: "去年同学期没有课程",
  previousEmpty: "上一学期没有课程",
  sharedCourseRecords: "上一学期与本学期共用同一批课程记录，资源不按学期分开保存，无法比较",
  schoolScopeOnly: "只有校级账号能看到全校数据",
  noScored: "本学期还没有学校评价出分的课程",
  percentile: "需要读取全系课程数据，教师账号目前没有这个权限，待确认是否开放",
} as const
