import type { SchoolDashboardData, StageCount } from "@/modules/dashboard/types"
import { createSampleRandom } from "@/modules/dashboard/sample/seeded-random"
import { SAMPLE_COURSES, SAMPLE_DEPARTMENTS } from "@/modules/dashboard/sample/sample-names"

const DEPARTMENT_BASE_RATES = [0.748, 0.714, 0.669, 0.632, 0.613, 0.586, 0.55, 0.524, 0.478, 0.421, 0.355, 0.312]

const RECENT_ACTIONS = ["更新了课件", "上传了教学视频", "完善了课程矩阵", "提交了自评材料", "补充了习题库", "修订了教学大纲"]

export function buildSchoolSample(seed: number): SchoolDashboardData {
  const random = createSampleRandom(seed)

  const courseTotal = random.count(4056, 0.04)
  const qualifiedRate = random.rate(0.476, 0.02)
  const qualifiedCourseCount = Math.round(courseTotal * qualifiedRate)
  const awaitingEvaluation = Math.round(courseTotal * random.rate(0.151, 0.01))
  const notStarted = Math.round(courseTotal * random.rate(0.121, 0.01))
  const inProgress = courseTotal - qualifiedCourseCount - awaitingEvaluation - notStarted

  const stageDistribution: StageCount[] = [
    { stage: "notStarted", count: notStarted },
    { stage: "inProgress", count: inProgress },
    { stage: "awaitingEvaluation", count: awaitingEvaluation },
    { stage: "qualified", count: qualifiedCourseCount },
  ]

  const registeredTeacherCount = 526
  const participatingTeacherCount = random.count(486, 0.03)
  // KPI 卡与待办预警引用同一个数，避免两处对不上
  const overdueRectificationCount = random.count(36, 0.15)
  const ownerMissingCount = random.count(102, 0.1)

  return {
    overview: {
      departmentCount: SAMPLE_DEPARTMENTS.length,
      majorCount: 130,
      courseTotal,
      newCourseCount: random.count(263, 0.12),
      courseYoyRate: random.rate(0.069, 0.01),
      departmentArchiveCoverage: 1,
      qualifiedCourseCount,
      qualifiedRate,
      qualifiedRateDeltaPp: Number(random.rate(0.032, 0.006).toFixed(3)) * 100,
      participatingTeacherCount: Math.min(participatingTeacherCount, registeredTeacherCount),
      registeredTeacherCount,
      evaluationPassRate: random.rate(0.935, 0.01),
      evaluatedCourseCount: random.count(402, 0.08),
      evaluationPassRateDeltaPp: Number(random.rate(0.011, 0.004).toFixed(3)) * 100,
      overdueRectificationCount,
      ownerMissingCount,
    },
    stageDistribution,
    departmentRanking: SAMPLE_DEPARTMENTS.map((departmentName, index) => ({
      departmentId: `dept-${index + 1}`,
      departmentName,
      qualifiedRate: random.rate(DEPARTMENT_BASE_RATES[index], 0.012),
    })).sort((left, right) => right.qualifiedRate - left.qualifiedRate),
    monthlyActivity: [
      { month: "4月", newCourses: random.count(38, 0.2), resourceUpdates: random.count(126, 0.1) },
      { month: "5月", newCourses: random.count(52, 0.2), resourceUpdates: random.count(178, 0.1) },
      { month: "6月", newCourses: random.count(57, 0.2), resourceUpdates: random.count(236, 0.1) },
      { month: "7月", newCourses: random.count(64, 0.2), resourceUpdates: random.count(308, 0.1) },
      { month: "8月", newCourses: random.count(58, 0.2), resourceUpdates: random.count(287, 0.1) },
      { month: "9月", newCourses: random.count(47, 0.2), resourceUpdates: random.count(352, 0.1) },
    ],
    passRateTrend: [
      { termLabel: "2022秋", passRate: random.rate(0.871, 0.004) },
      { termLabel: "2023春", passRate: random.rate(0.884, 0.004) },
      { termLabel: "2023秋", passRate: random.rate(0.893, 0.004) },
      { termLabel: "2024春", passRate: random.rate(0.906, 0.004) },
      { termLabel: "2024秋", passRate: random.rate(0.912, 0.004) },
      { termLabel: "2025春", passRate: random.rate(0.918, 0.004) },
      { termLabel: "2025秋", passRate: random.rate(0.924, 0.004) },
      { termLabel: "本学期", passRate: random.rate(0.935, 0.004) },
    ],
    passRateTarget: 0.9,
    resourceStats: [
      { category: "document", count: random.count(17860) },
      { category: "video", count: random.count(9420) },
      { category: "questionBank", count: random.count(11380) },
      { category: "other", count: random.count(2340) },
    ],
    recentUpdates: SAMPLE_COURSES.slice(0, 10).map((courseName, index) => ({
      id: `update-${index + 1}`,
      date: `09-${String(3 - Math.floor(index / 4)).padStart(2, "0")}`,
      courseName,
      departmentName: SAMPLE_DEPARTMENTS[(index * 5 + seed) % SAMPLE_DEPARTMENTS.length],
      action: RECENT_ACTIONS[index % RECENT_ACTIONS.length],
    })),
    warnings: [
      {
        kind: "overdueRectification",
        count: overdueRectificationCount,
        topDepartmentName: "建筑工程系",
        topDepartmentCount: random.count(9, 0.2),
      },
      {
        kind: "ownerMissing",
        count: ownerMissingCount,
        topDepartmentName: "信息工程学院",
        topDepartmentCount: random.count(28, 0.15),
      },
      {
        kind: "evaluationDueSoon",
        count: random.count(21, 0.15),
        topDepartmentName: "医学院",
        topDepartmentCount: random.count(6, 0.2),
      },
      {
        kind: "staleOver60Days",
        count: random.count(47, 0.12),
        topDepartmentName: "经济管理学院",
        topDepartmentCount: random.count(11, 0.2),
      },
      {
        kind: "zeroResource",
        count: random.count(83, 0.1),
        topDepartmentName: "机电工程学院",
        topDepartmentCount: random.count(15, 0.2),
      },
    ],
  }
}
