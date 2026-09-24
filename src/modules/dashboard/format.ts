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

/** 变化率 -> "+3.2%" / "-1.0%" / "0.0%" */
export function formatSignedPercent(rate: number, digits = 1): string {
  const text = formatPercent(Math.abs(rate), digits)
  if (Number((rate * 100).toFixed(digits)) === 0) return formatPercent(0, digits)
  return rate > 0 ? `+${text}` : `-${text}`
}

/** 比例差 -> "+3.2 个百分点" / "-1.0 个百分点" / "持平" */
export function formatPointChange(delta: number, digits = 1): string {
  const points = Number((delta * 100).toFixed(digits))
  if (points === 0) return "持平"
  return `${points > 0 ? "+" : "-"}${Math.abs(points).toFixed(digits)} 个百分点`
}

/** 比例；分母为 0 时比例无意义，返回 null 由页面显示 N/A */
export function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null
}
