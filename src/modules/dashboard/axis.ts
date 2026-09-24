const NICE_MULTIPLIERS = [1, 2, 2.5, 5, 10]

/** 计数轴取整刻度：步长取 1/2/2.5/5 × 10^n，刻度从 0 开始 */
export function niceCountTicks(maxValue: number, segments = 4): number[] {
  if (maxValue <= 0) return [0, 1]
  const raw = maxValue / segments
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = NICE_MULTIPLIERS.map((multiplier) => multiplier * magnitude).find((candidate) => candidate >= raw)
  if (step === undefined) {
    throw new Error(`Cannot derive tick step for ${maxValue}`)
  }
  return Array.from({ length: segments + 1 }, (_, index) => index * step)
}
