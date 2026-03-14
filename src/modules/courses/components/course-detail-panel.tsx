"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import type { DetailPanelProps } from "@/components/detail-panel/types"
import { convertCourseToCanvasComplete } from "@/lib/utils/course-to-canvas"
import { BookOpen, Calendar, Pencil, User } from "lucide-react"
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
import { CourseBasicInfo } from "@/modules/courses/components/course/course-basic-info"
import { CourseGoals } from "@/modules/courses/components/course/course-goals"
import { CoursePoints } from "@/modules/courses/components/course/course-points"
import { CourseKsa } from "@/modules/courses/components/course/course-ksa"
import { CourseChapters } from "@/modules/courses/components/course/course-chapters"
import { CourseSyllabusPreview } from "@/modules/courses/components/course/course-syllabus-preview"
import { CourseResources } from "@/modules/courses/components/course/resources/course-resources"
import { CourseSupervision } from "@/modules/courses/components/course/supervision/course-supervision"
import { CourseThreeLevelMatrix } from "@/modules/courses/components/course/matrix/course-three-level-matrix"
import { TeachingObjectivesEditor } from "@/modules/courses/components/shared/teaching-objectives-editor"
import type { TeachingObjectiveFilterData } from "@/modules/courses/model/course-matrix"
import { getCourseCache } from "@/shared/utils/course-cache"
import { useActivePageTracker } from "@/shared/hooks/use-active-page-tracker"
import { useAiCanvasStore } from "@/shared/stores/ai-canvas-store"
import { useCourseEditPermission } from "@/modules/courses/hooks/use-course-edit-permission"
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

interface CourseOrganizationInfo {
  universityId: string
  universityName: string
  departmentId: string
  departmentName: string
  majorId: string
  majorName: string
}

const TREE_STORAGE_KEYS = ["education-api-tree-data", "education-tree-data"] as const

const extractNumericId = (rawValue?: string): string => {
  if (!rawValue) return ""
  const match = rawValue.match(/\d+/)
  return match ? match[0] : rawValue
}

const getNodeNumericId = (node?: TreeNode | null): string => {
  if (!node) return ""
  return node.id || extractNumericId(node.nodeId)
}

const resolveCourseOrganizationFromSelectedPath = (params: {
  selectedNodePath?: TreeNode[]
  courseNode?: TreeNode | null
  majorIdFromDetail?: number
  majorNameFallback?: string
}): CourseOrganizationInfo | null => {
  const { selectedNodePath, courseNode, majorIdFromDetail, majorNameFallback = "" } = params
  if (!selectedNodePath || selectedNodePath.length === 0 || !courseNode) {
    return null
  }

  const pathCourseNode = selectedNodePath[selectedNodePath.length - 1]
  if (!pathCourseNode || pathCourseNode.nodeType !== "course") {
    return null
  }

  const pathCourseNodeId = pathCourseNode.nodeId
  const expectedCourseNodeId = courseNode.nodeId
  const pathCourseNumericId = getNodeNumericId(pathCourseNode)
  const expectedCourseNumericId = getNodeNumericId(courseNode)

  const isSameCourse = (pathCourseNodeId && pathCourseNodeId === expectedCourseNodeId)
    || (pathCourseNumericId && pathCourseNumericId === expectedCourseNumericId)

  if (!isSameCourse) {
    return null
  }

  const universityNode = selectedNodePath.find((item) => item.nodeType === "university")
  const departmentNode = selectedNodePath.find((item) => item.nodeType === "department")
  const majorNode = selectedNodePath.find((item) => item.nodeType === "major")

  const fallbackMajorId = majorIdFromDetail ? String(majorIdFromDetail) : ""
  const fallbackMajorName = majorNameFallback

  return {
    universityId: getNodeNumericId(universityNode),
    universityName: universityNode?.nodeName || "",
    departmentId: getNodeNumericId(departmentNode),
    departmentName: departmentNode?.nodeName || "",
    majorId: getNodeNumericId(majorNode) || fallbackMajorId,
    majorName: majorNode?.nodeName || fallbackMajorName,
  }
}

const findNodePath = (root: TreeNode, matcher: (node: TreeNode) => boolean, path: TreeNode[] = []): TreeNode[] | null => {
  const currentPath = [...path, root]
  if (matcher(root)) {
    return currentPath
  }

  const children = root.children || []
  for (const child of children) {
    const result = findNodePath(child, matcher, currentPath)
    if (result) {
      return result
    }
  }

  return null
}

const loadTreeFromLocalStorage = (): TreeNode | null => {
  for (const storageKey of TREE_STORAGE_KEYS) {
    const stored = localStorage.getItem(storageKey)
    if (!stored) continue

    try {
      const parsed = JSON.parse(stored) as TreeNode
      if (parsed && typeof parsed === "object") {
        return parsed
      }
    } catch (error) {
      console.warn(`[CourseDetail] 解析本地树数据失败，key=${storageKey}:`, error)
    }
  }

  return null
}

const resolveCourseOrganizationFromTree = (params: {
  treeRoot?: TreeNode | null
  courseNode?: TreeNode | null
  majorIdFromDetail?: number
  majorNameFallback?: string
}): CourseOrganizationInfo => {
  const { treeRoot, courseNode, majorIdFromDetail, majorNameFallback = "" } = params
  const sourceTree = treeRoot || loadTreeFromLocalStorage()

  const fallbackMajorId = majorIdFromDetail ? String(majorIdFromDetail) : ""
  const fallbackMajorName = majorNameFallback

  if (!sourceTree || !courseNode) {
    return {
      universityId: "",
      universityName: "",
      departmentId: "",
      departmentName: "",
      majorId: fallbackMajorId,
      majorName: fallbackMajorName,
    }
  }

  const expectedCourseNumericId = getNodeNumericId(courseNode)
  const expectedCourseNodeId = courseNode.nodeId

  const path = findNodePath(sourceTree, (node) => {
    if (node.nodeType !== "course") return false

    const nodeNumericId = getNodeNumericId(node)
    if (expectedCourseNumericId && nodeNumericId === expectedCourseNumericId) return true
    if (expectedCourseNodeId && node.nodeId === expectedCourseNodeId) return true
    return false
  })

  if (!path) {
    return {
      universityId: "",
      universityName: "",
      departmentId: "",
      departmentName: "",
      majorId: fallbackMajorId,
      majorName: fallbackMajorName,
    }
  }

  const universityNode = path.find((item) => item.nodeType === "university")
  const departmentNode = path.find((item) => item.nodeType === "department")
  const majorNode = path.find((item) => item.nodeType === "major")

  return {
    universityId: getNodeNumericId(universityNode),
    universityName: universityNode?.nodeName || "",
    departmentId: getNodeNumericId(departmentNode),
    departmentName: departmentNode?.nodeName || "",
    majorId: getNodeNumericId(majorNode) || fallbackMajorId,
    majorName: majorNode?.nodeName || fallbackMajorName,
  }
}

export function CourseDetail({ node, onUpdateNode, treeData, selectedNodePath }: DetailPanelProps) {
  const courseNode = node?.nodeType === "course" ? node : null
  const courseEditable = useCourseEditPermission(courseNode)
  const courseNodeId = courseNode?.id
  const [isEditingCourse, setIsEditingCourse] = useState(false)
  const [contentView, setContentView] = useState<"detail" | "syllabus">("detail")
  const [isEditingTeachingObjectives, setIsEditingTeachingObjectives] = useState(false)
  const [courseDetailData, setCourseDetailData] = useState<CombinedCourseDetail | null>(null)
  const [courseGoals, setCourseGoals] = useState<CourseGoal[]>([])
  const [hasLoadedCourseGoals, setHasLoadedCourseGoals] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("info")
  const [activeMatrixTab, setActiveMatrixTab] = useState("courseMatrix")
  const [matrixRefreshToken, setMatrixRefreshToken] = useState(0)
  const [teachingObjectiveFilterData, setTeachingObjectiveFilterData] = useState<TeachingObjectiveFilterData>({
    majorIndicators: [],
    isLoadingMajorIndicators: false,
    teachingObjectiveIndicatorMap: {},
    isLoadingTeachingObjectiveIndicators: false,
  })
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
  const prefetchedCanvasCourseIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!courseNode) return
    setActivePage(DEFAULT_COURSE_TAB, COURSE_TABS[DEFAULT_COURSE_TAB])
  }, [courseNodeId, courseNode, setActivePage])

  useEffect(() => {
    prefetchedCanvasCourseIdRef.current = null
    setHasLoadedCourseGoals(false)
    clearPreparedCanvasData()
  }, [clearPreparedCanvasData, courseNodeId])

  useEffect(() => {
    setTeachingObjectiveFilterData({
      majorIndicators: [],
      isLoadingMajorIndicators: false,
      teachingObjectiveIndicatorMap: {},
      isLoadingTeachingObjectiveIndicators: false,
    })
  }, [courseNode?.nodeId])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const tabKey = value as CourseTabKey
    const label = COURSE_TABS[tabKey] ?? value
    setActivePage(value, label)
  }

  // 当节点改变时，退出编辑模式
  useEffect(() => {
    setIsEditingCourse(false)
    setContentView("detail")
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
  const loadCourseGoals = useCallback(async (options?: { refreshMatrix?: boolean }) => {
    try {
      const courseId = courseNodeId
      const majorId = courseDetailData?.courseDetailData?.course?.majorId

      if (!courseId || !majorId) {
        console.warn("[CourseDetail] 无法获取课程ID或专业ID")
        setHasLoadedCourseGoals(false)
        return false
      }

      console.log(`[CourseDetail] 开始加载教学目标，courseId: ${courseId}, majorId: ${majorId}`)
      const response = await courseGoalsApi.getCourseMatrixHeaderGoals(String(courseId))
      if (response.data) {
        console.log(`[CourseDetail] 教学目标加载成功:`, response.data.length)
        setCourseGoals(response.data)
        setHasLoadedCourseGoals(true)
        if (options?.refreshMatrix) {
          setMatrixRefreshToken((prev) => prev + 1)
        }
        return true
      }

      setHasLoadedCourseGoals(false)
      return false
    } catch (error) {
      console.error("[CourseDetail] 加载教学目标失败:", error)
      setHasLoadedCourseGoals(false)
      return false
    }
  }, [courseNodeId, courseDetailData])

  useEffect(() => {
    // 当课程详情加载完成后，加载教学目标数据
    if (courseDetailData) {
      void loadCourseGoals()
    }
  }, [courseDetailData, loadCourseGoals])

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
      const summarizedPeriods = courseMatrixVOS.reduce(
        (totals, chapter) => ({
          theoryPeriod: totals.theoryPeriod + Number(normalizeChapterPeriod(chapter.theoryPeriod)),
          practicePeriod: totals.practicePeriod + Number(normalizeChapterPeriod(chapter.practicePeriod)),
        }),
        { theoryPeriod: 0, practicePeriod: 0 },
      )

      const saveRequest: SaveCourseUnitRequest = {
        course: {
          id: courseId,
          majorId: majorId,
          classId: classId,
          typeId: typeId,
          name: courseData.name || "",
          introduction: courseData.metadata?.introduction || null,
          criterion: null,
          theoryPeriod: summarizedPeriods.theoryPeriod,
          practicePeriod: summarizedPeriods.practicePeriod,
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

      // 手动保存后刷新详情数据，避免返回详情页显示旧数据
      if (!isAutoSave) {
        const refreshed = await loadCourseDetail({ silent: false })
        if (!refreshed) {
          console.warn("[CourseDetail] 保存后刷新详情失败，页面可能显示旧数据")
        }
      }

      // 手动保存时退出编辑模式，自动保存时不退出
      if (!isAutoSave) {
        setIsEditingCourse(false)
      }
    } catch (error) {
      console.error("[CourseDetail] 保存课程异常:", error)
    }
  }

  const handleStartEditCourse = () => {
    if (!courseEditable) {
      console.warn("[CourseDetail] edit course blocked by permission or ownership")
      return
    }

    setIsEditingCourse(true)
  }

  const handleOpenCourseSyllabus = () => {
    if (!courseEditable) {
      console.warn("[CourseDetail] open course syllabus blocked by permission or ownership")
      return
    }

    setContentView("syllabus")
  }

  // 注册画布数据准备回调到全局 store，供 Header AI 按钮调用
  useEffect(() => {
    if (!courseEditable || !courseDetailData || !courseNodeId) {
      unregisterPrepareCanvasData()
      return
    }

    const prepareCanvasData = async () => {
      const courseId = courseNodeId
      const majorId = courseDetailData.courseDetailData.course.majorId
      const courseCache = getCourseCache(courseNode?.id || "")
      const organizationFromSelectedPath = resolveCourseOrganizationFromSelectedPath({
        selectedNodePath,
        courseNode,
        majorIdFromDetail: majorId,
        majorNameFallback: courseCache?.majorName || courseDetailData.courseNameData.major || "",
      })
      const organizationInfo = organizationFromSelectedPath || resolveCourseOrganizationFromTree({
        treeRoot: treeData,
        courseNode,
        majorIdFromDetail: majorId,
        majorNameFallback: courseCache?.majorName || courseDetailData.courseNameData.major || "",
      })
      const prepareStart = performance.now()
      const matrixFetchStart = performance.now()

      // 并行获取课程矩阵、项目矩阵和专业指标点信息
      let matrixData: MatrixDataForCanvas | undefined
      try {
        const [courseMatrixSeedRes, projectMatrixRes, majorMatrixRes, majorDetailRes, indicatorSupportLevelsRes] = await Promise.all([
          api.matrices.getFilteredCourseMatrix(String(courseId)),
          api.matrices.getProjectMatrixData(String(courseId)),
          api.matrices.getMajorMatrix(String(courseId)),
          majorId
            ? api.tree.getMajorDetail(String(majorId))
            : Promise.resolve({ data: null, error: null, status: 200 }),
          majorId
            ? api.matrices.getCourseIndicatorSupportLevels(String(courseId), String(majorId))
            : Promise.resolve({ data: {}, error: null, status: 200 }),
        ])

        const courseMatrixRes = courseMatrixSeedRes.status === 404
          ? await api.matrices.getCourseMatrix(String(courseId))
          : courseMatrixSeedRes

        const courseMatrixItems = courseMatrixRes.data && Array.isArray(courseMatrixRes.data)
          ? courseMatrixRes.data
          : undefined
        const projectMatrixApiData = projectMatrixRes.data
          ? (projectMatrixRes.data as unknown as ProjectMatrixApiData)
          : undefined
        const indicatorSupportLevels: Record<string, "strong" | "weak"> = indicatorSupportLevelsRes.data || {}
        const supportedIndicatorLevelById = new Map<number, "strong" | "weak">()
        const majorMatrixItems = Array.isArray(majorMatrixRes.data) ? majorMatrixRes.data : []

        console.log("[CourseDetail][Debug] 矩阵原始数据摘要:", {
          courseId: String(courseId),
          majorId: String(majorId || ""),
          courseMatrixCount: courseMatrixItems?.length || 0,
          graduateRequireIds: (courseMatrixItems || []).map((item) => Number(item.graduateRequireId)),
          relates: (courseMatrixItems || []).map((item) => item.relate?.relate),
          majorMatrixCount: majorMatrixItems.length,
          majorMatrixGraduateRequireIds: majorMatrixItems.map((item) => Number(item.graduateRequireId)),
          majorMatrixRelates: majorMatrixItems.map((item) => Number(item.relate)),
        })

        // 主路径：使用专业矩阵中的 graduateRequireId（即指标点ID）识别已建立支撑关系
        majorMatrixItems.forEach((item) => {
          const indicatorId = Number(item.graduateRequireId)
          if (!Number.isFinite(indicatorId) || indicatorId <= 0) return

          const level = Number(item.relate) === 0 ? "strong" : "weak"
          const existing = supportedIndicatorLevelById.get(indicatorId)
          if (level === "strong" || !existing) {
            supportedIndicatorLevelById.set(indicatorId, level)
          }
        })
        const hasLegacySupportKeys = Object.keys(indicatorSupportLevels).length > 0

        // 严格校验：未配置任何毕业要求支撑关系时，禁止进入画布
        if (supportedIndicatorLevelById.size === 0 && !hasLegacySupportKeys) {
          console.warn("[CourseDetail] 当前课程未配置毕业要求支撑关系，阻止进入画布")
          return null
        }

        console.log("[CourseDetail][Debug] 支撑指标点映射(按 indicatorId):", {
          size: supportedIndicatorLevelById.size,
          entries: Array.from(supportedIndicatorLevelById.entries()).map(([indicatorId, supportLevel]) => ({
            indicatorId,
            supportLevel,
          })),
          legacyKeyCount: Object.keys(indicatorSupportLevels).length,
        })

        let graduationSupportData: GraduationSupportData | undefined
        const majorRequirements = majorDetailRes.data?.requiresVOS
        if (Array.isArray(majorRequirements)) {
          console.log("[CourseDetail][Debug] 专业毕业要求摘要:", {
            requirementCount: majorRequirements.length,
            requirements: majorRequirements.map((req: { id?: number; children?: Array<{ id?: number }> }) => ({
              requirementId: Number(req.id) || 0,
              childCount: req.children?.length || 0,
              indicatorIds: (req.children || []).map((child) => Number(child.id)).filter(id => Number.isFinite(id) && id > 0),
            })),
          })
        } else {
          console.log("[CourseDetail][Debug] 专业毕业要求为空或非数组")
        }

        if (Array.isArray(majorRequirements) && majorRequirements.length > 0 && (supportedIndicatorLevelById.size > 0 || hasLegacySupportKeys)) {
          let matchedByIndicatorId = 0
          let matchedByLegacyKey = 0
          let unmatchedCount = 0
          const unmatchedExamples: number[] = []

          const requirements = majorRequirements
            .map((req: { id?: number; description?: string; children?: Array<{ id?: number; description?: string }> }) => ({
              id: Number(req.id) || 0,
              content: req.description || "",
              indicators: (req.children || [])
                .map((indicator, index) => {
                  const requirementId = Number(req.id)
                  const indicatorId = Number(indicator.id)
                  if (!Number.isFinite(requirementId) || requirementId <= 0) return null
                  if (!Number.isFinite(indicatorId) || indicatorId <= 0) return null

                  // 新数据路径：按指标点 ID 直接匹配
                  let supportLevel = supportedIndicatorLevelById.get(indicatorId)
                  let matchedFrom: "indicatorId" | "legacyKey" | "none" = "none"
                  if (supportLevel) {
                    matchedFrom = "indicatorId"
                  }

                  // 旧数据兼容：若未命中，再按 requirementId-indicatorIndex 匹配
                  if (!supportLevel) {
                    const supportKey = `${requirementId}-${index}`
                    supportLevel = indicatorSupportLevels[supportKey]
                    if (supportLevel) {
                      matchedFrom = "legacyKey"
                    }
                  }

                  if (supportLevel !== "strong" && supportLevel !== "weak") {
                    unmatchedCount++
                    if (unmatchedExamples.length < 20) {
                      unmatchedExamples.push(indicatorId)
                    }
                    return null
                  }

                  if (matchedFrom === "indicatorId") {
                    matchedByIndicatorId++
                  } else if (matchedFrom === "legacyKey") {
                    matchedByLegacyKey++
                  }

                  return {
                    id: indicatorId,
                    description: indicator.description || "",
                    supportLevel,
                  }
                })
                .filter((indicator): indicator is { id: number; description: string; supportLevel: "strong" | "weak" } => indicator !== null),
            }))
            .filter((req: { indicators: Array<unknown> }) => req.indicators.length > 0)

          console.log("[CourseDetail][Debug] 指标点匹配结果:", {
            matchedByIndicatorId,
            matchedByLegacyKey,
            unmatchedCount,
            unmatchedExamples,
          })

          if (requirements.length > 0) {
            graduationSupportData = {
              id: "graduation_support_loaded",
              universityId: organizationInfo.universityId,
              universityName: organizationInfo.universityName,
              departmentId: organizationInfo.departmentId,
              departmentName: organizationInfo.departmentName,
              majorId: organizationInfo.majorId,
              majorName: organizationInfo.majorName,
              requirements,
            }

            console.log("[CourseDetail][Debug] 写入画布前专业矩阵数据摘要:", {
              organizationSource: organizationFromSelectedPath ? "selectedNodePath" : "treeTraversalFallback",
              organizationInfo,
              requirementCount: requirements.length,
              indicatorCount: requirements.reduce((sum: number, req: { indicators?: Array<unknown> }) => sum + (req.indicators?.length || 0), 0),
              indicatorsPreview: requirements
                .flatMap((req: { id: number; indicators: Array<{ id: number; supportLevel: "strong" | "weak" }> }) =>
                  req.indicators.map((ind) => ({
                    requirementId: req.id,
                    indicatorId: ind.id,
                    supportLevel: ind.supportLevel,
                  }))
                )
                .slice(0, 20),
            })
          } else {
            console.log("[CourseDetail][Debug] 未生成 graduationSupportData: 匹配后 requirements 为空")
          }
        } else {
          console.log("[CourseDetail][Debug] 跳过生成 graduationSupportData:", {
            hasMajorRequirements: Array.isArray(majorRequirements) && majorRequirements.length > 0,
            supportedIndicatorByIdSize: supportedIndicatorLevelById.size,
            hasLegacySupportKeys,
          })
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

    registerPrepareCanvasData(prepareCanvasData, String(courseNodeId))

    if (hasLoadedCourseGoals && prefetchedCanvasCourseIdRef.current !== String(courseNodeId)) {
      prefetchedCanvasCourseIdRef.current = String(courseNodeId)
      // 在课程详情页数据完整就绪后仅预热一次，避免重复请求矩阵相关接口
      prefetchCanvasData()
    }

    return () => unregisterPrepareCanvasData()
  }, [
    courseEditable,
    courseDetailData,
    courseGoals,
    hasLoadedCourseGoals,
    courseNodeId,
    courseNode,
    prefetchCanvasData,
    registerPrepareCanvasData,
    selectedNodePath,
    treeData,
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
        enableAutoSaveInEdit={false}
        courseDetailData={courseDetailData}
      />
    )
  }

  if (isLoading) {
    return <LoadingState variant="card" />
  }

  if (!courseDetailData) {
    return (
      <LoadingState
        variant="card"
        title="加载失败"
        description="无法获取课程详情，请检查网络连接或刷新重试"
      />
    )
  }

  const courseNameData = courseDetailData.courseNameData
  const courseDetailInfo = courseDetailData.courseDetailData
  const collegeId = courseNameData.college.id
  const createTime = courseDetailInfo.course.createTime
  const majorId = courseDetailInfo.course.majorId
  const courseCache = getCourseCache(courseNode.id || '')
  const instructorNames = courseCache?.instructors && courseCache.instructors.length > 0 ? courseCache.instructors : ["未设置"]
  const organizationFromSelectedPath = resolveCourseOrganizationFromSelectedPath({
    selectedNodePath,
    courseNode,
    majorIdFromDetail: majorId,
    majorNameFallback: courseCache?.majorName || courseNameData.major || "",
  })
  const organizationInfo = organizationFromSelectedPath || resolveCourseOrganizationFromTree({
    treeRoot: treeData,
    courseNode,
    majorIdFromDetail: majorId,
    majorNameFallback: courseCache?.majorName || courseNameData.major || "",
  })

  if (contentView === "syllabus") {
    return (
      <div className="flex h-[calc(100vh-10rem)] min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card/30 shadow-2xl backdrop-blur-md">
        <CourseSyllabusPreview
          courseId={Number(courseNode.id)}
          courseName={courseNameData.name}
          instructorNames={instructorNames}
          departmentName={organizationInfo.departmentName || courseNameData.department?.name || courseNameData.college?.name || ""}
          courseDetail={courseDetailInfo.course}
          onBack={() => setContentView("detail")}
        />
      </div>
    )
  }

  // 从课程详情中获取专业名称，优先从缓存获取
  const majorName = courseCache?.majorName || courseNameData.major || "未设置"

  // 获取讲师数组 - 从缓存中读取
  const getInstructors = () => {
    return instructorNames
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
            void loadCourseGoals({ refreshMatrix: true })
            setIsEditingTeachingObjectives(false)
            setActiveTab("matrix")
          }}
        courseGoals={courseGoals}
        node={courseNode}
        majorId={majorId}
        majorIndicators={teachingObjectiveFilterData.majorIndicators}
        teachingObjectiveIndicatorMap={teachingObjectiveFilterData.teachingObjectiveIndicatorMap}
        isLoadingMajorIndicators={teachingObjectiveFilterData.isLoadingMajorIndicators}
        isLoadingTeachingObjectiveIndicators={teachingObjectiveFilterData.isLoadingTeachingObjectiveIndicators}
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
              {onUpdateNode && courseEditable && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleStartEditCourse}
                  className="gap-2 hover:bg-primary/10"
                >
                  <Pencil className="w-4 h-4 text-primary" />
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
                courseEditable={courseEditable}
                onOpenCourseSyllabus={handleOpenCourseSyllabus}
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
              <CourseResources nodeId={courseNode.id || courseNode.nodeId} courseEditable={courseEditable} />
            </TabsContent>

            <TabsContent value="matrix" className="space-y-4 mt-2 px-6">
              <CourseThreeLevelMatrix
                node={courseNode}
                onUpdateNode={onUpdateNode}
                treeData={treeData}
                majorId={majorId}
                refreshToken={matrixRefreshToken}
                courseEditable={courseEditable}
                onEditTeachingObjectives={(filterData) => {
                  setTeachingObjectiveFilterData(filterData)
                  setIsEditingTeachingObjectives(true)
                }}
                activeMatrixTab={activeMatrixTab}
                onActiveMatrixTabChange={setActiveMatrixTab}
              />
            </TabsContent>

            <TabsContent value="supervision" className="space-y-4 mt-4 px-6">
              <CourseSupervision courseId={courseNode.id || courseNode.nodeId} collegeId={collegeId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
