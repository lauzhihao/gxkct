"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"

import type { DemoNodeData } from "./mock-data"

const handleStyle = {
  width: 12,
  height: 12,
  border: "2px solid #0f172a",
  background: "#f8fafc",
}

const CourseHexNode = memo(function CourseHexNode({ data }: NodeProps<any>) {
  const nodeData = data as unknown as DemoNodeData

  return (
    <div className="graph-hex graph-hex-course">
      <Handle id="top" type="target" position={Position.Top} style={handleStyle} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={handleStyle} />
      <div className="graph-hex-content">
        <div className="graph-hex-caption">课程中心</div>
        <div className="graph-hex-title">{nodeData.label}</div>
        <div className="graph-hex-subtitle">{nodeData.subtitle}</div>
      </div>
    </div>
  )
})

const SupportHexNode = memo(function SupportHexNode({ data }: NodeProps<any>) {
  const nodeData = data as unknown as DemoNodeData

  return (
    <div className="graph-hex graph-hex-support">
      <div className="graph-hex-content graph-hex-content-compact">
        <div className="graph-hex-code">{nodeData.code}</div>
        <div className="graph-hex-title">{nodeData.label}</div>
        <div className="graph-hex-subtitle">{nodeData.subtitle}</div>
      </div>
    </div>
  )
})

const MajorRingNode = memo(function MajorRingNode({ data }: NodeProps<any>) {
  const nodeData = data as unknown as DemoNodeData

  return (
    <div className="graph-major-ring">
      <Handle id="top" type="target" position={Position.Top} style={handleStyle} />
      <div className="graph-major-ring-title">{nodeData.label}</div>
      <div className="graph-major-ring-subtitle">{nodeData.subtitle}</div>
    </div>
  )
})

export const graphDemoNodeTypes = {
  courseHex: CourseHexNode,
  supportHex: SupportHexNode,
  majorRing: MajorRingNode,
}
