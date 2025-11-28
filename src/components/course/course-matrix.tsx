"use client"

import type { TreeNode } from "@/types"
import { CourseMatrixHeader } from "./course-matrix/components/course-matrix-header"
import { ProjectMatrixTable } from "./course-matrix/components/project-matrix-table"
import { CoursePointManagerDialog } from "./course-matrix/components/course-point-manager-dialog"
import { CoursePointSelectionDialog } from "./course-matrix/components/course-point-selection-dialog"
import { CourseMatrixProvider, useCourseMatrixData } from "./course-matrix/hooks/use-course-matrix-data"

interface CourseMatrixProps {
  node: TreeNode
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
  majorId?: string | number
  onEditTeachingObjectives?: () => void
}

export function CourseMatrix({ node, onUpdateNode, majorId, onEditTeachingObjectives }: CourseMatrixProps) {
  const courseMatrix = useCourseMatrixData({ node, onUpdateNode, majorId })

  return (
    <CourseMatrixProvider value={courseMatrix}>
      <CourseMatrixHeader onEditTeachingObjectives={onEditTeachingObjectives} />
      <ProjectMatrixTable />
      <CoursePointManagerDialog />
      <CoursePointSelectionDialog />
    </CourseMatrixProvider>
  )
}
