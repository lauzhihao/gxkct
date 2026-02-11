"use client"
import { useState, useEffect, useCallback } from "react"
import type { DetailPanelProps } from "@/components/detail-panel/types"
import { convertCourseToCanvasComplete } from "@/lib/utils/course-to-canvas"
import { BookOpen, Calendar, Pencil, Trash2, User } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { cn } from "@/shared/utils/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Accordion } from "@/shared/components/ui/accordion"
import { LoadingState } from "@/shared/components/ui/loading-state"
import AddCourseForm from "@/components/add-course-form"
import { api, type CombinedCourseDetail, type CourseGoal, type SaveCourseUnitRequest } from "@/lib/api"
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
import { CourseGoals } from "@/modules/courses/components/course/course-goals"
import { CoursePoints } from "@/modules/courses/components/course/course-points"
import { CourseKsa } from "@/modules/courses/components/course/course-ksa"
import { CourseChapters } from "@/modules/courses/components/course/course-chapters"
import { CourseResources } from "@/modules/courses/components/course/resources/course-resources"
import { CourseSupervision } from "@/modules/courses/components/course/supervision/course-supervision"
import { CourseThreeLevelMatrix } from "@/modules/courses/components/course/matrix/course-three-level-matrix"
import { TeachingObjectivesEditor } from "@/modules/courses/components/shared/teaching-objectives-editor"
import { getCourseCache } from "@/shared/utils/course-cache"
import { useActivePageTracker } from "@/shared/hooks/use-active-page-tracker"
import { useAiCanvasStore } from "@/shared/stores/ai-canvas-store"
import type { TreeNode } from "@/types"
import type { MatrixDataForCanvas, ProjectMatrixApiData } from "@/lib/utils/course-to-canvas"
import type { GraduationSupportData } from "@/components/canvas-elements/types"

const COURSE_TABS = {
  info: "课程信息",
  resources: "课程资源",
  matrix: "矩阵管理",
  supervision: "质量评价",
} as const

type CourseTabKey = keyof typeof COURSE_TABS
const DEFAULT_COURSE_TAB: CourseTabKey = "info"

interface CourseFormMetadata {
  courseNatureId?: number
  introduction?: string | null
  theoryPeriod?: number
  practicePeriod?: number
  teachingClass?: string
  teachingLocation?: string
  teachingTime?: string
  studentCount?: number
  credits?: number
  mainTextbook?: string
  referenceResources?: string
  attendancePolicy?: string
  assignmentPolicy?: string
  conductRequirements?: string
  practiceRequirements?: string
  teamworkRequirements?: string
  bonusRequirements?: string
  otherSuggestions?: string
  assessmentMethod?: string
  assessmentForm?: string
  scoreType?: string
  scoreTable?: unknown
  assessmentDescription?: string
  chapters?: Array<{
    id?: string | number
    name?: string
    title?: string
    theoryHours?: number | string | null
    theoryPeriod?: number | string | null
    practiceHours?: number | string | null
    practicePeriod?: number | string | null
    courseUnitId?: number | string | null
  }>
}

interface CourseFormData {
  name?: string
  metadata?: CourseFormMetadata
}

export function CourseDetail({ node, onDelete, onUpdateNode, onNodeSelect, treeData }: DetailPanelProps) {
  const courseNode = node?.nodeType === "course" ? node : null
  const courseNodeId = courseNode?.id
  const [isEditingCourse, setIsEditingCourse] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditingTeachingObjectives, setIsEditingTeachingObjectives] = useState(false)
  const [courseDetailData, setCourseDetailData] = useState<CombinedCourseDetail | null>(null)
  const [courseGoals, setCourseGoals] = useState<CourseGoal[]>([])
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
  const { setActivePage } = useActivePageTracker()
  const {
    registerPrepareCanvasData,
    unregisterPrepareCanvasData,
    prefetchCanvasData,
    clearPreparedCanvasData,
  } = useAiCanvasStore()

  useEffect(() => {
    if (!courseNode) return
    setActivePage(DEFAULT_COURSE_TAB, COURSE_TABS[DEFAULT_COURSE_TAB])
  }, [courseNodeId, courseNode, setActivePage])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const tabKey = value as CourseTabKey
    const label = COURSE_TABS[tabKey] ?? value
    setActivePage(value, label)
  }

  // 当节点改变时，退出编辑模式
  useEffect(() => {
    setIsEditingCourse(false)
    setIsDeleteDialogOpen(false)
  }, [courseNode?.nodeId])

  useEffect(() => {
    const handleOpenResources = () => setActiveTab("resources")
    window.addEventListener("open-course-resources-tab", handleOpenResources)
    return () => window.removeEventListener("open-course-resources-tab", handleOpenResources)
  }, [])

  const loadCourseDetail = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!silent) {
      setIsLoading(true)
    }

    try {
      const courseId = courseNodeId
      if (!courseId) {
        console.error("[CourseDetail] 无法获取课程ID")
        return false
      }

      console.log(`[CourseDetail] 开始加载课程详情，courseId: ${courseId}`)
      const response = await courseApiService.getCourseDetail(courseId)
      if (response.data) {
        console.log("[CourseDetail] 课程详情加载成功")
        setCourseDetailData(response.data)
        return true
      }

      console.error("[CourseDetail] 课程详情返回为空")
      return false
    } catch (error) {
      console.error("[CourseDetail] 加载课程详情失败:", error)
      return false
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [courseNodeId])

  // 加载课程详情数据
  useEffect(() => {
    if (!courseNodeId) return
    void loadCourseDetail()
  }, [courseNodeId, loadCourseDetail])

  // 加载教学目标数据（课程详情加载完成后即加载）
  useEffect(() => {
    const loadCourseGoals = async () => {
      try {
        // 直接使用 node.id 作为课程ID
        const courseId = courseNodeId
        // majorId 从已加载的课程详情中获取
        const majorId = courseDetailData?.courseDetailData?.course?.majorId

        if (!courseId || !majorId) {
          console.warn("[CourseDetail] 无法获取课程ID或专业ID")
          return
        }

        console.log(`[CourseDetail] 开始加载教学目标，courseId: ${courseId}, majorId: ${majorId}`)
        const response = await courseGoalsApi.getCourseGoals(String(courseId), String(majorId))
        if (response.data) {
          console.log(`[CourseDetail] 教学目标加载成功:`, response.data.length)
          setCourseGoals(response.data)
        }
      } catch (error) {
        console.error("[CourseDetail] 加载教学目标失败:", error)
      }
    }

    // 当课程详情加载完成后，加载教学目标数据
    if (courseDetailData) {
      loadCourseGoals()
    }
  }, [courseNodeId, courseDetailData])

  const handleEditCourseFormSubmit = async (courseData: CourseFormData, isAutoSave: boolean = false) => {
    if (!courseNode) return

    try {
      // 构建保存请求数据
      const courseId = courseNode.id ? parseInt(courseNode.id, 10) : 0
      const majorId = courseDetailData?.courseDetailData?.course?.majorId || 0
      const classId = courseDetailData?.courseDetailData?.course?.classId || 1
      const typeId = courseData.metadata?.courseNatureId || courseDetailData?.courseDetailData?.course?.typeId || 1
      const normalizeChapterId = (value: unknown): number | null => {
        const parsed = Number.parseInt(String(value ?? ""), 10)
        return Number.isFinite(parsed) ? parsed : null
      }
      const normalizeChapterPeriod = (value: unknown): string => {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? String(parsed) : "0"
      }
      const sourceCourseMatrix = Array.isArray(courseDetailData?.courseDetailData?.course?.courseMatrixVOS)
        ? courseDetailData?.courseDetailData?.course?.courseMatrixVOS
        : []
      const sourceCourseMatrixById = new Map<number, {
        id?: unknown
        courseUnitId?: unknown
        courseClassId?: unknown
        courseTypeId?: unknown
        name?: unknown
        theoryPeriod?: unknown
        practicePeriod?: unknown
      }>()
      const sourceCourseUnitIdMap = new Map<number, number>()
      sourceCourseMatrix.forEach((item) => {
        const itemId = normalizeChapterId((item as { id?: unknown })?.id)
        const unitId = normalizeChapterId((item as { courseUnitId?: unknown })?.courseUnitId)
        if (itemId !== null && unitId !== null) {
          sourceCourseUnitIdMap.set(itemId, unitId)
        }
        if (itemId !== null) {
          sourceCourseMatrixById.set(itemId, item as {
            id?: unknown
            courseUnitId?: unknown
            courseClassId?: unknown
            courseTypeId?: unknown
            name?: unknown
            theoryPeriod?: unknown
            practicePeriod?: unknown
          })
        }
      })
      const chaptersFromForm = Array.isArray(courseData.metadata?.chapters) ? courseData.metadata.chapters : []
      const courseMatrixVOS = Array.isArray(courseData.metadata?.chapters)
        ? (() => {
          const submittedExistingIds = new Set<number>()
          const upsertItems = chaptersFromForm.map((chapter, index) => {
            const parsedId = normalizeChapterId(chapter.id)
            const sourceItem = parsedId !== null ? sourceCourseMatrixById.get(parsedId) : undefined
            const isExistingRow = parsedId !== null && sourceItem !== undefined
            if (isExistingRow && parsedId !== null) {
              submittedExistingIds.add(parsedId)
            }

            const fallbackCourseUnitId = parsedId !== null ? sourceCourseUnitIdMap.get(parsedId) : undefined
            const normalizedCourseUnitId = normalizeChapterId(chapter.courseUnitId)

            return {
              id: isExistingRow && parsedId !== null ? parsedId : 0,
              courseUnitId: normalizedCourseUnitId ?? fallbackCourseUnitId ?? courseId,
              courseClassId: normalizeChapterId((sourceItem as { courseClassId?: unknown } | undefined)?.courseClassId) ?? 0,
              courseTypeId: normalizeChapterId((sourceItem as { courseTypeId?: unknown } | undefined)?.courseTypeId) ?? 0,
              name: chapter.name || chapter.title || `章节${index + 1}`,
              theoryPeriod: normalizeChapterPeriod(chapter.theoryHours ?? chapter.theoryPeriod),
              practicePeriod: normalizeChapterPeriod(chapter.practiceHours ?? chapter.practicePeriod),
            }
          })

          const deletedItems = sourceCourseMatrix
            .filter((item) => {
              const existingId = normalizeChapterId((item as { id?: unknown })?.id)
              return existingId !== null && existingId > 0 && !submittedExistingIds.has(existingId)
            })
            .map((item) => {
              const existing = item as {
                id?: unknown
                name?: unknown
                courseClassId?: unknown
                courseTypeId?: unknown
                theoryPeriod?: unknown
                practicePeriod?: unknown
              }

              return {
                id: normalizeChapterId(existing.id) ?? 0,
                courseUnitId: -1,
                courseClassId: normalizeChapterId(existing.courseClassId) ?? 0,
                courseTypeId: normalizeChapterId(existing.courseTypeId) ?? 0,
                name: typeof existing.name === "string" ? existing.name : "",
                theoryPeriod: normalizeChapterPeriod(existing.theoryPeriod),
                practicePeriod: normalizeChapterPeriod(existing.practicePeriod),
              }
            })

          return [...upsertItems, ...deletedItems]
        })()
        : (sourceCourseMatrix)

      const saveRequest: SaveCourseUnitRequest = {
        course: {
          id: courseId,
          majorId: majorId,
          classId: classId,
          typeId: typeId,
          name: courseData.name || "",
          introduction: courseData.metadata?.introduction || null,
          criterion: null,
          theoryPeriod: courseData.metadata?.theoryPeriod || 0,
          practicePeriod: courseData.metadata?.practicePeriod || 0,
          courseMatrixVOS,
          position: null,
          // 扩展字段
          teachingClass: courseData.metadata?.teachingClass,
          teachingLocation: courseData.metadata?.teachingLocation,
          teachingTime: courseData.metadata?.teachingTime,
          studentCount: courseData.metadata?.studentCount,
          credits: courseData.metadata?.credits,
          mainTextbook: courseData.metadata?.mainTextbook,
          referenceResources: courseData.metadata?.referenceResources,
          attendancePolicy: courseData.metadata?.attendancePolicy,
          assignmentPolicy: courseData.metadata?.assignmentPolicy,
          conductRequirements: courseData.metadata?.conductRequirements,
          practiceRequirements: courseData.metadata?.practiceRequirements,
          teamworkRequirements: courseData.metadata?.teamworkRequirements,
          bonusRequirements: courseData.metadata?.bonusRequirements,
          otherSuggestions: courseData.metadata?.otherSuggestions,
          assessmentMethod: courseData.metadata?.assessmentMethod,
          assessmentForm: courseData.metadata?.assessmentForm,
          scoreType: courseData.metadata?.scoreType,
          scoreTable: courseData.metadata?.scoreTable,
          assessmentDescription: courseData.metadata?.assessmentDescription,
        }
      }

      console.log("[CourseDetail] 保存课程数据", saveRequest)

      // 调用保存接口
      const response = await api.courseDetail.saveCourseUnit(saveRequest)

      if (response.error) {
        console.error("[CourseDetail] 保存课程失败:", response.error)
        return
      }

      console.log("[CourseDetail] 课程保存成功")

      // 更新本地节点数据
      if (onUpdateNode) {
        onUpdateNode(courseNode.nodeId, courseData as Partial<TreeNode>)
      }

      // 保存后刷新详情数据，避免返回详情页显示旧数据
      const refreshed = await loadCourseDetail({ silent: isAutoSave })
      if (!refreshed) {
        console.warn("[CourseDetail] 保存后刷新详情失败，页面可能显示旧数据")
      }

      // 手动保存时退出编辑模式，自动保存时不退出
      if (!isAutoSave) {
        setIsEditingCourse(false)
      }
    } catch (error) {
      console.error("[CourseDetail] 保存课程异常:", error)
    }
  }

  const handleDeleteNode = (nodeId: string) => {
    if (onDelete) {
      onDelete(nodeId)
    }
    if (courseNode?.nodeId === nodeId && onNodeSelect) {
      onNodeSelect(null)
    }
    setIsDeleteDialogOpen(false)
  }

  // 注册画布数据准备回调到全局 store，供 Header AI 按钮调用
  useEffect(() => {
    if (!courseDetailData || !courseNodeId) {
      unregisterPrepareCanvasData()
      return
    }

    const prepareCanvasData = async () => {
      const courseId = courseNodeId
      const majorId = courseDetailData.courseDetailData.course.majorId
      const prepareStart = performance.now()
      const matrixFetchStart = performance.now()

      // 并行获取课程矩阵、项目矩阵和专业指标点信息
      let matrixData: MatrixDataForCanvas | undefined
      try {
        const [courseMatrixRes, projectMatrixRes, majorDetailRes, indicatorSupportLevelsRes] = await Promise.all([
          api.matrices.getCourseMatrix(String(courseId)),
          api.matrices.getProjectMatrixData(String(courseId)),
          majorId
            ? api.tree.getMajorDetail(String(majorId))
            : Promise.resolve({ data: null, error: null, status: 200 }),
          majorId
            ? api.matrices.getCourseIndicatorSupportLevels(String(courseId), String(majorId))
            : Promise.resolve({ data: {}, error: null, status: 200 }),
        ])

        const courseMatrixItems = courseMatrixRes.data && Array.isArray(courseMatrixRes.data)
          ? courseMatrixRes.data
          : undefined
        const projectMatrixApiData = projectMatrixRes.data
          ? (projectMatrixRes.data as unknown as ProjectMatrixApiData)
          : undefined
        const indicatorIdsFromGoals = new Set(
          (courseGoals || [])
            .map(goal => Number(goal.id))
            .filter(id => Number.isFinite(id) && id > 0)
        )
        const indicatorSupportLevels: Record<string, "strong" | "weak"> = indicatorSupportLevelsRes.data || {}

        let graduationSupportData: GraduationSupportData | undefined
        const majorRequirements = majorDetailRes.data?.requiresVOS
        if (Array.isArray(majorRequirements) && majorRequirements.length > 0 && indicatorIdsFromGoals.size > 0) {
          const requirements = majorRequirements
            .map((req: { id?: number; description?: string; children?: Array<{ id?: number; description?: string }> }) => ({
              id: Number(req.id) || 0,
              content: req.description || "",
              indicators: (req.children || [])
                .map((indicator, index) => ({ indicator, index }))
                .filter(({ indicator }) => {
                  const indicatorId = Number(indicator.id)
                  return Number.isFinite(indicatorId) && indicatorIdsFromGoals.has(indicatorId)
                })
                .map(({ indicator, index }) => {
                  const supportKey = `${Number(req.id) || 0}-${index}`
                  const supportLevel = indicatorSupportLevels[supportKey] || "strong"
                  return {
                    id: Number(indicator.id) || 0,
                    description: indicator.description || "",
                    supportLevel,
                  }
                }),
            }))
            .filter((req: { indicators: Array<unknown> }) => req.indicators.length > 0)

          if (requirements.length > 0) {
            graduationSupportData = {
              id: "graduation_support_loaded",
              universityId: String(courseDetailData.courseNameData.college?.id || ""),
              universityName: courseDetailData.courseNameData.college?.name,
              departmentId: String(courseDetailData.courseNameData.department?.id || ""),
              departmentName: courseDetailData.courseNameData.department?.name,
              majorId: String(majorId),
              majorName: courseDetailData.courseNameData.major,
              requirements,
            }
          }
        }

        const matrixFetchDurationMs = performance.now() - matrixFetchStart

        if (courseMatrixItems || projectMatrixApiData || graduationSupportData) {
          matrixData = { courseMatrixItems, projectMatrixApiData, graduationSupportData }
          console.log("[CourseDetail] 矩阵数据加载完成:", {
            fetchDurationMs: Number(matrixFetchDurationMs.toFixed(1)),
            courseMatrixCount: courseMatrixItems?.length || 0,
            projectCount: projectMatrixApiData?.projects?.length || 0,
            projectRowsCount: projectMatrixApiData?.data?.length || 0,
            ksaCount: projectMatrixApiData?.ksas?.length || 0,
            graduationIndicatorCount: graduationSupportData?.requirements?.reduce((sum, req) => sum + req.indicators.length, 0) || 0,
          })
        } else {
          console.log("[CourseDetail] 矩阵数据为空:", {
            fetchDurationMs: Number(matrixFetchDurationMs.toFixed(1)),
          })
        }
      } catch (error) {
        console.error("[CourseDetail] 加载矩阵数据失败，将继续不带矩阵数据:", error)
      }

      const convertStart = performance.now()
      const canvasData = convertCourseToCanvasComplete(courseDetailData, courseGoals, matrixData)
      const convertDurationMs = performance.now() - convertStart
      const totalDurationMs = performance.now() - prepareStart
      const objectiveCount = (courseGoals || []).reduce((sum, goal) => sum + (goal.children?.length || 0), 0)
      const hitIndicatorCount = matrixData?.graduationSupportData?.requirements?.reduce((sum, req) => sum + req.indicators.length, 0) || 0
      const renderedSupportData = canvasData.elements.find(el => el.type === "graduation_support")?.data as GraduationSupportData | undefined
      const renderedIndicatorCount = renderedSupportData?.requirements?.reduce((sum, req) => sum + req.indicators.length, 0) || 0

      console.log("[CourseDetail] 转换课程数据到画布格式:", {
        convertDurationMs: Number(convertDurationMs.toFixed(1)),
        totalDurationMs: Number(totalDurationMs.toFixed(1)),
        elementsCount: canvasData.elements.length,
        edgesCount: canvasData.edges.length,
        objectiveCount,
        hitIndicatorCount,
        renderedIndicatorCount,
      })

      return canvasData
    }

    clearPreparedCanvasData()
    registerPrepareCanvasData(prepareCanvasData, String(courseNodeId))
    // 在课程详情页数据已就绪后预热一次，点击 AI 时可直接复用结果
    prefetchCanvasData()

    return () => unregisterPrepareCanvasData()
  }, [
    clearPreparedCanvasData,
    courseDetailData,
    courseGoals,
    courseNodeId,
    prefetchCanvasData,
    registerPrepareCanvasData,
    unregisterPrepareCanvasData,
  ])

  if (!courseNode) return null

  // 获取课程所属的专业ID - 从已加载的课程详情中获取
  const getMajorId = (): string => {
    return courseDetailData?.courseDetailData?.course?.majorId?.toString() || courseNode.id || ""
  }

  if (isEditingCourse) {
    // 如果courseDetailData已加载，使用其中的majorId；否则等待加载
    if (isLoading) {
      return <LoadingState />
    }

    return (
      <AddCourseForm
        majorId={getMajorId()}
        onCancel={() => setIsEditingCourse(false)}
        onSubmit={handleEditCourseFormSubmit}
        initialData={courseNode}
        isEditMode={true}
        courseDetailData={courseDetailData}
      />
    )
  }

  if (isLoading) {
    return <LoadingState variant="card" />
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
  const courseCache = getCourseCache(courseNode.id || '')
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
        node={courseNode}
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
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="w-full h-10 bg-secondary/50 backdrop-blur-sm border-b border-border rounded-none p-0">
              <TabsTrigger value="info" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">课程信息</TabsTrigger>
              <TabsTrigger value="resources" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">课程资源</TabsTrigger>
              <TabsTrigger value="matrix" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">矩阵管理</TabsTrigger>
              <TabsTrigger value="supervision" className="flex-1 cursor-pointer hover:bg-accent/50 hover:text-white data-[state=active]:text-primary transition-colors">质量评价</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6 mt-4 px-6">
              <CourseBasicInfo
                name={courseNameData.name}
                courseDetail={courseDetailInfo.course}
                courseNameData={courseNameData}
                createTime={createTime}
              />

              <Accordion type="multiple" className="space-y-4 pb-4">
                {courseGoals && courseGoals.length > 0 && (
                  <CourseGoals courseGoals={courseGoals} />
                )}

                {courseDetailInfo.pointksa.points && courseDetailInfo.pointksa.points.length > 0 && (
                  <CoursePoints objectives={courseDetailInfo.pointksa.points} />
                )}

                {courseDetailInfo.pointksa.ksas && courseDetailInfo.pointksa.ksas.length > 0 && (
                  <CourseKsa coursePoints={courseDetailInfo.pointksa.ksas} />
                )}

                {courseDetailInfo.course.courseMatrixVOS && courseDetailInfo.course.courseMatrixVOS.length > 0 && (
                  <CourseChapters chapters={courseDetailInfo.course.courseMatrixVOS} />
                )}
              </Accordion>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4 mt-4 px-6">
              <CourseResources nodeId={courseNode.id || courseNode.nodeId} />
            </TabsContent>

            <TabsContent value="matrix" className="space-y-4 mt-2 px-6">
              <CourseThreeLevelMatrix node={courseNode} onUpdateNode={onUpdateNode} treeData={treeData} majorId={majorId} onEditTeachingObjectives={() => setIsEditingTeachingObjectives(true)} activeMatrixTab={activeMatrixTab} onActiveMatrixTabChange={setActiveMatrixTab} />
            </TabsContent>

            <TabsContent value="supervision" className="space-y-4 mt-4 px-6">
              <CourseSupervision courseId={courseNode.id || courseNode.nodeId} collegeId={collegeId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除课程&quot;{courseNameData.name}&quot;吗？此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteNode(courseNode.nodeId)} className="bg-red-500 hover:bg-red-600">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
