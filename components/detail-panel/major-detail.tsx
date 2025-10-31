"use client"

import { useState } from "react"
import type { TreeNode } from "@/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { GraduationCap, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import AddCourseForm from "@/components/add-course-form"
import { AddMajorForm } from "@/components/add-major-form"
import { MajorBasicInfo } from "@/components/major/major-basic-info"
import { MajorMatrix } from "@/components/major/major-matrix"
import { MajorCourses } from "@/components/major/major-courses"
import { MajorUsers } from "@/components/major/major-users"
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

interface MajorDetailProps {
  node: TreeNode
  onUpdate: () => void
  onAddCourse?: (majorId: string, newCourse: any) => void
  onDeleteCourse: (courseId: string) => void
  onUpdateNode?: (nodeId: string, updates: any) => void
  onDeleteNode?: (nodeId: string) => void
  onNodeSelect?: (node: any) => void
  currentUser: { username: string; role: string } | null
}

export function MajorDetail({
  node,
  onUpdate,
  onAddCourse,
  onDeleteCourse,
  onUpdateNode,
  onDeleteNode,
  onNodeSelect,
  currentUser,
}: MajorDetailProps) {
  const [isAddingCourse, setIsAddingCourse] = useState(false)
  const [isEditingMajor, setIsEditingMajor] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const handleDeleteNode = (nodeId: string) => {
    if (onDeleteNode) {
      onDeleteNode(nodeId)
    }
    if (node?.id === nodeId && onNodeSelect) {
      onNodeSelect(null)
    }
    setIsDeleteDialogOpen(false)
  }

  const handleEditMajorFormSubmit = (majorData: any) => {
    if (onUpdateNode) {
      onUpdateNode(node.id, majorData)
      setIsEditingMajor(false)
    }
  }

  const handleAddCourseSubmit = (data: any) => {
    if (onAddCourse) {
      onAddCourse(node.id, data)
    }
    setIsAddingCourse(false)
  }

  if (isEditingMajor && node.type === "major") {
    return (
      <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl p-6">
        <AddMajorForm
          departmentId={node.parentId || node.id}
          onCancel={() => setIsEditingMajor(false)}
          onSubmit={handleEditMajorFormSubmit}
          initialData={node}
          isEditMode={true}
        />
      </div>
    )
  }

  if (isAddingCourse) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-secondary/20">
        <AddCourseForm majorId={node.id} onSubmit={handleAddCourseSubmit} onCancel={() => setIsAddingCourse(false)} />
      </div>
    )
  }

  return (
    <>
      <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="flex items-start gap-4 p-6 border-b border-border bg-card/30 backdrop-blur-md">
          <div
            className={cn(
              "flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center",
              "bg-gradient-to-br from-primary/20 to-accent/20",
              "border border-primary/30 shadow-lg",
            )}
          >
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <div className="inline-block px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-xs font-medium text-primary mb-2">
              专业
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{node.name}</h2>
            {node.description && <p className="text-muted-foreground">{node.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {onUpdateNode && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingMajor(true)}
                className="gap-2 hover:bg-primary/10"
              >
                <Pencil className="w-4 h-4 text-primary" />
              </Button>
            )}
            {onDeleteNode && (
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

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full h-10 bg-secondary/50 backdrop-blur-sm border-b border-border rounded-none p-0">
              <TabsTrigger value="details" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
                专业详情
              </TabsTrigger>
              <TabsTrigger value="matrix" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
                专业矩阵
              </TabsTrigger>
              <TabsTrigger value="courses" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
                课程管理
              </TabsTrigger>
              <TabsTrigger value="users" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
                成员管理
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4 px-6">
              <MajorBasicInfo node={node} />
            </TabsContent>

            <TabsContent value="matrix" className="space-y-4 mt-4 px-6">
              <MajorMatrix node={node} onUpdateNode={onUpdateNode} />
            </TabsContent>

            <TabsContent value="courses" className="space-y-4 mt-4 px-6">
              <MajorCourses
                node={node}
                currentUser={currentUser}
                onNodeSelect={onNodeSelect}
                onAddCourse={() => setIsAddingCourse(true)}
              />
            </TabsContent>

            <TabsContent value="users" className="space-y-6 p-6">
              <MajorUsers node={node} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除专业"{node.name}"吗？此操作将同时删除该专业下的所有课程，且不可撤销。
            </AlertDialogDescription>
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
