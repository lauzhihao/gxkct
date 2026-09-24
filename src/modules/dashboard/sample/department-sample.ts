import type { DepartmentDashboardData, MajorProgress, StageCount } from "@/modules/dashboard/types"
import { buildSchoolSample } from "@/modules/dashboard/sample/school-sample"
import { createSampleRandom } from "@/modules/dashboard/sample/seeded-random"
import { SAMPLE_COURSES, SAMPLE_MAJORS, SAMPLE_TEACHERS } from "@/modules/dashboard/sample/sample-names"
import { countOfStage } from "@/modules/dashboard/stage-utils"

/**
 * 各专业达标率 = 本系达标率 × 系数（按课程数加权后系数均值约为 1），
 * 这样专业明细加总回去与本系达标率基本一致；完成率在达标率之上再加一段"已完成待评估"。
 */
const MAJOR_BASE = [
  { courses: 32, qualifiedFactor: 1.3, completionLift: 0.2 },
  { courses: 29, qualifiedFactor: 1.15, completionLift: 0.22 },
  { courses: 27, qualifiedFactor: 1.05, completionLift: 0.2 },
  { courses: 24, qualifiedFactor: 0.9, completionLift: 0.24 },
  { courses: 26, qualifiedFactor: 0.75, completionLift: 0.22 },
  { courses: 22, qualifiedFactor: 0.6, completionLift: 0.18 },
]

function buildStages(courseCount: number, completionRate: number, qualifiedRate: number): StageCount[] {
  const qualified = Math.round(courseCount * qualifiedRate)
  const completed = Math.round(courseCount * completionRate)
  const awaitingEvaluation = Math.max(0, completed - qualified)
  const notStarted = Math.round((courseCount - completed) * 0.35)
  const inProgress = courseCount - qualified - awaitingEvaluation - notStarted
  return [
    { stage: "notStarted", count: notStarted },
    { stage: "inProgress", count: inProgress },
    { stage: "awaitingEvaluation", count: awaitingEvaluation },
    { stage: "qualified", count: qualified },
  ]
}

/** 院系层示例：达标率与全校排名取自校级示例中同名院系，保证下钻前后数字一致 */
export function buildDepartmentSample(seed: number, departmentName: string): DepartmentDashboardData {
  const school = buildSchoolSample(seed)
  const random = createSampleRandom(seed + departmentName.length * 97)

  const rankIndex = school.departmentRanking.findIndex((item) => item.departmentName === departmentName)
  if (rankIndex < 0) {
    throw new Error(`Sample department not found: ${departmentName}`)
  }
  const departmentRate = school.departmentRanking[rankIndex].qualifiedRate

  const majorProgress: MajorProgress[] = SAMPLE_MAJORS.map((major, index) => {
    const base = MAJOR_BASE[index]
    const qualifiedRate = Math.min(0.95, random.rate(departmentRate * base.qualifiedFactor, 0.015))
    const completionRate = Math.min(0.97, qualifiedRate + base.completionLift)
    return {
      majorId: `major-${index + 1}`,
      majorName: major.name,
      gradeLabel: major.grade,
      courseCount: base.courses,
      completionRate,
      qualifiedRate,
      stages: buildStages(base.courses, completionRate, qualifiedRate),
    }
  })

  const courseTotal = majorProgress.reduce((sum, major) => sum + major.courseCount, 0)
  const stageTotal = (stage: StageCount["stage"]) =>
    majorProgress.reduce((sum, major) => sum + countOfStage(major.stages, stage), 0)

  const registeredTeacherCount = 58
  const participatingTeacherCount = random.count(52, 0.05)
  const schoolTeacherRate = school.overview.participatingTeacherCount / school.overview.registeredTeacherCount

  return {
    overview: {
      departmentName,
      courseTotal,
      inProgressCount: stageTotal("inProgress"),
      notStartedCount: stageTotal("notStarted"),
      participatingTeacherCount: Math.min(participatingTeacherCount, registeredTeacherCount),
      registeredTeacherCount,
      qualifiedRate: departmentRate,
      schoolRank: rankIndex + 1,
      departmentCount: school.departmentRanking.length,
    },
    majorProgress,
    comparison: [
      { key: "qualifiedRate", label: "达标率", unit: "rate", departmentValue: departmentRate, schoolAverage: school.overview.qualifiedRate },
      {
        key: "teacherRate",
        label: "教师参与率",
        unit: "rate",
        departmentValue: Math.min(participatingTeacherCount, registeredTeacherCount) / registeredTeacherCount,
        schoolAverage: schoolTeacherRate,
      },
      { key: "resourcePerCourse", label: "课均资源量", unit: "count", departmentValue: random.count(12.6 * 10, 0.08) / 10, schoolAverage: 10.2 },
      { key: "evaluationRate", label: "评估通过率", unit: "rate", departmentValue: random.rate(0.912, 0.02), schoolAverage: school.overview.evaluationPassRate },
      { key: "updateFrequency", label: "月均更新次数", unit: "count", departmentValue: random.count(3.1 * 10, 0.1) / 10, schoolAverage: 3.6 },
    ],
    breakpoints: [
      { kind: "noOwner", count: random.count(28, 0.15) },
      { kind: "noSyllabus", count: random.count(17, 0.15) },
      { kind: "noLessonPlanOrCourseware", count: random.count(41, 0.12) },
      { kind: "noResource", count: random.count(15, 0.15) },
    ],
    unqualifiedCourses: SAMPLE_COURSES.slice(0, 8).map((courseName, index) => ({
      id: `uq-${index + 1}`,
      courseName,
      majorName: SAMPLE_MAJORS[index % SAMPLE_MAJORS.length].name,
      ownerName: index % 3 === 0 ? null : SAMPLE_TEACHERS[index % SAMPLE_TEACHERS.length],
      stage: index % 2 === 0 ? "inProgress" : "notStarted",
      missing: [["大纲", "教案"], ["课件"], ["负责人", "资源"], ["教案", "课件"]][index % 4],
    })),
    idleTeachers: SAMPLE_TEACHERS.slice(5, 10).map((teacherName, index) => ({
      id: `idle-${index + 1}`,
      teacherName,
      majorName: SAMPLE_MAJORS[(index + 2) % SAMPLE_MAJORS.length].name,
      courseCount: (index % 3) + 1,
      lastActiveDate: index === 0 ? null : `2026-0${6 - (index % 3)}-1${index}`,
    })),
    tasks: [
      { id: "task-1", kind: "evaluation", title: "2026 秋季课程质量评价", courseName: "数据结构", deadline: "2026-09-30", status: "dueSoon" },
      { id: "task-2", kind: "rectification", title: "课程目标与毕业要求对应不完整", courseName: "Web 前端开发", deadline: "2026-09-10", status: "overdue" },
      { id: "task-3", kind: "evaluation", title: "2026 秋季课程质量评价", courseName: "Linux 操作系统", deadline: "2026-09-30", status: "dueSoon" },
      { id: "task-4", kind: "rectification", title: "教案课时与大纲不一致", courseName: "Python 数据分析", deadline: "2026-10-15", status: "pending" },
      { id: "task-5", kind: "rectification", title: "缺少过程性考核材料", courseName: "移动应用开发", deadline: "2026-09-05", status: "overdue" },
      { id: "task-6", kind: "evaluation", title: "专业认证自评", courseName: "软件工程导论", deadline: "2026-10-20", status: "pending" },
    ],
  }
}
