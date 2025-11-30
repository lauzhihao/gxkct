/**
 * 课程项目矩阵主组件
 * 简化后的入口组件,业务逻辑已迁移到容器组件和hooks中
 */

"use client"

import type { CourseProjectMatrixProps } from "@/modules/courses/types"
import { ProjectMatrixContainer } from "./course-project-matrix/ProjectMatrixContainer"

export function CourseProjectMatrix({ node, onUpdate }: CourseProjectMatrixProps) {
  return <ProjectMatrixContainer node={node} onUpdate={onUpdate} />
}
