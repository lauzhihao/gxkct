import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 从nodeId中提取数字ID
// 例如："dept_266" -> 266, "course_2334" -> 2334
export function extractNumericId(nodeId: string): number {
  const match = nodeId.match(/\d+/)
  return match ? Number(match[0]) : 0
}
