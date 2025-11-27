"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Trash2, Upload, FileSpreadsheet, X, Check, Loader2, Calendar, ChevronDown, Star } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUpload } from "@/components/ui/file-upload"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"

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

  // Tab 1: Basic Information
  const [openingDate, setOpeningDate] = useState(initialData?.metadata?.openingDate || "")
  const [courseType, setCourseType] = useState(initialData?.metadata?.courseType || "必修")
  const [courseName, setCourseName] = useState(initialData?.name || "")
  const [courseNatureId, setCourseNatureId] = useState<number>(initialData?.metadata?.courseNatureId || 0)
  const [introduction, setIntroduction] = useState(initialData?.metadata?.introduction || "")
  const [theoryPeriod, setTheoryPeriod] = useState(initialData?.metadata?.theoryPeriod || 0)
  const [practicePeriod, setPracticePeriod] = useState(initialData?.metadata?.practicePeriod || 0)

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
    initialData?.metadata?.teachingObjectives || [{ id: "1", content: "", points: [""] }],
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
    initialData?.metadata?.coursePoints?.map((cp: any) => ({
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
    initialData?.metadata?.chapters || [{ id: "1", name: "", theoryHours: 0, practiceHours: 0 }],
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

          if (parsed.metadata?.graduationRequirements) {
            parsed.metadata.graduationRequirements.forEach((req: any) => {
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
          <Button variant="ghost" size="sm" onClick={onCancel} className="gap-2">
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
          <TabsList className="w-full h-10 bg-secondary/50 backdrop-blur-sm rounded-none p-0">
            <TabsTrigger value="basic" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              基本信息
            </TabsTrigger>
            <TabsTrigger value="objectives" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              教学目标
            </TabsTrigger>
            <TabsTrigger value="points" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              课点信息
            </TabsTrigger>
            <TabsTrigger value="chapters" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              章节与项目
            </TabsTrigger>
          </TabsList>

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

                <div className="space-y-2">
                  <Label htmlFor="introduction">课程介绍</Label>
                  <textarea
                    id="introduction"
                    placeholder="输入课程介绍"
                    value={introduction}
                    onChange={(e) => setIntroduction(e.target.value.slice(0, 1024))}
                    maxLength={1024}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 resize-none"
                    rows={4}
                  />
                  <div className="text-xs text-muted-foreground text-right">{introduction.length}/1024</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="objectives" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
                  <h3 className="text-base font-semibold text-foreground">教学目标</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="gap-2 bg-primary text-white hover:bg-primary/90"
                    onClick={() => {
                      toast({
                        title: "提示",
                        description: "功能开发中，敬请期待！",
                        duration: 3000,
                      })
                    }}
                  >
                    <Star className="w-4 h-4" />
                    AI一键生成
                  </Button>
                  <FileUpload
                    buttonText="上传Excel"
                    fileType="Excel文件"
                    maxFileSize={10 * 1024 * 1024}
                    maxFileCount={1}
                    accept=".xlsx,.xls"
                    onUpload={async (files) => {
                      // TODO: 将文件上传到OSS，返回文件地址
                      // 目前mock返回文件地址
                      return files.map((file) => `/uploads/${file.name}`)
                    }}
                  />
                </div>
              </div>
              <div className="border-t border-dashed border-border" />
              {objectivesFile && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">{objectivesFile.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setObjectivesFile(null)}
                    className="gap-2 text-red-500 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* 课程目标显示 */}
              {isLoadingGoals ? (
                <div className="flex items-center justify-center py-6">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">加载课程目标中...</p>
                  </div>
                </div>
              ) : courseGoals.length > 0 ? (
                <Accordion
                  type="multiple"
                  className="space-y-3"
                  defaultValue={courseGoals
                    .map((goal, idx) => goal.children && goal.children.length > 0 ? `goal-${goal.id}` : null)
                    .filter(Boolean) as string[]}
                >
                    {courseGoals.map((goal, goalIdx) => {
                      const goalObjectivesList = goalObjectives[goal.id] || []
                      const goalInput = goalObjectiveInputs[goal.id]
                      const hasChildren = goal.children && goal.children.length > 0
                      const accordionValue = `goal-${goal.id}`

                      return (
                        <AccordionItem
                          key={goal.id}
                          value={accordionValue}
                          className="rounded-lg border border-border bg-secondary/10 backdrop-blur-sm"
                          defaultOpen={hasChildren}
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex items-start gap-3 w-full">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary">
                                {goalIdx + 1}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-foreground leading-relaxed">{goal.description}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startAddingObjectiveForGoal(goal.id)
                                }}
                                className="gap-1 h-6 w-6 p-0 flex-shrink-0 text-primary hover:bg-primary/10"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </AccordionTrigger>

                          <AccordionContent className="px-4 pb-4">
                            <div className="border-t border-dashed border-border mb-4" />

                            {/* 教学目标列表 */}
                            <div className="space-y-3">
                              {/* 教学目标输入框 */}
                              {goalInput?.isEditing && (
                                <div className="flex items-center gap-2 mb-3 pl-6 p-2 bg-card/20 rounded-md border border-border">
                                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[0.7rem] font-medium text-primary">
                                    {String.fromCharCode(97 + goalObjectivesList.length)}
                                  </div>
                                  {goalInput.isMultiline ? (
                                    <textarea
                                      autoFocus
                                      placeholder="输入教学目标内容"
                                      value={goalInput.inputValue}
                                      onChange={(e) => updateGoalObjectiveInput(goal.id, e.target.value)}
                                      onBlur={() => finishAddingObjectiveForGoal(goal.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && e.ctrlKey) {
                                          finishAddingObjectiveForGoal(goal.id)
                                        }
                                      }}
                                      className="flex-1 px-3 py-2 border border-border rounded-md text-[1.05rem] resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
                                    />
                                  ) : (
                                    <input
                                      autoFocus
                                      type="text"
                                      placeholder="输入教学目标内容"
                                      value={goalInput.inputValue}
                                      onChange={(e) => updateGoalObjectiveInput(goal.id, e.target.value)}
                                      onFocus={() => toggleGoalObjectiveMultiline(goal.id, true)}
                                      onBlur={() => finishAddingObjectiveForGoal(goal.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          finishAddingObjectiveForGoal(goal.id)
                                        }
                                      }}
                                      className="flex-1 px-3 py-2 border border-border rounded-md text-[1.05rem] focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                  )}
                                </div>
                              )}

                              {/* 教学目标列表 */}
                              {goalObjectivesList.length > 0 ? (
                                <div className="space-y-2 pl-6">
                                  {goalObjectivesList.map((objective, objIdx) => {
                                    const editKey = `${goal.id}-${objective.id}`
                                    const editState = goalObjectiveEditStates[editKey]
                                    const isMultiline = editState?.isMultiline

                                    return (
                                      <div key={objective.id} className="flex items-center gap-2 p-2 bg-card/20 rounded-md border border-border">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[0.7rem] font-medium text-primary">
                                          {String.fromCharCode(97 + objIdx)}
                                        </div>
                                        {isMultiline ? (
                                          <textarea
                                            placeholder="输入教学目标内容"
                                            value={objective.content}
                                            onChange={(e) => updateTeachingObjective(objective.id, e.target.value.slice(0, 500))}
                                            onBlur={() => toggleGoalObjectiveEditMode(goal.id, objective.id, false)}
                                            className="flex-1 px-3 py-2 border border-border rounded-md text-[1.05rem] resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
                                          />
                                        ) : (
                                          <input
                                            type="text"
                                            placeholder="输入教学目标内容"
                                            value={objective.content}
                                            onChange={(e) => updateTeachingObjective(objective.id, e.target.value.slice(0, 500))}
                                            onFocus={() => toggleGoalObjectiveEditMode(goal.id, objective.id, true)}
                                            className="flex-1 text-[1.05rem] text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5"
                                          />
                                        )}
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => removeGoalObjective(goal.id, objective.id)}
                                          className="gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 h-5 px-1 flex-shrink-0"
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                !goalInput?.isEditing && (
                                  <div className="text-center py-3 text-muted-foreground text-xs">
                                    暂无教学目标
                                  </div>
                                )
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    })}
                  </Accordion>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="points" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
                  <h3 className="text-base font-semibold text-foreground">课点信息</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={addCoursePoint} className="gap-2 bg-transparent">
                    <Plus className="w-4 h-4" />
                    添加课点
                  </Button>
                  <FileUpload
                    buttonText="上传Excel"
                    fileType="Excel文件"
                    maxFileSize={10 * 1024 * 1024}
                    maxFileCount={1}
                    accept=".xlsx,.xls"
                    onUpload={async (files) => {
                      // TODO: 将文件上传到OSS，返回文件地址
                      // 目前mock返回文件地址
                      return files.map((file) => `/uploads/${file.name}`)
                    }}
                  />
                </div>
              </div>
              <div className="border-t border-dashed border-border" />
              {pointsFile && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">{pointsFile.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPointsFile(null)}
                    className="gap-2 text-red-500 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                {coursePoints.map((point, pointIndex) => {
                  const kPoints = point.infoPoints
                    .filter((ip) => ip.type === "K")
                    .sort((a, b) => {
                      const aNum = Number.parseInt(a.id.substring(1)) || 0
                      const bNum = Number.parseInt(b.id.substring(1)) || 0
                      return aNum - bNum
                    })
                  const sPoints = point.infoPoints
                    .filter((ip) => ip.type === "S")
                    .sort((a, b) => {
                      const aNum = Number.parseInt(a.id.substring(1)) || 0
                      const bNum = Number.parseInt(b.id.substring(1)) || 0
                      return aNum - bNum
                    })
                  const aPoints = point.infoPoints
                    .filter((ip) => ip.type === "A")
                    .sort((a, b) => {
                      const aNum = Number.parseInt(a.id.substring(1)) || 0
                      const bNum = Number.parseInt(b.id.substring(1)) || 0
                      return aNum - bNum
                    })

                  return (
                    <div key={point.id} className="p-4 rounded-lg border border-border bg-card/50 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary mt-2">
                          {pointIndex + 1}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-2">
                            <div className="relative flex-1">
                              <Label className="text-sm font-medium mb-1.5 block">课点内容</Label>
                              <Input
                                ref={pointIndex === coursePoints.length - 1 ? lastPointRef : null}
                                placeholder="输入课点内容（最多200字）"
                                value={point.content}
                                onChange={(e) => updateCoursePointContent(point.id, e.target.value.slice(0, 200))}
                                maxLength={200}
                                className="pr-20"
                              />
                              <div className="absolute right-2 top-[34px] flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{point.content.length}/200</span>
                              </div>
                            </div>
                            {coursePoints.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeCoursePoint(point.id)}
                                className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 mt-7"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          <div className="pl-4 border-l-2 border-primary/30 space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground">信息点（KSA）</Label>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addInfoPointWithType(point.id, "K")}
                                  className="gap-1 h-7 text-xs bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                                >
                                  <Plus className="w-3 h-3" />K
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addInfoPointWithType(point.id, "S")}
                                  className="gap-1 h-7 text-xs bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                                >
                                  <Plus className="w-3 h-3" />S
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addInfoPointWithType(point.id, "A")}
                                  className="gap-1 h-7 text-xs bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                                >
                                  <Plus className="w-3 h-3" />A
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {kPoints.map((infoPoint) => (
                                <div key={infoPoint.id} className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-10 h-7 rounded text-xs font-medium bg-blue-100 border border-blue-200 text-blue-700 flex-shrink-0">
                                    {infoPoint.id}
                                  </span>
                                  <Input
                                    placeholder="输入知识点内容（最多200字）"
                                    value={infoPoint.content}
                                    onChange={(e) =>
                                      updateInfoPointContent(point.id, infoPoint.id, e.target.value.slice(0, 200))
                                    }
                                    maxLength={200}
                                    className="h-7 text-sm flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeInfoPoint(point.id, infoPoint.id)}
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                              {sPoints.map((infoPoint) => (
                                <div key={infoPoint.id} className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-10 h-7 rounded text-xs font-medium bg-green-100 border border-green-200 text-green-700 flex-shrink-0">
                                    {infoPoint.id}
                                  </span>
                                  <Input
                                    placeholder="输入技能点内容（最多200字）"
                                    value={infoPoint.content}
                                    onChange={(e) =>
                                      updateInfoPointContent(point.id, infoPoint.id, e.target.value.slice(0, 200))
                                    }
                                    maxLength={200}
                                    className="h-7 text-sm flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeInfoPoint(point.id, infoPoint.id)}
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                              {aPoints.map((infoPoint) => (
                                <div key={infoPoint.id} className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-10 h-7 rounded text-xs font-medium bg-purple-100 border border-purple-200 text-purple-700 flex-shrink-0">
                                    {infoPoint.id}
                                  </span>
                                  <Input
                                    placeholder="输入态度点内容（最多200字）"
                                    value={infoPoint.content}
                                    onChange={(e) =>
                                      updateInfoPointContent(point.id, infoPoint.id, e.target.value.slice(0, 200))
                                    }
                                    maxLength={200}
                                    className="h-7 text-sm flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeInfoPoint(point.id, infoPoint.id)}
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
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
