/** 0-1 比例 -> "47.6%" */
export function formatPercent(rate: number, digits = 1): string {
  return `${(rate * 100).toFixed(digits)}%`
}

/** 百分点差值 -> "+3.2pp" / "-1.0pp" */
export function formatPp(delta: number): string {
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "±"
  return `${sign}${Math.abs(delta).toFixed(1)}pp`
}

/** 带符号的比例变化 -> "+6.9%" */
export function formatSignedPercent(rate: number): string {
  const sign = rate > 0 ? "+" : rate < 0 ? "-" : "±"
  return `${sign}${Math.abs(rate * 100).toFixed(1)}%`
}

/** 千分位整数 -> "4,056"；过万压缩为 "4.1万" */
export function formatCount(value: number, compact = false): string {
  if (compact && value >= 10000) {
    return `${(value / 10000).toFixed(1)}万`
  }
  return value.toLocaleString("zh-CN")
}
