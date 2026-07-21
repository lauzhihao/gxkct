"use client"

import { memo } from "react"
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"

import type { DemoNodeData } from "./mock-data"

type DemoGraphNode = Node<DemoNodeData, "courseHex" | "supportHex" | "majorRing">

const handleStyle = {
  width: 12,
  height: 12,
  border: "2px solid #0f172a",
  background: "#f8fafc",
}

const CourseHexNode = memo(function CourseHexNode({ data }: NodeProps<DemoGraphNode>) {
  return (
    <div className="graph-hex graph-hex-course">
      <Handle id="top" type="target" position={Position.Top} style={handleStyle} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={handleStyle} />
      <div className="graph-hex-content">
        <div className="graph-hex-caption">课程中心</div>
        <div className="graph-hex-title">{data.label}</div>
        <div className="graph-hex-subtitle">{data.subtitle}</div>
      </div>
    </div>
  )
})

const SupportHexNode = memo(function SupportHexNode({ data }: NodeProps<DemoGraphNode>) {
  return (
    <div className="graph-hex graph-hex-support">
      <div className="graph-hex-content graph-hex-content-compact">
        <div className="graph-hex-code">{data.code}</div>
        <div className="graph-hex-title">{data.label}</div>
        <div className="graph-hex-subtitle">{data.subtitle}</div>
      </div>
    </div>
  )
})

const MajorRingNode = memo(function MajorRingNode({ data }: NodeProps<DemoGraphNode>) {
  return (
    <div className="graph-major-ring">
      <Handle id="top" type="target" position={Position.Top} style={handleStyle} />
      <div className="graph-major-ring-title">{data.label}</div>
      <div className="graph-major-ring-subtitle">{data.subtitle}</div>
    </div>
  )
})

export const graphDemoNodeTypes = {
  courseHex: CourseHexNode,
  supportHex: SupportHexNode,
  majorRing: MajorRingNode,
}
