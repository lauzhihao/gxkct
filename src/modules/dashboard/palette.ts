/**
 * 看板数据色。与主题色（--primary）解耦：用户切换主题色不应改变数据编码。
 * 已用 dataviz validate_palette.js 在白色卡片面（#ffffff）上校验通过。
 * 当前只有比例条使用蓝色；其余分类色为后续图表接入真实数据时保留的固定顺序。
 */
export const SERIES_COLORS = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  yellow: "#eda100",
} as const
