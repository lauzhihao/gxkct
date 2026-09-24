import type { ConstructionStage, StageCount } from "@/modules/dashboard/types"

/** 取某阶段的课程数；阶段缺失说明数据不完整，直接报错而不是按 0 处理 */
export function countOfStage(stages: StageCount[], stage: ConstructionStage): number {
  const found = stages.find((item) => item.stage === stage)
  if (!found) {
    throw new Error(`Stage count missing: ${stage}`)
  }
  return found.count
}

export function sumStages(stages: StageCount[]): number {
  return stages.reduce((sum, item) => sum + item.count, 0)
}
