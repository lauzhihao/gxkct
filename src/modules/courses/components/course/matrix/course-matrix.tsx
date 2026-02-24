"use client"

import type { TreeNode } from "@/types"
import { CourseMatrixHeader } from "./course-matrix/course-matrix-header"
import { ProjectMatrixTable } from "./course-matrix/project-matrix-table"
import { CoursePointManagerDialog } from "../../dialogs/course-point-manager-dialog"
import { CoursePointSelectionDialog } from "../../dialogs/course-point-selection-dialog"
import { CourseMatrixProvider, useCourseMatrixData } from "@/modules/courses/hooks/use-course-matrix-data"

interface CourseMatrixProps {
  node: TreeNode
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
  majorId?: string | number
  courseEditable?: boolean
  onEditTeachingObjectives?: () => void
}

export function CourseMatrix({ node, onUpdateNode, majorId, courseEditable = false, onEditTeachingObjectives }: CourseMatrixProps) {
  const courseMatrix = useCourseMatrixData({ node, onUpdateNode, majorId })

  return (
    <CourseMatrixProvider value={courseMatrix}>
      <CourseMatrixHeader courseEditable={courseEditable} onEditTeachingObjectives={onEditTeachingObjectives} />
      <ProjectMatrixTable courseEditable={courseEditable} />
      <CoursePointManagerDialog />
      <CoursePointSelectionDialog />
    </CourseMatrixProvider>
  )
}
