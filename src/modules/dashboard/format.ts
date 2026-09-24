/** 0-1 比例 -> "47.6%" */
export function formatPercent(rate: number, digits = 1): string {
  return `${(rate * 100).toFixed(digits)}%`
}

/** 千分位整数 -> "4,056" */
export function formatCount(value: number): string {
  return value.toLocaleString("zh-CN")
}

/** 评估分：整数原样显示，小数保留一位 */
export function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1)
}

/** 比例；分母为 0 时比例无意义，返回 null 由页面显示 N/A */
export function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null
}
