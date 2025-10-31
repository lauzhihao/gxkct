"use client"
import { useState } from "react"
import type { DetailPanelProps } from "./types"
import { BookOpen, Calendar, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion } from "@/components/ui/accordion"
import AddCourseForm from "@/components/add-course-form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CourseBasicInfo } from "@/components/course/course-basic-info"
import { CourseTeachingObjectives } from "@/components/course/course-teaching-objectives"
import { CoursePoints } from "@/components/course/course-points"
import { CourseChapters } from "@/components/course/course-chapters"
import { CourseResources } from "@/components/course/course-resources"
import { CourseMatrix } from "@/components/course/course-matrix"
import { CourseSupervision } from "@/components/course/course-supervision"
import { CourseProjectMatrix } from "@/components/course/course-project-matrix"

export function CourseDetail({ node, onEdit, onDelete, onUpdateNode, onNodeSelect }: DetailPanelProps) {
  const metadata = node.metadata || {}
  const [isEditingCourse, setIsEditingCourse] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  if (!node || node.type !== "course") return null

  const handleUpdateMetadata = (updates: Partial<typeof metadata>) => {
    if (onUpdateNode) {
      onUpdateNode(node.id, { metadata: { ...metadata, ...updates } })
    }
  }

  const handleEditCourseFormSubmit = (courseData: any) => {
    if (onUpdateNode) {
      onUpdateNode(node.id, courseData)
      setIsEditingCourse(false)
    }
  }

  const handleDeleteNode = (nodeId: string) => {
    if (onDelete) {
      onDelete(nodeId)
    }
    if (node?.id === nodeId && onNodeSelect) {
      onNodeSelect(null)
    }
    setIsDeleteDialogOpen(false)
  }

  if (isEditingCourse && node?.type === "course") {
    return (
      <AddCourseForm
        majorId={node.parentId || node.id}
        onCancel={() => setIsEditingCourse(false)}
        onSubmit={handleEditCourseFormSubmit}
        initialData={node}
        isEditMode={true}
      />
    )
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{node.name}</h2>
                <div className="flex flex-wrap gap-2">
                  {metadata.courseType && <Badge variant="secondary">{metadata.courseType}</Badge>}
                  {metadata.courseNature && <Badge variant="outline">{metadata.courseNature}</Badge>}
                  {metadata.openingDate && (
                    <Badge variant="outline">
                      <Calendar className="w-3 h-3 mr-1" />
                      {metadata.openingDate}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {onUpdateNode && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingCourse(true)}
                  className="gap-2 hover:bg-primary/10"
                >
                  <Pencil className="w-4 h-4 text-primary" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="gap-2 hover:bg-red-500/10 text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="w-full grid grid-cols-5 h-10 bg-secondary/50">
              <TabsTrigger value="info">课程信息</TabsTrigger>
              <TabsTrigger value="resources">课程资源</TabsTrigger>
              <TabsTrigger value="matrix">课程矩阵</TabsTrigger>
              <TabsTrigger value="projectMatrix">项目矩阵</TabsTrigger>
              <TabsTrigger value="supervision">督导评分</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6 mt-4">
              <CourseBasicInfo name={node.name} metadata={metadata} />

              <Accordion type="multiple" className="space-y-4">
                {metadata.teachingObjectives && metadata.teachingObjectives.length > 0 && (
                  <CourseTeachingObjectives objectives={metadata.teachingObjectives} />
                )}

                {metadata.coursePoints && metadata.coursePoints.length > 0 && (
                  <CoursePoints coursePoints={metadata.coursePoints} />
                )}

                {metadata.chapters && metadata.chapters.length > 0 && <CourseChapters chapters={metadata.chapters} />}
              </Accordion>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4 mt-4 px-6">
              <CourseResources nodeId={node.id} />
            </TabsContent>

            <TabsContent value="matrix" className="space-y-4 mt-4 px-6">
              <CourseMatrix node={node} onUpdateNode={onUpdateNode} />
            </TabsContent>

            <TabsContent value="projectMatrix" className="space-y-4 mt-4 px-6">
              <CourseProjectMatrix node={node} onUpdate={handleUpdateMetadata} />
            </TabsContent>

            <TabsContent value="supervision" className="space-y-4 mt-4 px-6">
              <CourseSupervision />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除课程"{node.name}"吗？此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteNode(node.id)} className="bg-red-500 hover:bg-red-600">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
