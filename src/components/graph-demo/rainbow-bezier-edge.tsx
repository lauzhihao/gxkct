"use client"

import { memo } from "react"
import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react"

const RAINBOW_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
]

export const RainbowBezierEdge = memo(function RainbowBezierEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const gradientId = `graph-demo-rainbow-${id}`

  return (
    <>
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

      <BaseEdge
        id={id}
        path={edgePath}
        className="graph-rainbow-bezier-edge"
        style={{
          stroke: `url(#${gradientId})`,
          strokeWidth: 2.5,
          strokeDasharray: "10 8",
          strokeLinecap: "round",
        }}
      />
    </>
  )
})
