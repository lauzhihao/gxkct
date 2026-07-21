"use client"

import { memo } from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react"
import type { FlowEdgeData } from "../utils/types"

// 彩虹渐变颜色（与画布分割线配色一致）
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
 * 支撑关系边组件
 * 用于表示课程体系中各元素之间的支撑关系
 */
export const SupportEdge = memo(function SupportEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
}: EdgeProps<Edge<FlowEdgeData>>) {
  // 计算边的路径（贝塞尔曲线）
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  // 根据支撑强度确定样式
  const isStrong = data?.strength === "strong"
  const strokeWidth = isStrong ? 2.5 : 1.5
  const strokeDasharray = isStrong ? "none" : "5,5"

  // 为每条边生成唯一的渐变 ID
  const gradientId = `rainbow-gradient-${id}`

  return (
    <>
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

      {/* 边路径 */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: `url(#${gradientId})`,
          strokeWidth,
          strokeDasharray,
        }}
      />

      {/* 边标签（可选）- 带悬停效果 */}
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          {/* 支撑强度标签 */}
          {data?.strength && (
            <span
              className={`
                px-1.5 py-0.5 rounded text-xs font-medium
                transition-all duration-150 ease-out
                hover:scale-110 hover:shadow-md cursor-default
                ${isStrong
                  ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }
              `}
            >
              {isStrong ? "H" : "L"}
            </span>
          )}

          {/* 自定义标签 */}
          {data?.label && !data?.strength && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-white border border-gray-200 text-gray-600 shadow-sm transition-all duration-150 ease-out hover:scale-105 hover:shadow-md cursor-default">
              {data.label}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
})

export default SupportEdge
