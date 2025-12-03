"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { ArrowLeft, Plus, Trash2, Upload, FileSpreadsheet, X, Check, Loader2, Calendar, ChevronDown, Star } from "lucide-react"
import { Card } from "@/shared/components/ui/card"
import { Tabs, TabsContent } from "@/shared/components/ui/tabs"
import { UnderlineTabsList, UnderlineTabsTrigger } from "@/shared/components/ui/underline-tabs"
import { FileUpload } from "@/shared/components/ui/file-upload"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/shared/components/ui/accordion"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/components/ui/table"
import { useToast } from "@/shared/hooks/use-toast"
import { api } from "@/lib/api"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"

interface TeachingObjective {
  id: string
  content: string
  points: string[]
  supportedIndicators?: string[] // 支撑的指标点，格式为"requirementId-indicatorIndex"
}

interface CoursePoint {
  id: string
  content: string // Merged title and description into single content field
  infoPoints: InfoPoint[]
}

interface InfoPoint {
  id: string
  type: "K" | "S" | "A" // Added type field for Knowledge/Skills/Attitude
  content: string // Single content field instead of title and description
}

interface ChapterProject {
  id: string
  name: string
  theoryHours: number
  practiceHours: number
}

interface AddCourseFormProps {
  majorId: string
  onCancel: () => void
  onSubmit: (courseData: any) => void
  initialData?: any
  isEditMode?: boolean
  courseDetailData?: any
}

const courseNatureOptions = [
  { id: 1, name: "通识教育课" },
  { id: 2, name: "学科基础课" },
  { id: 3, name: "专业课" },
  { id: 4, name: "集中实践教学环节" },
  { id: 5, name: "综合教育" },
]

function AddCourseForm({ majorId, onCancel, onSubmit, initialData, isEditMode = false, courseDetailData }: AddCourseFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [courseNaturePopoverOpen, setCourseNaturePopoverOpen] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"" | "saving" | "saved" | "failed">("")
  const teachingObjectivesSnapshotRef = useRef<TeachingObjective[]>([])

  // 从majorId中提取真实的majorId（如果是major-3895格式，提取3895）
  const realMajorId = useMemo(() => {
    if (majorId.startsWith("major-")) {
      return majorId.substring(6) // 移除"major-"前缀
    }
    return majorId
  }, [majorId])

  // 从initialData.id中提取真实的courseId（如果是course-3895-8622-0格式，提取8622）
  const realCourseId = useMemo(() => {
    if (initialData?.id && initialData.id.startsWith("course-")) {
      // 格式: course-${majorId}-${courseId}-${index}
      // 需要提取中间的courseId部分
      const parts = initialData.id.split("-")
      if (parts.length >= 3) {
        return parts[2] // 返回courseId部分
      }
    }
    return initialData?.id
  }, [initialData?.id])

  // Tab 1: Basic Information - 直接访问 initialData 的属性
  const [openingDate, setOpeningDate] = useState(initialData?.openingDate || "")
  const [courseType, setCourseType] = useState(initialData?.courseType || "必修")
  const [courseName, setCourseName] = useState(initialData?.name || initialData?.nodeName || "")
  const [courseNatureId, setCourseNatureId] = useState<number>(initialData?.courseNatureId || 0)
  const [introduction, setIntroduction] = useState(initialData?.introduction || "")
  const [theoryPeriod, setTheoryPeriod] = useState(initialData?.theoryPeriod || 0)
  const [practicePeriod, setPracticePeriod] = useState(initialData?.practicePeriod || 0)
  // 新增字段
  const [teachingClass, setTeachingClass] = useState(initialData?.teachingClass || "")
  const [teachingLocation, setTeachingLocation] = useState(initialData?.teachingLocation || "")

  // 课程表数据结构 - 支持多行
  const defaultScheduleRow = {
    period: "",
    sessions: "",
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: "",
  }

  const parseTeachingSchedule = (data: any) => {
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data)
        // 如果是数组格式，直接返回；否则转换为数组
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        return [defaultScheduleRow]
      }
    }
    return Array.isArray(data) ? data : (data ? [data] : [defaultScheduleRow])
  }

  const [teachingScheduleRows, setTeachingScheduleRows] = useState<typeof defaultScheduleRow[]>(() =>
    parseTeachingSchedule(initialData?.teachingTime)
  )

  // 课程表字段展开/收起状态 - 使用 rowIndex-fieldName 作为key
  const [scheduleFieldsExpanded, setScheduleFieldsExpanded] = useState<Record<string, boolean>>({})

  // 课程表操作函数
  const addScheduleRow = () => {
    setTeachingScheduleRows([...teachingScheduleRows, defaultScheduleRow])
  }

  const deleteScheduleRow = (index: number) => {
    if (teachingScheduleRows.length > 1) {
      setTeachingScheduleRows(teachingScheduleRows.filter((_, i) => i !== index))
    }
  }

  const updateScheduleRow = (index: number, field: string, value: string) => {
    const newRows = [...teachingScheduleRows]
    newRows[index] = { ...newRows[index], [field]: value }
    setTeachingScheduleRows(newRows)
  }

  const [studentCount, setStudentCount] = useState(initialData?.studentCount || 0)
  const [credits, setCredits] = useState(initialData?.credits || 0)
  const [mainTextbook, setMainTextbook] = useState(initialData?.mainTextbook || "")
  const [referenceResources, setReferenceResources] = useState(initialData?.referenceResources || "")

  // Tab 2: Course Requirements (课程要求)
  const [attendancePolicy, setAttendancePolicy] = useState(initialData?.attendancePolicy || "")
  const [assignmentPolicy, setAssignmentPolicy] = useState(initialData?.assignmentPolicy || "")
  const [conductRequirements, setConductRequirements] = useState(initialData?.conductRequirements || "")
  const [practiceRequirements, setPracticeRequirements] = useState(initialData?.practiceRequirements || "")
  const [teamworkRequirements, setTeamworkRequirements] = useState(initialData?.teamworkRequirements || "")
  const [bonusRequirements, setBonusRequirements] = useState(initialData?.bonusRequirements || "")
  const [otherSuggestions, setOtherSuggestions] = useState(initialData?.otherSuggestions || "")

  // Tab 3: Assessment and Evaluation (考核评价)
  const [assessmentMethod, setAssessmentMethod] = useState(initialData?.assessmentMethod || "考试")
  const [assessmentForm, setAssessmentForm] = useState(initialData?.assessmentForm || "")
  const [scoreType, setScoreType] = useState(initialData?.scoreType || "百分制")
  const [scoreTable, setScoreTable] = useState<{ headers: string[]; rows: { [key: string]: string }[] }>(
    initialData?.scoreTable || { headers: ["等级", "分值"], rows: [{ "等级": "", "分值": "" }] }
  )
  const [assessmentDescription, setAssessmentDescription] = useState(initialData?.assessmentDescription || "")

  // 获取课程性质名称
  const courseNatureName = useMemo(() => {
    const option = courseNatureOptions.find(opt => opt.id === courseNatureId)
    return option?.name || ""
  }, [courseNatureId])

  // 在编辑模式下，使用传入的 courseDetailData 初始化表单字段
  useEffect(() => {
    if (!isEditMode || !courseDetailData) return

    const courseData = courseDetailData.courseDetailData?.course
    if (courseData) {
      console.log(`[AddCourseForm] 使用 courseDetailData 初始化表单字段`)
      setCourseName(courseData.name || initialData?.name || "")
      setIntroduction(courseData.introduction || "")
      setTheoryPeriod(courseData.theoryPeriod || 0)
      setPracticePeriod(courseData.practicePeriod || 0)
      // 初始化新增字段
      setTeachingClass(courseData.teachingClass || "")
      setTeachingLocation(courseData.teachingLocation || "")
      setTeachingScheduleRows(parseTeachingSchedule(courseData.teachingTime))
      setStudentCount(courseData.studentCount || 0)
      setCredits(courseData.credits || 0)
      setMainTextbook(courseData.mainTextbook || "")
      setReferenceResources(courseData.referenceResources || "")
      // 初始化课程要求字段
      setAttendancePolicy(courseData.attendancePolicy || "")
      setAssignmentPolicy(courseData.assignmentPolicy || "")
      setConductRequirements(courseData.conductRequirements || "")
      setPracticeRequirements(courseData.practiceRequirements || "")
      setTeamworkRequirements(courseData.teamworkRequirements || "")
      setBonusRequirements(courseData.bonusRequirements || "")
      setOtherSuggestions(courseData.otherSuggestions || "")
      // 初始化考核评价字段
      setAssessmentMethod(courseData.assessmentMethod || "考试")
      setAssessmentForm(courseData.assessmentForm || "")
      setScoreType(courseData.scoreType || "百分制")
      setScoreTable(courseData.scoreTable || { headers: ["等级", "分值"], rows: [{ "等级": "", "分值": "" }] })
      setAssessmentDescription(courseData.assessmentDescription || "")
      // 根据 typeId 设置课程性质
      if (courseData.typeId) {
        setCourseNatureId(courseData.typeId)
      }
      // 从 createTime 提取日期部分
      if (courseData.createTime) {
        const dateStr = courseData.createTime.split("T")[0]
        setOpeningDate(dateStr)
      }
    }
  }, [isEditMode, courseDetailData, initialData?.name])

  // Tab 2: Teaching Objectives
  const [teachingObjectives, setTeachingObjectives] = useState<TeachingObjective[]>(
    initialData?.teachingObjectives || [{ id: "1", content: "", points: [""] }],
  )
  const [objectivesFile, setObjectivesFile] = useState<File | null>(null)
  const [courseGoals, setCourseGoals] = useState<any[]>([])
  const [isLoadingGoals, setIsLoadingGoals] = useState(false)
  // 追踪每个课程目标下的教学目标输入框状态：goalId -> { inputValue, isMultiline, isEditing }
  const [goalObjectiveInputs, setGoalObjectiveInputs] = useState<{ [key: number]: { inputValue: string; isMultiline: boolean; isEditing: boolean } }>({})
  // 追踪每个课程目标下的教学目标列表：goalId -> TeachingObjective[]（包含 children）
  const [goalObjectives, setGoalObjectives] = useState<{ [key: number]: Array<TeachingObjective & { children?: TeachingObjective[] }> }>({})
  // 追踪子项的编辑状态：`${goalId}-${objectiveId}-${childIdx}` -> { isEditing, inputValue }
  const [childrenEditStates, setChildrenEditStates] = useState<{ [key: string]: { isEditing: boolean; inputValue: string } }>({})
  // 追踪教学目标的编辑状态：`${goalId}-${objectiveId}` -> { isMultiline }
  const [goalObjectiveEditStates, setGoalObjectiveEditStates] = useState<{ [key: string]: { isMultiline: boolean } }>({})

  // Tab 3: Course Point Information Library
  const [coursePoints, setCoursePoints] = useState<CoursePoint[]>(
    initialData?.coursePoints?.map((cp: any) => ({
      id: cp.id,
      content: cp.content || cp.title || "",
      infoPoints:
        cp.infoPoints?.map((ip: any) => ({
          id: ip.id || Date.now().toString() + Math.random(),
          type: ip.type || "K",
          content: ip.content || ip.title || "",
        })) || [],
    })) || [{ id: "1", content: "", infoPoints: [] }],
  )
  const [pointsFile, setPointsFile] = useState<File | null>(null)

  // Tab 4: Chapter and Project Management
  const [chapters, setChapters] = useState<ChapterProject[]>(
    initialData?.chapters || [{ id: "1", name: "", theoryHours: 0, practiceHours: 0 }],
  )

  const lastObjectiveRef = useRef<HTMLInputElement>(null)
  const lastPointRef = useRef<HTMLInputElement>(null)
  const hasLoadedGoalsRef = useRef(false)
  const [majorIndicators, setMajorIndicators] = useState<Array<{ requirementId: string; indicatorIndex: number; content: string }>>([])

  // 加载专业的指标点，并过滤出该课程支撑的指标点
  useEffect(() => {
    const loadMajorIndicators = async () => {
      try {
        console.log("loadMajorIndicators: isEditMode=", isEditMode, "realCourseId=", realCourseId, "realMajorId=", realMajorId)

        // 从localStorage中获取专业数据
        const majorData = localStorage.getItem(`major-${realMajorId}`)
        if (majorData) {
          const parsed = JSON.parse(majorData)
          const allIndicators: Array<{ requirementId: string; indicatorIndex: number; content: string }> = []

          // 从缓存的专业数据中获取毕业要求（兼容新旧格式）
          const graduationRequirements = parsed.graduationRequirements || parsed.requiresVOS || []
          if (graduationRequirements.length > 0) {
            graduationRequirements.forEach((req: any) => {
              req.indicators?.forEach((indicator: string, index: number) => {
                allIndicators.push({
                  requirementId: req.id,
                  indicatorIndex: index,
                  content: indicator,
                })
              })
            })
          }

          console.log("所有指标点数量:", allIndicators.length)

          // 如果是编辑模式，获取该课程支撑的指标点
          if (isEditMode && realCourseId) {
            console.log("加载课程支撑的指标点，courseId:", realCourseId, "majorId:", realMajorId)
            const supportResponse = await api.matrices.getCourseIndicatorSupports(realCourseId, realMajorId)
            console.log("课程支撑的指标点:", supportResponse.data)

            if (supportResponse.data && supportResponse.data.length > 0) {
              // 只显示该课程支撑的指标点
              const supportedIndicatorKeys = new Set(supportResponse.data)
              const filteredIndicators = allIndicators.filter((indicator) => {
                const key = `${indicator.requirementId}-${indicator.indicatorIndex}`
                return supportedIndicatorKeys.has(key)
              })
              console.log("过滤后的指标点:", filteredIndicators)
              setMajorIndicators(filteredIndicators)
            } else {
              // 如果没有支撑的指标点，显示所有指标点
              console.log("没有支撑的指标点，显示所有指标点")
              setMajorIndicators(allIndicators)
            }
          } else {
            // 新增模式显示所有指标点
            console.log("新增模式，显示所有指标点")
            setMajorIndicators(allIndicators)
          }
        }
      } catch (error) {
        console.error("加载专业指标点失败:", error)
      }
    }

    if (realMajorId) {
      loadMajorIndicators()
    }
  }, [realMajorId, isEditMode, realCourseId])

  // 进入编辑模式时，加载课程与指标点的关系
  useEffect(() => {
    const loadCourseObjectiveIndicators = async () => {
      if (!isEditMode || !realCourseId || !realMajorId) return

      try {
        const response = await api.matrices.getCourseTeachingObjectiveIndicators(realCourseId, realMajorId)
        if (response.data) {
          // 根据保存的关系数据，更新教学目标的supportedIndicators
          setTeachingObjectives((prevObjectives) =>
            prevObjectives.map((obj) => ({
              ...obj,
              supportedIndicators: response.data[obj.id] || [],
            }))
          )
        }
      } catch (error) {
        console.error("加载课程教学目标指标点关系失败:", error)
      }
    }

    loadCourseObjectiveIndicators()
  }, [isEditMode, realCourseId, realMajorId])

  // 加载课程目标数据
  useEffect(() => {
    const loadCourseGoalsData = async () => {
      if (!isEditMode || !realCourseId || !realMajorId) return

      // 防止重复加载（React StrictMode 会执行两次）
      if (hasLoadedGoalsRef.current) return
      hasLoadedGoalsRef.current = true

      setIsLoadingGoals(true)
      try {
        console.log(`[AddCourseForm] 加载课程目标，courseId: ${realCourseId}, majorId: ${realMajorId}`)
        const response = await api.courseGoals.getCourseGoals(realCourseId, realMajorId)
        if (response.data) {
          console.log(`[AddCourseForm] 课程目标加载成功`, response.data)
          setCourseGoals(response.data)

          // 初始化 goalObjectives，将 children 也添加到教学目标列表中
          const initialGoalObjectives: Record<number, Array<TeachingObjective & { children?: TeachingObjective[] }>> = {}
          response.data.forEach((goal: any) => {
            const objectives: Array<TeachingObjective & { children?: TeachingObjective[] }> = []

            // 如果有 children，添加到教学目标列表
            if (goal.children && goal.children.length > 0) {
              goal.children.forEach((child: any) => {
                objectives.push({
                  id: child.id.toString(),
                  content: child.description,
                  points: [""],
                  children: [],
                })
              })
            }

            initialGoalObjectives[goal.id] = objectives
          })
          setGoalObjectives(initialGoalObjectives)
        }
      } catch (error) {
        console.error("[AddCourseForm] 加载课程目标失败:", error)
      } finally {
        setIsLoadingGoals(false)
      }
    }

    loadCourseGoalsData()
  }, [isEditMode, realCourseId, realMajorId])

  // Teaching Objectives functions
  const addTeachingObjective = () => {
    const newId = Date.now().toString()
    setTeachingObjectives([{ id: newId, content: "", points: [""] }, ...teachingObjectives])
    setTimeout(() => lastObjectiveRef.current?.focus(), 0)
  }

  const removeTeachingObjective = (id: string) => {
    if (teachingObjectives.length > 1) {
      setTeachingObjectives(teachingObjectives.filter((obj) => obj.id !== id))
    }
  }

  const updateTeachingObjective = (id: string, content: string) => {
    setTeachingObjectives(teachingObjectives.map((obj) => (obj.id === id ? { ...obj, content } : obj)))
  }

  const updateTeachingObjectiveIndicators = (id: string, indicators: string[]) => {
    setTeachingObjectives(teachingObjectives.map((obj) => (obj.id === id ? { ...obj, supportedIndicators: indicators } : obj)))
  }

  // 课程目标下的教学目标处理函数
  const startAddingObjectiveForGoal = (goalId: number) => {
    setGoalObjectiveInputs((prev) => ({
      ...prev,
      [goalId]: { inputValue: "", isMultiline: false, isEditing: true },
    }))
  }

  const updateGoalObjectiveInput = (goalId: number, value: string) => {
    setGoalObjectiveInputs((prev) => ({
      ...prev,
      [goalId]: { ...prev[goalId], inputValue: value },
    }))
  }

  const toggleGoalObjectiveMultiline = (goalId: number, isMultiline: boolean) => {
    setGoalObjectiveInputs((prev) => ({
      ...prev,
      [goalId]: { ...prev[goalId], isMultiline },
    }))
  }

  const finishAddingObjectiveForGoal = (goalId: number) => {
    const input = goalObjectiveInputs[goalId]
    if (!input || !input.inputValue.trim()) {
      setGoalObjectiveInputs((prev) => ({
        ...prev,
        [goalId]: { inputValue: "", isMultiline: false, isEditing: false },
      }))
      return
    }

    // 添加到该课程目标的教学目标列表
    const newObjective: TeachingObjective & { children?: TeachingObjective[] } = {
      id: Date.now().toString(),
      content: input.inputValue.trim(),
      points: [""],
      children: [],
    }

    setGoalObjectives((prev) => ({
      ...prev,
      [goalId]: [...(prev[goalId] || []), newObjective],
    }))

    // 清空输入框
    setGoalObjectiveInputs((prev) => ({
      ...prev,
      [goalId]: { inputValue: "", isMultiline: false, isEditing: false },
    }))
  }

  const removeGoalObjective = (goalId: number, objectiveId: string) => {
    setGoalObjectives((prev) => ({
      ...prev,
      [goalId]: (prev[goalId] || []).filter((obj) => obj.id !== objectiveId),
    }))
  }

  const toggleGoalObjectiveEditMode = (goalId: number, objectiveId: string, isMultiline: boolean) => {
    const key = `${goalId}-${objectiveId}`
    setGoalObjectiveEditStates((prev) => ({
      ...prev,
      [key]: { isMultiline },
    }))
  }

  // 子项编辑函数
  const startEditingChild = (goalId: number, objectiveId: string, childIdx: number, currentValue: string) => {
    const key = `${goalId}-${objectiveId}-${childIdx}`
    setChildrenEditStates((prev) => ({
      ...prev,
      [key]: { isEditing: true, inputValue: currentValue },
    }))
  }

  const updateChildInput = (goalId: number, objectiveId: string, childIdx: number, value: string) => {
    const key = `${goalId}-${objectiveId}-${childIdx}`
    setChildrenEditStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], inputValue: value },
    }))
  }

  const finishEditingChild = (goalId: number, objectiveId: string, childIdx: number) => {
    const key = `${goalId}-${objectiveId}-${childIdx}`
    const editState = childrenEditStates[key]
    if (!editState) return

    // 更新子项内容
    setGoalObjectives((prev) => ({
      ...prev,
      [goalId]: (prev[goalId] || []).map((obj) => {
        if (obj.id === objectiveId && obj.children) {
          return {
            ...obj,
            children: obj.children.map((child, idx) =>
              idx === childIdx ? { ...child, content: editState.inputValue.trim() } : child
            ),
          }
        }
        return obj
      }),
    }))

    // 清空编辑状态
    setChildrenEditStates((prev) => {
      const newState = { ...prev }
      delete newState[key]
      return newState
    })
  }

  const removeChild = (goalId: number, objectiveId: string, childIdx: number) => {
    setGoalObjectives((prev) => ({
      ...prev,
      [goalId]: (prev[goalId] || []).map((obj) => {
        if (obj.id === objectiveId && obj.children) {
          return {
            ...obj,
            children: obj.children.filter((_, idx) => idx !== childIdx),
          }
        }
        return obj
      }),
    }))
  }

  const addChildToObjective = (goalId: number, objectiveId: string) => {
    setGoalObjectives((prev) => ({
      ...prev,
      [goalId]: (prev[goalId] || []).map((obj) => {
        if (obj.id === objectiveId) {
          return {
            ...obj,
            children: [
              ...(obj.children || []),
              {
                id: Date.now().toString(),
                content: "",
                points: [""],
              },
            ],
          }
        }
        return obj
      }),
    }))
  }

  // Course Points functions
  const addCoursePoint = () => {
    const newId = Date.now().toString()
    setCoursePoints([...coursePoints, { id: newId, content: "", infoPoints: [] }])
    setTimeout(() => lastPointRef.current?.focus(), 0)
  }

  const removeCoursePoint = (id: string) => {
    if (coursePoints.length > 1) {
      setCoursePoints(coursePoints.filter((point) => point.id !== id))
    }
  }

  const updateCoursePointContent = (id: string, content: string) => {
    setCoursePoints(coursePoints.map((point) => (point.id === id ? { ...point, content } : point)))
  }

  const addInfoPointWithType = (pointId: string, type: "K" | "S" | "A") => {
    setCoursePoints(
      coursePoints.map((point) => {
        if (point.id === pointId) {
          // Count existing info points of this type
          const existingCount = point.infoPoints.filter((ip) => ip.type === type).length
          const newNumber = existingCount + 1
          const newId = `${type}${newNumber}`

          return {
            ...point,
            infoPoints: [...point.infoPoints, { id: newId, type, content: "" }],
          }
        }
        return point
      }),
    )
  }

  const removeInfoPoint = (pointId: string, infoPointId: string) => {
    setCoursePoints(
      coursePoints.map((point) =>
        point.id === pointId ? { ...point, infoPoints: point.infoPoints.filter((ip) => ip.id !== infoPointId) } : point,
      ),
    )
  }

  const updateInfoPointContent = (pointId: string, infoPointId: string, content: string) => {
    setCoursePoints(
      coursePoints.map((point) =>
        point.id === pointId
          ? {
              ...point,
              infoPoints: point.infoPoints.map((ip) => (ip.id === infoPointId ? { ...ip, content } : ip)),
            }
          : point,
      ),
    )
  }

  // Chapter functions
  const addChapter = () => {
    setChapters([...chapters, { id: Date.now().toString(), name: "", theoryHours: 0, practiceHours: 0 }])
  }

  const removeChapter = (id: string) => {
    if (chapters.length > 1) {
      setChapters(chapters.filter((ch) => ch.id !== id))
    }
  }

  const updateChapter = (id: string, field: string, value: any) => {
    setChapters(chapters.map((ch) => (ch.id === id ? { ...ch, [field]: value } : ch)))
  }

  const handleObjectivesFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setObjectivesFile(file)
      // TODO: Parse Excel file
    }
  }

  const handlePointsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPointsFile(file)
      // TODO: Parse Excel file
    }
  }

  // 同步教学目标到快照ref，用于自动保存
  useEffect(() => {
    teachingObjectivesSnapshotRef.current = teachingObjectives
  }, [teachingObjectives])

  // 自动保存教学目标与指标点的关系（异步，不阻塞UI）
  useEffect(() => {
    if (!isEditMode || !realCourseId || !realMajorId) return

    const autoSaveInterval = setInterval(() => {
      const snapshot = teachingObjectivesSnapshotRef.current

      Promise.resolve().then(async () => {
        try {
          setAutoSaveStatus("saving")
          // 构建教学目标与指标点的关系数据
          const objectiveIndicatorMap: Record<string, string[]> = {}
          snapshot.forEach((obj) => {
            if (obj.supportedIndicators && obj.supportedIndicators.length > 0) {
              objectiveIndicatorMap[obj.id] = obj.supportedIndicators
            }
          })
          // 保存到API
          await api.matrices.updateCourseTeachingObjectiveIndicators(realCourseId, realMajorId, objectiveIndicatorMap)
          setAutoSaveStatus("saved")
          setTimeout(() => setAutoSaveStatus(""), 3000)
        } catch (error) {
          console.error("自动保存教学目标指标点关系失败:", error)
          setAutoSaveStatus("failed")
          setTimeout(() => setAutoSaveStatus(""), 3000)
        }
      })
    }, 10000) // 每10秒自动保存一次

    return () => clearInterval(autoSaveInterval)
  }, [isEditMode, realCourseId, realMajorId])

  const handleSubmit = () => {
    setIsLoading(true)

    if (!courseName.trim() || !courseNatureId) {
      toast({
        variant: "destructive",
        title: "表单验证失败",
        description: "请完整填写表单内容",
        duration: 5000,
      })
      setIsLoading(false)
      return
    }

    const courseData = {
      name: courseName,
      type: "course" as const,
      metadata: {
        openingDate,
        courseType,
        courseNatureId,
        courseNatureName: courseNatureName,
        introduction,
        theoryPeriod,
        practicePeriod,
        teachingClass,
        teachingLocation,
        teachingTime: JSON.stringify(teachingScheduleRows),
        studentCount,
        credits,
        mainTextbook,
        referenceResources,
        // 课程要求字段
        attendancePolicy,
        assignmentPolicy,
        conductRequirements,
        practiceRequirements,
        teamworkRequirements,
        bonusRequirements,
        otherSuggestions,
        // 考核评价字段
        assessmentMethod,
        assessmentForm,
        scoreType,
        scoreTable,
        assessmentDescription,
        teachingObjectives,
        coursePoints,
        chapters,
      },
      children: initialData?.children || [],
    }

    toast({
      variant: "success",
      title: "保存成功",
      description: isEditMode ? "课程信息已成功更新" : "课程信息已成功保存",
      duration: 3000,
    })
    onSubmit(courseData)
    setIsLoading(false)
  }

  const totalTheoryHours = chapters.reduce((sum, ch) => sum + (ch.theoryHours || 0), 0)
  const totalPracticeHours = chapters.reduce((sum, ch) => sum + (ch.practiceHours || 0), 0)
  const totalHours = totalTheoryHours + totalPracticeHours
  const chapterCount = chapters.filter((ch) => ch.name.includes("章")).length
  const projectCount = chapters.filter((ch) => ch.name.includes("项目")).length

  return (
    <div className="space-y-6 mr-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel} className="gap-2 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
          <h2 className="text-xl font-bold text-foreground">{isEditMode ? "编辑课程" : "新增课程"}</h2>
        </div>
        <div className="flex items-center gap-2 pr-6">
          <Button
            variant="outline"
            onClick={onCancel}
            className="gap-2 bg-transparent"
            disabled={isLoading || autoSaveStatus === "saving" || autoSaveStatus === "saved"}
          >
            <X className="w-4 h-4" />
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            className="gap-2"
            disabled={isLoading || autoSaveStatus === "saving" || autoSaveStatus === "saved"}
            variant={autoSaveStatus === "saved" ? "default" : autoSaveStatus === "failed" ? "destructive" : "default"}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中
              </>
            ) : autoSaveStatus === "saving" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                自动保存中
              </>
            ) : autoSaveStatus === "saved" ? (
              <>
                <Check className="w-4 h-4" />
                已保存
              </>
            ) : autoSaveStatus === "failed" ? (
              <>
                <X className="w-4 h-4" />
                保存失败
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                保存
              </>
            )}
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <UnderlineTabsList className="grid grid-cols-4">
            <UnderlineTabsTrigger value="basic">
              基本信息
            </UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="requirements">
              课程要求
            </UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="assessment">
              考核评价
            </UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="chapters">
              章节与项目
            </UnderlineTabsTrigger>
          </UnderlineTabsList>

          <TabsContent value="basic" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
                <h3 className="text-base font-semibold text-foreground">基本信息</h3>
              </div>
              <div className="border-t border-dashed border-border" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="opening-date">开课日期</Label>
                  <div className="relative">
                    <Input
                      id="opening-date"
                      type="date"
                      value={openingDate}
                      onChange={(e) => setOpeningDate(e.target.value)}
                      className="pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    课程类型 <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={courseType === "必修" ? "default" : "outline"}
                      onClick={() => setCourseType("必修")}
                      className="flex-1"
                    >
                      必修
                    </Button>
                    <Button
                      type="button"
                      variant={courseType === "选修" ? "default" : "outline"}
                      onClick={() => setCourseType("选修")}
                      className="flex-1"
                    >
                      选修
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="course-name">
                    课程名称 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="course-name"
                      placeholder="例如：数据结构与算法"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value.slice(0, 32))}
                      maxLength={32}
                      className="pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{courseName.length}/32</span>
                      {courseName && (
                        <button
                          type="button"
                          onClick={() => setCourseName("")}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="course-nature">
                    课程性质 <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={courseNaturePopoverOpen} onOpenChange={setCourseNaturePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between bg-transparent">
                        <span className="truncate">{courseNatureName || "请选择课程性质"}</span>
                        <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <div className="max-h-[300px] overflow-y-auto p-2">
                        {courseNatureOptions.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => {
                              setCourseNatureId(option.id)
                              setCourseNaturePopoverOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent hover:text-white ${
                              courseNatureId === option.id ? "bg-[var(--naive-primary)] text-white" : ""
                            }`}
                          >
                            {option.name}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theory-period">理论学时</Label>
                  <Input
                    id="theory-period"
                    type="number"
                    min="0"
                    placeholder="例如：32"
                    value={theoryPeriod}
                    onChange={(e) => setTheoryPeriod(Number.parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="practice-period">实践学时</Label>
                  <Input
                    id="practice-period"
                    type="number"
                    min="0"
                    placeholder="例如：16"
                    value={practicePeriod}
                    onChange={(e) => setPracticePeriod(Number.parseInt(e.target.value) || 0)}
                  />
                </div>



                <div className="space-y-2 relative">
                  <Label htmlFor="teaching-class">授课班级</Label>
                  <div className="relative">
                    <Input
                      id="teaching-class"
                      placeholder=""
                      value={teachingClass}
                      onChange={(e) => setTeachingClass(e.target.value.slice(0, 200))}
                      maxLength={200}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      {teachingClass.length}/200
                    </div>
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="teaching-location">授课地点</Label>
                  <div className="relative">
                    <Input
                      id="teaching-location"
                      placeholder=""
                      value={teachingLocation}
                      onChange={(e) => setTeachingLocation(e.target.value.slice(0, 200))}
                      maxLength={200}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      {teachingLocation.length}/200
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="student-count">学生人数</Label>
                  <Input
                    id="student-count"
                    type="number"
                    min="0"
                    placeholder=""
                    value={studentCount}
                    onChange={(e) => setStudentCount(Number.parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credits">学分</Label>
                  <Input
                    id="credits"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder=""
                    value={credits}
                    onChange={(e) => setCredits(Number.parseFloat(e.target.value) || 0)}
                  />
                </div>

                {/* 主要教材和参考文献放在一行 */}
                <div className="space-y-2">
                  <Label htmlFor="main-textbook">课程使用的主要教材</Label>
                  <ExpandableTextarea
                    value={mainTextbook}
                    onChange={setMainTextbook}
                    placeholder=""
                    maxLength={500}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference-resources">建议阅读材料和参考文献</Label>
                  <ExpandableTextarea
                    value={referenceResources}
                    onChange={setReferenceResources}
                    placeholder=""
                    maxLength={1000}
                    rows={4}
                  />
                </div>

                {/* 课程介绍和课程表放在最后一行 */}
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="introduction">课程介绍</Label>
                  <ExpandableTextarea
                    value={introduction}
                    onChange={setIntroduction}
                    placeholder="输入课程介绍"
                    maxLength={1024}
                    rows={10}
                  />
                </div>

                {/* 授课时间课程表 */}
                <div className="space-y-2 col-span-2">
                  <Label>授课时间</Label>
                  <div className="border border-input rounded-md overflow-hidden bg-background">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                          <TableHead className="w-32 text-center p-2 font-medium">时段</TableHead>
                          <TableHead className="w-8 text-center p-2 font-medium">节次</TableHead>
                          <TableHead className="w-8 text-center p-2 font-medium">周一</TableHead>
                          <TableHead className="w-8 text-center p-2 font-medium">周二</TableHead>
                          <TableHead className="w-8 text-center p-2 font-medium">周三</TableHead>
                          <TableHead className="w-8 text-center p-2 font-medium">周四</TableHead>
                          <TableHead className="w-8 text-center p-2 font-medium">周五</TableHead>
                          <TableHead className="w-8 text-center p-2 font-medium">周六</TableHead>
                          <TableHead className="w-8 text-center p-2 font-medium">周日</TableHead>
                          <TableHead className="w-16 text-center p-2 font-medium">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={addScheduleRow}
                              className="h-6 w-6 p-0 hover:bg-primary/10 mx-auto"
                              title="新增行"
                            >
                              <Plus className="w-4 h-4 text-primary" />
                            </Button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teachingScheduleRows.map((row, rowIndex) => {
                          const isFirstRow = rowIndex === 0
                          const isLastRow = rowIndex === teachingScheduleRows.length - 1
                          const dayFields = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

                          return (
                            <TableRow key={rowIndex} className="hover:bg-secondary/20">
                              {/* 时段单元格 */}
                              <TableCell className="p-1 text-center">
                                {scheduleFieldsExpanded[`${rowIndex}-period`] ? (
                                  <textarea
                                    placeholder=""
                                    value={row.period}
                                    onChange={(e) => updateScheduleRow(rowIndex, "period", e.target.value)}
                                    onBlur={() => setScheduleFieldsExpanded({ ...scheduleFieldsExpanded, [`${rowIndex}-period`]: false })}
                                    className="w-full px-1 py-0.5 text-xs border border-input rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                    rows={3}
                                    autoFocus
                                  />
                                ) : (
                                  <Input
                                    placeholder=""
                                    value={row.period}
                                    onFocus={() => setScheduleFieldsExpanded({ ...scheduleFieldsExpanded, [`${rowIndex}-period`]: true })}
                                    readOnly
                                    className="cursor-text text-xs h-6 p-0.5 text-center"
                                  />
                                )}
                              </TableCell>

                              {/* 节次单元格 */}
                              <TableCell className="p-1 text-center">
                                {scheduleFieldsExpanded[`${rowIndex}-sessions`] ? (
                                  <textarea
                                    placeholder=""
                                    value={row.sessions}
                                    onChange={(e) => updateScheduleRow(rowIndex, "sessions", e.target.value)}
                                    onBlur={() => setScheduleFieldsExpanded({ ...scheduleFieldsExpanded, [`${rowIndex}-sessions`]: false })}
                                    className="w-full px-1 py-0.5 text-xs border border-input rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                    rows={3}
                                    autoFocus
                                  />
                                ) : (
                                  <Input
                                    placeholder=""
                                    value={row.sessions}
                                    onFocus={() => setScheduleFieldsExpanded({ ...scheduleFieldsExpanded, [`${rowIndex}-sessions`]: true })}
                                    readOnly
                                    className="cursor-text text-xs h-6 p-0.5 text-center"
                                  />
                                )}
                              </TableCell>

                              {/* 周一到周日单元格 */}
                              {dayFields.map((day) => (
                                <TableCell key={`${rowIndex}-${day}`} className="p-1 text-center">
                                  {scheduleFieldsExpanded[`${rowIndex}-${day}`] ? (
                                    <textarea
                                      placeholder=""
                                      value={row[day as keyof typeof row]}
                                      onChange={(e) => updateScheduleRow(rowIndex, day, e.target.value)}
                                      onBlur={() => setScheduleFieldsExpanded({ ...scheduleFieldsExpanded, [`${rowIndex}-${day}`]: false })}
                                      className="w-full px-1 py-0.5 text-xs border border-input rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                      rows={3}
                                      autoFocus
                                    />
                                  ) : (
                                    <Input
                                      placeholder=""
                                      value={row[day as keyof typeof row]}
                                      onFocus={() => setScheduleFieldsExpanded({ ...scheduleFieldsExpanded, [`${rowIndex}-${day}`]: true })}
                                      readOnly
                                      className="cursor-text text-xs h-6 p-0.5 text-center"
                                    />
                                  )}
                                </TableCell>
                              ))}

                              {/* 操作列 */}
                              <TableCell className="p-1 text-center w-16">
                                {teachingScheduleRows.length > 1 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteScheduleRow(rowIndex)}
                                    className="h-6 w-6 p-0 hover:bg-destructive/10 mx-auto"
                                    title="删除行"
                                  >
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="requirements" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
                <h3 className="text-base font-semibold text-foreground">课程要求</h3>
              </div>
              <div className="border-t border-dashed border-border" />

              {/* 课程要求字段 - 2列布局 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 1. 关于课堂出席政策及要求 */}
                <div className="space-y-2">
                  <Label htmlFor="attendance-policy">关于课堂出席政策及要求</Label>
                  <ExpandableTextarea
                    value={attendancePolicy}
                    onChange={setAttendancePolicy}
                    placeholder=""
                    maxLength={500}
                    rows={4}
                  />
                </div>

                {/* 2. 关于作业提交的政策及要求 */}
                <div className="space-y-2">
                  <Label htmlFor="assignment-policy">关于作业提交的政策及要求</Label>
                  <ExpandableTextarea
                    value={assignmentPolicy}
                    onChange={setAssignmentPolicy}
                    placeholder=""
                    maxLength={500}
                    rows={4}
                  />
                </div>

                {/* 3. 关于上课行为规范、诚信学习要求 */}
                <div className="space-y-2">
                  <Label htmlFor="conduct-requirements">关于上课行为规范、诚信学习要求</Label>
                  <ExpandableTextarea
                    value={conductRequirements}
                    onChange={setConductRequirements}
                    placeholder=""
                    maxLength={500}
                    rows={4}
                  />
                </div>

                {/* 4. 关于参与实践环节的要求 */}
                <div className="space-y-2">
                  <Label htmlFor="practice-requirements">关于参与实践环节的要求</Label>
                  <ExpandableTextarea
                    value={practiceRequirements}
                    onChange={setPracticeRequirements}
                    placeholder=""
                    maxLength={500}
                    rows={4}
                  />
                </div>

                {/* 5. 关于团队学习、分组讨论的要求 */}
                <div className="space-y-2">
                  <Label htmlFor="teamwork-requirements">关于团队学习、分组讨论的要求</Label>
                  <ExpandableTextarea
                    value={teamworkRequirements}
                    onChange={setTeamworkRequirements}
                    placeholder=""
                    maxLength={500}
                    rows={4}
                  />
                </div>

                {/* 6. 关于专利、论文等加分项的要求 */}
                <div className="space-y-2">
                  <Label htmlFor="bonus-requirements">关于专利、论文等加分项的要求</Label>
                  <ExpandableTextarea
                    value={bonusRequirements}
                    onChange={setBonusRequirements}
                    placeholder=""
                    maxLength={500}
                    rows={4}
                  />
                </div>

                {/* 7. 其他学习建议 */}
                <div className="space-y-2">
                  <Label htmlFor="other-suggestions">其他学习建议</Label>
                  <ExpandableTextarea
                    value={otherSuggestions}
                    onChange={setOtherSuggestions}
                    placeholder=""
                    maxLength={500}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assessment" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
                <h3 className="text-base font-semibold text-foreground">考核评价</h3>
              </div>
              <div className="border-t border-dashed border-border" />

              {/* 1. 考核方式 和 3. 总成绩类型 - 同一行 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 1. 考核方式 */}
                <div className="space-y-2">
                  <Label>考核方式</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={assessmentMethod === "考试" ? "default" : "outline"}
                      onClick={() => setAssessmentMethod("考试")}
                      className="flex-1"
                    >
                      考试
                    </Button>
                    <Button
                      type="button"
                      variant={assessmentMethod === "考查" ? "default" : "outline"}
                      onClick={() => setAssessmentMethod("考查")}
                      className="flex-1"
                    >
                      考查
                    </Button>
                  </div>
                </div>

                {/* 3. 总成绩类型 */}
                <div className="space-y-2">
                  <Label>总成绩为</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={scoreType === "百分制" ? "default" : "outline"}
                      onClick={() => setScoreType("百分制")}
                      className="flex-1"
                    >
                      百分制
                    </Button>
                    <Button
                      type="button"
                      variant={scoreType === "五级分制" ? "default" : "outline"}
                      onClick={() => setScoreType("五级分制")}
                      className="flex-1"
                    >
                      五级分制
                    </Button>
                  </div>
                </div>
              </div>

              {/* 2. 具体形式 和 6. 考核评价说明 - 同一行 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 2. 具体形式 */}
                <div className="space-y-2">
                  <Label htmlFor="assessment-form">具体形式</Label>
                  <ExpandableTextarea
                    value={assessmentForm}
                    onChange={setAssessmentForm}
                    placeholder=""
                    maxLength={500}
                    rows={4}
                  />
                </div>

                {/* 6. 考核评价说明 */}
                <div className="space-y-2">
                  <Label htmlFor="assessment-description">考核评价说明</Label>
                  <ExpandableTextarea
                    value={assessmentDescription}
                    onChange={setAssessmentDescription}
                    placeholder=""
                    maxLength={1000}
                    rows={4}
                  />
                </div>
              </div>

              {/* 4. 总成绩表格 */}
              <div className="space-y-2">
                <Label>总成绩</Label>
                <div className="border border-input rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-input bg-secondary/30">
                        {scoreTable.headers.map((header, idx) => (
                          <th key={idx} className="border-r border-input p-2 text-center font-medium">
                            <div className="flex items-center justify-center gap-2">
                              <Input
                                value={header}
                                onChange={(e) => {
                                  const newHeaders = [...scoreTable.headers]
                                  newHeaders[idx] = e.target.value
                                  setScoreTable({ ...scoreTable, headers: newHeaders })
                                }}
                                placeholder="表头"
                                className="text-center text-sm h-8"
                              />
                              {scoreTable.headers.length > 1 && (
                                <button
                                  onClick={() => {
                                    const newHeaders = scoreTable.headers.filter((_, i) => i !== idx)
                                    const newRows = scoreTable.rows.map((row) => {
                                      const newRow = { ...row }
                                      delete newRow[header]
                                      return newRow
                                    })
                                    setScoreTable({ headers: newHeaders, rows: newRows })
                                  }}
                                  className="text-destructive hover:text-destructive/80"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="p-2 text-center">
                          <button
                            onClick={() => {
                              const newHeader = `列${scoreTable.headers.length + 1}`
                              setScoreTable({
                                ...scoreTable,
                                headers: [...scoreTable.headers, newHeader],
                                rows: scoreTable.rows.map((row) => ({ ...row, [newHeader]: "" })),
                              })
                            }}
                            className="text-primary hover:text-primary/80"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreTable.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-t border-input hover:bg-secondary/20">
                          {scoreTable.headers.map((header, colIdx) => (
                            <td key={colIdx} className={`border-r border-input p-2 ${colIdx < scoreTable.headers.length - 1 ? "border-r" : ""}`}>
                              <Input
                                value={row[header] || ""}
                                onChange={(e) => {
                                  const newRows = [...scoreTable.rows]
                                  newRows[rowIdx] = { ...newRows[rowIdx], [header]: e.target.value }
                                  setScoreTable({ ...scoreTable, rows: newRows })
                                }}
                                placeholder="输入内容"
                                className="text-center text-sm h-8"
                              />
                            </td>
                          ))}
                          <td className="p-2 text-center">
                            {scoreTable.rows.length > 1 && (
                              <button
                                onClick={() => {
                                  const newRows = scoreTable.rows.filter((_, i) => i !== rowIdx)
                                  setScoreTable({ ...scoreTable, rows: newRows })
                                }}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-input">
                        <td colSpan={scoreTable.headers.length + 1} className="p-2 text-center">
                          <button
                            onClick={() => {
                              const newRow: { [key: string]: string } = {}
                              scoreTable.headers.forEach((header) => {
                                newRow[header] = ""
                              })
                              setScoreTable({ ...scoreTable, rows: [...scoreTable.rows, newRow] })
                            }}
                            className="text-primary hover:text-primary/80 flex items-center justify-center gap-1 mx-auto"
                          >
                            <Plus className="w-4 h-4" />
                            <span>添加行</span>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. 五级分制说明 */}
              {scoreType === "五级分制" && (
                <div className="p-4 bg-secondary/30 rounded-md border border-border">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    五级分制的成绩等级与分值对应如下：90-100分为优秀，80-89分为良好，70-79分为中等，60-69分为及格，60分以下为不及格（详细列示五级分制的考核标准和具体要求）。
                  </p>
                </div>
              )}

            </div>
          </TabsContent>

          <TabsContent value="chapters" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
                  <h3 className="text-base font-semibold text-foreground">章节项目管理</h3>
                </div>
                <Button size="sm" variant="outline" onClick={addChapter} className="gap-2 bg-transparent">
                  <Plus className="w-4 h-4" />
                  添加章节/项目
                </Button>
              </div>
              <div className="border-t border-dashed border-border" />

              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                        序号
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                        名称
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                        理论学时
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                        实践学时
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chapters.map((chapter, index) => (
                      <tr key={chapter.id} className="border-t border-border hover:bg-secondary/30">
                        <td className="px-4 py-3 text-sm text-foreground border-r border-border">{index + 1}</td>
                        <td className="px-4 py-3 border-r border-border">
                          <Input
                            placeholder="例如：第一章 数据结构基础"
                            value={chapter.name}
                            onChange={(e) => updateChapter(chapter.id, "name", e.target.value)}
                            className="h-9"
                          />
                        </td>
                        <td className="px-4 py-3 border-r border-border">
                          <Input
                            type="number"
                            min="0"
                            value={chapter.theoryHours}
                            onChange={(e) =>
                              updateChapter(chapter.id, "theoryHours", Number.parseInt(e.target.value) || 0)
                            }
                            className="h-9"
                          />
                        </td>
                        <td className="px-4 py-3 border-r border-border">
                          <Input
                            type="number"
                            min="0"
                            value={chapter.practiceHours}
                            onChange={(e) =>
                              updateChapter(chapter.id, "practiceHours", Number.parseInt(e.target.value) || 0)
                            }
                            className="h-9"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {chapters.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeChapter(chapter.id)}
                              className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              删除
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-primary/30 bg-primary/5">
                      <td
                        colSpan={2}
                        className="px-4 py-3 text-sm font-semibold text-foreground border-r border-border"
                      >
                        统计：{chapterCount} 个章节，{projectCount} 个项目
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground border-r border-border">
                        {totalTheoryHours} 学时
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground border-r border-border">
                        {totalPracticeHours} 学时
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">合计：{totalHours} 学时</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <div className="flex items-center justify-center gap-2 pb-6 mr-6">
        <Button variant="outline" onClick={onCancel} className="gap-2 bg-transparent" disabled={isLoading}>
          <X className="w-4 h-4" />
          取消
        </Button>
        <Button onClick={handleSubmit} className="gap-2" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          保存
        </Button>
      </div>
    </div>
  )
}

export { AddCourseForm }
export default AddCourseForm
