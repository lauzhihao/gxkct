"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, FileText, Loader2 } from "lucide-react"
import { exportReport, getAdditionalInfo, getCourseIntro, getGraduateRequires, getMajorMatrix, getPointMatrix, getProjectList, getProjectMatrix, getTaskGoal } from "@/modules/courses/report/api"
import { ReportChapter } from "@/modules/courses/report/components/ReportChapter"
import { ReportRevisableTable } from "@/modules/courses/report/components/ReportRevisableTable"
import { ReportTable } from "@/modules/courses/report/components/ReportTable"
import type { AdditionalInfoResponse, ColumnOption, GraduateRequireNode, PointMatrixItem, ProjectListItem, ProjectMatrixItem, RevisableCell, RevisableRow, RevisableTableValue, TableOption, TaskGoalGroup } from "@/modules/courses/report/types"
import { Button } from "@/shared/components/ui/button"
import { SafeRichTextContent } from "@/shared/components/ui/safe-rich-text-content"
import { showError, showSuccess } from "@/shared/utils/toast-utils"

interface CourseSyllabusPreviewProps {
  courseId: number
  courseName: string
  instructorNames?: string[]
  departmentName?: string
  courseDetail?: {
    theoryPeriod?: number | null
    practicePeriod?: number | null
    credits?: number | null
    teachingTime?: unknown
    introduction?: string | null
    teachingClass?: string | null
    teachingLocation?: string | null
    studentCount?: number | null
    criterion?: string | null
    scoreType?: string | null
    mainTextbook?: string | null
    referenceResources?: string | null
    attendancePolicy?: string | null
    assignmentPolicy?: string | null
    conductRequirements?: string | null
    practiceRequirements?: string | null
    teamworkRequirements?: string | null
    bonusRequirements?: string | null
    otherSuggestions?: string | null
    assessmentMethod?: string | null
    assessmentForm?: string | null
    assessmentDescription?: string | null
    // 开课学期字段
    openingSemesterId?: number | null
    openingSemesterDisplay?: string | null
  }
  onBack: () => void
}

const LOCAL_EXAM_FIVE = "90-100分为优秀，80-89分为良好，70-79分为中等，60-69分为及格，60分以下为不及格（详细列示五级分制的考核标准和具体要求）。"

function InlineCheckText({ title, options }: { title: string; options: Array<{ label: string; checked: boolean }> }) {
  return (
    <div className="text-[12pt] leading-[22pt]">
      <span className="font-medium">{title}：</span>
      <span className="pl-[2ch]">
        {options.map((option) => `${option.label}（${option.checked ? "✓" : "　"}）`).join("  ")}
      </span>
    </div>
  )
}

function BasicInfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[auto_2ch_minmax(0,1fr)] items-start text-[12pt] leading-[22pt]">
      <span className="whitespace-pre-wrap font-medium text-slate-700">{`${label}:`}</span>
      <span aria-hidden="true" />
      <span className="min-w-0 whitespace-pre-wrap text-slate-900">{value}</span>
    </div>
  )
}

function LongTextSection({ title, content }: { title: string; content: string }) {
  return (
    <div className="space-y-1 text-[12pt] leading-[22pt]">
      <div className="font-medium">{title}</div>
      <SafeRichTextContent
        content={content}
        className="pl-[2em] text-foreground/90 [&_em]:italic [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-[3.2em] [&_p]:min-h-0 [&_p]:leading-[22pt] [&_p+*]:mt-2 [&_strong]:font-semibold [&_table]:my-3 [&_table]:text-[11pt] [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:py-1.5 [&_u]:underline [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-[3.2em]"
        plainTextClassName="whitespace-pre-wrap pl-[2em] text-foreground/90"
      />
    </div>
  )
}

function PreviewPage({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto w-full ${wide ? "max-w-[1220px]" : "max-w-[900px]"} rounded-sm bg-white px-[54px] py-[60px] shadow-[0_10px_30px_rgba(15,23,42,0.14)]`}>
      {children}
    </div>
  )
}

function parseFilenameFromContentDisposition(headerValue: string | null): string | null {
  if (!headerValue) return null
  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }
  const asciiMatch = headerValue.match(/filename="?([^";]+)"?/i)
  return asciiMatch?.[1] ?? null
}

function downloadBlob(blob: Blob, fileName: string): Promise<void> {
  return new Promise((resolve) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  window.setTimeout(() => {
    link.remove()
    URL.revokeObjectURL(url)
    resolve()
  }, 400)
  })
}

function normalizeText(value: string | null | undefined): string {
  if (!value) return ""
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim()
}

function pickRichContent(primary: string | null | undefined, fallback: string | null | undefined): string {
  if (primary && primary.trim().length > 0) {
    return primary
  }

  return fallback ?? ""
}

type TeachingTimeScheduleRow = Record<string, string | number | null | undefined>

const TEACHING_TIME_DAY_FIELDS: Array<{ key: keyof TeachingTimeScheduleRow; label: string }> = [
  { key: "monday", label: "周一" },
  { key: "tuesday", label: "周二" },
  { key: "wednesday", label: "周三" },
  { key: "thursday", label: "周四" },
  { key: "friday", label: "周五" },
  { key: "saturday", label: "周六" },
  { key: "sunday", label: "周日" },
]

function stringifyTeachingTimeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  return String(value).trim()
}

function parseTeachingTimeRows(raw: unknown): TeachingTimeScheduleRow[] {
  if (raw === null || raw === undefined) {
    return []
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (trimmed === "") {
      return []
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown
      return parseTeachingTimeRows(parsed)
    } catch {
      return []
    }
  }

  if (Array.isArray(raw)) {
    return raw.filter((item): item is TeachingTimeScheduleRow => item !== null && typeof item === "object")
  }

  if (typeof raw === "object") {
    return [raw as TeachingTimeScheduleRow]
  }

  return []
}

function buildTeachingTimeFallbackSchedule(raw: unknown): RevisableTableValue {
  const rows = parseTeachingTimeRows(raw)

  return {
    label: "课程表",
    data: rows.map((row, index) => ({
      label: stringifyTeachingTimeCell(row.period) || `时段${index + 1}`,
      data: [
        {
          label: stringifyTeachingTimeCell(row.sessions),
          data: TEACHING_TIME_DAY_FIELDS.map((field) => ({
            label: stringifyTeachingTimeCell(row[field.key]),
            data: null,
          })),
        },
      ],
    })),
  }
}

function resolveTeachingTimeDisplay(raw: unknown): string {
  const parsedRows = parseTeachingTimeRows(raw)
  if (parsedRows.length > 0) {
    return "详见下方授课时间表"
  }

  if (typeof raw === "string") {
    return normalizeText(raw)
  }

  if (raw === null || raw === undefined) {
    return ""
  }

  return String(raw)
}

interface MajorMatrixLeafColumn {
  requirementId: number
  requirementLabel: string
  requirementDescription: string
  indicatorId: number
  indicatorLabel: string
  indicatorDescription: string
}

interface MajorMatrixExplanationItem {
  requirementLabel: string
  requirementDescription: string
  indicators: Array<{
    indicatorLabel: string
    indicatorDescription: string
    mark: string
  }>
}

const MAJOR_MATRIX_VISIBLE_LEAF_COUNT = 12

function buildMajorMatrixLeafColumns(requires: GraduateRequireNode[]): MajorMatrixLeafColumn[] {
  return requires.flatMap((requirement, requirementIndex) => requirement.children.map((indicator, indicatorIndex) => ({
    requirementId: requirement.id,
    requirementLabel: `毕业要求${requirementIndex + 1}`,
    requirementDescription: requirement.description,
    indicatorId: indicator.id,
    indicatorLabel: `${requirementIndex + 1}-${indicatorIndex + 1}`,
    indicatorDescription: indicator.description,
  })))
}

function collapseMajorMatrixColumns(columns: MajorMatrixLeafColumn[]): Array<ColumnOption & { sourceIds?: number[] }> {
  const visibleColumns = columns.length > MAJOR_MATRIX_VISIBLE_LEAF_COUNT
    ? [...columns.slice(0, MAJOR_MATRIX_VISIBLE_LEAF_COUNT - 2), columns[columns.length - 1]]
    : columns

  const groupedColumns: Array<ColumnOption & { sourceIds?: number[] }> = []
  let currentGroup: (ColumnOption & { sourceIds?: number[] }) | null = null

  visibleColumns.forEach((column, index) => {
    const nextGroup = currentGroup && currentGroup.label === column.requirementLabel
    if (!nextGroup) {
      currentGroup = {
        label: column.requirementLabel,
      children: [],
      sourceIds: [column.requirementId],
      }
      groupedColumns.push(currentGroup)
    }

    currentGroup?.children?.push({ label: `指标点${column.indicatorLabel}`, id: column.indicatorId, children: null })

    if (columns.length > MAJOR_MATRIX_VISIBLE_LEAF_COUNT && index === MAJOR_MATRIX_VISIBLE_LEAF_COUNT - 3) {
      groupedColumns.push({
        label: "...",
        children: [{ label: "...", children: null }],
      })
      currentGroup = null
    }
  })

  return groupedColumns
}

function buildMajorMatrixExplanations(requires: GraduateRequireNode[], matrixItems: Array<{ graduateRequireId: number; relate: number }>): MajorMatrixExplanationItem[] {
  const matchedIds = new Map(matrixItems.map((item) => [item.graduateRequireId, item.relate === 0 ? "★" : "☆"]))
  return requires
    .map((requirement, requirementIndex) => {
      const indicators = requirement.children
        .map((indicator, indicatorIndex) => {
          const mark = matchedIds.get(indicator.id)
          if (!mark) return null
          return {
            indicatorLabel: `${requirementIndex + 1}-${indicatorIndex + 1}`,
            indicatorDescription: indicator.description,
            mark,
          }
        })
        .filter((indicator): indicator is { indicatorLabel: string; indicatorDescription: string; mark: string } => indicator !== null)

      if (indicators.length === 0) return null
      return {
        requirementLabel: `毕业要求${requirementIndex + 1}`,
        requirementDescription: requirement.description,
        indicators,
      }
    })
    .filter((item): item is MajorMatrixExplanationItem => item !== null)
}

function buildMajorMatrixOptions(requires: GraduateRequireNode[]): TableOption {
  const leafColumns = buildMajorMatrixLeafColumns(requires)
  return {
    name: "majormatrix",
    header: { text: "", format: "{$1}课程体系矩阵" },
    footer: { text: "注：其中★为强支撑，☆为弱支撑" },
    style: { dataAlign: "center", titleAlign: "left" },
    column: collapseMajorMatrixColumns(leafColumns),
  }
}

function buildMajorMatrixData(courseName: string, requires: GraduateRequireNode[], matrixItems: Array<{ graduateRequireId: number; relate: number }>): Array<{ data: string[] }> {
  const leafColumns = buildMajorMatrixLeafColumns(requires)
  const visibleColumns = leafColumns.length > MAJOR_MATRIX_VISIBLE_LEAF_COUNT
    ? [...leafColumns.slice(0, MAJOR_MATRIX_VISIBLE_LEAF_COUNT - 2), leafColumns[leafColumns.length - 1]]
    : leafColumns
  const row = [courseName]
  visibleColumns.forEach((column, index) => {
    const matched = matrixItems.find((item) => item.graduateRequireId === column.indicatorId)
    row.push(matched ? (matched.relate === 0 ? "{$strong}" : "{$weak}") : "")
    if (leafColumns.length > MAJOR_MATRIX_VISIBLE_LEAF_COUNT && index === MAJOR_MATRIX_VISIBLE_LEAF_COUNT - 3) {
      row.push("...")
    }
  })
  return [{ data: row }]
}

function buildProjectMatrixOptions(requires: GraduateRequireNode[]): TableOption {
  return {
    name: "projectmatrix",
    header: { text: "门课矩阵", format: "" },
    footer: { text: "注：其中★为强支撑，☆为弱支撑" },
    style: { dataAlign: "left" },
    column: requires.flatMap((requirement) => requirement.children
      .filter((indicator) => indicator.children.length > 0)
      .map((indicator) => ({
        label: indicator.description,
        children: indicator.children.map((child) => ({ label: child.description, id: child.id, children: null })),
      }))),
  }
}

function buildProjectMatrixData(projectList: ProjectListItem[], projectMatrixItems: ProjectMatrixItem[], options: TableOption): Array<{ data: string[] }> {
  return projectList.map((project) => {
    const row = [project.name]
    options.column.forEach((column) => {
      column.children?.forEach((child) => {
        const cell = projectMatrixItems
          .filter((item) => item.projectId === project.id && item.graduateRequireId === child.id)
          .map((item) => `${item.relate.relate === 0 ? "{$strong}" : "{$weak}"}${item.point.title}:${item.point.description}`)
          .join("\n")
        row.push(cell)
      })
    })
    return { data: row }
  })
}

function buildPointMatrixTables(projectList: ProjectListItem[], projectMatrixItems: ProjectMatrixItem[], pointMatrixItems: PointMatrixItem[], taskGoals: TaskGoalGroup[]): Array<{ options: TableOption; data: Array<{ data: string[] }> }> {
  return projectList.map((project, projectIndex) => {
    const goals = taskGoals[projectIndex]?.goals ?? []
    const options: TableOption = {
      name: "pointmatrix",
      header: { text: project.name, format: "{$1}矩阵" },
      footer: { text: "注：其中★为强支撑，☆为弱支撑;K-knowledge知识点；S-skill技能点；A-attitude态度点" },
      style: { dataAlign: "left" },
      column: [
        ...goals.map((goal) => ({ label: goal.description, children: null })),
        { label: "学法", width: 62, children: null },
        { label: "教法", width: 62, children: null },
        { label: "学习产出及测量标准\n（以课点为单位进行考核）", width: 96, children: null },
        {
          label: "教学安排",
          children: [
            { label: "开课周数", width: 72, children: null },
            { label: "理论学时", width: 72, children: null },
            { label: "实践学时", width: 72, children: null },
          ],
        },
      ],
    }

    const rows = projectMatrixItems
      .filter((item) => item.projectId === project.id)
      .map((item) => ({
        data: [
          `${item.relate.relate === 0 ? "{$strong}" : "{$weak}"}${item.point.title}:${item.point.description}`,
          ...goals.map((goal) => pointMatrixItems
            .filter((pointItem) => pointItem.projectMatrixId === item.id && pointItem.taskGoalId === goal.id)
            .map((pointItem) => `${pointItem.relate.relate === 0 ? "{$strong}" : "{$weak}"}${pointItem.ksa.title}${pointItem.ksa.level}:${pointItem.ksa.description}`)
            .join("\n")),
          item.study,
          item.teach,
          item.product,
          item.week,
          item.theoryPeriod,
          item.practicePeriod,
        ],
      }))

    rows.push({
      data: [
        "学习产出及测量标准（以教学目标为单位进行考核）",
        ...goals.map((goal) => goal.product),
        "",
        "",
        "",
        "",
        "",
        "",
      ],
    })

    return { options, data: rows }
  })
}

function buildScheduleOptions(): TableOption {
  return {
    name: "schedule",
    header: { text: "", format: "", show: true },
    footer: { text: "", show: false },
    column: ["时段", "节次", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"].map((label) => ({ label, children: null })),
    style: { dataAlign: "center" },
    showHeader: true,
    rowDataCoverter: (value) => value.flatMap((group, groupIndex) => group.data.map((row, rowIndex) => {
      const cells: RevisableCell[] = [
        { label: group.label, revisableType: "row", marker: [0, groupIndex] },
        { label: row.label, revisableType: "row", marker: [1, groupIndex, rowIndex] },
        ...row.data.map((item, itemIndex) => ({ label: item.label, revisableType: "none" as const, marker: [1, groupIndex, rowIndex, itemIndex] })),
      ]
      return { data: cells }
    })),
    spanFormat: (value) => {
      let rowIndex = 0
      return value.map((group) => {
        const covers: [number, number][] = []
        for (let index = 1; index < group.data.length; index += 1) covers.push([rowIndex + index, 0])
        const item = { location: [rowIndex, 0] as [number, number], status: [group.data.length, 1] as [number, number], covers }
        rowIndex += group.data.length
        return item
      })
    },
  }
}

function buildExamPercentOptions(): TableOption {
  return {
    name: "percent",
    header: { text: "", format: "", show: false },
    footer: { text: "", show: false },
    column: [],
    style: { dataAlign: "center" },
    showHeader: false,
    rowDataCoverter: (value) => {
      const max = value.reduce((result, item) => Math.max(result, item.data.length), 0)
      return Array.from({ length: max + 1 }, (_, rowIndex): RevisableRow => {
        const cells: RevisableCell[] = [
          { label: "总分100分", revisableType: "none", marker: [] },
          ...value.map((group, groupIndex) => (rowIndex === 0
            ? { label: group.label, revisableType: "column" as const, marker: [0, groupIndex] }
            : { label: rowIndex > group.data.length ? "{$hold}" : group.data[rowIndex - 1].label, revisableType: "row" as const, marker: [1, groupIndex, rowIndex - 1] })),
        ]
        return { data: cells }
      })
    },
    spanFormat: (value) => {
      const max = value.reduce((result, item) => Math.max(result, item.data.length), 0)
      return [{
        location: [0, 0] as [number, number],
        status: [max + 1, 1] as [number, number],
        covers: Array.from({ length: max }, (_, index) => [index + 1, 0] as [number, number]),
      }]
    },
  }
}

function formatTodayDate(): string {
  const today = new Date()
  const year = String(today.getFullYear())
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}年${month}月${day}日`
}

export function CourseSyllabusPreview({
  courseId,
  courseName,
  instructorNames = [],
  departmentName = "",
  courseDetail,
  onBack,
}: CourseSyllabusPreviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState<0 | 1 | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [courseIntro, setCourseIntro] = useState("")
  const [additionalInfo, setAdditionalInfo] = useState<AdditionalInfoResponse | null>(null)
  const [totalPeriodData, setTotalPeriodData] = useState<[number, number, number]>([0, 0, 0])
  const [majorMatrixData, setMajorMatrixData] = useState<Array<{ data: string[] }>>([])
  const [majorMatrixOptions, setMajorMatrixOptions] = useState<TableOption | null>(null)
  const [majorMatrixExplanations, setMajorMatrixExplanations] = useState<MajorMatrixExplanationItem[]>([])
  const [projectMatrixData, setProjectMatrixData] = useState<Array<{ data: string[] }>>([])
  const [projectMatrixOptions, setProjectMatrixOptions] = useState<TableOption | null>(null)
  const [pointMatrixTables, setPointMatrixTables] = useState<Array<{ options: TableOption; data: Array<{ data: string[] }> }>>([])

  const scheduleOptions = useMemo(() => buildScheduleOptions(), [])
  const examPercentOptions = useMemo(() => buildExamPercentOptions(), [])
  const todayDate = useMemo(() => formatTodayDate(), [])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setErrorMessage("")
      try {
        const [intro, info, requires, majorMatrixItems, projectList, projectMatrixItems, pointMatrixItems, taskGoals] = await Promise.all([
          getCourseIntro(courseId),
          getAdditionalInfo(courseId),
          getGraduateRequires(courseId),
          getMajorMatrix(courseId),
          getProjectList(courseId),
          getProjectMatrix(courseId),
          getPointMatrix(courseId),
          getTaskGoal(courseId),
        ])
        if (!mounted) return
        setCourseIntro(intro)
        setAdditionalInfo(info)
        const nextMajorOptions = buildMajorMatrixOptions(requires)
        setMajorMatrixOptions(nextMajorOptions)
        setMajorMatrixData(buildMajorMatrixData(courseName, requires, majorMatrixItems))
        setMajorMatrixExplanations(buildMajorMatrixExplanations(requires, majorMatrixItems))
        const nextProjectOptions = buildProjectMatrixOptions(requires)
        setProjectMatrixOptions(nextProjectOptions)
        setProjectMatrixData(buildProjectMatrixData(projectList, projectMatrixItems, nextProjectOptions))
        const theory = projectList.reduce((sum, item) => sum + Number(item.theoryPeriod || 0), 0)
        const practice = projectList.reduce((sum, item) => sum + Number(item.practicePeriod || 0), 0)
        setTotalPeriodData([theory + practice, theory, practice])
        setPointMatrixTables(buildPointMatrixTables(projectList, projectMatrixItems, pointMatrixItems, taskGoals))
      } catch (error) {
        console.error("[CourseSyllabusPreview] load failed", error)
        if (mounted) setErrorMessage("开课说明加载失败，请稍后重试")
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [courseId, courseName])

  const handleExport = useCallback(async () => {
    setIsExporting(1)
    try {
      const response = await exportReport(courseId)
      const blob = await response.blob()
      const fileName = parseFilenameFromContentDisposition(response.headers.get("content-disposition")) || `${courseName}_开课说明.docx`
      await downloadBlob(blob, fileName)
      showSuccess("Word 导出成功")
    } catch (error) {
      console.error("[CourseSyllabusPreview] export failed", error)
      showError("Word 导出失败，请稍后重试")
    } finally {
      setIsExporting(null)
    }
  }, [courseId, courseName])

  if (isLoading) return <div className="flex min-h-[360px] items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />正在加载开课说明...</div>
  if (errorMessage || !additionalInfo || !majorMatrixOptions || !projectMatrixOptions) return <div className="flex min-h-[360px] items-center justify-center text-sm text-destructive">{errorMessage || "开课说明数据缺失"}</div>

  const fallbackScheduleData = buildTeachingTimeFallbackSchedule(courseDetail?.teachingTime)
  const scheduleData = additionalInfo.schedule?.data?.length
    ? additionalInfo.schedule
    : fallbackScheduleData
  const examPercentType = normalizeText(additionalInfo.exampercent?.label) || normalizeText(courseDetail?.scoreType)
  const mergedCourseIntro = pickRichContent(courseIntro, courseDetail?.introduction)
  const mergedCredits = additionalInfo.score || String(courseDetail?.credits ?? "")
  const mergedLecturer = normalizeText(additionalInfo.lecturer) || instructorNames.filter(Boolean).join("、")
  const mergedDepartment = normalizeText(additionalInfo.department) || departmentName
  const mergedTeachingClass = additionalInfo.classname || normalizeText(courseDetail?.teachingClass)
  const mergedTeachingLocation = additionalInfo.classroom || normalizeText(courseDetail?.teachingLocation)
  const mergedTeachingTime = scheduleData.data.length > 0
    ? "详见下方授课时间表"
    : resolveTeachingTimeDisplay(courseDetail?.teachingTime)
  const mergedStudentCount = additionalInfo.students || String(courseDetail?.studentCount ?? "")
  const mergedTextbooks = pickRichContent(additionalInfo.textbooks, courseDetail?.mainTextbook)
  const mergedReferences = pickRichContent(additionalInfo.textreferences, courseDetail?.referenceResources)
  const mergedAttend = pickRichContent(additionalInfo.attend, courseDetail?.attendancePolicy)
  const mergedAssignment = pickRichContent(additionalInfo.assignment, courseDetail?.assignmentPolicy)
  const mergedCriterion = pickRichContent(
    additionalInfo.criterion,
    courseDetail?.conductRequirements ? courseDetail.conductRequirements : courseDetail?.criterion,
  )
  const mergedPractice = pickRichContent(additionalInfo.practice, courseDetail?.practiceRequirements)
  const mergedGroup = pickRichContent(additionalInfo.textgroup, courseDetail?.teamworkRequirements)
  const mergedPaper = pickRichContent(additionalInfo.paper, courseDetail?.bonusRequirements)
  const mergedOthers = pickRichContent(additionalInfo.others, courseDetail?.otherSuggestions)
  const mergedExamWay = pickRichContent(additionalInfo.examway, courseDetail?.assessmentForm)
  const mergedExamDetail = pickRichContent(additionalInfo.examdetail, courseDetail?.assessmentDescription)
  const fallbackTheory = Number(courseDetail?.theoryPeriod ?? 0)
  const fallbackPractice = Number(courseDetail?.practicePeriod ?? 0)
  const mergedTotalPeriodData = totalPeriodData[0] > 0 ? totalPeriodData : [fallbackTheory + fallbackPractice, fallbackTheory, fallbackPractice]
  // [MOD] 开课学期：优先使用外面传进来的 courseDetail 数据，再用 API 查询的数据
  const mergedOpeningSemester = normalizeText(courseDetail?.openingSemesterDisplay) || normalizeText(additionalInfo.year)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f5f1e8]">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-6 py-4 backdrop-blur">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />返回
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void handleExport()} disabled={isExporting !== null} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <FileText className="mr-2 h-4 w-4" />{isExporting === 1 ? "导出中..." : "下载 WORD 格式"}
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-8">
          <PreviewPage>
            <div className="mb-10 text-center text-[16pt] font-bold">《{courseName}》开课说明</div>
            <div className="space-y-6 text-black">
            <ReportChapter data="第一部分：基础信息" />
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-3">
                <div className="md:col-span-1">
                  <BasicInfoField label="总学时数" value={`${mergedTotalPeriodData[0]}(${mergedTotalPeriodData[1]}/${mergedTotalPeriodData[2]})`} />
                </div>
                <div className="md:col-span-1">
                  <BasicInfoField label="学分" value={mergedCredits} />
                </div>
                <div className="hidden md:block" />

                <div className="md:col-span-1">
                  <BasicInfoField label="开课学期" value={mergedOpeningSemester} />
                </div>
                <div className="hidden md:block" />
                <div className="hidden md:block" />

                <div className="md:col-span-1">
                  <BasicInfoField label="授课教师" value={mergedLecturer} />
                </div>
                <div className="md:col-span-1">
                  <BasicInfoField label="联系电话" value={additionalInfo.phone ?? ""} />
                </div>
                <div className="md:col-span-1">
                  <BasicInfoField label="Email" value={additionalInfo.email ?? ""} />
                </div>

                <div className="md:col-span-3">
                  <BasicInfoField label="开课部门" value={mergedDepartment} />
                </div>
                <div className="md:col-span-3">
                  <BasicInfoField label="授课班级" value={mergedTeachingClass} />
                </div>
                <div className="md:col-span-3">
                  <BasicInfoField label="学生人数" value={mergedStudentCount} />
                </div>
                <div className="md:col-span-3">
                  <BasicInfoField label="授课地点" value={mergedTeachingLocation} />
                </div>
                <div className="md:col-span-3">
                  <BasicInfoField label="授课时间" value={mergedTeachingTime} />
                </div>
              </div>
              <div className="space-y-2">
                <ReportRevisableTable data={scheduleData} options={scheduleOptions} />
              </div>
             <LongTextSection title="课程使用的主要教材" content={mergedTextbooks} />
              <LongTextSection title="建议阅读材料和参考文献" content={mergedReferences} />
            </div>
            <ReportTable data={majorMatrixData} options={majorMatrixOptions} />
            {majorMatrixExplanations.length > 0 ? (
              <div className="space-y-2 text-[10.5pt] leading-[20pt] text-slate-800">
                {majorMatrixExplanations.map((item) => (
                  <div key={item.requirementLabel} className="space-y-1">
                    <div>{item.requirementLabel}：{item.requirementDescription}</div>
                    <div className="space-y-1 pl-[2em]">
                      {item.indicators.map((indicator) => (
                        <div key={`${item.requirementLabel}-${indicator.indicatorLabel}`}>
                          {indicator.indicatorLabel}（{indicator.mark}）：{indicator.indicatorDescription}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            </div>
          </PreviewPage>

          <PreviewPage>
            <div className="space-y-6 text-black">
            <ReportChapter data="第二部分：课程简介" />
            <div className="text-[12pt] leading-[22pt] [&_img]:max-h-[420px] [&_img]:max-w-full [&_img]:object-contain">
              <SafeRichTextContent
                content={mergedCourseIntro}
                className="[&_p]:min-h-0 [&_p]:leading-[22pt] [&_p+*]:mt-2"
                plainTextClassName="whitespace-pre-wrap text-[12pt] leading-[22pt]"
              />
            </div>
            </div>
          </PreviewPage>

          <PreviewPage wide>
            <div className="space-y-6 text-black">
            <ReportTable data={projectMatrixData} options={projectMatrixOptions} />
            </div>
          </PreviewPage>

          <PreviewPage>
            <div className="space-y-6 text-black">
            <ReportChapter data="第三部分：课程要求" />
            <LongTextSection title="1.关于课堂出席政策及要求" content={mergedAttend} />
            <LongTextSection title="2.关于作业提交的政策及要求" content={mergedAssignment} />
            <LongTextSection title="3.关于上课行为规范、诚信学习要求" content={mergedCriterion} />
            <LongTextSection title="4.关于参与实践环节的要求" content={mergedPractice} />
            <LongTextSection title="5.关于团队学习、分组讨论的要求" content={mergedGroup} />
            <LongTextSection title="6.关于专利、论文等加分项的要求" content={mergedPaper} />
            <LongTextSection title="7.其他学习建议" content={mergedOthers} />
            <ReportChapter data="第四部分：考核评价" />
            <InlineCheckText
              title="1.考核方式"
              options={[
                { label: "考试", checked: String(additionalInfo.examtype ?? "") === "0" || normalizeText(courseDetail?.assessmentMethod) === "考试" },
                { label: "考查", checked: String(additionalInfo.examtype ?? "") === "1" || normalizeText(courseDetail?.assessmentMethod) === "考查" },
              ]}
            />
            <LongTextSection title="2.具体形式" content={mergedExamWay} />
            <InlineCheckText
              title="3.总成绩为"
              options={[
                { label: "百分制", checked: examPercentType === "百分制" },
                { label: "五级分制", checked: examPercentType === "五级分制" },
              ]}
            />
            {additionalInfo.exampercent ? <ReportRevisableTable data={additionalInfo.exampercent} options={examPercentOptions} /> : null}
            <blockquote className="border-l-4 border-slate-300 bg-slate-100 px-4 py-3 text-[12pt] leading-[22pt] text-slate-700">
              总成绩为五级分制的，成绩等级与分值对应如下：
              <div className="mt-1 whitespace-pre-wrap pl-[2em]">{LOCAL_EXAM_FIVE}</div>
            </blockquote>
            <ReportChapter data="考核评价说明：" noDecoration />
            <SafeRichTextContent
              content={mergedExamDetail}
              className="pl-[2em] text-[12pt] leading-[22pt] text-foreground/90 [&_em]:italic [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-[3.2em] [&_p]:min-h-0 [&_p]:leading-[22pt] [&_p+*]:mt-2 [&_strong]:font-semibold [&_table]:my-3 [&_table]:text-[11pt] [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:py-1.5 [&_u]:underline [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-[3.2em]"
              plainTextClassName="whitespace-pre-wrap pl-[2em] text-[12pt] leading-[22pt] text-foreground/90"
            />
            </div>
          </PreviewPage>

          <PreviewPage wide>
            <div className="space-y-6 text-black">
            <ReportChapter data="第五部分：课程计划" />
            {pointMatrixTables.map((table, index) => <ReportTable key={`${table.options.header.text}-${index}`} data={table.data} options={table.options} />)}
            <div className="grid grid-cols-[1fr_minmax(max-content,1.4fr)_1fr] gap-6 pt-4 text-[12pt] leading-[22pt]">
              <div className="min-w-0 whitespace-nowrap text-left">授课教师签字：_________</div>
              <div className="min-w-0 whitespace-nowrap text-left">专业负责人（课程负责人）签字：__________</div>
              <div className="flex min-w-0 flex-col items-start gap-2 text-left">
                <div className="whitespace-nowrap">系主任签字：_________</div>
                <div>{todayDate}</div>
              </div>
            </div>
            </div>
          </PreviewPage>
        </div>
      </div>
    </div>
  )
}
