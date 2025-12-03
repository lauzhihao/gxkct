"use client"
import { useState, useEffect } from "react"
import type { DetailPanelProps } from "@/components/detail-panel/types"
import { BookOpen, Calendar, Pencil, Trash2, User, Loader2 } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { cn } from "@/shared/utils/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Accordion } from "@/shared/components/ui/accordion"
import AddCourseForm from "@/components/add-course-form"
import type { CombinedCourseDetail } from "@/lib/api"
import { courseApiService } from "@/modules/courses/api"
import { courseGoalsApi } from "@/modules/courses/api/courseGoalsApi"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { CourseBasicInfo } from "@/modules/courses/components/course/course-basic-info"
import { CourseTeachingObjectives } from "@/modules/courses/components/course/course-teaching-objectives"
import { CoursePoints } from "@/modules/courses/components/course/course-points"
import { CourseChapters } from "@/modules/courses/components/course/course-chapters"
import { CourseResources } from "@/modules/courses/components/course/resources/course-resources"
import { CourseSupervision } from "@/modules/courses/components/course/supervision/course-supervision"
import { CourseThreeLevelMatrix } from "@/modules/courses/components/course/matrix/course-three-level-matrix"
import { TeachingObjectivesEditor } from "@/modules/courses/components/shared/teaching-objectives-editor"
import { getCourseCache } from "@/shared/utils/course-cache"

export function CourseDetail({ node, onDelete, onUpdateNode, onNodeSelect, treeData, currentUser }: DetailPanelProps) {
  const [isEditingCourse, setIsEditingCourse] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditingTeachingObjectives, setIsEditingTeachingObjectives] = useState(false)
  const [courseDetailData, setCourseDetailData] = useState<CombinedCourseDetail | null>(null)
  const [courseGoals, setCourseGoals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("info")
  const [activeMatrixTab, setActiveMatrixTab] = useState("courseMatrix")
  const [selectedSemester, setSelectedSemester] = useState("2024-spring")
  const [semesters] = useState([
    { value: "2024-spring", label: "2024年春季学期" },
    { value: "2024-fall", label: "2024年秋季学期" },
    { value: "2025-spring", label: "2025年春季学期" },
    { value: "2025-fall", label: "2025年秋季学期" },
  ])

  // 当节点改变时，退出编辑模式
  useEffect(() => {
    setIsEditingCourse(false)
    setIsDeleteDialogOpen(false)
  }, [node?.nodeId])

  // 加载课程详情数据
  useEffect(() => {
    const loadCourseDetail = async () => {
      setIsLoading(true)
      try {
        // 直接使用 node.id 作为课程ID（兼容属性，从 nodeId 解析出的数字ID）
        const courseId = node?.id
        if (!courseId) {
          console.error("[CourseDetail] 无法获取课程ID")
          setIsLoading(false)
          return
        }
        console.log(`[CourseDetail] 开始加载课程详情，courseId: ${courseId}`)
        const response = await courseApiService.getCourseDetail(courseId)
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

    if (node?.id) {
      loadCourseDetail()
    }
  }, [node?.id])

  // 加载教学目标数据
  useEffect(() => {
    const loadCourseGoals = async () => {
      try {
        // 直接使用 node.id 作为课程ID
        const courseId = node?.id
        // majorId 从已加载的课程详情中获取
        const majorId = courseDetailData?.courseDetailData?.course?.majorId

        if (!courseId || !majorId) {
          console.warn("[CourseDetail] 无法获取课程ID或专业ID")
          return
        }

        console.log(`[CourseDetail] 开始加载教学目标，courseId: ${courseId}, majorId: ${majorId}`)
        const response = await courseGoalsApi.getCourseGoals(String(courseId), String(majorId))
        if (response.data) {
          console.log(`[CourseDetail] 教学目标加载成功:`, response.data)
          setCourseGoals(response.data)
        }
      } catch (error) {
        console.error("[CourseDetail] 加载教学目标失败:", error)
      }
    }

    if (isEditingTeachingObjectives && courseDetailData) {
      loadCourseGoals()
    }
  }, [isEditingTeachingObjectives, node?.id, courseDetailData])

  if (!node || node.nodeType !== "course") return null

  const handleEditCourseFormSubmit = (courseData: any) => {
    if (onUpdateNode) {
      onUpdateNode(node.nodeId, courseData)
      setIsEditingCourse(false)
    }
  }

  const handleDeleteNode = (nodeId: string) => {
    if (onDelete) {
      onDelete(nodeId)
    }
    if (node?.nodeId === nodeId && onNodeSelect) {
      onNodeSelect(null)
    }
    setIsDeleteDialogOpen(false)
  }

  // 获取课程所属的专业ID - 从已加载的课程详情中获取
  const getMajorId = (): string => {
    return courseDetailData?.courseDetailData?.course?.majorId?.toString() || node.id || ""
  }

  if (isEditingCourse && node?.nodeType === "course") {
    // 如果courseDetailData已加载，使用其中的majorId；否则等待加载
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载中</p>
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
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <div className="text-lg text-muted-foreground">加载中</div>
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

  // 从课程详情中获取专业名称，优先从缓存获取
  const courseCache = getCourseCache(node.id || '')
  const majorName = courseCache?.majorName || courseNameData.major || "未设置"

  // 获取讲师数组 - 从缓存中读取
  const getInstructors = () => {
    if (courseCache?.instructors && courseCache.instructors.length > 0) {
      return courseCache.instructors
    }
    return ["未设置"]
  }

  // 判断讲师是否已设置
  const isInstructorSet = () => {
    return courseCache?.instructors && courseCache.instructors.length > 0
  }

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
        majorId={majorId}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-foreground leading-tight">{courseNameData.name}</h2>
                <div className="flex flex-wrap gap-1 items-center">
                  {getInstructors().map((instructor, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs",
                        isInstructorSet()
                          ? "bg-primary border-primary"
                          : "bg-muted border-muted-foreground/30",
                      )}
                    >
                      <User className={cn(
                        "w-3 h-3",
                        isInstructorSet() ? "text-white" : "text-muted-foreground",
                      )} />
                      <span className={cn(
                        "font-medium",
                        isInstructorSet() ? "text-white" : "text-muted-foreground",
                      )}>
                        {instructor}
                      </span>
                    </div>
                  ))}
                  {majorName && (
                    <Badge variant="secondary" className="text-sm px-2 py-0.5 w-fit">@{majorName}</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {courseNameData.department?.name && (
              <Badge variant="outline">{courseNameData.department.name}</Badge>
            )}
            {courseNameData.college?.name && (
              <Badge variant="outline">
                <Calendar className="w-3 h-3 mr-1" />
                {courseNameData.college.name}
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-2 absolute top-6 right-6">
            <div className="flex gap-2 justify-end">
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
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {semesters.map((semester) => (
                  <SelectItem
                    key={semester.value}
                    value={semester.value}
                    className={selectedSemester === semester.value ? "[&_svg]:text-white" : ""}
                  >
                    {semester.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-10 bg-secondary/50 backdrop-blur-sm border-b border-border rounded-none p-0">
              <TabsTrigger value="info" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">课程信息</TabsTrigger>
              <TabsTrigger value="resources" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">课程资源</TabsTrigger>
              <TabsTrigger value="matrix" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">矩阵管理</TabsTrigger>
              <TabsTrigger value="supervision" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">教学督导</TabsTrigger>
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
              <CourseResources nodeId={node.id || node.nodeId} />
            </TabsContent>

            <TabsContent value="matrix" className="space-y-4 mt-2 px-6">
              <CourseThreeLevelMatrix node={node} onUpdateNode={onUpdateNode} treeData={treeData} majorId={majorId} onEditTeachingObjectives={() => setIsEditingTeachingObjectives(true)} activeMatrixTab={activeMatrixTab} onActiveMatrixTabChange={setActiveMatrixTab} />
            </TabsContent>

            <TabsContent value="supervision" className="space-y-4 mt-4 px-6">
              <CourseSupervision courseId={node.id || node.nodeId} collegeId={collegeId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除课程"{courseNameData.name}"吗？此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteNode(node.nodeId)} className="bg-red-500 hover:bg-red-600">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
