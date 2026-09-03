"use client"

import type { DetailPanelProps } from "./types"
import { UniversityDetail } from "@/modules/universities"
import { DepartmentDetail } from "@/modules/departments"
import { MajorDetail } from "@/modules/majors"
import { CourseDetail } from "@/modules/courses"
import { FileText } from "lucide-react"

export function DetailPanel(props: DetailPanelProps) {
  const { node } = props

  if (!node) {
    return (
      <div className="rounded-md border border-border bg-card p-6 flex items-center justify-center min-h-[500px]">
        <div className="text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm font-medium">选择一个节点查看详情</p>
          <p className="text-[13px] text-muted-foreground mt-1.5">点击左侧树形结构中的任意节点</p>
        </div>
      </div>
    )
  }

  // Route to appropriate detail component based on node type
  const currentUserValue = props.currentUser ?? null
  const handleUpdate = () => {
    if (node?.id) {
      props.onUpdateNode?.(node.id, {})
    }
  }
  const handleDeleteCourse = () => {
    if (node?.id) {
      props.onDeleteNode?.(node.id)
    }
  }
  switch (node.nodeType) {
    case "university":
      return <UniversityDetail {...props} currentUser={currentUserValue} />
    case "department":
      return <DepartmentDetail {...props} currentUser={currentUserValue} />
    case "major":
      return (
        <MajorDetail
          {...(props as Parameters<typeof MajorDetail>[0])}
          currentUser={currentUserValue}
          onUpdate={handleUpdate}
          onDeleteCourse={handleDeleteCourse}
        />
      )
    case "course":
      return <CourseDetail {...props} currentUser={currentUserValue} />
    default:
      return (
        <div className="rounded-md border border-border bg-card p-6 flex items-center justify-center min-h-[500px]">
          <div className="text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium">未知节点类型</p>
          </div>
        </div>
      )
  }
}
