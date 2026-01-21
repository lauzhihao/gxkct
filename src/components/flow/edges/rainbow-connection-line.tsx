"use client"

import {
  getBezierPath,
  type ConnectionLineComponentProps,
} from "@xyflow/react"

// 彩虹渐变颜色（与 SupportEdge 保持一致）
const RAINBOW_COLORS = [
  "#f79533",
  "#f37055",
  "#ef4e7b",
  "#a166ab",
  "#5073b8",
  "#1098ad",
  "#07b39b",
]

/**
 * 彩虹色虚线连接线组件
 * 用于拖拽连接时显示的临时连接线
 */
export function RainbowConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
}: ConnectionLineComponentProps) {
  // 计算贝塞尔曲线路径
  const [path] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  })

  // 渐变 ID（连接线只有一条，使用固定 ID）
  const gradientId = "rainbow-connection-gradient"

  return (
    <g>
      {/* SVG 渐变定义 */}
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          {RAINBOW_COLORS.map((color, index) => (
            <stop
              key={color}
              offset={`${(index / (RAINBOW_COLORS.length - 1)) * 100}%`}
              stopColor={color}
            />
          ))}
        </linearGradient>
      </defs>

      {/* 连接线路径 - 彩虹色虚线 */}
      <path
        d={path}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={2}
        strokeDasharray="6,4"
        className="animated"
      />
    </g>
  )
}

export default RainbowConnectionLine
