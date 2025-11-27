"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { UnderlineTabsList, UnderlineTabsTrigger } from "@/components/ui/underline-tabs"
import type { TreeNode } from "@/types"
import { CourseMatrix } from "./course-matrix"
import { CourseProjectMatrix } from "./course-project-matrix"
import { CourseMajorMatrix } from "./course-major-matrix"

interface CourseThreeLevelMatrixProps {
  node: TreeNode
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
  treeData?: TreeNode
  majorCourses?: Map<string, TreeNode[]>
  majorId?: string | number
  onEditTeachingObjectives?: () => void
  activeMatrixTab?: string
  onActiveMatrixTabChange?: (tab: string) => void
}

export function CourseThreeLevelMatrix({ node, onUpdateNode, treeData, majorCourses, majorId, onEditTeachingObjectives, activeMatrixTab = "majorMatrix", onActiveMatrixTabChange }: CourseThreeLevelMatrixProps) {
  const metadata = node.metadata || {}
  const [majorNode, setMajorNode] = useState<TreeNode | undefined>(undefined)

  // 查找当前课程所属的专业节点
  useEffect(() => {
    if (!treeData) {
      setMajorNode(undefined)
      return
    }

    // 从 treeData 中查找第一个包含当前课程的专业
    const findMajorWithCourse = (root: TreeNode): TreeNode | undefined => {
      if (root.type === "major" && root.children?.some(child => child.id === node.id)) {
        return root
      }
      if (root.children) {
        for (const child of root.children) {
          const found = findMajorWithCourse(child)
          if (found) return found
        }
      }
      return undefined
    }

    const found = findMajorWithCourse(treeData)
    setMajorNode(found)
  }, [node.id, treeData])

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
    <>
      {/* Tabs for Course Matrix, Project Matrix and Major Matrix */}
      <Tabs value={activeMatrixTab} onValueChange={onActiveMatrixTabChange} className="w-full">
        <UnderlineTabsList className="grid grid-cols-3">
          <UnderlineTabsTrigger value="majorMatrix">专业矩阵</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="courseMatrix">课程矩阵</UnderlineTabsTrigger>
          <UnderlineTabsTrigger value="projectMatrix">项目矩阵</UnderlineTabsTrigger>
        </UnderlineTabsList>

        <TabsContent value="majorMatrix" className="mt-2 pb-2.5">
          <CourseMajorMatrix node={node} majorNode={majorNode} majorId={majorId} onUpdateNode={onUpdateNode} />
        </TabsContent>

        <TabsContent value="courseMatrix" className="mt-2 pb-2.5">
          <CourseMatrix node={node} onUpdateNode={onUpdateNode} majorId={majorId} onEditTeachingObjectives={onEditTeachingObjectives} />
        </TabsContent>

        <TabsContent value="projectMatrix" className="mt-2 pb-2.5">
          <CourseProjectMatrix node={node} onUpdate={handleUpdateMetadata} />
        </TabsContent>
      </Tabs>
    </>
  )
}

