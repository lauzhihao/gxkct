import { fetchCourseSummaries, type CourseSummaryDto, type SchoolEvaluationDto } from "@/modules/dashboard/data/dashboard-api"
import { summarizeFolderFileCounts } from "@/modules/dashboard/data/resources"
import type { OrderedSemester } from "@/modules/dashboard/data/semesters"
import { toUpdateDay } from "@/modules/dashboard/data/update-time"
import type { CourseStage, ResourceCategory } from "@/modules/dashboard/types"

/**
 * 课程建设口径（operator 2026-09-24 确认）：
 * - 达标：大纲、教案、课件三项齐备（课程资源里同名预置目录有文件）。
 * - 建设完成率：每门课 5 项（大纲、教案、课件、KSA 有课点、专业矩阵有支撑点）完成几项；专业、院系、全校取课程平均值。
 * - 设置完整：课程基本信息里的定位、简介、标准都已填写，且学时大于 0。
 * - 终评得分：发布关系的 final_score 没有代码写入，取学校评价（最后一级）完成后的总分。
 * - 合格线：得分率 = 学校评价总分 / 该任务各评价标准满分之和，达到 60% 为合格；
 *   五级制每项得分 = 满分 × 所选等级的系数，系数由评估任务自定义；C 级系数为 0.6 时，60% 相当于平均 C 级及以上。
 * - 待整改：最近一次学校评价未达合格线。
 * - 建设阶段按确认的阶段表自上而下判定：5 项都没完成为未开始；完成部分为建设中；
 *   5 项完成但还没有学校评价出分为待评估；其余（5 项完成且已出分）为已达标。
 *   已达标一行的口径是"按达标"，5 项完成时大纲、教案、课件必然齐备，所以不再看评价是否合格，
 *   评价未达合格线的课程另计入待整改。
 */

export const PASS_RATE = 0.6

export const COMPLETION_ITEM_COUNT = 5

export interface EvaluationResult {
  taskId: string
  score: number
  fullScore: number
  rate: number
  passed: boolean
}

export interface CourseStatus {
  courseId: string
  hasSyllabus: boolean
  hasLessonPlan: boolean
  hasCourseware: boolean
  hasKsa: boolean
  hasSupportedPoint: boolean
  resourceCount: number
  byCategory: Record<ResourceCategory, number>
  /** 5 项里完成的项数 */
  completedItems: number
  /** 未完成的项，按固定顺序 */
  missingItems: string[]
  /** 达标：大纲、教案、课件三项齐备 */
  qualified: boolean
  setupComplete: boolean
  /** 基本信息里未填写的项 */
  setupMissing: string[]
  /** 最近一次能算出得分率的学校评价；没有为 null */
  latestEvaluation: EvaluationResult | null
  needsRectification: boolean
  stage: CourseStage
  /** 课程信息最后保存日期（YYYY-MM-DD）；取不到为 null */
  updateDay: string | null
  /** 对比学期里是否有同一门逻辑课程；没有对比学期时为 null */
  lineageInBaseSemester: boolean | null
}

/** 能算出得分率的学校评价；分数或满分缺失、满分不大于 0 时无法判定 */
export function toEvaluationResult(evaluation: SchoolEvaluationDto): EvaluationResult | null {
  if (evaluation.score === null || evaluation.fullScore === null || evaluation.fullScore <= 0) return null
  const rate = evaluation.score / evaluation.fullScore
  return { taskId: evaluation.taskId, score: evaluation.score, fullScore: evaluation.fullScore, rate, passed: rate >= PASS_RATE }
}

/** 学校评价已按提交时间从早到晚排列，取最后一个能判定的 */
function latestEvaluationResult(evaluations: readonly SchoolEvaluationDto[]): EvaluationResult | null {
  for (let index = evaluations.length - 1; index >= 0; index -= 1) {
    const result = toEvaluationResult(evaluations[index])
    if (result !== null) return result
  }
  return null
}

function resolveStage(completedItems: number, latestEvaluation: EvaluationResult | null): CourseStage {
  if (completedItems === 0) return "notStarted"
  if (completedItems < COMPLETION_ITEM_COUNT) return "building"
  if (latestEvaluation === null) return "awaitingEvaluation"
  return "qualified"
}

export function buildCourseStatus(summary: CourseSummaryDto): CourseStatus {
  const folders = summarizeFolderFileCounts(summary.rootFolderFileCounts)
  const items: [string, boolean][] = [
    ["大纲", folders.hasSyllabus],
    ["教案", folders.hasLessonPlan],
    ["课件", folders.hasCourseware],
    ["KSA 课点", summary.ksaCount > 0],
    ["专业矩阵支撑点", summary.supportedPointCount > 0],
  ]
  const setupItems: [string, boolean][] = [
    ["定位", summary.positionFilled],
    ["简介", summary.introductionFilled],
    ["标准", summary.criterionFilled],
    ["学时", summary.periodFilled],
  ]
  const completedItems = items.filter(([, done]) => done).length
  const setupMissing = setupItems.filter(([, done]) => !done).map(([name]) => name)
  const latestEvaluation = latestEvaluationResult(summary.schoolEvaluations)

  return {
    courseId: summary.courseId,
    hasSyllabus: folders.hasSyllabus,
    hasLessonPlan: folders.hasLessonPlan,
    hasCourseware: folders.hasCourseware,
    hasKsa: summary.ksaCount > 0,
    hasSupportedPoint: summary.supportedPointCount > 0,
    resourceCount: folders.resourceCount,
    byCategory: folders.byCategory,
    completedItems,
    missingItems: items.filter(([, done]) => !done).map(([name]) => name),
    qualified: folders.hasSyllabus && folders.hasLessonPlan && folders.hasCourseware,
    setupComplete: setupMissing.length === 0,
    setupMissing,
    latestEvaluation,
    needsRectification: latestEvaluation !== null && !latestEvaluation.passed,
    stage: resolveStage(completedItems, latestEvaluation),
    updateDay: summary.updateTime === null ? null : toUpdateDay(summary.updateTime),
    lineageInBaseSemester: summary.lineageInBaseSemester,
  }
}

export interface CourseStatusSet {
  statuses: Map<string, CourseStatus>
  /** 已完成的学校评价（全部任务），用于按任务统计通过率 */
  evaluations: { courseId: string; result: EvaluationResult }[]
}

/**
 * 可见课程的建设概况。对比学期固定取"上一学期"，各层级请求地址一致，切换层级时命中请求缓存。
 */
export async function loadCourseStatuses(
  collegeId: number,
  semesterId: number | null,
  previousSemester: OrderedSemester | null,
): Promise<CourseStatusSet> {
  const summaries = await fetchCourseSummaries(collegeId, semesterId, previousSemester === null ? null : previousSemester.id)
  const statuses = new Map(summaries.map((summary) => [summary.courseId, buildCourseStatus(summary)]))
  const evaluations = summaries.flatMap((summary) =>
    summary.schoolEvaluations
      .map(toEvaluationResult)
      .filter((result): result is EvaluationResult => result !== null)
      .map((result) => ({ courseId: summary.courseId, result })),
  )
  return { statuses, evaluations }
}

export function requireCourseStatus(statuses: ReadonlyMap<string, CourseStatus>, courseId: string): CourseStatus {
  const status = statuses.get(courseId)
  if (status === undefined) {
    // 概况接口与组织树走同一次可见范围计算，缺课程说明两边口径不一致
    throw new Error(`Course ${courseId} missing from course summaries`)
  }
  return status
}

/* ---------- 汇总 ---------- */

export const STAGE_ORDER: readonly CourseStage[] = ["notStarted", "building", "awaitingEvaluation", "qualified"]

export function countStages(statuses: readonly CourseStatus[]): Record<CourseStage, number> {
  const counts: Record<CourseStage, number> = { notStarted: 0, building: 0, awaitingEvaluation: 0, qualified: 0 }
  statuses.forEach((status) => {
    counts[status.stage] += 1
  })
  return counts
}

/** 课程完成率的平均值；没有课程时为 null */
export function averageCompletion(statuses: readonly CourseStatus[]): number | null {
  if (statuses.length === 0) return null
  const total = statuses.reduce((sum, status) => sum + status.completedItems / COMPLETION_ITEM_COUNT, 0)
  return total / statuses.length
}

export function countQualified(statuses: readonly CourseStatus[]): number {
  return statuses.filter((status) => status.qualified).length
}

/** 已有学校评价出分的课程数，以及其中最近一次评价合格的课程数；比例由调用方在出分课程数大于 0 时计算 */
export function passRate(statuses: readonly CourseStatus[]): { passed: number; scored: number } {
  const scored = statuses.filter((status) => status.latestEvaluation !== null)
  return { passed: scored.filter((status) => status.latestEvaluation !== null && status.latestEvaluation.passed).length, scored: scored.length }
}
