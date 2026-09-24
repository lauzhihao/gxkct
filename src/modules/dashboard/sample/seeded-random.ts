/**
 * 示例数据用的确定性随机数：同一学期种子每次渲染结果一致，
 * 切换学期时数字随之变化，用来演示"学期切换全局生效"。
 */
export interface SampleRandom {
  /** 在 base 上下浮动 spread 比例后取整 */
  count: (base: number, spread?: number) => number
  /** 在 base 上下浮动 spread（绝对值）后截断到 [0, 1] */
  rate: (base: number, spread?: number) => number
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createSampleRandom(seed: number): SampleRandom {
  const next = mulberry32(seed * 2654435761)
  return {
    count: (base, spread = 0.06) => Math.max(0, Math.round(base * (1 + (next() - 0.5) * 2 * spread))),
    rate: (base, spread = 0.015) => Math.min(1, Math.max(0, base + (next() - 0.5) * 2 * spread)),
  }
}
