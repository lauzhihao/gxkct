"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent } from "@/shared/components/ui/tabs"
import { UnderlineTabsList, UnderlineTabsTrigger } from "@/shared/components/ui/underline-tabs"
import type { TreeNode } from "@/types"
import { CourseMatrix } from "./course-matrix"
import { CourseProjectMatrix } from "./course-project-matrix"
import { CourseMajorMatrix } from "./course-major-matrix"

interface CourseThreeLevelMatrixProps {
  node: TreeNode
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
  treeData?: TreeNode
  majorId?: string | number
  refreshToken?: number
  courseEditable?: boolean
  onEditTeachingObjectives?: () => void
  activeMatrixTab?: string
  onActiveMatrixTabChange?: (tab: string) => void
}

export function CourseThreeLevelMatrix({ node, onUpdateNode, treeData, majorId, refreshToken, courseEditable = false, onEditTeachingObjectives, activeMatrixTab = "majorMatrix", onActiveMatrixTabChange }: CourseThreeLevelMatrixProps) {
  const [majorNode, setMajorNode] = useState<TreeNode | undefined>(undefined)

  // 处理项目矩阵更新回调（空实现，因为 metadata 已移除）
  const handleUpdateMetadata = (updates: Record<string, any>) => {
    // 空回调 - 项目矩阵数据不再被保存到 metadata
    console.log("[CourseThreeLevelMatrix] 项目矩阵更新:", updates)
  }

  // 查找当前课程所属的专业节点
  useEffect(() => {
    if (!treeData) {
      setMajorNode(undefined)
      return
    }

    // 从 treeData 中查找第一个包含当前课程的专业
    const findMajorWithCourse = (root: TreeNode): TreeNode | undefined => {
      if (root.nodeType === "major" && root.children?.some(child => child.nodeId === node.nodeId)) {
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
  }, [node.nodeId, treeData])

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
          <CourseMajorMatrix node={node} majorNode={majorNode} majorId={majorId} courseEditable={courseEditable} />
        </TabsContent>

        <TabsContent value="courseMatrix" className="mt-2 pb-2.5">
          <CourseMatrix node={node} onUpdateNode={onUpdateNode} majorId={majorId} refreshToken={refreshToken} courseEditable={courseEditable} onEditTeachingObjectives={onEditTeachingObjectives} />
        </TabsContent>

        <TabsContent value="projectMatrix" className="mt-2 pb-2.5">
          <CourseProjectMatrix node={node} onUpdate={handleUpdateMetadata} majorId={majorId} courseEditable={courseEditable} />
        </TabsContent>
      </Tabs>
    </>
  )
}
