"use client"

import type { DetailPanelProps } from "./types"
import { UniversityDetail } from "./university-detail"
import { DepartmentDetail } from "./department-detail"
import { MajorDetail } from "./major-detail"
import { CourseDetail } from "./course-detail"
import { FileText } from "lucide-react"

export function DetailPanel(props: DetailPanelProps) {
  const { node } = props

  if (!node) {
    return (
      <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl p-6 flex items-center justify-center min-h-[500px]">
        <div className="text-center text-muted-foreground">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">选择一个节点查看详情</p>
          <p className="text-sm mt-2">点击左侧树形结构中的任意节点</p>
        </div>
      </div>
    )
  }

  // Route to appropriate detail component based on node type
  switch (node.type) {
    case "university":
      return <UniversityDetail {...props} />
    case "department":
      return <DepartmentDetail {...props} />
    case "major":
      return <MajorDetail {...props} />
    case "course":
      return <CourseDetail {...props} />
    default:
      return (
        <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl p-6 flex items-center justify-center min-h-[500px]">
          <div className="text-center text-muted-foreground">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">未知节点类型</p>
          </div>
        </div>
      )
  }
}
