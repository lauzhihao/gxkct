import type { TeacherDashboardData } from "@/modules/dashboard/types"
import { createSampleRandom } from "@/modules/dashboard/sample/seeded-random"

export function buildTeacherSample(seed: number): TeacherDashboardData {
  const random = createSampleRandom(seed + 7)
  return {
    teacherName: "示例教师",
    departmentName: "信息工程学院",
    courses: [
      {
        id: "my-1",
        courseName: "数据结构",
        majorName: "软件技术",
        progress: random.rate(0.92, 0.03),
        stage: "qualified",
        matrix: { level1: true, level2: true, level3: true },
        ksa: { knowledge: random.count(14, 0.1), skill: random.count(9, 0.1), attitude: random.count(4, 0.2) },
      },
      {
        id: "my-2",
        courseName: "Web 前端开发",
        majorName: "软件技术",
        progress: random.rate(0.74, 0.04),
        stage: "awaitingEvaluation",
        matrix: { level1: true, level2: true, level3: false },
        ksa: { knowledge: random.count(11, 0.1), skill: random.count(12, 0.1), attitude: random.count(3, 0.2) },
      },
      {
        id: "my-3",
        courseName: "Python 数据分析",
        majorName: "大数据技术",
        progress: random.rate(0.46, 0.05),
        stage: "inProgress",
        matrix: { level1: true, level2: false, level3: false },
        ksa: { knowledge: random.count(7, 0.15), skill: random.count(5, 0.15), attitude: random.count(1, 0.3) },
      },
      {
        id: "my-4",
        courseName: "云计算技术基础",
        majorName: "计算机应用技术",
        progress: random.rate(0.08, 0.03),
        stage: "notStarted",
        matrix: { level1: false, level2: false, level3: false },
        ksa: { knowledge: 0, skill: 0, attitude: 0 },
      },
    ],
    todos: [
      { id: "todo-1", kind: "missingMaterial", courseName: "Python 数据分析", detail: "缺教案（第 5-8 周）", deadline: null },
      { id: "todo-2", kind: "missingMaterial", courseName: "云计算技术基础", detail: "缺教学大纲、课件", deadline: null },
      { id: "todo-3", kind: "dueSoon", courseName: "Web 前端开发", detail: "2026 秋季课程质量评价 - 教师自评", deadline: "2026-09-30" },
      { id: "todo-4", kind: "dueSoon", courseName: "数据结构", detail: "期中过程性考核材料上传", deadline: "2026-10-12" },
      { id: "todo-5", kind: "returned", courseName: "Web 前端开发", detail: "自评材料被退回：课程目标达成度计算缺少依据", deadline: "2026-09-20" },
    ],
    resources: [
      { key: "syllabus", label: "教学大纲", uploaded: 3, required: 4 },
      { key: "lessonPlan", label: "教案", uploaded: random.count(38, 0.1), required: 48 },
      { key: "courseware", label: "课件", uploaded: random.count(41, 0.1), required: 48 },
      { key: "video", label: "教学视频", uploaded: random.count(9, 0.2), required: 16 },
      { key: "questionBank", label: "习题库", uploaded: random.count(126, 0.1), required: 160 },
    ],
    evaluations: [
      { id: "ev-1", courseName: "数据结构", termLabel: "2025秋", score: 91, level: "A", comment: null, rectifyDeadline: null },
      { id: "ev-2", courseName: "Web 前端开发", termLabel: "2025秋", score: 78, level: "B", comment: "课程目标与毕业要求指标点对应关系需补充说明", rectifyDeadline: "2026-09-20" },
      { id: "ev-3", courseName: "数据结构", termLabel: "2025春", score: 86, level: "A", comment: null, rectifyDeadline: null },
      { id: "ev-4", courseName: "Python 数据分析", termLabel: "2025春", score: 64, level: "C", comment: "实践学时安排与大纲不一致，过程性考核材料不全", rectifyDeadline: "2026-10-15" },
    ],
    departmentPercentile: random.rate(0.62, 0.04),
  }
}
