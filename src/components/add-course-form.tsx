"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/shared/components/ui/button"
import { FieldError } from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { ArrowLeft, Plus, Trash2, X, Check, Calendar, ChevronDown } from "lucide-react"
import { Spinner } from "@/shared/components/ui/spinner"
import { Card } from "@/shared/components/ui/card"
import { Tabs, TabsContent } from "@/shared/components/ui/tabs"
import { UnderlineTabsList, UnderlineTabsTrigger } from "@/shared/components/ui/underline-tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/components/ui/table"
import { useToast } from "@/shared/hooks/use-toast"
import { api } from "@/lib/api"
import { canvasApi } from "@/lib/api/canvas-api"
import { RichTextEditor } from "@/shared/components/ui/rich-text-editor"
import { usePermission } from "@/shared/hooks/use-permission"
import type { PermissionAction } from "@/shared/permissions/types"
import { useSemesterStore } from "@/shared/stores/semester-store"

const CREATE_COURSE_ACTION: PermissionAction = "major.course.create"
const EDIT_COURSE_ACTION: PermissionAction = "course.detail.edit"

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
  courseUnitId?: number
}

type ChapterInputColumn = "name" | "theoryHours" | "practiceHours"
type ChapterHourColumn = Exclude<ChapterInputColumn, "name">

interface RawChapterProject {
  id?: string | number
  name?: string
  title?: string
  theoryHours?: number | string | null
  theoryPeriod?: number | string | null
  practiceHours?: number | string | null
  practicePeriod?: number | string | null
  courseUnitId?: number | string | null
}

interface AddCourseFormProps {
  majorId: string
  onCancel: () => void
  onSubmit: (courseData: any, isAutoSave?: boolean) => void | Promise<void>
  initialData?: any
  isEditMode?: boolean
  courseDetailData?: any
  hideChapterSectionInEdit?: boolean
  enableAutoSaveInEdit?: boolean
  allowHourFieldEdit?: boolean
  validationMode?: "legacy" | "serverEdit"
}

const DEFAULT_SCHEDULE_ROW = {
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

type ScheduleRow = typeof DEFAULT_SCHEDULE_ROW
type ScheduleField = keyof ScheduleRow
type ScheduleDayField = Exclude<ScheduleField, "period" | "sessions">

const SCHEDULE_DAY_FIELDS: ScheduleDayField[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]

const getScheduleFieldKey = (rowIndex: number, field: ScheduleField) => `${rowIndex}-${field}`

const HOUR_FIELD_HELP_TEXT = "系统自动汇总章节项目学时"

const readOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim()
    if (trimmedValue.length === 0) {
      return null
    }

    const parsedValue = Number(trimmedValue)
    return Number.isFinite(parsedValue) ? parsedValue : null
  }

  return null
}

const resolveReadonlyHourFieldValue = (
  sourceValue: number | null,
  summarizedValue: number,
  hasMeaningfulChapterData: boolean,
): number | "" => {
  if (sourceValue !== null && Number.isFinite(sourceValue)) {
    return sourceValue
  }

  if (hasMeaningfulChapterData && Number.isFinite(summarizedValue)) {
    return summarizedValue
  }

  return ""
}

const courseNatureOptions = [
  { id: 1, name: "通识教育课" },
  { id: 2, name: "学科基础课" },
  { id: 3, name: "专业课" },
  { id: 4, name: "集中实践教学环节" },
  { id: 5, name: "综合教育" },
]

type ServerEditField = "courseType" | "courseName" | "courseNatureId" | "studentCount" | "credits"

type ServerEditErrors = Partial<Record<ServerEditField, string>>

interface OptionalNumberInputState {
  value: string
  sourceInvalid: boolean
}

interface ServerEditValidationValues {
  courseType: string
  courseName: string
  courseNatureId: number
  studentCount: OptionalNumberInputState
  credits: OptionalNumberInputState
}

interface ChapterHourFocusTarget {
  rowIndex: number
  column: ChapterHourColumn
}

interface ChapterHourValidationResult {
  errors: Record<string, string>
  firstInvalidTarget: ChapterHourFocusTarget | null
}

const SERVER_EDIT_FIELD_ORDER = [
  "courseType",
  "courseName",
  "courseNatureId",
  "studentCount",
  "credits",
] as const satisfies readonly ServerEditField[]

const COURSE_TYPE_OPTIONS = ["必修", "选修"] as const
type CourseTypeOption = (typeof COURSE_TYPE_OPTIONS)[number]

const VALID_COURSE_TYPES: ReadonlySet<string> = new Set(COURSE_TYPE_OPTIONS)
const VALID_COURSE_NATURE_IDS: ReadonlySet<number> = new Set(courseNatureOptions.map((option) => option.id))

const COURSE_TYPE_LABEL_ID = "course-type-label"
const COURSE_TYPE_ERROR_ID = "course-type-error"
const COURSE_NAME_ERROR_ID = "course-name-error"
const COURSE_NATURE_ERROR_ID = "course-nature-error"
const STUDENT_COUNT_ERROR_ID = "student-count-error"
const CREDITS_ERROR_ID = "credits-error"

const getChapterHourFieldKey = (rowIndex: number, column: ChapterHourColumn) => `${rowIndex}-${column}`

const getChapterHourErrorId = (rowIndex: number, column: ChapterHourColumn) =>
  `course-chapter-${rowIndex}-${column}-error`

const getServerChapterHourSource = (
  chapter: RawChapterProject,
  column: ChapterHourColumn,
): unknown => column === "theoryHours" ? chapter.theoryPeriod : chapter.practicePeriod

const createOptionalNumberInputState = (value: unknown): OptionalNumberInputState => {
  if (value === undefined || value === null || value === "") {
    return { value: "", sourceInvalid: false }
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { value: "", sourceInvalid: true }
    }

    return { value: String(value), sourceInvalid: false }
  }

  if (typeof value === "string") {
    return { value, sourceInvalid: false }
  }

  return { value: "", sourceInvalid: true }
}

const parseOptionalNumberInput = (input: OptionalNumberInputState): number | undefined => {
  if (input.sourceInvalid) {
    return Number.NaN
  }

  const trimmedValue = input.value.trim()
  if (trimmedValue === "") {
    return undefined
  }

  return Number(trimmedValue)
}

const getServerEditFieldError = (
  field: ServerEditField,
  values: ServerEditValidationValues,
): string | undefined => {
  switch (field) {
    case "courseType":
      return VALID_COURSE_TYPES.has(values.courseType) ? undefined : "请选择课程类型"
    case "courseName": {
      const trimmedName = values.courseName.trim()
      if (trimmedName === "") {
        return "请输入课程名称"
      }
      return trimmedName.length <= 32 ? undefined : "课程名称不能超过 32 个字符"
    }
    case "courseNatureId":
      return VALID_COURSE_NATURE_IDS.has(values.courseNatureId) ? undefined : "请选择课程性质"
    case "studentCount": {
      const parsedValue = parseOptionalNumberInput(values.studentCount)
      if (parsedValue === undefined) {
        return undefined
      }
      return Number.isFinite(parsedValue) && parsedValue >= 0 && Number.isInteger(parsedValue)
        ? undefined
        : "学生人数必须是非负整数"
    }
    case "credits": {
      const parsedValue = parseOptionalNumberInput(values.credits)
      if (parsedValue === undefined) {
        return undefined
      }
      return Number.isFinite(parsedValue) && parsedValue >= 0 ? undefined : "学分必须是非负数"
    }
  }
}

const validateServerEditFields = (values: ServerEditValidationValues): ServerEditErrors => {
  const errors: ServerEditErrors = {}

  for (const field of SERVER_EDIT_FIELD_ORDER) {
    const error = getServerEditFieldError(field, values)
    if (error !== undefined) {
      errors[field] = error
    }
  }

  return errors
}

const getFirstInvalidServerEditField = (errors: ServerEditErrors): ServerEditField | null => {
  for (const field of SERVER_EDIT_FIELD_ORDER) {
    if (errors[field] !== undefined) {
      return field
    }
  }

  return null
}

const getChapterHourInputState = (
  chapter: ChapterProject,
  rowIndex: number,
  column: ChapterHourColumn,
  serverInputs: Record<string, OptionalNumberInputState>,
): OptionalNumberInputState => {
  const fieldKey = getChapterHourFieldKey(rowIndex, column)
  const storedInput = serverInputs[fieldKey]
  if (storedInput !== undefined) {
    return storedInput
  }

  return createOptionalNumberInputState(chapter[column])
}

const remapServerChapterHourInputsAfterRemoval = (
  chapters: ChapterProject[],
  removedChapterId: string,
  serverInputs: Record<string, OptionalNumberInputState>,
): Record<string, OptionalNumberInputState> => {
  const nextInputs: Record<string, OptionalNumberInputState> = {}
  let nextRowIndex = 0

  chapters.forEach((chapter, rowIndex) => {
    if (chapter.id === removedChapterId) {
      return
    }

    const columns: readonly ChapterHourColumn[] = ["theoryHours", "practiceHours"]
    for (const column of columns) {
      nextInputs[getChapterHourFieldKey(nextRowIndex, column)] = getChapterHourInputState(
        chapter,
        rowIndex,
        column,
        serverInputs,
      )
    }
    nextRowIndex += 1
  })

  return nextInputs
}

const createServerChapterHourInputs = (
  source: unknown,
): Record<string, OptionalNumberInputState> => {
  if (!Array.isArray(source)) {
    return {}
  }

  const inputs: Record<string, OptionalNumberInputState> = {}
  source.forEach((item, rowIndex) => {
    const chapter = (item !== null && typeof item === "object" ? item : {}) as RawChapterProject
    const columns: readonly ChapterHourColumn[] = ["theoryHours", "practiceHours"]
    for (const column of columns) {
      inputs[getChapterHourFieldKey(rowIndex, column)] = createOptionalNumberInputState(
        getServerChapterHourSource(chapter, column),
      )
    }
  })

  return inputs
}

const validateChapterHours = (
  chapters: ChapterProject[],
  serverInputs: Record<string, OptionalNumberInputState>,
): ChapterHourValidationResult => {
  const errors: Record<string, string> = {}
  let firstInvalidTarget: ChapterHourFocusTarget | null = null
  let theoryPeriodTotal = 0
  let practicePeriodTotal = 0

  chapters.forEach((chapter, rowIndex) => {
    const columns: readonly ChapterHourColumn[] = ["theoryHours", "practiceHours"]
    for (const column of columns) {
      const input = getChapterHourInputState(chapter, rowIndex, column, serverInputs)
      const trimmedValue = input.value.trim()
      const parsedValue = trimmedValue === "" ? 0 : Number(trimmedValue)
      const fieldKey = getChapterHourFieldKey(rowIndex, column)
      const fieldLabel = column === "theoryHours" ? "理论学时" : "实践学时"
      let error: string | undefined

      if (input.sourceInvalid) {
        error = `${fieldLabel}必须是非负有限数`
      } else if (trimmedValue === "") {
        error = `请输入${fieldLabel}`
      } else if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        error = `${fieldLabel}必须是非负有限数`
      } else if (column === "theoryHours") {
        theoryPeriodTotal += parsedValue
        if (!Number.isFinite(theoryPeriodTotal)) {
          error = "理论学时汇总超出有效数值范围"
        }
      } else {
        practicePeriodTotal += parsedValue
        if (!Number.isFinite(practicePeriodTotal)) {
          error = "实践学时汇总超出有效数值范围"
        }
      }

      if (error !== undefined) {
        errors[fieldKey] = error
        if (firstInvalidTarget === null) {
          firstInvalidTarget = { rowIndex, column }
        }
      }
    }
  })

  return {
    errors,
    firstInvalidTarget,
  }
}

const resolveServerCourseType = (classId: unknown): string => {
  if (classId === 1) {
    return "必修"
  }
  if (classId === 2) {
    return "选修"
  }
  return ""
}

const resolveServerCourseNatureId = (typeId: unknown): number => {
  return typeof typeId === "number" && VALID_COURSE_NATURE_IDS.has(typeId) ? typeId : 0
}

function AddCourseForm({
  majorId,
  onCancel,
  onSubmit,
  initialData,
  isEditMode = false,
  courseDetailData,
  hideChapterSectionInEdit = false,
  enableAutoSaveInEdit = true,
  allowHourFieldEdit = false,
  validationMode = "legacy",
}: AddCourseFormProps) {
  const { toast } = useToast()
  const { can } = usePermission()
  const isServerEditValidation = validationMode === "serverEdit"
  const canManageCourse = isEditMode
    ? can(EDIT_COURSE_ACTION, { scope: "course" })
    : can(CREATE_COURSE_ACTION, { scope: "major" })
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [courseNaturePopoverOpen, setCourseNaturePopoverOpen] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"" | "saving" | "saved" | "failed">("")
  // 自动保存开关状态（编辑模式下默认开启）
  const [isAutoSaveEnabled] = useState(isEditMode && enableAutoSaveInEdit)
  // 用于自动保存的定时器引用
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const autoSaveStatusTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isSubmittingRef = useRef(false)
  const pendingAutoSaveRef = useRef(false)
  const pendingSnapshotRef = useRef<string | null>(null)
  const lastSavedSnapshotRef = useRef<string | null>(null)
  const handleSubmitRef = useRef<(isAutoSave?: boolean) => Promise<void>>(async () => {})
  const courseTypeFirstOptionRef = useRef<HTMLButtonElement>(null)
  const courseTypeSecondOptionRef = useRef<HTMLButtonElement>(null)
  const courseNameRef = useRef<HTMLInputElement>(null)
  const courseNatureTriggerRef = useRef<HTMLButtonElement>(null)
  const studentCountRef = useRef<HTMLInputElement>(null)
  const creditsRef = useRef<HTMLInputElement>(null)
  const chapterTableContainerRef = useRef<HTMLDivElement>(null)
  const [serverEditErrors, setServerEditErrors] = useState<ServerEditErrors>({})
  const [serverEditChapterHourErrors, setServerEditChapterHourErrors] = useState<Record<string, string>>({})
  const [serverEditChapterFocusTarget, setServerEditChapterFocusTarget] = useState<ChapterHourFocusTarget | null>(null)
  const [serverEditValidationAttempt, setServerEditValidationAttempt] = useState(0)
  const [serverEditFocusField, setServerEditFocusField] = useState<ServerEditField | null>(null)
  const showChapterTab = !isEditMode || !hideChapterSectionInEdit

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

  // [MOD] 将开课日期改为开课学期（只读，显示全校当前学期）
  const semesterList = useSemesterStore((state) => state.semesterList)
  const currentSemesterId = useSemesterStore((state) => state.currentSemesterId)

  // [MOD] 获取全校当前学期
  const currentSemester = useMemo(() => {
    if (!semesterList || semesterList.length === 0) {
      return null
    }
    // 优先使用标记为 isCurrent 的学期
    const current = semesterList.find((s) => s.isCurrent)
    if (current) {
      return current
    }
    // 如果没有标记，则使用 store 中的 currentSemesterId
    if (currentSemesterId) {
      return semesterList.find((s) => Number(s.id) === Number(currentSemesterId)) || null
    }
    return null
  }, [semesterList, currentSemesterId])

  // Tab 1: Basic Information - 直接访问 initialData 的属性
  const [openingSemesterId, setOpeningSemesterId] = useState<number | null>(currentSemester?.id ?? null)
  const [courseType, setCourseType] = useState<string>(() => {
    if (isServerEditValidation) {
      return typeof initialData?.courseType === "string" ? initialData.courseType : ""
    }
    return initialData?.courseType || "必修"
  })
  const [courseName, setCourseName] = useState<string>(() => {
    if (isServerEditValidation) {
      return typeof initialData?.name === "string" ? initialData.name : ""
    }
    return initialData?.name || initialData?.nodeName || ""
  })
  const [courseNatureId, setCourseNatureId] = useState<number>(() => {
    if (isServerEditValidation) {
      return resolveServerCourseNatureId(initialData?.courseNatureId)
    }
    return initialData?.courseNatureId || 0
  })
  const [introduction, setIntroduction] = useState(initialData?.introduction || "")
  const [theoryPeriod, setTheoryPeriod] = useState(initialData?.theoryPeriod || 0)
  const [practicePeriod, setPracticePeriod] = useState(initialData?.practicePeriod || 0)
  const [theoryPeriodSource, setTheoryPeriodSource] = useState<number | null>(() => readOptionalNumber(initialData?.theoryPeriod))
  const [practicePeriodSource, setPracticePeriodSource] = useState<number | null>(() => readOptionalNumber(initialData?.practicePeriod))
  // 新增字段
  const [teachingClass, setTeachingClass] = useState(initialData?.teachingClass || "")
  const [teachingLocation, setTeachingLocation] = useState(initialData?.teachingLocation || "")

  const parseTeachingSchedule = useCallback((data: any) => {
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data)
        // 如果是数组格式，直接返回；否则转换为数组
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        return [DEFAULT_SCHEDULE_ROW]
      }
    }
    return Array.isArray(data) ? data : (data ? [data] : [DEFAULT_SCHEDULE_ROW])
  }, [])

  const [teachingScheduleRows, setTeachingScheduleRows] = useState<ScheduleRow[]>(() =>
    parseTeachingSchedule(initialData?.teachingTime)
  )

  // 课程表字段展开/收起状态 - 使用 rowIndex-fieldName 作为key
  const [scheduleFieldsExpanded, setScheduleFieldsExpanded] = useState<Record<string, boolean>>({})
  const setScheduleFieldExpanded = useCallback((rowIndex: number, field: ScheduleField, expanded: boolean) => {
    const fieldKey = getScheduleFieldKey(rowIndex, field)

    setScheduleFieldsExpanded((currentState) => {
      if (currentState[fieldKey] === expanded) {
        return currentState
      }

      return {
        ...currentState,
        [fieldKey]: expanded,
      }
    })
  }, [])

  // 课程表操作函数
  const notifyNoPermission = useCallback(() => {
    toast({
      variant: "destructive",
      title: "无权限",
      description: "当前账号没有课程管理权限",
      duration: 3000,
    })
  }, [toast])

  const uploadCourseRichTextImage = useCallback(async (file: File): Promise<string> => {
    if (!file.type.startsWith("image/")) {
      throw new Error("仅支持粘贴图片文件")
    }

    const trimmedMimeType = file.type.trim()
    if (trimmedMimeType.length === 0) {
      throw new Error("图片 MIME type 缺失，无法上传")
    }

    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
    const timestamp = Date.now()
    const rawFileName = file.name.trim().length > 0 ? file.name : `pasted-image-${timestamp}.png`
    const safeFileName = rawFileName.replace(/[^a-zA-Z0-9._\u4e00-\u9fa5-]/g, "_")
    const courseScope = realCourseId ? `course_${realCourseId}` : `major_${realMajorId}`
    const fileName = `gxkct/course_rich_text_images/${dateStr}/${courseScope}_${timestamp}_${safeFileName}`

    const presignResponse = await canvasApi.getPresignUrl({
      fileName,
      mimeType: trimmedMimeType,
      size: file.size,
    })

    if (presignResponse.error || !presignResponse.data) {
      throw new Error(presignResponse.error || "获取图片上传签名失败")
    }

    const responseData = presignResponse.data as unknown as Record<string, unknown>
    const uploadUrl = typeof responseData.uploadUrl === "string"
      ? responseData.uploadUrl
      : typeof responseData.url === "string"
        ? responseData.url
        : ""
    const ossKey = typeof responseData.ossKey === "string"
      ? responseData.ossKey
      : typeof responseData.uploadPath === "string"
        ? responseData.uploadPath
        : ""
    const uploadHeaders = (() => {
      const rawHeaders = "headers" in responseData ? responseData.headers : responseData.uploadHeaders
      if (!rawHeaders || typeof rawHeaders !== "object" || Array.isArray(rawHeaders)) {
        return {}
      }

      return Object.fromEntries(
        Object.entries(rawHeaders).filter((entry): entry is [string, string] => typeof entry[1] === "string")
      )
    })()

    if (uploadUrl.length === 0 || ossKey.length === 0) {
      throw new Error("上传签名响应缺少必要字段")
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": trimmedMimeType,
        ...uploadHeaders,
      },
      body: file,
    })

    if (!uploadResponse.ok) {
      throw new Error(`上传图片失败，HTTP ${uploadResponse.status}`)
    }

    const urlObj = new URL(uploadUrl)
    return `${urlObj.origin}/${ossKey}`
  }, [realCourseId, realMajorId])

  const addScheduleRow = () => {
    if (!canManageCourse) {
      notifyNoPermission()
      return
    }
    setTeachingScheduleRows([...teachingScheduleRows, DEFAULT_SCHEDULE_ROW])
  }

  const deleteScheduleRow = (index: number) => {
    if (!canManageCourse) {
      notifyNoPermission()
      return
    }
    if (teachingScheduleRows.length > 1) {
      setTeachingScheduleRows(teachingScheduleRows.filter((_, i) => i !== index))
    }
  }

  const updateScheduleRow = (index: number, field: ScheduleField, value: string) => {
    const newRows = [...teachingScheduleRows]
    newRows[index] = { ...newRows[index], [field]: value }
    setTeachingScheduleRows(newRows)
  }

  const [studentCount, setStudentCount] = useState(initialData?.studentCount || 0)
  const [credits, setCredits] = useState(initialData?.credits || 0)
  const [serverStudentCountInput, setServerStudentCountInput] = useState<OptionalNumberInputState>(() =>
    isServerEditValidation
      ? createOptionalNumberInputState(initialData?.studentCount)
      : createOptionalNumberInputState(undefined)
  )
  const [serverCreditsInput, setServerCreditsInput] = useState<OptionalNumberInputState>(() =>
    isServerEditValidation
      ? createOptionalNumberInputState(initialData?.credits)
      : createOptionalNumberInputState(undefined)
  )
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
    initialData?.scoreTable || { headers: ["平时考核", "期末考核"], rows: [{ "平时考核": "", "期末考核": "" }] }
  )
  const [assessmentDescription, setAssessmentDescription] = useState(initialData?.assessmentDescription || "")

  // 获取课程性质名称
  const courseNatureName = useMemo(() => {
    const option = courseNatureOptions.find(opt => opt.id === courseNatureId)
    return option?.name || ""
  }, [courseNatureId])

  const normalizeChapterProjects = useCallback((source: unknown): ChapterProject[] => {
    const defaultChapter: ChapterProject = { id: "1", name: "", theoryHours: 0, practiceHours: 0 }
    if (!Array.isArray(source) || source.length === 0) {
      return [defaultChapter]
    }

    const normalized = source.map((item, index) => {
      const chapter = (item || {}) as RawChapterProject
      const id = chapter.id !== undefined && chapter.id !== null && String(chapter.id).trim().length > 0
        ? String(chapter.id)
        : String(index + 1)
      const name = typeof chapter.name === "string"
        ? chapter.name
        : typeof chapter.title === "string"
          ? chapter.title
          : ""

      const theoryValue = Number(
        isServerEditValidation
          ? chapter.theoryPeriod
          : chapter.theoryHours ?? chapter.theoryPeriod ?? 0,
      )
      const practiceValue = Number(
        isServerEditValidation
          ? chapter.practicePeriod
          : chapter.practiceHours ?? chapter.practicePeriod ?? 0,
      )

      const courseUnitIdValue = Number(chapter.courseUnitId)

      return {
        id,
        name,
        theoryHours: Number.isFinite(theoryValue) ? theoryValue : 0,
        practiceHours: Number.isFinite(practiceValue) ? practiceValue : 0,
        courseUnitId: Number.isFinite(courseUnitIdValue) ? courseUnitIdValue : undefined,
      }
    })

    return normalized.length > 0 ? normalized : [defaultChapter]
  }, [isServerEditValidation])

  // Tab 4: Chapter and Project Management
  const [chapters, setChapters] = useState<ChapterProject[]>(() =>
    normalizeChapterProjects(initialData?.chapters),
  )
  const [serverChapterHourInputs, setServerChapterHourInputs] = useState<
    Record<string, OptionalNumberInputState>
  >(() => isServerEditValidation
    ? createServerChapterHourInputs(initialData?.chapters)
    : {})
  const summarizedPeriods = useMemo(() => {
    return chapters.reduce(
      (totals, chapter) => ({
        theoryPeriod: totals.theoryPeriod + (Number.isFinite(Number(chapter.theoryHours)) ? Number(chapter.theoryHours) : 0),
        practicePeriod: totals.practicePeriod + (Number.isFinite(Number(chapter.practiceHours)) ? Number(chapter.practiceHours) : 0),
      }),
      { theoryPeriod: 0, practicePeriod: 0 },
    )
  }, [chapters])

  const hasMeaningfulChapterData = useMemo(() => {
    return chapters.some((chapter) => {
      const hasName = chapter.name.trim().length > 0
      const theoryHours = Number(chapter.theoryHours)
      const practiceHours = Number(chapter.practiceHours)
      const hasTheoryHours = Number.isFinite(theoryHours) && theoryHours > 0
      const hasPracticeHours = Number.isFinite(practiceHours) && practiceHours > 0
      const hasCourseUnitId = typeof chapter.courseUnitId === "number" && Number.isFinite(chapter.courseUnitId)

      return hasName || hasTheoryHours || hasPracticeHours || hasCourseUnitId
    })
  }, [chapters])

  useEffect(() => {
    if (!hasMeaningfulChapterData) {
      return
    }

    if (theoryPeriodSource === null) {
      setTheoryPeriod((current: number) => (current === summarizedPeriods.theoryPeriod ? current : summarizedPeriods.theoryPeriod))
    }

    if (practicePeriodSource === null) {
      setPracticePeriod((current: number) => (current === summarizedPeriods.practicePeriod ? current : summarizedPeriods.practicePeriod))
    }
  }, [hasMeaningfulChapterData, practicePeriodSource, summarizedPeriods.practicePeriod, summarizedPeriods.theoryPeriod, theoryPeriodSource])

  const isReadonlyHourField = isEditMode && !allowHourFieldEdit
  const theoryPeriodDisplayValue = isReadonlyHourField
    ? resolveReadonlyHourFieldValue(theoryPeriodSource, summarizedPeriods.theoryPeriod, hasMeaningfulChapterData)
    : theoryPeriod
  const practicePeriodDisplayValue = isReadonlyHourField
    ? resolveReadonlyHourFieldValue(practicePeriodSource, summarizedPeriods.practicePeriod, hasMeaningfulChapterData)
    : practicePeriod

  const serverEditValidationValues = useMemo<ServerEditValidationValues>(() => ({
    courseType,
    courseName,
    courseNatureId,
    studentCount: serverStudentCountInput,
    credits: serverCreditsInput,
  }), [courseName, courseNatureId, courseType, serverCreditsInput, serverStudentCountInput])

  useEffect(() => {
    if (!isServerEditValidation || serverEditValidationAttempt === 0) {
      return
    }

    setServerEditErrors(validateServerEditFields(serverEditValidationValues))
    setServerEditChapterHourErrors(validateChapterHours(chapters, serverChapterHourInputs).errors)
  }, [
    chapters,
    isServerEditValidation,
    serverChapterHourInputs,
    serverEditValidationAttempt,
    serverEditValidationValues,
  ])

  useEffect(() => {
    if (
      !isServerEditValidation
      || serverEditValidationAttempt === 0
      || activeTab !== "basic"
      || serverEditFocusField === null
    ) {
      return
    }

    switch (serverEditFocusField) {
      case "courseType":
        courseTypeFirstOptionRef.current?.focus()
        break
      case "courseName":
        courseNameRef.current?.focus()
        break
      case "courseNatureId":
        courseNatureTriggerRef.current?.focus()
        break
      case "studentCount":
        studentCountRef.current?.focus()
        break
      case "credits":
        creditsRef.current?.focus()
    }
    setServerEditFocusField(null)
  }, [activeTab, isServerEditValidation, serverEditFocusField, serverEditValidationAttempt])

  useEffect(() => {
    if (
      !isServerEditValidation
      || serverEditValidationAttempt === 0
      || activeTab !== "chapters"
      || serverEditChapterFocusTarget === null
    ) {
      return
    }

    const targetInput = chapterTableContainerRef.current?.querySelector<HTMLInputElement>(
      `[data-chapter-row="${serverEditChapterFocusTarget.rowIndex}"]`
      + `[data-chapter-col="${serverEditChapterFocusTarget.column}"]`,
    )
    targetInput?.focus()
    targetInput?.select()
    setServerEditChapterFocusTarget(null)
  }, [
    activeTab,
    isServerEditValidation,
    serverEditChapterFocusTarget,
    serverEditValidationAttempt,
  ])

  // 在编辑模式下，使用传入的 courseDetailData 初始化表单字段
  useEffect(() => {
    if (!isEditMode || !courseDetailData) return

    const courseData = courseDetailData.courseDetailData?.course
    if (courseData) {
      console.log("[AddCourseForm] Initializing fields from course detail")
      if (isServerEditValidation) {
        setCourseType(resolveServerCourseType(courseData.classId))
        setCourseName(typeof courseData.name === "string" ? courseData.name : "")
        setCourseNatureId(resolveServerCourseNatureId(courseData.typeId))
        setServerStudentCountInput(createOptionalNumberInputState(courseData.studentCount))
        setServerCreditsInput(createOptionalNumberInputState(courseData.credits))
      } else {
        setCourseName(courseData.name || initialData?.name || "")
        setStudentCount(courseData.studentCount || 0)
        setCredits(courseData.credits || 0)
        if (courseData.typeId) {
          setCourseNatureId(courseData.typeId)
        }
      }
      setIntroduction(courseData.introduction || "")
      const nextTheoryPeriod = readOptionalNumber(courseData.theoryPeriod)
      const nextPracticePeriod = readOptionalNumber(courseData.practicePeriod)
      setTheoryPeriodSource(nextTheoryPeriod)
      setPracticePeriodSource(nextPracticePeriod)
      setTheoryPeriod(nextTheoryPeriod !== null ? nextTheoryPeriod : 0)
      setPracticePeriod(nextPracticePeriod !== null ? nextPracticePeriod : 0)
      // 初始化新增字段
      setTeachingClass(courseData.teachingClass || "")
      setTeachingLocation(courseData.teachingLocation || "")
      setTeachingScheduleRows(parseTeachingSchedule(courseData.teachingTime))
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
      setScoreTable(courseData.scoreTable || { headers: ["平时考核", "期末考核"], rows: [{ "平时考核": "", "期末考核": "" }] })
      setAssessmentDescription(courseData.assessmentDescription || "")
      setChapters(normalizeChapterProjects(courseData.courseMatrixVOS))
      if (isServerEditValidation) {
        setServerChapterHourInputs(createServerChapterHourInputs(courseData.courseMatrixVOS))
      }
      // [MOD] 开课学期初始化为全校当前学期（移除旧的 createTime 逻辑）
      if (currentSemester) {
        setOpeningSemesterId(currentSemester.id)
      }
    }
  }, [
    courseDetailData,
    currentSemester,
    initialData?.name,
    isEditMode,
    isServerEditValidation,
    normalizeChapterProjects,
    parseTeachingSchedule,
  ])

  // Tab 3: Course Point Information Library
  const [coursePoints] = useState<CoursePoint[]>(
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

  useEffect(() => {
    if (showChapterTab) return
    if (activeTab === "chapters") {
      setActiveTab("basic")
    }
  }, [activeTab, showChapterTab])

  const handleTabChange = useCallback((value: string) => {
    if (value === "basic" || value === "requirements" || value === "assessment" || value === "chapters") {
      setActiveTab(value)
    }
  }, [])

  const addChapter = () => {
    if (!canManageCourse) {
      notifyNoPermission()
      return
    }
    if (isServerEditValidation) {
      const newRowIndex = chapters.length
      setServerChapterHourInputs((currentInputs) => ({
        ...currentInputs,
        [getChapterHourFieldKey(newRowIndex, "theoryHours")]: {
          value: "",
          sourceInvalid: false,
        },
        [getChapterHourFieldKey(newRowIndex, "practiceHours")]: {
          value: "",
          sourceInvalid: false,
        },
      }))
    }
    setChapters(prev => ([...prev, { id: Date.now().toString(), name: "", theoryHours: 0, practiceHours: 0 }]))
  }

  const removeChapter = (id: string) => {
    if (!canManageCourse) {
      notifyNoPermission()
      return
    }
    if (chapters.length <= 1) {
      return
    }
    if (isServerEditValidation) {
      setServerChapterHourInputs((currentInputs) =>
        remapServerChapterHourInputsAfterRemoval(chapters, id, currentInputs))
    }
    setChapters(prev => prev.filter(chapter => chapter.id !== id))
  }

  const updateChapter = (id: string, field: "name" | "theoryHours" | "practiceHours", value: string | number) => {
    setChapters(prev => prev.map(chapter => (
      chapter.id === id
        ? { ...chapter, [field]: value }
        : chapter
    )))
  }

  const handleChapterHourChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    chapterId: string,
    rowIndex: number,
    column: ChapterHourColumn,
  ) => {
    if (!isServerEditValidation) {
      updateChapter(chapterId, column, Number.parseInt(event.target.value) || 0)
      return
    }

    const inputState: OptionalNumberInputState = {
      value: event.target.value,
      sourceInvalid: event.target.validity.badInput,
    }
    const fieldKey = getChapterHourFieldKey(rowIndex, column)
    setServerChapterHourInputs((currentInputs) => ({
      ...currentInputs,
      [fieldKey]: inputState,
    }))

    if (inputState.sourceInvalid) {
      return
    }

    const trimmedValue = inputState.value.trim()
    if (trimmedValue === "") {
      return
    }

    const parsedValue = Number(trimmedValue)
    if (Number.isFinite(parsedValue)) {
      updateChapter(chapterId, column, parsedValue)
    }
  }

  const handleChapterInputKeyDown = useCallback((
    event: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    column: ChapterInputColumn,
  ) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return
    }

    event.preventDefault()

    const rowDelta = event.key === "ArrowUp" ? -1 : 1
    const maxRowIndex = chapters.length - 1
    const targetRowIndex = Math.max(0, Math.min(maxRowIndex, rowIndex + rowDelta))

    if (targetRowIndex === rowIndex) {
      return
    }

    const targetInput = chapterTableContainerRef.current?.querySelector<HTMLInputElement>(
      `[data-chapter-row="${targetRowIndex}"][data-chapter-col="${column}"]`,
    )

    if (!targetInput) {
      return
    }

    targetInput.focus()
    targetInput.select()
  }, [chapters.length])

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

            if (supportResponse.data && Array.isArray(supportResponse.data) && supportResponse.data.length > 0) {
              // 仅用于保持数据加载链路，当前表单不展示该列表
              const supportedIndicatorKeys = new Set(supportResponse.data)
              const filteredIndicators = allIndicators.filter((indicator) => {
                const key = `${indicator.requirementId}-${indicator.indicatorIndex}`
                return supportedIndicatorKeys.has(key)
              })
              console.log("过滤后的指标点:", filteredIndicators)
            } else {
              console.log("没有支撑的指标点，显示所有指标点")
            }
          } else {
            console.log("新增模式，显示所有指标点")
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

  // 自动保存课程表单（每10秒）
  useEffect(() => {
    // 清除之前的定时器
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }

    // 如果自动保存未启用或不是编辑模式，不启动定时器
    if (!isAutoSaveEnabled || !isEditMode) {
      return
    }

    // 启动自动保存定时器
    autoSaveTimerRef.current = setInterval(() => {
      console.log("[AddCourseForm] 自动保存触发")
      void handleSubmitRef.current(true)
    }, 10000) // 每10秒自动保存一次

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
    }
  }, [isAutoSaveEnabled, isEditMode])

  useEffect(() => {
    return () => {
      if (autoSaveStatusTimerRef.current) {
        clearTimeout(autoSaveStatusTimerRef.current)
        autoSaveStatusTimerRef.current = null
      }
    }
  }, [])

  // [MOD] 获取开课学期的显示名称（直接取学期对象的 name 字段，无需前端计算）
  const openingSemesterDisplay = currentSemester?.name ?? null

  const buildCourseData = useCallback(() => ({
    name: isServerEditValidation ? courseName.trim() : courseName,
    type: "course" as const,
    metadata: {
      // [MOD] 改为开课学期 ID
      openingSemesterId,
      openingSemesterDisplay,
      courseType,
      courseNatureId,
      courseNatureName: courseNatureName,
      introduction,
      theoryPeriod,
      practicePeriod,
      teachingClass,
      teachingLocation,
      teachingTime: JSON.stringify(teachingScheduleRows),
      studentCount: isServerEditValidation
        ? parseOptionalNumberInput(serverStudentCountInput)
        : studentCount,
      credits: isServerEditValidation
        ? parseOptionalNumberInput(serverCreditsInput)
        : credits,
      mainTextbook,
      referenceResources,
      attendancePolicy,
      assignmentPolicy,
      conductRequirements,
      practiceRequirements,
      teamworkRequirements,
      bonusRequirements,
      otherSuggestions,
      assessmentMethod,
      assessmentForm,
      scoreType,
      scoreTable,
      assessmentDescription,
      coursePoints,
      chapters,
    },
    children: initialData?.children || [],
  }), [
    assessmentDescription,
    assessmentForm,
    assessmentMethod,
    assignmentPolicy,
    attendancePolicy,
    bonusRequirements,
    chapters,
    conductRequirements,
    courseName,
    courseNatureId,
    courseNatureName,
    coursePoints,
    courseType,
    credits,
    initialData?.children,
    introduction,
    isServerEditValidation,
    mainTextbook,
    openingSemesterId,
    openingSemesterDisplay,
    otherSuggestions,
    practicePeriod,
    practiceRequirements,
    referenceResources,
    scoreTable,
    scoreType,
    serverCreditsInput,
    serverStudentCountInput,
    studentCount,
    teachingClass,
    teachingLocation,
    teachingScheduleRows,
    teamworkRequirements,
    theoryPeriod,
  ])

  const getCurrentSnapshot = useCallback(() => JSON.stringify(buildCourseData()), [buildCourseData])

  useEffect(() => {
    if (lastSavedSnapshotRef.current !== null || isSubmittingRef.current) {
      return
    }
    lastSavedSnapshotRef.current = getCurrentSnapshot()
  }, [getCurrentSnapshot])

  const handleSubmit = useCallback(async (isAutoSave: boolean = false) => {
    if (!canManageCourse) {
      if (!isAutoSave) {
        notifyNoPermission()
      }
      return
    }

    const currentSnapshot = getCurrentSnapshot()
    pendingSnapshotRef.current = currentSnapshot

    if (isAutoSave && lastSavedSnapshotRef.current === currentSnapshot) {
      return
    }

    if (isAutoSave && isSubmittingRef.current) {
      pendingAutoSaveRef.current = true
      return
    }

    if (!isAutoSave && isSubmittingRef.current) {
      return
    }

    // 自动保存时不设置loading状态（避免干扰用户操作）
    if (!isAutoSave) {
      setIsLoading(true)
    }

    if (isAutoSave) {
      setAutoSaveStatus("saving")
    }

    isSubmittingRef.current = true

    if (isServerEditValidation) {
      const nextErrors = validateServerEditFields(serverEditValidationValues)
      const nextChapterHourValidation = validateChapterHours(chapters, serverChapterHourInputs)
      const nextFocusField = getFirstInvalidServerEditField(nextErrors)
      const nextChapterFocusTarget = nextChapterHourValidation.firstInvalidTarget
      const hasValidationError = nextFocusField !== null || nextChapterFocusTarget !== null

      setServerEditErrors(nextErrors)
      setServerEditChapterHourErrors(nextChapterHourValidation.errors)
      setServerEditFocusField(nextFocusField)
      setServerEditChapterFocusTarget(nextFocusField === null ? nextChapterFocusTarget : null)
      setServerEditValidationAttempt((currentAttempt) => currentAttempt + 1)

      if (hasValidationError) {
        if (nextFocusField !== null) {
          setActiveTab("basic")
        } else if (nextChapterFocusTarget !== null) {
          setActiveTab("chapters")
        }
        if (isAutoSave) {
          setAutoSaveStatus("failed")
        }
        if (!isAutoSave) {
          toast({
            variant: "destructive",
            title: "表单验证失败",
            description: "请修正标记的课程信息后重试",
            duration: 5000,
          })
          setIsLoading(false)
        }
        isSubmittingRef.current = false
        return
      }
    } else if (!courseName.trim() || !courseNatureId) {
      if (isAutoSave) {
        setAutoSaveStatus("failed")
      }
      if (!isAutoSave) {
        toast({
          variant: "destructive",
          title: "表单验证失败",
          description: "请完整填写表单内容",
          duration: 5000,
        })
        setIsLoading(false)
      }
      isSubmittingRef.current = false
      return
    }

    const courseData = buildCourseData()

    try {
      await Promise.resolve(onSubmit(courseData, isAutoSave))
      lastSavedSnapshotRef.current = currentSnapshot
      if (!isAutoSave) {
        toast({
          variant: "success",
          title: "保存成功",
          description: isEditMode ? "课程信息已成功更新" : "课程信息已成功保存",
          duration: 3000,
        })
      } else {
        setAutoSaveStatus("saved")
      }
    } catch (error) {
      if (!isAutoSave) {
        toast({
          variant: "destructive",
          title: "保存失败",
          description: "课程信息保存失败，请重试",
          duration: 5000,
        })
      } else {
        setAutoSaveStatus("failed")
      }
      console.error("[AddCourseForm] Course save failed:", error)
    } finally {
      if (autoSaveStatusTimerRef.current) {
        clearTimeout(autoSaveStatusTimerRef.current)
      }
      if (isAutoSave) {
        autoSaveStatusTimerRef.current = setTimeout(() => {
          setAutoSaveStatus("")
          autoSaveStatusTimerRef.current = null
        }, 3000)
      }

      if (!isAutoSave) {
        setIsLoading(false)
      }

      isSubmittingRef.current = false

      if (pendingAutoSaveRef.current) {
        pendingAutoSaveRef.current = false
        const latestSnapshot = getCurrentSnapshot()
        pendingSnapshotRef.current = latestSnapshot
        if (latestSnapshot !== lastSavedSnapshotRef.current) {
          void handleSubmitRef.current(true)
        }
      }
    }
  }, [
    buildCourseData,
    canManageCourse,
    getCurrentSnapshot,
    isEditMode,
    isServerEditValidation,
    notifyNoPermission,
    onSubmit,
    chapters,
    serverChapterHourInputs,
    serverEditValidationValues,
    toast,
    courseName,
    courseNatureId,
  ])

  const handleManualSubmit = useCallback(() => {
    if (!canManageCourse) {
      notifyNoPermission()
      return
    }
    void handleSubmit(false)
  }, [canManageCourse, handleSubmit, notifyNoPermission])

  const handleCourseTypeKeyDown = useCallback((
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentOption: CourseTypeOption,
  ) => {
    if (!isServerEditValidation) {
      return
    }

    const currentIndex = COURSE_TYPE_OPTIONS.indexOf(currentOption)
    let targetIndex: number
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        targetIndex = (currentIndex - 1 + COURSE_TYPE_OPTIONS.length) % COURSE_TYPE_OPTIONS.length
        break
      case "ArrowRight":
      case "ArrowDown":
        targetIndex = (currentIndex + 1) % COURSE_TYPE_OPTIONS.length
        break
      case "Home":
        targetIndex = 0
        break
      case "End":
        targetIndex = COURSE_TYPE_OPTIONS.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    const targetOption = COURSE_TYPE_OPTIONS[targetIndex]
    setCourseType(targetOption)
    if (targetIndex === 0) {
      courseTypeFirstOptionRef.current?.focus()
      return
    }
    courseTypeSecondOptionRef.current?.focus()
  }, [isServerEditValidation])

  const handleStudentCountChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (isServerEditValidation) {
      setServerStudentCountInput({
        value: event.target.value,
        sourceInvalid: event.target.validity.badInput,
      })
      return
    }

    setStudentCount(Number.parseInt(event.target.value) || 0)
  }, [isServerEditValidation])

  const handleCreditsChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (isServerEditValidation) {
      setServerCreditsInput({
        value: event.target.value,
        sourceInvalid: event.target.validity.badInput,
      })
      return
    }

    setCredits(Number.parseFloat(event.target.value) || 0)
  }, [isServerEditValidation])

  const removeScoreHeader = useCallback((index: number, header: string) => {
    if (!canManageCourse) {
      notifyNoPermission()
      return
    }

    setScoreTable((prev) => {
      const newHeaders = prev.headers.filter((_, i) => i !== index)
      const newRows = prev.rows.map((row) => {
        const newRow = { ...row }
        delete newRow[header]
        return newRow
      })
      return { headers: newHeaders, rows: newRows }
    })
  }, [canManageCourse, notifyNoPermission])

  const addScoreHeader = useCallback(() => {
    if (!canManageCourse) {
      notifyNoPermission()
      return
    }

    setScoreTable((prev) => {
      const newHeader = `列${prev.headers.length + 1}`
      return {
        ...prev,
        headers: [...prev.headers, newHeader],
        rows: prev.rows.map((row) => ({ ...row, [newHeader]: "" })),
      }
    })
  }, [canManageCourse, notifyNoPermission])

  const removeScoreRow = useCallback((index: number) => {
    if (!canManageCourse) {
      notifyNoPermission()
      return
    }

    setScoreTable((prev) => ({ ...prev, rows: prev.rows.filter((_, i) => i !== index) }))
  }, [canManageCourse, notifyNoPermission])

  const addScoreRow = useCallback(() => {
    if (!canManageCourse) {
      notifyNoPermission()
      return
    }

    setScoreTable((prev) => {
      const newRow: { [key: string]: string } = {}
      prev.headers.forEach((header) => {
        newRow[header] = ""
      })
      return { ...prev, rows: [...prev.rows, newRow] }
    })
  }, [canManageCourse, notifyNoPermission])

  useEffect(() => {
    handleSubmitRef.current = handleSubmit
  }, [handleSubmit])

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
          {canManageCourse && (
            <Button
              onClick={handleManualSubmit}
              className="gap-2"
              disabled={isLoading || autoSaveStatus === "saving" || autoSaveStatus === "saved"}
              variant={autoSaveStatus === "saved" ? "default" : autoSaveStatus === "failed" ? "destructive" : "default"}
            >
              {isLoading ? (
                <>
                  <Spinner />
                  保存中
                </>
              ) : autoSaveStatus === "saving" ? (
                <>
                  <Spinner />
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
          )}
        </div>
      </div>

      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <UnderlineTabsList className={`grid ${showChapterTab ? "grid-cols-4" : "grid-cols-3"}`}>
            <UnderlineTabsTrigger value="basic">
              基本信息
            </UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="requirements">
              课程要求
            </UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="assessment">
              考核评价
            </UnderlineTabsTrigger>
            {showChapterTab && (
              <UnderlineTabsTrigger value="chapters">
                章节项目
              </UnderlineTabsTrigger>
            )}
          </UnderlineTabsList>

          <TabsContent value="basic" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  {/* [MOD] 改为开课学期（只读） */}
                  <Label>开课学期</Label>
                  <div className="flex items-center px-3 py-2 bg-muted/30 border border-border rounded-md h-10">
                    <span className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {openingSemesterDisplay}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label id={isServerEditValidation ? COURSE_TYPE_LABEL_ID : undefined}>
                    课程类型 <span className="text-red-500">*</span>
                  </Label>
                  <div
                    className={
                      serverEditErrors.courseType !== undefined
                        ? "flex gap-2 rounded-md border border-destructive p-2"
                        : "flex gap-2"
                    }
                    role={isServerEditValidation ? "radiogroup" : undefined}
                    aria-labelledby={isServerEditValidation ? COURSE_TYPE_LABEL_ID : undefined}
                    aria-required={isServerEditValidation ? true : undefined}
                    aria-invalid={serverEditErrors.courseType !== undefined ? true : undefined}
                    aria-describedby={
                      serverEditErrors.courseType !== undefined ? COURSE_TYPE_ERROR_ID : undefined
                    }
                  >
                    <Button
                      ref={courseTypeFirstOptionRef}
                      type="button"
                      variant={courseType === "必修" ? "default" : "outline"}
                      onClick={() => setCourseType("必修")}
                      className="flex-1"
                      role={isServerEditValidation ? "radio" : undefined}
                      aria-checked={isServerEditValidation ? courseType === "必修" : undefined}
                      tabIndex={isServerEditValidation ? (courseType === "选修" ? -1 : 0) : undefined}
                      onKeyDown={
                        isServerEditValidation
                          ? (event) => handleCourseTypeKeyDown(event, "必修")
                          : undefined
                      }
                    >
                      必修
                    </Button>
                    <Button
                      ref={courseTypeSecondOptionRef}
                      type="button"
                      variant={courseType === "选修" ? "default" : "outline"}
                      onClick={() => setCourseType("选修")}
                      className="flex-1"
                      role={isServerEditValidation ? "radio" : undefined}
                      aria-checked={isServerEditValidation ? courseType === "选修" : undefined}
                      tabIndex={isServerEditValidation ? (courseType === "选修" ? 0 : -1) : undefined}
                      onKeyDown={
                        isServerEditValidation
                          ? (event) => handleCourseTypeKeyDown(event, "选修")
                          : undefined
                      }
                    >
                      选修
                    </Button>
                  </div>
                  {serverEditErrors.courseType !== undefined && (
                    <FieldError id={COURSE_TYPE_ERROR_ID}>{serverEditErrors.courseType}</FieldError>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="course-name">
                    课程名称 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      ref={courseNameRef}
                      id="course-name"
                      placeholder="例如：数据结构与算法"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value.slice(0, 32))}
                      maxLength={32}
                      className="pr-20"
                      aria-invalid={serverEditErrors.courseName !== undefined ? true : undefined}
                      aria-required={isServerEditValidation ? true : undefined}
                      aria-describedby={
                        serverEditErrors.courseName !== undefined ? COURSE_NAME_ERROR_ID : undefined
                      }
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{courseName.length}/32</span>
                      {courseName && (
                        <button
                          type="button"
                          onClick={() => setCourseName("")}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="清空课程名称"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {serverEditErrors.courseName !== undefined && (
                    <FieldError id={COURSE_NAME_ERROR_ID}>{serverEditErrors.courseName}</FieldError>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="course-nature">
                    课程性质 <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={courseNaturePopoverOpen} onOpenChange={setCourseNaturePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        ref={courseNatureTriggerRef}
                        id={isServerEditValidation ? "course-nature" : undefined}
                        variant="outline"
                        className={
                          serverEditErrors.courseNatureId !== undefined
                            ? "w-full justify-between border-destructive bg-transparent"
                            : "w-full justify-between bg-transparent"
                        }
                        aria-invalid={serverEditErrors.courseNatureId !== undefined ? true : undefined}
                        aria-required={isServerEditValidation ? true : undefined}
                        aria-describedby={
                          serverEditErrors.courseNatureId !== undefined ? COURSE_NATURE_ERROR_ID : undefined
                        }
                      >
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
                  {serverEditErrors.courseNatureId !== undefined && (
                    <FieldError id={COURSE_NATURE_ERROR_ID}>{serverEditErrors.courseNatureId}</FieldError>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theory-period">理论学时</Label>
                  <Input
                    id="theory-period"
                    type="number"
                    min="0"
                    placeholder={isReadonlyHourField ? undefined : "例如：32"}
                    value={theoryPeriodDisplayValue}
                    onChange={(e) => setTheoryPeriod(Number.parseInt(e.target.value) || 0)}
                    readOnly={isEditMode && !allowHourFieldEdit}
                  />
                  <p className="text-xs font-medium text-amber-600">{HOUR_FIELD_HELP_TEXT}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="practice-period">实践学时</Label>
                  <Input
                    id="practice-period"
                    type="number"
                    min="0"
                    placeholder={isReadonlyHourField ? undefined : "例如：16"}
                    value={practicePeriodDisplayValue}
                    onChange={(e) => setPracticePeriod(Number.parseInt(e.target.value) || 0)}
                    readOnly={isEditMode && !allowHourFieldEdit}
                  />
                  <p className="text-xs font-medium text-amber-600">{HOUR_FIELD_HELP_TEXT}</p>
                </div>

                {/* 主要教材和参考文献放在一行 */}
                <div className="space-y-2">
                  <Label htmlFor="main-textbook">课程使用的主要教材</Label>
                  <RichTextEditor
                    value={mainTextbook}
                    onChange={setMainTextbook}
                    placeholder="支持粘贴 Word、Excel 或网页表格"
                    onPasteImageUpload={uploadCourseRichTextImage}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference-resources">建议阅读材料和参考文献</Label>
                  <RichTextEditor
                    value={referenceResources}
                    onChange={setReferenceResources}
                    placeholder="支持粘贴 Word、Excel 或网页表格"
                    onPasteImageUpload={uploadCourseRichTextImage}
                  />
                </div>

                {/* 课程介绍 */}
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="introduction">课程介绍</Label>
                  <RichTextEditor
                    value={introduction}
                    onChange={setIntroduction}
                    placeholder="输入课程介绍，支持粘贴 Word、Excel 或网页表格"
                    onPasteImageUpload={uploadCourseRichTextImage}
                  />
                </div>

                {/* 授课班级、授课地点、学生人数、学分 */}
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
                    ref={studentCountRef}
                    id="student-count"
                    type="number"
                    min="0"
                    placeholder=""
                    value={isServerEditValidation ? serverStudentCountInput.value : studentCount}
                    onChange={handleStudentCountChange}
                    aria-invalid={serverEditErrors.studentCount !== undefined ? true : undefined}
                    aria-describedby={
                      serverEditErrors.studentCount !== undefined ? STUDENT_COUNT_ERROR_ID : undefined
                    }
                  />
                  {serverEditErrors.studentCount !== undefined && (
                    <FieldError id={STUDENT_COUNT_ERROR_ID}>{serverEditErrors.studentCount}</FieldError>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credits">学分</Label>
                  <Input
                    ref={creditsRef}
                    id="credits"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder=""
                    value={isServerEditValidation ? serverCreditsInput.value : credits}
                    onChange={handleCreditsChange}
                    aria-invalid={serverEditErrors.credits !== undefined ? true : undefined}
                    aria-describedby={serverEditErrors.credits !== undefined ? CREDITS_ERROR_ID : undefined}
                  />
                  {serverEditErrors.credits !== undefined && (
                    <FieldError id={CREDITS_ERROR_ID}>{serverEditErrors.credits}</FieldError>
                  )}
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
                            {canManageCourse && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={addScheduleRow}
                                className="h-6 w-6 p-0 hover:bg-primary/10 mx-auto"
                                title="新增行"
                              >
                                <Plus className="w-4 h-4 text-primary" />
                              </Button>
                            )}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teachingScheduleRows.map((row, rowIndex) => {
                          const renderScheduleTextarea = (field: ScheduleField, value: string) => {
                            const fieldKey = getScheduleFieldKey(rowIndex, field)
                            const isExpanded = scheduleFieldsExpanded[fieldKey] === true

                            return (
                              <textarea
                                placeholder=""
                                value={value}
                                onChange={(e) => updateScheduleRow(rowIndex, field, e.target.value)}
                                onFocus={() => setScheduleFieldExpanded(rowIndex, field, true)}
                                onBlur={() => setScheduleFieldExpanded(rowIndex, field, false)}
                                className={`w-full border border-input rounded-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none overflow-hidden transition-[height,padding] ${
                                  isExpanded ? "h-[4.5rem] px-1 py-1" : "h-6 px-1 py-0.5"
                                } text-xs text-center`}
                                rows={isExpanded ? 3 : 1}
                                data-schedule-row={rowIndex}
                                data-schedule-field={field}
                              />
                            )
                          }

                          return (
                            <TableRow key={rowIndex} className="hover:bg-secondary/20">
                              {/* 时段单元格 */}
                              <TableCell className="p-1 text-center">
                                {renderScheduleTextarea("period", row.period)}
                              </TableCell>

                              {/* 节次单元格 */}
                              <TableCell className="p-1 text-center">
                                {renderScheduleTextarea("sessions", row.sessions)}
                              </TableCell>

                              {/* 周一到周日单元格 */}
                              {SCHEDULE_DAY_FIELDS.map((day) => (
                                <TableCell key={`${rowIndex}-${day}`} className="p-1 text-center">
                                  {renderScheduleTextarea(day, row[day])}
                                </TableCell>
                              ))}

                              {/* 操作列 */}
                              <TableCell className="p-1 text-center w-16">
                                {canManageCourse && teachingScheduleRows.length > 1 && (
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
              {/* 课程要求字段 - 2列布局 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 1. 关于课堂出席政策及要求 */}
                <div className="space-y-2">
                  <Label htmlFor="attendance-policy">关于课堂出席政策及要求</Label>
                  <RichTextEditor
                    value={attendancePolicy}
                    onChange={setAttendancePolicy}
                    placeholder="支持粘贴 Word、Excel 或网页表格"
                    onPasteImageUpload={uploadCourseRichTextImage}
                  />
                </div>

                {/* 2. 关于作业提交的政策及要求 */}
                <div className="space-y-2">
                  <Label htmlFor="assignment-policy">关于作业提交的政策及要求</Label>
                  <RichTextEditor
                    value={assignmentPolicy}
                    onChange={setAssignmentPolicy}
                    placeholder="支持粘贴 Word、Excel 或网页表格"
                    onPasteImageUpload={uploadCourseRichTextImage}
                  />
                </div>

                {/* 3. 关于上课行为规范、诚信学习要求 */}
                <div className="space-y-2">
                  <Label htmlFor="conduct-requirements">关于上课行为规范、诚信学习要求</Label>
                  <RichTextEditor
                    value={conductRequirements}
                    onChange={setConductRequirements}
                    placeholder="支持粘贴 Word、Excel 或网页表格"
                    onPasteImageUpload={uploadCourseRichTextImage}
                  />
                </div>

                {/* 4. 关于参与实践环节的要求 */}
                <div className="space-y-2">
                  <Label htmlFor="practice-requirements">关于参与实践环节的要求</Label>
                  <RichTextEditor
                    value={practiceRequirements}
                    onChange={setPracticeRequirements}
                    placeholder="支持粘贴 Word、Excel 或网页表格"
                    onPasteImageUpload={uploadCourseRichTextImage}
                  />
                </div>

                {/* 5. 关于团队学习、分组讨论的要求 */}
                <div className="space-y-2">
                  <Label htmlFor="teamwork-requirements">关于团队学习、分组讨论的要求</Label>
                  <RichTextEditor
                    value={teamworkRequirements}
                    onChange={setTeamworkRequirements}
                    placeholder="支持粘贴 Word、Excel 或网页表格"
                    onPasteImageUpload={uploadCourseRichTextImage}
                  />
                </div>

                {/* 6. 关于专利、论文等加分项的要求 */}
                <div className="space-y-2">
                  <Label htmlFor="bonus-requirements">关于专利、论文等加分项的要求</Label>
                  <RichTextEditor
                    value={bonusRequirements}
                    onChange={setBonusRequirements}
                    placeholder="支持粘贴 Word、Excel 或网页表格"
                    onPasteImageUpload={uploadCourseRichTextImage}
                  />
                </div>

                {/* 7. 其他课程要求或学习建议 */}
                <div className="space-y-2">
                  <Label htmlFor="other-suggestions">其他课程要求或学习建议</Label>
                  <RichTextEditor
                    value={otherSuggestions}
                    onChange={setOtherSuggestions}
                    placeholder="支持粘贴 Word、Excel 或网页表格"
                    onPasteImageUpload={uploadCourseRichTextImage}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assessment" className="space-y-6 mt-6">
            <div className="space-y-4">
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
                  <RichTextEditor
                    value={assessmentForm}
                    onChange={setAssessmentForm}
                    placeholder="支持粘贴 Word、Excel 或网页表格"
                    onPasteImageUpload={uploadCourseRichTextImage}
                  />
                </div>

                {/* 6. 考核评价说明 */}
                <div className="space-y-2">
                  <Label htmlFor="assessment-description">考核评价说明</Label>
                  <RichTextEditor
                    value={assessmentDescription}
                    onChange={setAssessmentDescription}
                    placeholder="支持粘贴 Word、Excel 或网页表格"
                    onPasteImageUpload={uploadCourseRichTextImage}
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
                          {canManageCourse && scoreTable.headers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeScoreHeader(idx, header)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="p-2 text-center">
                          {canManageCourse && (
                            <button type="button" onClick={addScoreHeader} className="text-primary hover:text-primary/80">
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
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
                            {canManageCourse && scoreTable.rows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeScoreRow(rowIdx)}
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
                          {canManageCourse && (
                            <button
                              type="button"
                              onClick={addScoreRow}
                              className="text-primary hover:text-primary/80 flex items-center justify-center gap-1 mx-auto"
                            >
                              <Plus className="w-4 h-4" />
                              <span>添加行</span>
                            </button>
                          )}
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
              <div ref={chapterTableContainerRef} className="border border-input rounded-md overflow-hidden bg-background">
                <Table>
                  <TableHeader className="[&_tr]:border-0">
                    <TableRow className="border-0 bg-secondary/30 hover:bg-secondary/30">
                      <TableHead className="w-[45%]">章节/项目名称</TableHead>
                      <TableHead className="w-[20%]">理论学时</TableHead>
                      <TableHead className="w-[20%]">实践学时</TableHead>
                      <TableHead className="w-[15%] text-center">
                        {canManageCourse && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={addChapter}
                            className="h-7 w-7 p-0 mx-auto hover:bg-primary/10"
                            title="新增章节项目"
                          >
                            <Plus className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr]:border-0">
                    {chapters.map((chapter, index) => (
                      <TableRow key={chapter.id || `${index}`} className="border-0 hover:bg-secondary/20">
                        <TableCell>
                          <Input
                            placeholder="例如：第1章 绪论"
                            value={chapter.name}
                            onChange={(e) => updateChapter(chapter.id, "name", e.target.value)}
                            onKeyDown={(e) => handleChapterInputKeyDown(e, index, "name")}
                            data-chapter-row={index}
                            data-chapter-col="name"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={
                              isServerEditValidation
                                ? getChapterHourInputState(
                                  chapter,
                                  index,
                                  "theoryHours",
                                  serverChapterHourInputs,
                                ).value
                                : chapter.theoryHours
                            }
                            onChange={(event) => handleChapterHourChange(
                              event,
                              chapter.id,
                              index,
                              "theoryHours",
                            )}
                            onKeyDown={(e) => handleChapterInputKeyDown(e, index, "theoryHours")}
                            data-chapter-row={index}
                            data-chapter-col="theoryHours"
                            aria-invalid={
                              serverEditChapterHourErrors[
                                getChapterHourFieldKey(index, "theoryHours")
                              ] !== undefined
                                ? true
                                : undefined
                            }
                            aria-describedby={
                              serverEditChapterHourErrors[
                                getChapterHourFieldKey(index, "theoryHours")
                              ] !== undefined
                                ? getChapterHourErrorId(index, "theoryHours")
                                : undefined
                            }
                          />
                          {serverEditChapterHourErrors[
                            getChapterHourFieldKey(index, "theoryHours")
                          ] !== undefined && (
                            <FieldError id={getChapterHourErrorId(index, "theoryHours")}>
                              {serverEditChapterHourErrors[
                                getChapterHourFieldKey(index, "theoryHours")
                              ]}
                            </FieldError>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={
                              isServerEditValidation
                                ? getChapterHourInputState(
                                  chapter,
                                  index,
                                  "practiceHours",
                                  serverChapterHourInputs,
                                ).value
                                : chapter.practiceHours
                            }
                            onChange={(event) => handleChapterHourChange(
                              event,
                              chapter.id,
                              index,
                              "practiceHours",
                            )}
                            onKeyDown={(e) => handleChapterInputKeyDown(e, index, "practiceHours")}
                            data-chapter-row={index}
                            data-chapter-col="practiceHours"
                            aria-invalid={
                              serverEditChapterHourErrors[
                                getChapterHourFieldKey(index, "practiceHours")
                              ] !== undefined
                                ? true
                                : undefined
                            }
                            aria-describedby={
                              serverEditChapterHourErrors[
                                getChapterHourFieldKey(index, "practiceHours")
                              ] !== undefined
                                ? getChapterHourErrorId(index, "practiceHours")
                                : undefined
                            }
                          />
                          {serverEditChapterHourErrors[
                            getChapterHourFieldKey(index, "practiceHours")
                          ] !== undefined && (
                            <FieldError id={getChapterHourErrorId(index, "practiceHours")}>
                              {serverEditChapterHourErrors[
                                getChapterHourFieldKey(index, "practiceHours")
                              ]}
                            </FieldError>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {canManageCourse && chapters.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeChapter(chapter.id)}
                              className="h-7 w-7 p-0 mx-auto hover:bg-destructive/10"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
        {canManageCourse && (
          <Button onClick={handleManualSubmit} className="gap-2" disabled={isLoading}>
            {isLoading ? <Spinner /> : <Check className="w-4 h-4" />}
            保存
          </Button>
        )}
      </div>
    </div>
  )
}

export { AddCourseForm }
export default AddCourseForm
