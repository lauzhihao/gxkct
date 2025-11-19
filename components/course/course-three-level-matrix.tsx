"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Grid3x3 } from "lucide-react"
import type { TreeNode } from "@/types"
import { CourseMatrix } from "./course-matrix"
import { CourseProjectMatrix } from "./course-project-matrix"
import { CourseMajorMatrix } from "./course-major-matrix"

interface CourseThreeLevelMatrixProps {
  node: TreeNode
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
  treeData?: TreeNode
  majorCourses?: Map<string, TreeNode[]>
}

export function CourseThreeLevelMatrix({ node, onUpdateNode, treeData, majorCourses }: CourseThreeLevelMatrixProps) {
  const metadata = node.metadata || {}

  // 查找当前课程所属的专业节点
  const getMajorNode = (): TreeNode | undefined => {
    if (!majorCourses || !treeData) return undefined

    // 遍历 majorCourses 找到包含当前课程的专业
    for (const [majorId, courses] of majorCourses.entries()) {
      if (courses.some(course => course.id === node.id)) {
        // 从 treeData 中查找该专业节点
        return findNodeById(treeData, majorId)
      }
    }
    return undefined
  }

  const handleUpdateMetadata = (updates: Partial<typeof metadata>) => {
    if (onUpdateNode) {
      onUpdateNode(node.id, { metadata: { ...metadata, ...updates } })
    }
  }

  // 辅助函数：从树中查找节点
  const findNodeById = (root: TreeNode, targetId: string): TreeNode | undefined => {
    if (root.id === targetId) return root
    if (root.children) {
      for (const child of root.children) {
        const found = findNodeById(child, targetId)
        if (found) return found
      }
    }
    return undefined
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Grid3x3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">三级矩阵</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            管理课程目标、课点与章节项目之间的关联关系
          </p>
        </div>
      </div>

      {/* Tabs for Course Matrix, Project Matrix and Major Matrix */}
      <Tabs defaultValue="courseMatrix" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-10 bg-secondary/50">
          <TabsTrigger value="courseMatrix">课程矩阵</TabsTrigger>
          <TabsTrigger value="projectMatrix">项目矩阵</TabsTrigger>
          <TabsTrigger value="majorMatrix">专业矩阵</TabsTrigger>
        </TabsList>

        <TabsContent value="courseMatrix" className="mt-6">
          <CourseMatrix node={node} onUpdateNode={onUpdateNode} />
        </TabsContent>

        <TabsContent value="projectMatrix" className="mt-6">
          <CourseProjectMatrix node={node} onUpdate={handleUpdateMetadata} />
        </TabsContent>

        <TabsContent value="majorMatrix" className="mt-6">
          <CourseMajorMatrix node={node} majorNode={getMajorNode()} onUpdateNode={onUpdateNode} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

