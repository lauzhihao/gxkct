import type { ConstructionStage, DrilldownRequest } from "@/modules/dashboard/types"
import { SAMPLE_COURSES, SAMPLE_DEPARTMENTS, SAMPLE_MAJORS, SAMPLE_TEACHERS } from "@/modules/dashboard/sample/sample-names"

const STAGE_CYCLE: ConstructionStage[] = ["notStarted", "inProgress", "inProgress", "awaitingEvaluation"]
/** 没有负责人的课程不会走到"已完成待评估" */
const OWNERLESS_STAGE_CYCLE: ConstructionStage[] = ["notStarted", "inProgress"]

export interface DrilldownSampleOptions {
  title: string
  total: number
  /** 限定院系；null 表示全校 */
  departmentName: string | null
  /** all：都有负责人；none：都未设置；mixed：交替 */
  ownerMode: "all" | "none" | "mixed"
  /** 固定阶段；null 表示按未达标阶段轮换 */
  fixedStage: ConstructionStage | null
}

/** 下钻清单示例：生成至多 12 行，total 保留该统计口径的总数 */
export function buildDrilldownSample(options: DrilldownSampleOptions): DrilldownRequest {
  const rowCount = Math.min(options.total, 12)
  return {
    title: options.title,
    total: options.total,
    courses: Array.from({ length: rowCount }, (_, index) => {
      const hasOwner = options.ownerMode === "all" || (options.ownerMode === "mixed" && index % 2 === 0)
      return {
        id: `drill-${index + 1}`,
        courseName: SAMPLE_COURSES[index % SAMPLE_COURSES.length],
        majorName: SAMPLE_MAJORS[index % SAMPLE_MAJORS.length].name,
        departmentName:
          options.departmentName !== null
            ? options.departmentName
            : SAMPLE_DEPARTMENTS[(index * 7) % SAMPLE_DEPARTMENTS.length],
        ownerName: hasOwner ? SAMPLE_TEACHERS[index % SAMPLE_TEACHERS.length] : null,
        stage:
          options.fixedStage !== null
            ? options.fixedStage
            : hasOwner
              ? STAGE_CYCLE[index % STAGE_CYCLE.length]
              : OWNERLESS_STAGE_CYCLE[index % OWNERLESS_STAGE_CYCLE.length],
        lastUpdated: `2026-0${7 + (index % 2)}-${String(((index * 3) % 28) + 1).padStart(2, "0")}`,
      }
    }),
  }
}
