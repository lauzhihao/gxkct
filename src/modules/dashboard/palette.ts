import type { CourseStage } from "@/modules/dashboard/types"

/**
 * 看板数据色。与主题色（--primary）解耦：用户切换主题色不应改变数据编码。
 * 已用 dataviz validate_palette.js 在白色卡片面（#ffffff）上校验通过。
 * 比例条与单系列柱图用蓝色；其余分类色为后续图表接入时保留的固定顺序。
 */
export const SERIES_COLORS = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  yellow: "#eda100",
} as const

/** 建设阶段是有先后的等级，用同一蓝色相由浅到深（validate_palette.js --ordinal 校验通过） */
export const STAGE_COLORS: Record<CourseStage, string> = {
  notStarted: "#86b6ef",
  building: "#5598e7",
  awaitingEvaluation: "#2a78d6",
  qualified: "#184f95",
}
