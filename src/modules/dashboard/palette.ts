import type { ConstructionStage, ResourceCategory } from "@/modules/dashboard/types"

/**
 * 看板数据色。与主题色（--primary）解耦：用户切换主题色不应改变数据编码。
 * 已用 dataviz validate_palette.js 在白色卡片面（#ffffff）上校验：
 * - 分类 4 色：全部通过；青/黄对比度 < 3:1，因此资源分布必须带可见的数值标签
 * - 建设阶段序数色阶（单一蓝色相，浅 -> 深）：全部通过
 */
export const SERIES_COLORS = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  yellow: "#eda100",
} as const

/** 有序阶段用同一色相由浅到深，阶段越靠后颜色越深 */
export const STAGE_COLORS: Record<ConstructionStage, string> = {
  notStarted: "#86b6ef",
  inProgress: "#3987e5",
  awaitingEvaluation: "#256abf",
  qualified: "#104281",
}

export const RESOURCE_COLORS: Record<ResourceCategory, string> = {
  document: SERIES_COLORS.blue,
  video: SERIES_COLORS.orange,
  questionBank: SERIES_COLORS.aqua,
  other: SERIES_COLORS.yellow,
}

/** 去强调的中性灰，用于"其余"数据 */
export const DEEMPHASIS_COLOR = "#c3c7cf"

/** 状态色沿用设计 token，只用于真正表示好坏的标记，且总是配图标或文字 */
export const STATUS_COLORS = {
  critical: "var(--destructive)",
  warning: "var(--warning)",
  good: "var(--success)",
} as const
