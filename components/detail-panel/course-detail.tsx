"use client"
import { useState, useEffect } from "react"
import type { DetailPanelProps } from "./types"
import { BookOpen, Calendar, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion } from "@/components/ui/accordion"
import AddCourseForm from "@/components/add-course-form"
import { api, type CombinedCourseDetail } from "@/lib/api"
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
import { CourseSupervision } from "@/components/course/course-supervision"
import { CourseThreeLevelMatrix } from "@/components/course/course-three-level-matrix"
import { TeachingObjectivesEditor } from "@/components/course/teaching-objectives-editor"

export function CourseDetail({ node, onEdit, onDelete, onUpdateNode, onNodeSelect, treeData, majorCourses }: DetailPanelProps) {
  const metadata = node.metadata || {}
  const [isEditingCourse, setIsEditingCourse] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditingTeachingObjectives, setIsEditingTeachingObjectives] = useState(false)
  const [courseDetailData, setCourseDetailData] = useState<CombinedCourseDetail | null>(null)
  const [courseGoals, setCourseGoals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("info")
  const [activeMatrixTab, setActiveMatrixTab] = useState("courseMatrix")

  // 当节点改变时，退出编辑模式
  useEffect(() => {
    setIsEditingCourse(false)
    setIsDeleteDialogOpen(false)
  }, [node?.id])

  // 加载课程详情数据
  useEffect(() => {
    const loadCourseDetail = async () => {
      setIsLoading(true)
      try {
        // 从metadata中获取真实的courseId
        const courseId = (metadata as any)?.courseId
        if (!courseId) {
          console.error("[CourseDetail] 无法获取课程ID")
          setIsLoading(false)
          return
        }
        console.log(`[CourseDetail] 开始加载课程详情，courseId: ${courseId}`)
        const response = await api.courseDetail.getCourseDetail(courseId)
        if (response.data) {
          console.log(`[CourseDetail] 课程详情加载成功`)
          setCourseDetailData(response.data)
        }
      } catch (error) {
        console.error("[CourseDetail] 加载课程详情失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (node?.id && (metadata as any)?.courseId) {
      loadCourseDetail()
    }
  }, [node?.id, (metadata as any)?.courseId])

  // 加载教学目标数据
  useEffect(() => {
    const loadCourseGoals = async () => {
      try {
        const courseId = (metadata as any)?.courseId
        const parentMajorId = (metadata as any)?.parentMajorId

        if (!courseId || !parentMajorId) {
          console.warn("[CourseDetail] 无法获取课程ID或专业ID")
          return
        }

        console.log(`[CourseDetail] 开始加载教学目标，courseId: ${courseId}, majorId: ${parentMajorId}`)
        const response = await api.courseGoals.getCourseGoals(String(courseId), String(parentMajorId))
        if (response.data) {
          console.log(`[CourseDetail] 教学目标加载成功:`, response.data)
          setCourseGoals(response.data)
        }
      } catch (error) {
        console.error("[CourseDetail] 加载教学目标失败:", error)
      }
    }

    if (isEditingTeachingObjectives) {
      loadCourseGoals()
    }
  }, [isEditingTeachingObjectives, (metadata as any)?.courseId, (metadata as any)?.parentMajorId])

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

  // 获取课程所属的专业ID
  const getMajorId = (): string => {
    if (majorCourses) {
      for (const [majorId, courses] of majorCourses.entries()) {
        if (courses.some(course => course.id === node.id)) {
          return majorId
        }
      }
    }
    return node.id
  }

  if (isEditingCourse && node?.type === "course") {
    // 如果courseDetailData已加载，使用其中的majorId；否则等待加载
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载课程信息中...</p>
          </div>
        </div>
      )
    }

    return (
      <AddCourseForm
        majorId={getMajorId()}
        onCancel={() => setIsEditingCourse(false)}
        onSubmit={handleEditCourseFormSubmit}
        initialData={node}
        isEditMode={true}
        courseDetailData={courseDetailData}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl p-6 flex items-center justify-center min-h-[500px]">
        <div className="text-center text-muted-foreground">
          <div className="text-lg">加载课程详情中...</div>
        </div>
      </div>
    )
  }

  if (!courseDetailData) {
    return (
      <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl p-6 flex items-center justify-center min-h-[500px]">
        <div className="text-center text-muted-foreground">
          <div className="text-lg">课程详情加载失败</div>
        </div>
      </div>
    )
  }

  const courseNameData = courseDetailData.courseNameData
  const courseDetailInfo = courseDetailData.courseDetailData
  const collegeId = courseNameData.college.id
  const createTime = courseDetailInfo.course.createTime
  const majorId = courseDetailInfo.course.majorId

  // 如果正在编辑教学目标，显示TeachingObjectivesEditor
  if (isEditingTeachingObjectives) {
    return (
      <TeachingObjectivesEditor
        isOpen={true}
        onClose={() => {
          setIsEditingTeachingObjectives(false)
          setActiveTab("matrix")
        }}
        courseGoals={courseGoals}
        node={node}
        majorIndicators={[]}
        teachingObjectiveIndicatorMap={{}}
        isLoadingMajorIndicators={false}
        isLoadingTeachingObjectiveIndicators={false}
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
                <h2 className="text-2xl font-bold text-foreground mb-2">{courseNameData.name}</h2>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{courseNameData.major}</Badge>
                  <Badge variant="outline">{courseNameData.department.name}</Badge>
                  <Badge variant="outline">
                    <Calendar className="w-3 h-3 mr-1" />
                    {courseNameData.college.name}
                  </Badge>
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
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-10 bg-secondary/50 backdrop-blur-sm border-b border-border rounded-none p-0">
              <TabsTrigger value="info" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">课程信息</TabsTrigger>
              <TabsTrigger value="resources" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">课程资源</TabsTrigger>
              <TabsTrigger value="matrix" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">矩阵管理</TabsTrigger>
              <TabsTrigger value="supervision" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">教学督导</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6 mt-4 px-6">
              <CourseBasicInfo
                name={courseNameData.name}
                courseDetail={courseDetailInfo.course}
                courseNameData={courseNameData}
                createTime={createTime}
              />

              <Accordion type="multiple" className="space-y-4 pb-4">
                {courseDetailInfo.pointksa.points && courseDetailInfo.pointksa.points.length > 0 && (
                  <CourseTeachingObjectives objectives={courseDetailInfo.pointksa.points} />
                )}

                {courseDetailInfo.pointksa.ksas && courseDetailInfo.pointksa.ksas.length > 0 && (
                  <CoursePoints coursePoints={courseDetailInfo.pointksa.ksas} />
                )}

                {courseDetailInfo.course.courseMatrixVOS && courseDetailInfo.course.courseMatrixVOS.length > 0 && (
                  <CourseChapters chapters={courseDetailInfo.course.courseMatrixVOS} />
                )}
              </Accordion>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4 mt-4 px-6">
              <CourseResources nodeId={node.id} />
            </TabsContent>

            <TabsContent value="matrix" className="space-y-4 mt-4 px-6">
              <CourseThreeLevelMatrix node={node} onUpdateNode={onUpdateNode} treeData={treeData} majorCourses={majorCourses} majorId={majorId} onEditTeachingObjectives={() => setIsEditingTeachingObjectives(true)} activeMatrixTab={activeMatrixTab} onActiveMatrixTabChange={setActiveMatrixTab} />
            </TabsContent>

            <TabsContent value="supervision" className="space-y-4 mt-4 px-6">
              <CourseSupervision courseId={node.id} collegeId={collegeId} />
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
