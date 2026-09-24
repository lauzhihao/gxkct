import type {
  BreakpointKind,
  ConstructionStage,
  DashboardTier,
  DepartmentTaskStatus,
  MajorWarningKind,
  ResourceCategory,
  SchoolWarningKind,
  TeacherTodoKind,
} from "@/modules/dashboard/types"

export const TIER_LABELS: Record<DashboardTier, string> = {
  school: "校级大盘",
  department: "院系",
  major: "专业",
  teacher: "我的课程",
}

export const TIER_ORDER: DashboardTier[] = ["school", "department", "major", "teacher"]

export const STAGE_LABELS: Record<ConstructionStage, string> = {
  notStarted: "未开始",
  inProgress: "建设中",
  awaitingEvaluation: "已完成待评估",
  qualified: "已达标",
}

export const STAGE_ORDER: ConstructionStage[] = ["notStarted", "inProgress", "awaitingEvaluation", "qualified"]

export const RESOURCE_LABELS: Record<ResourceCategory, string> = {
  document: "教学文档",
  video: "视频资源",
  questionBank: "试题库",
  other: "其他",
}

export const SCHOOL_WARNING_LABELS: Record<SchoolWarningKind, string> = {
  overdueRectification: "逾期未整改课程",
  ownerMissing: "负责人未设置课程",
  evaluationDueSoon: "30 天内临期评估",
  staleOver60Days: "超 60 天未更新课程",
  zeroResource: "未建立课程档案（零资源）",
}

export const BREAKPOINT_LABELS: Record<BreakpointKind, string> = {
  noOwner: "无负责人",
  noSyllabus: "无大纲",
  noLessonPlanOrCourseware: "无教案课件",
  noResource: "无资源",
}

export const DEPARTMENT_TASK_STATUS_LABELS: Record<DepartmentTaskStatus, string> = {
  pending: "进行中",
  dueSoon: "临期",
  overdue: "已逾期",
}

export const MAJOR_WARNING_LABELS: Record<MajorWarningKind, string> = {
  ownerMissing: "负责人未设置",
  staleOver60Days: "超 60 天未更新",
  evaluationUnprepared: "临近评估批次未准备",
}

export const TEACHER_TODO_LABELS: Record<TeacherTodoKind, string> = {
  missingMaterial: "待补材料",
  dueSoon: "临期任务",
  returned: "被退回修改",
}
