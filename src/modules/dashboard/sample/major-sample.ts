import type { ConstructionStage, CourseMatrixRow, MajorDashboardData } from "@/modules/dashboard/types"
import { buildDepartmentSample } from "@/modules/dashboard/sample/department-sample"
import { createSampleRandom } from "@/modules/dashboard/sample/seeded-random"
import { SAMPLE_COURSES, SAMPLE_TEACHERS } from "@/modules/dashboard/sample/sample-names"

const INDICATOR_POINTS = [["1.1", "3.2"], ["2.1"], ["1.2", "4.1"], ["3.1", "5.2"], ["2.3"], ["4.2", "6.1"]]
const EVALUATION_TERMS = ["2024秋", "2025春", "2025秋", "本学期"]
const STALE_DAYS = [3, 12, 5, 71, 18, 9, 64, 26, 2, 88, 15, 7, 40, 11]
/** 固定的行序置换：决定哪些行先被分配为已达标 / 待评估，避免达标课程全挤在表头 */
const STAGE_ORDER_PERMUTATION = [3, 0, 7, 1, 9, 4, 12, 2, 5, 10, 6, 13, 8, 11]

/** 专业层示例：课程表各行阶段按该专业的达标率 / 完成率分配，保证与 KPI 一致 */
export function buildMajorSample(seed: number, departmentName: string, majorName: string): MajorDashboardData {
  const department = buildDepartmentSample(seed, departmentName)
  const major = department.majorProgress.find((item) => item.majorName === majorName)
  if (!major) {
    throw new Error(`Sample major not found: ${majorName}`)
  }
  const random = createSampleRandom(seed + majorName.length * 131)

  const rowCount = SAMPLE_COURSES.length
  const qualifiedCount = Math.round(rowCount * major.qualifiedRate)
  const completedCount = Math.max(qualifiedCount, Math.round(rowCount * major.completionRate))
  const stageByRow = new Map<number, ConstructionStage>()
  STAGE_ORDER_PERMUTATION.forEach((rowIndex, order) => {
    if (order < qualifiedCount) stageByRow.set(rowIndex, "qualified")
    else if (order < completedCount) stageByRow.set(rowIndex, "awaitingEvaluation")
  })

  const courses: CourseMatrixRow[] = SAMPLE_COURSES.map((courseName, index) => {
    const completedStage = stageByRow.get(index)
    const daysSinceUpdate = STALE_DAYS[index]
    const base = {
      id: `course-${index + 1}`,
      courseName,
      indicatorPoints: INDICATOR_POINTS[index % INDICATOR_POINTS.length],
      lastUpdated: `2026-${daysSinceUpdate > 60 ? "07" : "08"}-${String((index % 27) + 1).padStart(2, "0")}`,
      daysSinceUpdate,
      evaluationRank: null,
    }

    if (completedStage !== undefined) {
      // 已完成的课程：负责人与各项材料齐备，并有评估分
      return {
        ...base,
        ownerName: SAMPLE_TEACHERS[index % SAMPLE_TEACHERS.length],
        setupComplete: true,
        hasSyllabus: true,
        hasLessonPlan: true,
        hasCourseware: true,
        resourceCount: random.count(20, 0.3),
        evaluationScore: random.count(completedStage === "qualified" ? 86 : 78, 0.06),
        stage: completedStage,
      }
    }

    // 未完成的课程：至少缺一项，负责人空缺或齐备项少于两项视为未开始
    const ownerName = index % 2 === 1 ? null : SAMPLE_TEACHERS[index % SAMPLE_TEACHERS.length]
    const flags = {
      setupComplete: index % 3 !== 0,
      hasSyllabus: index % 4 !== 1,
      hasLessonPlan: index % 2 === 0,
      hasCourseware: index % 3 === 2,
    }
    const doneCount = Object.values(flags).filter(Boolean).length
    return {
      ...base,
      ownerName,
      ...flags,
      resourceCount: flags.hasCourseware ? random.count(9, 0.4) : random.count(2, 0.6),
      evaluationScore: null,
      stage: ownerName === null || doneCount < 2 ? "notStarted" : "inProgress",
    }
  })

  // 专业内按评估分排名，只给有分数的课程排名
  const scored = courses.filter((course): course is CourseMatrixRow & { evaluationScore: number } => course.evaluationScore !== null)
  scored
    .sort((left, right) => right.evaluationScore - left.evaluationScore)
    .forEach((course, index) => {
      course.evaluationRank = index + 1
    })

  return {
    overview: {
      majorName: major.majorName,
      gradeLabel: major.gradeLabel,
      departmentName,
      courseCount: major.courseCount,
      completionRate: major.completionRate,
      qualifiedRate: major.qualifiedRate,
    },
    courses,
    warnings: [
      { kind: "ownerMissing", courseNames: courses.filter((course) => course.ownerName === null).map((course) => course.courseName) },
      { kind: "staleOver60Days", courseNames: courses.filter((course) => course.daysSinceUpdate > 60).map((course) => course.courseName) },
      {
        kind: "evaluationUnprepared",
        courseNames: courses.filter((course) => !course.hasSyllabus || !course.setupComplete).map((course) => course.courseName),
      },
    ],
    evaluationTerms: EVALUATION_TERMS,
    evaluationPassScore: 70,
    evaluationRecords: courses.slice(0, 8).map((course, index) => ({
      courseId: course.id,
      courseName: course.courseName,
      results: EVALUATION_TERMS.map((termLabel, termIndex) => ({
        termLabel,
        score: index === 6 && termIndex < 2 ? null : random.count(78 + termIndex * 2 - (index % 4) * 3, 0.08),
      })),
    })),
  }
}
