"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Save, Building2, GraduationCap, BookOpen, Loader2, CheckCircle2, Circle, Search, X, User, FileText } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { SearchableSelect } from "@/shared/components/ui/searchable-select"
import { toast } from "sonner"
import { cn } from "@/shared/utils/utils"
import type { TreeNode } from "@/types"
import type {
  CourseInfoData,
  CanvasElementData,
  ObjectiveCardData,
  ObjectiveSupportLabel,
  CoursePointCardData,
  ChapterCardData,
  CourseMatrixData,
  GraduationSupportData,
  KsaItemData,
  ProjectMatrixData,
} from "./canvas-elements/types"
import { CanvasComponentType } from "./canvas-elements/types"
import { CourseDetailApi, type SaveCourseUnitRequest } from "@/lib/api/course-detail-api"
import { api, type CourseGoal, type Project as ApiProject, type TaskGoalItem } from "@/lib/api"
import type { CoursePoint as ApiCoursePoint } from "@/lib/api/course-points-api"
import type { KsaListResponse, ProjectMatrixDataResponse, ProjectMatrixSaveItem } from "@/lib/api/matrix-api"
import { getCourseTypeId } from "@/shared/utils/data-transform"
import { findKsaByReference } from "@/shared/utils/ksa"
import { courseCanvasSyncApi, type CourseCanvasSyncEvent } from "@/lib/api/course-canvas-sync-api"
import { isCurrentUserCourseOwner, resolveCourseManagers } from "@/shared/utils/course-ownership"

// ============ 常量定义 ============
const DEFAULT_CLASS_ID = 1
const DEFAULT_COURSE_TYPE_ID = 1
const NEW_RECORD_ID = 0

const SAVE_STEP_ITEMS = [
  { key: "course", label: "正在更新课程基本信息" },
  { key: "objectives", label: "正在更新教学目标" },
  { key: "coursePoints", label: "正在更新课点" },
  { key: "ksa", label: "正在更新 KSA" },
  { key: "courseMatrix", label: "正在更新课程矩阵" },
  { key: "projectMatrix", label: "正在更新项目矩阵" },
] as const

type SaveStepKey = (typeof SAVE_STEP_ITEMS)[number]["key"]
type SaveStepStatus = "pending" | "in_progress" | "completed" | "failed"
type SaveStepState = Record<SaveStepKey, SaveStepStatus>
type SaveFlowStatus = "idle" | "saving" | "success" | "error"

function createInitialSaveStepState(): SaveStepState {
  return SAVE_STEP_ITEMS.reduce<SaveStepState>((accumulator, item) => {
    accumulator[item.key] = "pending"
    return accumulator
  }, {
    course: "pending",
    objectives: "pending",
    coursePoints: "pending",
    ksa: "pending",
    courseMatrix: "pending",
    projectMatrix: "pending",
  })
}

function resolveObjectiveSupportIndicatorId(
  support: ObjectiveSupportLabel,
): number | null {
  if (typeof support.indicatorId === "number" && Number.isFinite(support.indicatorId) && support.indicatorId > 0) {
    return support.indicatorId
  }

  return null
}

function isPlainStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function normalizeOptionalStringField(fieldName: string, value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  if (typeof value === "string") {
    return value
  }

  if (isPlainStringArray(value)) {
    return value.join("\n")
  }

  throw new Error(`课程字段 ${fieldName} 类型无效，期望 string`)
}

function normalizeNullableStringField(fieldName: string, value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null
  }

  if (typeof value === "string") {
    return value
  }

  if (isPlainStringArray(value)) {
    return value.join("\n")
  }

  throw new Error(`课程字段 ${fieldName} 类型无效，期望 string`)
}

function normalizeOptionalNumberField(fieldName: string, value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  throw new Error(`课程字段 ${fieldName} 类型无效，期望 number`)
}

function normalizeScoreTableField(value: unknown): SaveCourseUnitRequest["course"]["scoreTable"] {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("课程字段 scoreTable 类型无效，期望对象")
  }

  const candidate = value as { headers?: unknown; rows?: unknown }
  if (!Array.isArray(candidate.headers) || !candidate.headers.every((item) => typeof item === "string")) {
    throw new Error("课程字段 scoreTable.headers 类型无效，期望 string[]")
  }
  const headers = candidate.headers as string[]
  if (headers.some((header) => header.trim().length === 0)) {
    throw new Error("课程字段 scoreTable.headers 存在空表头，无法保存")
  }
  if (!Array.isArray(candidate.rows)) {
    throw new Error("课程字段 scoreTable.rows 类型无效，期望数组")
  }
  const rows = candidate.rows as unknown[]

  const normalizedRows = rows.map((row, rowIndex) => {
    if (Array.isArray(row)) {
      if (!row.every((cell) => typeof cell === "string")) {
        throw new Error(`课程字段 scoreTable.rows[${rowIndex}] 单元格类型无效，期望 string`)
      }
      if (row.length !== headers.length) {
        throw new Error(`课程字段 scoreTable.rows[${rowIndex}] 列数与表头不一致，无法保存`)
      }

      return headers.reduce<Record<string, string>>((accumulator, header, columnIndex) => {
        accumulator[header] = row[columnIndex]
        return accumulator
      }, {})
    }

    if (typeof row !== "object" || row === null) {
      throw new Error(`课程字段 scoreTable.rows[${rowIndex}] 类型无效，期望对象或字符串数组`)
    }

    Object.entries(row).forEach(([key, cellValue]) => {
      if (typeof key !== "string" || typeof cellValue !== "string") {
        throw new Error(`课程字段 scoreTable.rows[${rowIndex}] 单元格类型无效，期望 string`)
      }
    })

    return row as Record<string, string>
  })

  return {
    headers,
    rows: normalizedRows,
  }
}

function normalizePositiveNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : 0
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  }

  return 0
}

// ============ 类型定义 ============
/** 课程列表数据结构（API 响应） */
interface CourseItem {
  lang: number
  parent: { value: string; label: string } | null
  self: { value: string; label: string } | null
  manager: Array<{ value: string; label: string }> | null
  info: any
  cover: any
  btnMenus: any[]
  coverMenus: any[]
  metadata: Record<string, unknown> | null
}

function normalizeTreeCourseToCourseItem(course: TreeNode): CourseItem {
  return {
    lang: 80101,
    parent: course.parentId ? { value: String(course.parentId), label: "" } : null,
    self: {
      value: String(course.id ?? course.nodeId),
      label: course.name || course.nodeName,
    },
    manager: Array.isArray(course.manager)
      ? course.manager.map((item) => ({
          value: item.value,
          label: item.label,
        }))
      : null,
    info: null,
    cover: null,
    btnMenus: Array.isArray(course.btnMenus) ? course.btnMenus : [],
    coverMenus: Array.isArray(course.coverMenus) ? course.coverMenus : [],
    metadata: course.metadata || null,
  }
}

/** 课程矩阵保存数据项 */
interface CourseMatrixPayloadItem {
  project: {
    id: number
    uniqueCode: string
    courseUnitId: number
    name: string
    product: string
    theoryPeriod: string
    practicePeriod: string
    indexNo: number
  }
  data: Array<{
    id: number
    courseUnitId: number
    projectId: number
    graduateRequireId: number
    point: { id: number; title: string; description: string }
    relate: { name: string; code: string; relate: number }
    study: string
    teach: string
    product: string
    week: string
    period: string
  }>
}

interface MatrixCoursePointResolution {
  currentPoint: CoursePointCardData
  latestPoint: CoursePointCardData
}

type ProjectMatrixResponseData = NonNullable<ProjectMatrixDataResponse["data"]>
type ProjectMatrixResponseProject = ProjectMatrixResponseData["projects"][number]
type ProjectMatrixResponseRow = NonNullable<ProjectMatrixResponseData["data"]>[number]

/**
 * 保存向导组件的Props接口
 */
export interface CanvasSaveWizardProps {
  /** 对话框是否打开 */
  open: boolean
  /** 对话框状态变化回调 */
  onOpenChange: (open: boolean) => void
  /** 课程基本信息数据 */
  courseInfo: CourseInfoData | null
  /** 画布元素数据（用于提取完整课程数据） */
  canvasElements: CanvasElementData[]
  /** 画布内容的OSS Key */
  canvasOssKey: string | null
  /** 树形结构数据（用于选择学校/院系/专业） */
  treeData: TreeNode | null
  /** 保存成功回调 */
  onSaveSuccess?: (majorId: string, courseId: string) => void
  /** 更新课程信息回调（用于保存后更新画布中的 courseId） */
  onUpdateCourseInfo?: (updates: {
    courseId?: number
    majorId?: number
    objectives?: ObjectiveCardData[]
    coursePoints?: CoursePointCardData[]
    chapters?: ChapterCardData[]
    ksaItems?: KsaItemData[]
  }) => void
  /** 导出 Word 回调（仅在更新成功后可用） */
  onExportWord?: () => void
  /** 是否正在导出 Word */
  isExportingWord?: boolean
  /** 是否允许导出 Word */
  canExportWord?: boolean
  /** 导出 Word 不可用原因 */
  exportWordDisabledReason?: string
  /** 强制上传最新画布并返回最新 ossKey */
  onEnsureLatestCanvasOssKey?: () => Promise<string | null>
}

/**
 * 选中的路径信息
 */
interface SelectedPath {
  universityId: string | null
  universityName: string | null
  departmentId: string | null
  departmentName: string | null
  majorId: string | null
  majorName: string | null
}

/** MajorSelector 子组件 Props */
interface MajorSelectorProps {
  treeData: TreeNode | null
  selectedPath: SelectedPath
  onPathChange: (path: SelectedPath | ((prev: SelectedPath) => SelectedPath)) => void
  onMajorSelected: (majorId: string) => void
  disabled?: boolean
}

/** CoursePicker 子组件 Props */
interface CoursePickerProps {
  courses: CourseItem[]
  isLoading: boolean
  selectedCourseId: string | null
  onSelectCourse: (courseId: string) => void
  searchTerm: string
  onSearchChange: (term: string) => void
  majorId: string | null
}

/**
 * 从 nodeId 中提取数字ID
 * 例如 "dept_266" -> "266"
 */
function extractNumericId(nodeId: string): string {
  const match = nodeId.match(/\d+/)
  return match ? match[0] : nodeId
}

/**
 * 从 treeData 中根据 majorId 查找对应的学校/院系/专业路径
 * 返回完整的 SelectedPath 或 null（如果未找到）
 */
function findMajorPathInTree(
  treeData: TreeNode | null,
  majorId: number
): SelectedPath | null {
  if (!treeData?.children) return null

  for (const university of treeData.children) {
    if (university.nodeType !== "university" || !university.children) continue

    for (const department of university.children) {
      if (department.nodeType !== "department" || !department.children) continue

      for (const major of department.children) {
        if (major.nodeType !== "major") continue

        // 从 nodeId 中提取数字ID进行比较
        const majorNumericId = extractNumericId(major.nodeId)
        if (majorNumericId === String(majorId)) {
          return {
            universityId: university.nodeId,
            universityName: university.nodeName,
            departmentId: department.nodeId,
            departmentName: department.nodeName,
            majorId: major.nodeId,
            majorName: major.nodeName,
          }
        }
      }
    }
  }

  return null
}

function findPathByOrganization(
  treeData: TreeNode | null,
  organization: {
    universityId?: number | string
    departmentId?: number | string
    majorId?: number | string
  }
): SelectedPath | null {
  if (!treeData?.children) return null
  if (!organization.majorId) return null

  for (const university of treeData.children) {
    if (university.nodeType !== "university" || !university.children) continue
    if (organization.universityId && extractNumericId(university.nodeId) !== String(organization.universityId)) continue

    for (const department of university.children) {
      if (department.nodeType !== "department" || !department.children) continue
      if (organization.departmentId && extractNumericId(department.nodeId) !== String(organization.departmentId)) continue

      for (const major of department.children) {
        if (major.nodeType !== "major") continue
        if (extractNumericId(major.nodeId) !== String(organization.majorId)) continue

        return {
          universityId: university.nodeId,
          universityName: university.nodeName,
          departmentId: department.nodeId,
          departmentName: department.nodeName,
          majorId: major.nodeId,
          majorName: major.nodeName,
        }
      }
    }
  }

  return null
}

function normalizeProjectMatrixResponseData(
  responseData: ProjectMatrixDataResponse | ProjectMatrixResponseData | null | undefined
): ProjectMatrixResponseData | null {
  if (!responseData) {
    return null
  }

  const candidate = responseData as ProjectMatrixDataResponse & {
    projects?: ProjectMatrixResponseData["projects"]
    data?: ProjectMatrixResponseData["data"] | ProjectMatrixResponseData
  }

  if (Array.isArray(candidate.projects)) {
    return candidate as unknown as ProjectMatrixResponseData
  }

  const nestedData = candidate.data as ProjectMatrixResponseData | undefined
  if (nestedData && Array.isArray(nestedData.projects)) {
    return nestedData
  }

  return null
}

function mapCanvasSyncStepToSaveStep(step: string): SaveStepKey | null {
  switch (step) {
    case "snapshot":
    case "validate":
    case "course":
    case "graduation_support":
      return "course"
    case "objectives":
      return "objectives"
    case "chapters":
      return "projectMatrix"
    case "course_points":
      return "coursePoints"
    case "ksa":
      return "ksa"
    case "course_matrix":
      return "courseMatrix"
    case "task_goals":
    case "project_matrix":
      return "projectMatrix"
    default:
      return null
  }
}

function getSaveStepDisplayLabel(itemLabel: string, status: SaveStepStatus): string {
  if (status === "completed") {
    return itemLabel.replace("正在", "已")
  }

  if (status === "failed") {
    return itemLabel.replace("正在", "更新") + "失败"
  }

  return itemLabel
}

/**
 * 专业选择器子组件
 * 提供学校/院系/专业三级联动选择
 */
function MajorSelector({
  treeData,
  selectedPath,
  onPathChange,
  onMajorSelected,
  disabled = false,
}: MajorSelectorProps) {
  // 获取学校列表（树的一级节点）
  const universities = useMemo(() => {
    if (!treeData?.children) return []
    return treeData.children.filter(node => node.nodeType === "university")
  }, [treeData])

  // 获取当前选中学校下的院系列表
  const departments = useMemo(() => {
    if (!selectedPath.universityId || !treeData?.children) return []
    const university = treeData.children.find(
      node => node.nodeId === selectedPath.universityId
    )
    if (!university?.children) return []
    return university.children.filter(node => node.nodeType === "department")
  }, [treeData, selectedPath.universityId])

  // 获取当前选中院系下的专业列表
  const majors = useMemo(() => {
    if (!selectedPath.universityId || !selectedPath.departmentId || !treeData?.children) return []
    const university = treeData.children.find(
      node => node.nodeId === selectedPath.universityId
    )
    if (!university?.children) return []
    const department = university.children.find(
      node => node.nodeId === selectedPath.departmentId
    )
    if (!department?.children) return []
    return department.children.filter(node => node.nodeType === "major")
  }, [treeData, selectedPath.universityId, selectedPath.departmentId])

  // 处理学校选择变化
  const handleUniversityChange = useCallback((nodeId: string) => {
    const university = universities.find(u => u.nodeId === nodeId)
    onPathChange({
      universityId: nodeId,
      universityName: university?.nodeName || null,
      departmentId: null,
      departmentName: null,
      majorId: null,
      majorName: null,
    })
  }, [universities, onPathChange])

  // 处理院系选择变化
  const handleDepartmentChange = useCallback((nodeId: string) => {
    const department = departments.find(d => d.nodeId === nodeId)
    onPathChange(prev => ({
      ...prev,
      departmentId: nodeId,
      departmentName: department?.nodeName || null,
      majorId: null,
      majorName: null,
    }))
  }, [departments, onPathChange])

  // 处理专业选择变化
  const handleMajorChange = useCallback((nodeId: string) => {
    const major = majors.find(m => m.nodeId === nodeId)
    onPathChange(prev => ({
      ...prev,
      majorId: nodeId,
      majorName: major?.nodeName || null,
    }))
    onMajorSelected(nodeId)
  }, [majors, onPathChange, onMajorSelected])

  return (
    <div className="flex items-end gap-4 pt-3">
      {/* 学校选择 */}
      <div className="flex-1 min-w-0">
        <Label className="flex items-center gap-1.5 text-sm font-medium mb-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          学校
        </Label>
        <SearchableSelect
          value={selectedPath.universityId || ""}
          onValueChange={handleUniversityChange}
          disabled={disabled}
          placeholder="请选择学校"
          searchPlaceholder="搜索学校..."
          emptyText={universities.length === 0 ? "暂无可选学校" : "无匹配结果"}
          options={universities.map(uni => ({
            value: uni.nodeId,
            label: uni.nodeName,
          }))}
        />
      </div>

      {/* 院系选择 */}
      <div className="flex-1 min-w-0">
        <Label className="flex items-center gap-1.5 text-sm font-medium mb-2">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          院系
        </Label>
        <SearchableSelect
          value={selectedPath.departmentId || ""}
          onValueChange={handleDepartmentChange}
          disabled={disabled || !selectedPath.universityId}
          placeholder={selectedPath.universityId ? "请选择院系" : "请先选择学校"}
          searchPlaceholder="搜索院系..."
          emptyText={
            departments.length === 0
              ? (selectedPath.universityId ? "该学校暂无院系" : "请先选择学校")
              : "无匹配结果"
          }
          options={departments.map(dept => ({
            value: dept.nodeId,
            label: dept.nodeName,
          }))}
        />
      </div>

      {/* 专业选择 */}
      <div className="flex-1 min-w-0">
        <Label className="flex items-center gap-1.5 text-sm font-medium mb-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          专业
        </Label>
        <SearchableSelect
          value={selectedPath.majorId || ""}
          onValueChange={handleMajorChange}
          disabled={disabled || !selectedPath.departmentId}
          placeholder={selectedPath.departmentId ? "请选择专业" : "请先选择院系"}
          searchPlaceholder="搜索专业..."
          emptyText={
            majors.length === 0
              ? (selectedPath.departmentId ? "该院系暂无专业" : "请先选择院系")
              : "无匹配结果"
          }
          options={majors.map(major => ({
            value: major.nodeId,
            label: major.nodeName,
          }))}
        />
      </div>
    </div>
  )
}

/**
 * 课程选择器子组件
 * 展示专业下的课程列表，支持单选
 */
function CoursePicker({
  courses,
  isLoading,
  selectedCourseId,
  onSelectCourse,
  searchTerm,
  onSearchChange,
  majorId,
}: CoursePickerProps) {
  // 获取课程ID
  const getCourseId = (course: CourseItem) => course.self?.value || ""

  // 获取课程名称
  const getCourseName = (course: CourseItem) => course.self?.label || ""

  // 获取讲师数组
  const getInstructors = (course: CourseItem) => {
    const managers = resolveCourseManagers({
      id: getCourseId(course),
      manager: course.manager,
      metadata: course.metadata,
    })
    const instructors = managers.map((m) => m.label).filter(Boolean)
    return instructors.length > 0 ? instructors : ["未设置"]
  }

  // 判断讲师是否已设置
  const isInstructorSet = (course: CourseItem) => {
    const managers = resolveCourseManagers({
      id: getCourseId(course),
      manager: course.manager,
      metadata: course.metadata,
    })
    return managers.length > 0
  }

  // 筛选"我的课程"：只显示当前用户是负责人的课程
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const courseName = getCourseName(course)
      const matchesSearch = !searchTerm || courseName.toLowerCase().includes(searchTerm.toLowerCase())
      const isMyCourseCourse = isCurrentUserCourseOwner({
        id: getCourseId(course),
        manager: course.manager,
        metadata: course.metadata,
      })
      // 必须是"我的课程"且匹配搜索条件
      return isMyCourseCourse && matchesSearch
    })
  }, [courses, searchTerm])

  // 处理课程点击（直接选择进入下一步）
  const handleCourseClick = useCallback((courseId: string) => {
    onSelectCourse(courseId)
  }, [onSelectCourse])

  // 未选择专业时的占位状态
  if (!majorId) {
    return (
      <div className="h-[180px] flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/5">
        <div className="flex flex-col items-center gap-3 text-center px-8">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
            <FileText className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-base font-medium text-muted-foreground/70">请先选择专业</p>
            <p className="text-sm text-muted-foreground/50 mt-1">选择专业后将加载您负责的课程列表</p>
          </div>
        </div>
      </div>
    )
  }

  // 正在加载课程
  if (isLoading) {
    return (
      <div className="h-[180px] flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/20 bg-primary/5">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-base font-medium text-primary/80">正在加载课程列表</p>
        </div>
      </div>
    )
  }

  // 无我的课程
  if (filteredCourses.length === 0) {
    return (
      <div className="h-[180px] flex flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50/50">
        <div className="flex flex-col items-center gap-2 text-center px-8">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <FileText className="h-6 w-6 text-amber-600" />
          </div>
          <p className="text-sm text-amber-700">
            {courses.length === 0
              ? "该专业暂无课程"
              : "您在该专业下暂无负责的课程"
            }
          </p>
        </div>
      </div>
    )
  }

  // 正常渲染课程列表
  return (
    <div className="space-y-3 px-1">
      {/* 搜索框 */}
      <div className="relative w-1/2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜索课程名称..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-9 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="清空搜索"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 课程列表 */}
      <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-auto">
        {filteredCourses.map((course) => {
          const courseId = getCourseId(course)

          return (
            <button
              key={courseId}
              onClick={() => handleCourseClick(courseId)}
              className={cn(
                "relative flex flex-col p-3 rounded-lg border transition-all duration-200",
                selectedCourseId === courseId
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                  : "border-border bg-background",
                "hover:shadow-md hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              {/* 课程名称 */}
              <div className="font-medium text-sm text-foreground text-left line-clamp-1">
                {getCourseName(course)}
              </div>

              {/* 讲师信息 */}
              <div className="flex flex-wrap gap-1 mt-2">
                {getInstructors(course).slice(0, 2).map((instructor, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs",
                      isInstructorSet(course)
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <User className="w-3 h-3" />
                    <span>{instructor}</span>
                  </div>
                ))}
                {getInstructors(course).length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{getInstructors(course).length - 2}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* 提示文字 */}
      <p className="text-xs text-muted-foreground">
        共 {filteredCourses.length} 门课程
      </p>
    </div>
  )
}

/**
 * 保存向导组件
 * 用于将画布中的课程数据更新到系统中已存在的占位课程
 */
export function CanvasSaveWizard({
  open,
  onOpenChange,
  courseInfo,
  canvasOssKey = null,
  canvasElements,
  treeData,
  onSaveSuccess,
  onUpdateCourseInfo,
  onExportWord,
  isExportingWord = false,
  canExportWord = false,
  exportWordDisabledReason,
  onEnsureLatestCanvasOssKey,
}: CanvasSaveWizardProps) {
  // 选中的路径状态
  const [selectedPath, setSelectedPath] = useState<SelectedPath>({
    universityId: null,
    universityName: null,
    departmentId: null,
    departmentName: null,
    majorId: null,
    majorName: null,
  })

  // 课程列表状态
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [courseSearchTerm, setCourseSearchTerm] = useState("")

  // 选中课程的名称（用于显示）
  const [selectedCourseName, setSelectedCourseName] = useState<string>("")

  // 保存状态
  const [saveFlowStatus, setSaveFlowStatus] = useState<SaveFlowStatus>("idle")
  const [saveStepState, setSaveStepState] = useState<SaveStepState>(() => createInitialSaveStepState())
  const [saveStepMessage, setSaveStepMessage] = useState<string>("")
  const [saveErrorMessage, setSaveErrorMessage] = useState<string>("")

  const isSaving = saveFlowStatus === "saving"
  const saveSuccess = saveFlowStatus === "success"
  const hasSaveError = saveFlowStatus === "error"

  // [MOD] 合并画布元素提取逻辑，统一作为保存数据源
  const { objectives, coursePoints, chapters, ksaItems, courseMatrixData, projectMatrices, graduationSupportData } = useMemo(() => {
    const result = {
      objectives: [] as ObjectiveCardData[],
      coursePoints: [] as CoursePointCardData[],
      chapters: [] as ChapterCardData[],
      ksaItems: [] as KsaItemData[],
      courseMatrixData: undefined as CourseMatrixData | undefined,
      projectMatrices: [] as ProjectMatrixData[],
      graduationSupportData: undefined as GraduationSupportData | undefined,
    }

    for (const el of canvasElements) {
      switch (el.type) {
        case CanvasComponentType.OBJECTIVE_CARD:
          result.objectives.push(el.data as ObjectiveCardData)
          break
        case CanvasComponentType.COURSE_POINT_CARD:
          result.coursePoints.push(el.data as CoursePointCardData)
          break
        case CanvasComponentType.CHAPTER_CARD:
          result.chapters.push(el.data as ChapterCardData)
          break
        case CanvasComponentType.KSA_ITEM:
          result.ksaItems.push(el.data as KsaItemData)
          break
        case CanvasComponentType.COURSE_MATRIX:
          result.courseMatrixData = el.data as CourseMatrixData
          break
        case CanvasComponentType.PROJECT_MATRIX:
          result.projectMatrices.push(el.data as ProjectMatrixData)
          break
        case CanvasComponentType.GRADUATION_SUPPORT:
          result.graduationSupportData = el.data as GraduationSupportData
          break
      }
    }

    result.objectives.sort((a, b) => a.index - b.index)
    result.coursePoints.sort((a, b) => a.index - b.index)
    result.chapters.sort((a, b) => a.index - b.index)
    result.ksaItems.sort((a, b) => {
      if (a.category === b.category) {
        return a.index - b.index
      }
      return a.category.localeCompare(b.category)
    })
    result.projectMatrices.sort((a, b) => a.chapter_index - b.chapter_index)

    return result
  }, [canvasElements])

  const savedCourseId = courseInfo?.metadata?.courseId
  const savedMajorId = courseInfo?.metadata?.majorId
  const hasCurrentCourseContext = typeof savedCourseId === "number" && Number.isFinite(savedCourseId) && savedCourseId > 0
  const lockedOrganizationPath = useMemo(() => {
    if (!treeData) return null

    if (typeof savedMajorId === "number" && Number.isFinite(savedMajorId) && savedMajorId > 0) {
      const pathFromCourseInfo = findMajorPathInTree(treeData, savedMajorId)
      if (pathFromCourseInfo) {
        return pathFromCourseInfo
      }
    }

    if (!graduationSupportData) {
      return null
    }

    return findPathByOrganization(treeData, {
      universityId: graduationSupportData.universityId,
      departmentId: graduationSupportData.departmentId,
      majorId: graduationSupportData.majorId,
    })
  }, [graduationSupportData, savedMajorId, treeData])

  const shouldLockOrganizationSelection = lockedOrganizationPath !== null
  const shouldRequireCourseSelection = !hasCurrentCourseContext

  // 加载专业课程列表
  const loadCourses = useCallback(async (majorId: string) => {
    setIsLoadingCourses(true)
    if (!hasCurrentCourseContext) {
      setSelectedCourseId(null)
      setSelectedCourseName("")
    }
    setCourseSearchTerm("")
    try {
      const response = await api.tree.getMajorCourses(majorId)
      if (response.error) {
        throw new Error(response.error)
      }

      const normalizedCourses = Array.isArray(response.data)
        ? response.data.map(normalizeTreeCourseToCourseItem)
        : []

      setCourses(normalizedCourses)
    } catch (error) {
      console.error("[CanvasSaveWizard] 获取课程列表失败:", error)
      setCourses([])
      toast.error(error instanceof Error ? error.message : "获取课程列表失败")
    } finally {
      setIsLoadingCourses(false)
    }
  }, [hasCurrentCourseContext])

  // 处理课程选择
  const handleCourseSelect = useCallback((courseId: string | null) => {
    if (courseId && selectedPath.majorId) {
      const selectedCourse = courses.find(c => c.self?.value === courseId)
      setSelectedCourseName(selectedCourse?.self?.label || "")
      setSelectedCourseId(courseId)
    }
  }, [selectedPath.majorId, courses])

  // 选择专业后加载课程列表
  const handleMajorSelected = useCallback((majorId: string) => {
    loadCourses(majorId)
  }, [loadCourses])

  // 对话框打开/关闭时的状态处理
  useEffect(() => {
    if (!open) {
      // 关闭时重置状态
      setSaveFlowStatus("idle")
      setSaveStepState(createInitialSaveStepState())
      setSaveStepMessage("")
      setSaveErrorMessage("")
      // 重置课程相关状态
      setCourses([])
      setSelectedCourseId(null)
      setSelectedCourseName("")
      setCourseSearchTerm("")
      // 重置三个下拉框的选择状态
      setSelectedPath({
        universityId: null,
        universityName: null,
        departmentId: null,
        departmentName: null,
        majorId: null,
        majorName: null,
      })
    } else {
      if (lockedOrganizationPath) {
        setSelectedPath(lockedOrganizationPath)
        if (lockedOrganizationPath.majorId) {
          loadCourses(lockedOrganizationPath.majorId)
        }
      }
    }
  }, [open, loadCourses, lockedOrganizationPath])

  // 打开时若已有 courseId，则自动选中对应课程
  useEffect(() => {
    if (
      open &&
      savedCourseId &&
      courses.length > 0 &&
      !selectedCourseId
    ) {
      const savedCourseIdStr = String(savedCourseId)
      const matchedCourse = courses.find(c => c.self?.value === savedCourseIdStr)
      if (matchedCourse) {
        setSelectedCourseName(matchedCourse.self?.label || "")
        setSelectedCourseId(savedCourseIdStr)
      }
    }
  }, [open, savedCourseId, courses, selectedCourseId])

  const markSaveStep = useCallback((step: SaveStepKey, status: SaveStepStatus, message: string) => {
    setSaveStepState((prev) => ({
      ...prev,
      [step]: status,
    }))
    setSaveStepMessage(message)
  }, [])

  const markSaveStepFailure = useCallback((step: SaveStepKey | null, message: string) => {
    setSaveStepState((prev) => {
      const targetStep = step !== null
        ? step
        : SAVE_STEP_ITEMS.find((item) => prev[item.key] === "in_progress")?.key

      if (!targetStep) {
        return prev
      }

      return {
        ...prev,
        [targetStep]: "failed",
      }
    })
    setSaveStepMessage(message)
    setSaveErrorMessage(message)
  }, [])

  const buildObjectiveGroupsForApi = useCallback((): CourseGoal[] => {
    if (!graduationSupportData?.requirements || objectives.length === 0) {
      throw new Error("画布中缺少毕业要求支撑关系，无法更新课程")
    }

    const objectiveWithoutSupports = objectives.find((objective) => !objective.supports || objective.supports.length === 0)
    if (objectiveWithoutSupports) {
      throw new Error(`教学目标 ${objectiveWithoutSupports.index} 缺少毕业要求关联关系，无法更新课程`)
    }

    const groupedGoals = new Map<number, CourseGoal>()

    objectives.forEach((objective) => {
      const objectiveSupports = objective.supports
      if (!objectiveSupports || objectiveSupports.length === 0) {
        throw new Error(`教学目标 ${objective.index} 缺少毕业要求关联关系，无法更新课程`)
      }

      objectiveSupports.forEach((support) => {
        const indicatorId = resolveObjectiveSupportIndicatorId(support)
        if (!indicatorId) {
          throw new Error(`教学目标 ${objective.index} 的支撑关系缺少有效的指标点 ID`)
        }

        const existingGroup = groupedGoals.get(indicatorId)
        const childGoal: CourseGoal = {
          id: objective.originalId ?? 0,
          description: objective.content,
          children: null,
        }

        if (existingGroup) {
          const dedupeKey = objective.originalId != null ? `db:${objective.originalId}` : `canvas:${objective.id}`
          const hasExistingChild = existingGroup.children?.some((child) => {
            const childKey = child.id > 0 ? `db:${child.id}` : `canvas:${child.description}`
            return childKey === dedupeKey || child.description === objective.content
          })
          if (!hasExistingChild) {
            existingGroup.children = [...(existingGroup.children || []), childGoal]
          }
          return
        }

        groupedGoals.set(indicatorId, {
          id: indicatorId,
          description: support.desc || support.title,
          children: [childGoal],
        })
      })
    })

    const groupedGoalList = Array.from(groupedGoals.values())
    if (groupedGoalList.length === 0) {
      throw new Error("画布中未找到教学目标与毕业要求指标点的关联关系")
    }

    return groupedGoalList
  }, [graduationSupportData, objectives])

  const syncObjectiveOriginalIds = useCallback((latestGoals: CourseGoal[]): ObjectiveCardData[] => {
    if (!graduationSupportData?.requirements) {
      return objectives
    }

    const matchedChildIds = new Set<number>()

    return objectives.map((objective) => {
      if (objective.originalId != null) {
        return objective
      }

      const supports = objective.supports || []
      const matchingIndicatorIds = supports
        .map((support) => resolveObjectiveSupportIndicatorId(support))
        .filter((indicatorId): indicatorId is number => typeof indicatorId === "number")

      for (const goal of latestGoals) {
        if (!matchingIndicatorIds.includes(goal.id)) {
          continue
        }

        const matchedChild = (goal.children || []).find((child) => {
          if (matchedChildIds.has(child.id)) {
            return false
          }
          return child.description.trim() === objective.content.trim()
        })

        if (matchedChild) {
          matchedChildIds.add(matchedChild.id)
          return {
            ...objective,
            originalId: matchedChild.id,
          }
        }
      }

      return objective
    })
  }, [graduationSupportData, objectives])

  const syncCoursePointOriginalIds = useCallback((latestPoints: ApiCoursePoint[] | null | undefined): CoursePointCardData[] => {
    const availablePoints = Array.isArray(latestPoints) ? [...latestPoints] : []
    return coursePoints.map((point) => {
      const matchedIndex = availablePoints.findIndex((item) => (
        item.title.trim() === point.name.trim() && item.description.trim() === (point.description || "").trim()
      ))
      if (matchedIndex === -1) {
        return point
      }

      const matchedPoint = availablePoints.splice(matchedIndex, 1)[0]
      if (!matchedPoint) {
        return point
      }

      return {
        ...point,
        originalId: matchedPoint.id,
      }
    })
  }, [coursePoints])

  const syncKsaOriginalIds = useCallback((latestKsas: KsaListResponse | null | undefined): KsaItemData[] => {
    const availableKsas = Array.isArray(latestKsas?.data) ? [...latestKsas.data] : []
    return ksaItems.map((item) => {
      if (item.originalId != null) {
        return item
      }

      const matchedIndex = availableKsas.findIndex((ksa) => (
        ksa.title === item.category && ksa.description.trim() === item.content.trim()
      ))
      if (matchedIndex === -1) {
        return item
      }

      const matchedKsa = availableKsas.splice(matchedIndex, 1)[0]
      if (!matchedKsa) {
        return item
      }

      return {
        ...item,
        originalId: matchedKsa.id,
      }
    })
  }, [ksaItems])

  const syncChapterOriginalIds = useCallback((latestProjects: ApiProject[] | null | undefined): ChapterCardData[] => {
    const availableProjects = Array.isArray(latestProjects) ? [...latestProjects] : []

    return chapters.map((chapter, index) => {
      const currentOriginalId = typeof chapter.originalId === "number" ? chapter.originalId : null
      if (currentOriginalId !== null && currentOriginalId > 0) {
        return chapter
      }

      const matchedIndex = availableProjects.findIndex((project) => {
        const projectName = typeof project.name === "string" ? project.name.trim() : ""
        const projectIndex = normalizePositiveNumber(project.indexNo)
        return projectName === chapter.name.trim() && projectIndex === index + 1
      })

      if (matchedIndex === -1) {
        return chapter
      }

      const matchedProject = availableProjects.splice(matchedIndex, 1)[0]
      const matchedProjectId = normalizePositiveNumber(matchedProject?.id)
      if (matchedProjectId <= 0) {
        return chapter
      }

      return {
        ...chapter,
        originalId: matchedProjectId,
      }
    })
  }, [chapters])

  const buildObjectiveDeleteIds = useCallback((serverGoals: CourseGoal[]): number[] => {
    const currentObjectiveIds = new Set(
      objectives
        .map((objective) => objective.originalId)
        .filter((objectiveId): objectiveId is number => typeof objectiveId === "number")
    )

    return serverGoals.flatMap((goal) => {
      const children = Array.isArray(goal.children) ? goal.children : []
      return children
        .map((child) => child.id)
        .filter((childId) => typeof childId === "number" && !currentObjectiveIds.has(childId))
    })
  }, [objectives])

  // [MOD] 拆分 handleSave 为多个子函数，提高可读性和可维护性

  // 验证保存前置条件
  const validateBeforeSave = useCallback((): boolean => {
    if (!selectedPath.majorId || !courseInfo) {
      toast.error("未识别到当前画布对应的专业，无法更新课程")
      return false
    }
    if (shouldRequireCourseSelection && !selectedCourseId) {
      toast.error("请选择要更新的课程")
      return false
    }
    if (objectives.length === 0) {
      toast.error("请先在画布中补充教学目标")
      return false
    }
    const objectiveWithoutSupports = objectives.find((objective) => !objective.supports || objective.supports.length === 0)
    if (objectiveWithoutSupports) {
      toast.error(`教学目标 ${objectiveWithoutSupports.index} 缺少毕业要求关联关系`)
      return false
    }
    return true
  }, [selectedPath.majorId, courseInfo, shouldRequireCourseSelection, selectedCourseId, objectives])

  // 获取最终更新的课程ID
  const getSelectedCourseId = useCallback((majorIdNum: number): number => {
    if (hasCurrentCourseContext) {
      console.log("[CanvasSaveWizard] 使用当前画布绑定的课程ID:", savedCourseId)
      onUpdateCourseInfo?.({ courseId: savedCourseId, majorId: majorIdNum })
      return savedCourseId
    }

    if (!selectedCourseId) {
      throw new Error("请先选择要更新的课程")
    }
    const courseIdNum = parseInt(selectedCourseId, 10)
    if (isNaN(courseIdNum)) {
      throw new Error("课程ID无效")
    }
    console.log("[CanvasSaveWizard] 使用选中的课程ID:", courseIdNum)
    onUpdateCourseInfo?.({ courseId: courseIdNum, majorId: majorIdNum })
    return courseIdNum
  }, [hasCurrentCourseContext, savedCourseId, selectedCourseId, onUpdateCourseInfo])

  const buildCourseUnitSaveRequest = useCallback((
    courseId: number,
    majorIdNum: number,
    chapterPayload: SaveCourseUnitRequest["course"]["courseMatrixVOS"]
  ): SaveCourseUnitRequest => {
    const metadata = courseInfo?.metadata || {}
    const resolvedClassId = getCourseTypeId(metadata.courseType)
    const normalizedIntroduction = normalizeNullableStringField("introduction", metadata.introduction)
    const normalizedTeachingClass = normalizeOptionalStringField("teachingClass", metadata.teachingClass)
    const normalizedTeachingLocation = normalizeOptionalStringField("teachingLocation", metadata.teachingLocation)
    const normalizedTeachingTime = normalizeOptionalStringField("teachingTime", metadata.teachingTime)
    const normalizedMainTextbook = normalizeOptionalStringField("mainTextbook", metadata.mainTextbook)
    const normalizedReferenceResources = normalizeOptionalStringField("referenceResources", metadata.referenceResources)
    const normalizedAttendancePolicy = normalizeOptionalStringField("attendancePolicy", metadata.attendancePolicy)
    const normalizedAssignmentPolicy = normalizeOptionalStringField("assignmentPolicy", metadata.assignmentPolicy)
    const normalizedConductRequirements = normalizeOptionalStringField("conductRequirements", metadata.conductRequirements)
    const normalizedPracticeRequirements = normalizeOptionalStringField("practiceRequirements", metadata.practiceRequirements)
    const normalizedTeamworkRequirements = normalizeOptionalStringField("teamworkRequirements", metadata.teamworkRequirements)
    const normalizedBonusRequirements = normalizeOptionalStringField("bonusRequirements", metadata.bonusRequirements)
    const normalizedOtherSuggestions = normalizeOptionalStringField("otherSuggestions", metadata.otherSuggestions)
    const normalizedAssessmentMethod = normalizeOptionalStringField("assessmentMethod", metadata.assessmentMethod)
    const normalizedAssessmentForm = normalizeOptionalStringField("assessmentForm", metadata.assessmentForm)
    const normalizedScoreType = normalizeOptionalStringField("scoreType", metadata.scoreType)
    const normalizedAssessmentDescription = normalizeOptionalStringField("assessmentDescription", metadata.assessmentDescription)
    const normalizedStudentCount = normalizeOptionalNumberField("studentCount", metadata.studentCount)
    const normalizedCredits = normalizeOptionalNumberField("credits", metadata.credits)
    const normalizedScoreTable = normalizeScoreTableField(metadata.scoreTable)

    return {
      course: {
        id: courseId,
        majorId: majorIdNum,
        classId: resolvedClassId ?? DEFAULT_CLASS_ID,
        typeId: metadata.courseNatureId ?? DEFAULT_COURSE_TYPE_ID,
        name: courseInfo?.name || "未命名课程",
        introduction: normalizedIntroduction,
        criterion: null,
        theoryPeriod: metadata.theoryPeriod || 0,
        practicePeriod: metadata.practicePeriod || 0,
        courseMatrixVOS: chapterPayload,
        position: null,
        teachingClass: normalizedTeachingClass,
        teachingLocation: normalizedTeachingLocation,
        teachingTime: normalizedTeachingTime,
        studentCount: normalizedStudentCount,
        credits: normalizedCredits,
        mainTextbook: normalizedMainTextbook,
        referenceResources: normalizedReferenceResources,
        attendancePolicy: normalizedAttendancePolicy,
        assignmentPolicy: normalizedAssignmentPolicy,
        conductRequirements: normalizedConductRequirements,
        practiceRequirements: normalizedPracticeRequirements,
        teamworkRequirements: normalizedTeamworkRequirements,
        bonusRequirements: normalizedBonusRequirements,
        otherSuggestions: normalizedOtherSuggestions,
        assessmentMethod: normalizedAssessmentMethod,
        assessmentForm: normalizedAssessmentForm,
        scoreType: normalizedScoreType,
        scoreTable: normalizedScoreTable,
        assessmentDescription: normalizedAssessmentDescription,
      },
    }
  }, [courseInfo])

  // 保存课程单元基本信息
  const saveCourseUnit = useCallback(async (courseId: number, majorIdNum: number): Promise<void> => {
    const saveRequest = buildCourseUnitSaveRequest(courseId, majorIdNum, [])
    const apiInstance = new CourseDetailApi()
    const response = await apiInstance.saveCourseUnit(saveRequest)
    if (response.error) {
      throw new Error(response.error)
    }
  }, [buildCourseUnitSaveRequest])

  // 保存课点数据（覆盖式重建，确保课程矩阵使用最新课点ID）
  const saveCoursePoints = useCallback(async (courseId: number, majorId: number): Promise<CoursePointCardData[]> => {
    const payload = coursePoints.map((point) => ({
      id: NEW_RECORD_ID,
      title: typeof point.name === "string" ? point.name : "",
      description: typeof point.description === "string" ? point.description : "",
    }))

    const saveResponse = await api.coursePoints.saveCoursePoints(majorId, courseId, payload, true)
    if (saveResponse.error) {
      throw new Error(saveResponse.error)
    }

    const refreshedCoursePointsResponse = await api.coursePoints.getCoursePoints(majorId, courseId)
    if (refreshedCoursePointsResponse.error) {
      throw new Error(refreshedCoursePointsResponse.error)
    }

    const syncedCoursePoints = syncCoursePointOriginalIds(refreshedCoursePointsResponse.data)
    onUpdateCourseInfo?.({ courseId, majorId, coursePoints: syncedCoursePoints })
    console.log("[CanvasSaveWizard] 课点保存成功, 数量:", payload.length)
    return syncedCoursePoints
  }, [coursePoints, onUpdateCourseInfo, syncCoursePointOriginalIds])

  const saveKsaItems = useCallback(async (courseId: number, majorId: number): Promise<KsaItemData[]> => {
    const latestKsaResponse = await api.matrices.getKsaList(String(majorId), String(courseId))
    if (latestKsaResponse.error) {
      throw new Error(latestKsaResponse.error)
    }

    const serverKsas = Array.isArray(latestKsaResponse.data?.data) ? latestKsaResponse.data.data : []
    const currentOriginalIds = new Set(
      ksaItems
        .map((item) => item.originalId)
        .filter((itemId): itemId is number => typeof itemId === "number")
    )

    const payload = [
      ...ksaItems.map((item) => ({
        id: item.originalId ?? NEW_RECORD_ID,
        title: item.category,
        description: item.content,
        level: item.index,
      })),
      ...serverKsas
        .filter((item: KsaListResponse["data"][number]) => !currentOriginalIds.has(item.id))
        .map((item: KsaListResponse["data"][number]) => ({
          id: -Math.abs(item.id),
          title: item.title,
          description: item.description,
          level: item.level,
        })),
    ]

    if (payload.length > 0) {
      const saveResponse = await api.matrices.saveKsaList({
        majorId,
        courseId,
        ksas: payload,
        upload: false,
      })
      if (saveResponse.error) {
        throw new Error(saveResponse.error)
      }
    }

    const refreshedKsaResponse = await api.matrices.getKsaList(String(majorId), String(courseId))
    if (refreshedKsaResponse.error) {
      throw new Error(refreshedKsaResponse.error)
    }

    const syncedKsaItems = syncKsaOriginalIds(refreshedKsaResponse.data)
    onUpdateCourseInfo?.({ courseId, majorId, ksaItems: syncedKsaItems })
    console.log("[CanvasSaveWizard] KSA 保存成功, 数量:", payload.length)
    return syncedKsaItems
  }, [ksaItems, onUpdateCourseInfo, syncKsaOriginalIds])

  // [MOD] 构建课程矩阵的 project 数据
  const buildMatrixProject = useCallback((
    row: CourseMatrixData["rows"][number],
    courseId: number,
    serverProjects: ApiProject[]
  ) => {
    const chapterCard = chapters.find(ch => ch.id === row.chapter_id)
    const chapterOriginalId = typeof chapterCard?.originalId === "number" ? chapterCard.originalId : undefined
    const matchedServerProject = chapterOriginalId && chapterOriginalId > 0
      ? serverProjects.find((project) => normalizePositiveNumber(project.id) === chapterOriginalId)
      : serverProjects.find((project) => (
          normalizePositiveNumber(project.indexNo) === row.chapter_index
          && project.name === row.chapter_name
        )) ?? serverProjects.find((project) => project.name === row.chapter_name)

    const resolvedProjectId = chapterOriginalId && chapterOriginalId > 0
      ? chapterOriginalId
      : normalizePositiveNumber(matchedServerProject?.id)

    return {
      id: resolvedProjectId,
      uniqueCode: matchedServerProject?.uniqueCode ?? "",
      courseUnitId: courseId,
      name: row.chapter_name,
      product: matchedServerProject?.product ?? "",
      theoryPeriod: chapterCard?.theory_hours?.toString() || matchedServerProject?.theoryPeriod || "0",
      practicePeriod: chapterCard?.practice_hours?.toString() || matchedServerProject?.practicePeriod || "0",
      indexNo: row.chapter_index,
    }
  }, [chapters])

  // [MOD] 构建课程矩阵的 data 数组
  const buildMatrixDataItems = useCallback((
    row: CourseMatrixData["rows"][number],
    courseId: number,
    projectId: number,
    resolveMatrixCoursePoint: (matrixCoursePoint: CourseMatrixData["rows"][number]["supports"][number]["course_points"][number]) => MatrixCoursePointResolution | null
  ): CourseMatrixPayloadItem["data"] => {
    const items: CourseMatrixPayloadItem["data"] = []
    row.supports.forEach((support) => {
      // 从 courseMatrixData.objectives 或 support 自身查找 originalGraduateRequireId
      const objOriginalId = courseMatrixData?.objectives?.find(
        o => o.id === support.objective_id
      )?.originalId
      const graduateRequireId = support.originalGraduateRequireId ?? objOriginalId ?? 0

      support.course_points.forEach((cp) => {
        const resolvedCoursePoint = resolveMatrixCoursePoint(cp)
        if (!resolvedCoursePoint) {
          console.warn("[CanvasSaveWizard] skip unmapped course matrix point", {
            pointId: cp.id,
            pointName: cp.name,
          })
          return
        }

        const latestOriginalId = typeof resolvedCoursePoint.latestPoint.originalId === "number"
          ? resolvedCoursePoint.latestPoint.originalId
          : 0

        if (latestOriginalId <= 0) {
          throw new Error(`课点 ${resolvedCoursePoint.latestPoint.name} 缺少服务端ID，无法重建课程矩阵`)
        }

        items.push({
          id: NEW_RECORD_ID,
          courseUnitId: courseId,
          projectId,
          graduateRequireId,
          point: {
            id: latestOriginalId,
            title: resolvedCoursePoint.latestPoint.name,
            description: resolvedCoursePoint.latestPoint.description || "",
          },
          relate: {
            name: cp.level === "strong" ? "强支撑" : "弱支撑",
            code: cp.level === "strong" ? "primary" : "success",
            relate: cp.level === "strong" ? 0 : 1,
          },
          study: "",
          teach: "",
          product: "",
          week: "0",
          period: "0",
        })
      })
    })
    return items
  }, [courseMatrixData])

  // 保存课程矩阵数据（先清空服务端旧矩阵，再按画布最新状态重建）
  const saveCourseMatrix = useCallback(async (courseId: number, latestCoursePoints: CoursePointCardData[]): Promise<void> => {
    const serverProjectResponse = await api.projectTeachGoal.getProjectTeachGoal(String(courseId))
    if (serverProjectResponse.error || !serverProjectResponse.data) {
      throw new Error(serverProjectResponse.error || "获取当前课程项目列表失败，无法更新课程矩阵")
    }

    const serverProjects = Array.isArray(serverProjectResponse.data.projects) ? serverProjectResponse.data.projects : []

    const currentCoursePointsByCanvasId = new Map(coursePoints.map((point) => [point.id, point] as const))
    const currentCoursePointsByOriginalId = new Map(
      coursePoints
        .filter((point): point is CoursePointCardData & { originalId: number } => typeof point.originalId === "number" && point.originalId > 0)
        .map((point) => [point.originalId, point] as const)
    )
    const latestCoursePointsByCanvasId = new Map(latestCoursePoints.map((point) => [point.id, point] as const))

    const resolveMatrixCoursePoint = (
      matrixCoursePoint: CourseMatrixData["rows"][number]["supports"][number]["course_points"][number]
    ): MatrixCoursePointResolution | null => {
      const directCurrentPoint = currentCoursePointsByCanvasId.get(matrixCoursePoint.id)
      if (directCurrentPoint) {
        const latestPoint = latestCoursePointsByCanvasId.get(directCurrentPoint.id) ?? directCurrentPoint
        return { currentPoint: directCurrentPoint, latestPoint }
      }

      const matrixPointOriginalId = normalizePositiveNumber(matrixCoursePoint.id)
      if (matrixPointOriginalId > 0) {
        const currentPointByOriginalId = currentCoursePointsByOriginalId.get(matrixPointOriginalId)
        if (currentPointByOriginalId) {
          const latestPoint = latestCoursePointsByCanvasId.get(currentPointByOriginalId.id) ?? currentPointByOriginalId
          return { currentPoint: currentPointByOriginalId, latestPoint }
        }
      }

      const currentPointByContent = coursePoints.find((point) => (
        point.name.trim() === matrixCoursePoint.name.trim()
        && (point.description || "").trim() === (matrixCoursePoint.description || "").trim()
      ))
      if (!currentPointByContent) {
        return null
      }

      const latestPoint = latestCoursePointsByCanvasId.get(currentPointByContent.id) ?? currentPointByContent
      return { currentPoint: currentPointByContent, latestPoint }
    }

    const clearCourseMatrixResponse = await api.matrices.clearCourseMatrix(String(courseId))
    if (clearCourseMatrixResponse.error) {
      throw new Error(clearCourseMatrixResponse.error)
    }

    const matrixRows = courseMatrixData?.rows || []
    if (matrixRows.length === 0) {
      console.log("[CanvasSaveWizard] course matrix cleared, no rebuild needed")
      return
    }

    const rebuildPayload = matrixRows.map((row) => {
      const project = buildMatrixProject(row, courseId, serverProjects)
      return {
        project,
        data: buildMatrixDataItems(row, courseId, project.id, resolveMatrixCoursePoint),
      }
    })

    await api.matrices.updateCourseMatrix(String(courseId), rebuildPayload as CourseMatrixPayloadItem[])
    console.log("[CanvasSaveWizard] course matrix rebuilt, chapter count:", rebuildPayload.length)
  }, [buildMatrixDataItems, buildMatrixProject, courseMatrixData, coursePoints])

  const fetchLatestProjectMatrixData = useCallback(async (courseId: number): Promise<ProjectMatrixResponseData> => {
    const response = await api.matrices.getProjectMatrixData(String(courseId))
    if (response.error) {
      throw new Error(response.error)
    }

    const normalizedData = normalizeProjectMatrixResponseData(response.data)
    if (!normalizedData) {
      throw new Error("项目矩阵响应结构异常，无法更新课程")
    }

    return normalizedData
  }, [])

  const resolveProjectMatrixServerProject = useCallback((
    matrix: ProjectMatrixData,
    serverProjects: ProjectMatrixResponseProject[]
  ): ProjectMatrixResponseProject | null => {
    const matrixProjectId = normalizePositiveNumber(matrix.project_id)
    if (matrixProjectId > 0) {
      const matchedById = serverProjects.find((item) => (
        normalizePositiveNumber(item.project?.id) === matrixProjectId
      ))
      if (matchedById) {
        return matchedById
      }
    }

    const normalizedChapterName = matrix.chapter_name.trim()
    return serverProjects.find((item) => (
      normalizePositiveNumber(item.project?.indexNo) === matrix.chapter_index
      && item.project?.name?.trim() === normalizedChapterName
    )) ?? serverProjects.find((item) => item.project?.name?.trim() === normalizedChapterName) ?? null
  }, [])

  const resolveProjectMatrixRowPointOriginalId = useCallback((
    row: ProjectMatrixData["rows"][number],
    latestCoursePoints: CoursePointCardData[]
  ): number => {
    const directOriginalId = normalizePositiveNumber(row.course_point_original_id)
    if (directOriginalId > 0) {
      return directOriginalId
    }

    const directRowId = normalizePositiveNumber(row.course_point_id)
    if (directRowId > 0) {
      return directRowId
    }

    const matchedByCanvasId = latestCoursePoints.find((point) => point.id === row.course_point_id)
    if (matchedByCanvasId?.originalId && matchedByCanvasId.originalId > 0) {
      return matchedByCanvasId.originalId
    }

    const normalizedName = row.course_point_name.trim()
    const normalizedDescription = (row.course_point_description || "").trim()
    const matchedByContent = latestCoursePoints.find((point) => (
      point.name.trim() === normalizedName
      && (point.description || "").trim() === normalizedDescription
      && typeof point.originalId === "number"
      && point.originalId > 0
    ))

    return matchedByContent?.originalId ?? 0
  }, [])

  const resolveProjectMatrixKsaOriginalId = useCallback((
    ksaItem: ProjectMatrixData["rows"][number]["objective_supports"][number]["ksa_items"][number],
    latestKsaItems: KsaItemData[]
  ): number => {
    const directOriginalId = normalizePositiveNumber(ksaItem.originalId)
    if (directOriginalId > 0) {
      return directOriginalId
    }

    const directItemId = normalizePositiveNumber(ksaItem.id)
    if (directItemId > 0) {
      return directItemId
    }

    const matchedKsa = findKsaByReference(latestKsaItems, ksaItem.id)
      ?? latestKsaItems.find((item) => (
        item.category === ksaItem.category
        && item.index === ksaItem.index
        && item.content.trim() === (ksaItem.description || "").trim()
      ))

    return typeof matchedKsa?.originalId === "number" && matchedKsa.originalId > 0
      ? matchedKsa.originalId
      : 0
  }, [])

  const saveProjectMatrix = useCallback(async (
    courseId: number,
    majorId: number,
    latestCoursePoints: CoursePointCardData[],
    latestKsaItems: KsaItemData[]
  ): Promise<void> => {
    const initialProjectMatrixData = await fetchLatestProjectMatrixData(courseId)
    const latestProjects = Array.isArray(initialProjectMatrixData.projects)
      ? initialProjectMatrixData.projects
      : []

    const syncedChapters = syncChapterOriginalIds(latestProjects.map((item) => item.project))
    onUpdateCourseInfo?.({ courseId, majorId, chapters: syncedChapters })

    for (const matrix of projectMatrices) {
      const matchedProject = resolveProjectMatrixServerProject(matrix, latestProjects)
      const projectId = normalizePositiveNumber(matchedProject?.project?.id)
      if (projectId <= 0) {
        throw new Error(`未找到章节 ${matrix.chapter_name} 对应的服务端项目，无法保存项目矩阵`)
      }

      const latestGoals = Array.isArray(matchedProject?.goals) ? matchedProject.goals : []
      const currentObjectives = [...(matrix.task_objectives || [])]
        .filter((objective) => objective.description.trim().length > 0)
        .sort((left, right) => left.index - right.index)

      const retainedGoalIds = new Set<number>()
      const taskGoalPayload: TaskGoalItem[] = currentObjectives.map((objective) => {
        const originalGoalId = typeof objective.originalId === "number"
          ? objective.originalId
          : normalizePositiveNumber(objective.id)
        const matchedGoal = originalGoalId > 0
          ? latestGoals.find((goal) => goal.id === originalGoalId)
          : undefined
        const resolvedGoalId = matchedGoal ? matchedGoal.id : NEW_RECORD_ID

        if (resolvedGoalId > 0) {
          retainedGoalIds.add(resolvedGoalId)
        }

        return {
          id: resolvedGoalId,
          projectId,
          description: objective.description,
          product: objective.product ?? matchedGoal?.product ?? "",
        }
      })

      latestGoals
        .filter((goal) => !retainedGoalIds.has(goal.id))
        .forEach((goal) => {
          taskGoalPayload.push({
            id: -Math.abs(goal.id),
            projectId,
            description: goal.description,
            product: goal.product || "",
          })
        })

      if (taskGoalPayload.length > 0) {
        const saveTaskGoalResponse = await api.projectTeachGoal.updateTaskGoals(taskGoalPayload)
        if (saveTaskGoalResponse.error) {
          throw new Error(saveTaskGoalResponse.error)
        }
      }
    }

    const refreshedProjectMatrixData = await fetchLatestProjectMatrixData(courseId)
    const refreshedProjects = Array.isArray(refreshedProjectMatrixData.projects)
      ? refreshedProjectMatrixData.projects
      : []
    const refreshedRows = Array.isArray(refreshedProjectMatrixData.data)
      ? refreshedProjectMatrixData.data
      : []

    const projectMatrixPayload: ProjectMatrixSaveItem[] = []

    for (const matrix of projectMatrices) {
      const matchedProject = resolveProjectMatrixServerProject(matrix, refreshedProjects)
      const projectId = normalizePositiveNumber(matchedProject?.project?.id)
      if (projectId <= 0) {
        throw new Error(`未找到章节 ${matrix.chapter_name} 的最新项目数据，无法保存项目矩阵`)
      }

      const latestGoals = Array.isArray(matchedProject?.goals) ? matchedProject.goals : []
      const unmatchedGoals = [...latestGoals]
      const taskGoalIdByCanvasId = new Map<string, number>()

      matrix.task_objectives
        .filter((objective) => objective.description.trim().length > 0)
        .sort((left, right) => left.index - right.index)
        .forEach((objective) => {
          const originalGoalId = typeof objective.originalId === "number"
            ? objective.originalId
            : normalizePositiveNumber(objective.id)
          const matchedGoalIndex = unmatchedGoals.findIndex((goal) => {
            if (originalGoalId > 0) {
              return goal.id === originalGoalId
            }
            return goal.description.trim() === objective.description.trim()
          })

          const matchedGoal = matchedGoalIndex >= 0
            ? unmatchedGoals.splice(matchedGoalIndex, 1)[0]
            : unmatchedGoals.shift()

          const resolvedGoalId = normalizePositiveNumber(matchedGoal?.id)
          if (resolvedGoalId > 0) {
            taskGoalIdByCanvasId.set(objective.id, resolvedGoalId)
          }
        })

      const projectScopedRows = refreshedRows.filter(
        (item) => normalizePositiveNumber(item.courseMatrix?.projectId) === projectId
      )
      const serverRowsByMatrixId = new Map<number, ProjectMatrixResponseRow>(
        projectScopedRows
          .map((item) => [normalizePositiveNumber(item.courseMatrix?.id), item] as const)
          .filter(([matrixId]) => matrixId > 0)
      )
      const serverRowsByPointId = new Map<number, ProjectMatrixResponseRow[]>()
      projectScopedRows.forEach((item) => {
        const pointId = normalizePositiveNumber(item.courseMatrix?.point?.id)
        if (pointId <= 0) {
          return
        }
        const existingRows = serverRowsByPointId.get(pointId) || []
        existingRows.push(item)
        serverRowsByPointId.set(pointId, existingRows)
      })

      for (const row of matrix.rows) {
        const pointOriginalId = resolveProjectMatrixRowPointOriginalId(row, latestCoursePoints)
        if (pointOriginalId <= 0) {
          throw new Error(`项目矩阵中的课点 ${row.course_point_name} 缺少服务端ID，无法保存`)
        }

        const directProjectMatrixId = normalizePositiveNumber(row.project_matrix_id)
        const matchedServerRow = directProjectMatrixId > 0
          ? serverRowsByMatrixId.get(directProjectMatrixId)
          : (serverRowsByPointId.get(pointOriginalId) || [])[0]
        const projectMatrixId = normalizePositiveNumber(matchedServerRow?.courseMatrix?.id)
        if (!matchedServerRow || projectMatrixId <= 0) {
          throw new Error(`未找到课点 ${row.course_point_name} 对应的项目矩阵行，无法保存`)
        }

        const existingPointMatrices = Array.isArray(matchedServerRow.projectMatrices)
          ? matchedServerRow.projectMatrices
          : []

        const pointMatrixPayload: ProjectMatrixSaveItem["projectMatrices"] = []

        const selectedSupportByGoal = new Map<number, Map<number, number>>()
        row.objective_supports.forEach((support) => {
          const taskGoalId = taskGoalIdByCanvasId.get(support.task_objective_id)
          if (!taskGoalId || taskGoalId <= 0) {
            return
          }

          const selectedKsaMap = new Map<number, number>()
          support.ksa_items.forEach((ksaItem) => {
            const ksaOriginalId = resolveProjectMatrixKsaOriginalId(ksaItem, latestKsaItems)
            if (ksaOriginalId <= 0) {
              throw new Error(`KSA ${ksaItem.name || ksaItem.id} 缺少服务端ID，无法保存项目矩阵`)
            }
            selectedKsaMap.set(ksaOriginalId, ksaItem.level === "strong" ? 0 : 1)
          })

          selectedSupportByGoal.set(taskGoalId, selectedKsaMap)
        })

        existingPointMatrices.forEach((item) => {
          const taskGoalId = normalizePositiveNumber(item.taskGoalId)
          const ksaId = normalizePositiveNumber(item.ksa?.id)
          if (taskGoalId <= 0 || ksaId <= 0) {
            return
          }

          const selectedKsaMap = selectedSupportByGoal.get(taskGoalId)
          const existingRelate = item.relate?.relate === 0 ? 0 : 1
          const desiredRelate = selectedKsaMap?.get(ksaId)

          if (desiredRelate === undefined || desiredRelate !== existingRelate) {
            pointMatrixPayload.push({
              id: -Math.abs(normalizePositiveNumber(item.id)),
              projectMatrixId,
              taskGoalId,
              ksa: {
                id: ksaId,
                majorId,
                courseUnitId: courseId,
                title: item.ksa?.title || "",
                description: item.ksa?.description || "",
                level: normalizePositiveNumber(item.ksa?.level),
              },
              relate: {
                name: existingRelate === 0 ? "强支撑" : "弱支撑",
                code: existingRelate === 0 ? "primary" : "success",
                relate: existingRelate,
              },
              valid: true,
            })
          }

          if (selectedKsaMap) {
            selectedKsaMap.delete(ksaId)
          }
        })

        selectedSupportByGoal.forEach((selectedKsaMap, taskGoalId) => {
          selectedKsaMap.forEach((relateValue, ksaId) => {
            const matchedKsa = latestKsaItems.find((item) => item.originalId === ksaId)
            pointMatrixPayload.push({
              id: NEW_RECORD_ID,
              projectMatrixId,
              taskGoalId,
              ksa: {
                id: ksaId,
                majorId,
                courseUnitId: courseId,
                title: matchedKsa?.category || "",
                description: matchedKsa?.content || "",
                level: matchedKsa?.index || 0,
              },
              relate: {
                name: relateValue === 0 ? "强支撑" : "弱支撑",
                code: relateValue === 0 ? "primary" : "success",
                relate: relateValue,
              },
              valid: true,
            })
          })
        })

        projectMatrixPayload.push({
          courseMatrix: {
            id: projectMatrixId,
            courseUnitId: courseId,
            projectId,
            graduateRequireId: normalizePositiveNumber(matchedServerRow.courseMatrix?.graduateRequireId),
            point: {
              id: pointOriginalId,
              title: row.course_point_name,
              description: row.course_point_description || "",
            },
            relate: matchedServerRow.courseMatrix?.relate
              ? {
                  name: matchedServerRow.courseMatrix.relate.name || "",
                  code: matchedServerRow.courseMatrix.relate.code || "",
                  relate: matchedServerRow.courseMatrix.relate.relate,
                }
              : undefined,
            study: row.learning_method || "",
            teach: row.teaching_method || "",
            product: row.learning_output || "",
            week: String(row.week ?? 0),
            period: String(normalizePositiveNumber(matchedServerRow.courseMatrix?.period)),
            theoryPeriod: String(row.theory_hours ?? 0),
            practicePeriod: String(row.practice_hours ?? 0),
            valid: true,
          },
          projectMatrices: pointMatrixPayload,
        })
      }
    }

    if (projectMatrixPayload.length > 0) {
      const saveResponse = await api.matrices.updateProjectMatrixData(projectMatrixPayload)
      if (saveResponse.error) {
        throw new Error(saveResponse.error)
      }
    }

    const refreshedProjectResponse = await api.projectTeachGoal.getProjectTeachGoal(String(courseId))
    if (refreshedProjectResponse.error) {
      throw new Error(refreshedProjectResponse.error)
    }

    const latestChapterProjects = Array.isArray(refreshedProjectResponse.data?.projects)
      ? refreshedProjectResponse.data.projects
      : []
    const latestSyncedChapters = syncChapterOriginalIds(latestChapterProjects)
    onUpdateCourseInfo?.({ courseId, majorId, chapters: latestSyncedChapters })
    console.log("[CanvasSaveWizard] 项目矩阵保存成功, 项目数:", projectMatrices.length)
  }, [
    fetchLatestProjectMatrixData,
    onUpdateCourseInfo,
    projectMatrices,
    resolveProjectMatrixKsaOriginalId,
    resolveProjectMatrixRowPointOriginalId,
    resolveProjectMatrixServerProject,
    syncChapterOriginalIds,
  ])

  // 保存教学目标与毕业要求指标点的关联关系
  const saveObjectiveIndicatorMapping = useCallback(async (courseId: number): Promise<void> => {
    if (objectives.length === 0) return

    const groupedGoals = buildObjectiveGroupsForApi()
    const existingGoalsResponse = await api.courseGoals.getCourseGoals(String(courseId), extractNumericId(selectedPath.majorId || ""))
    if (existingGoalsResponse.error) {
      throw new Error(existingGoalsResponse.error)
    }

    const updateResponse = await api.courseGoals.updateCourseGoals(
      String(courseId),
      extractNumericId(selectedPath.majorId || ""),
      groupedGoals
    )
    if (updateResponse.error) {
      throw new Error(updateResponse.error)
    }

    const deleteIds = buildObjectiveDeleteIds(existingGoalsResponse.data || [])
    for (const objectiveId of deleteIds) {
      const deleteResponse = await api.courseGoals.deleteCourseGoal(String(objectiveId))
      if (deleteResponse.error) {
        throw new Error(deleteResponse.error)
      }
    }

    const refreshedGoalsResponse = await api.courseGoals.getCourseGoals(String(courseId), extractNumericId(selectedPath.majorId || ""))
    if (refreshedGoalsResponse.error) {
      throw new Error(refreshedGoalsResponse.error)
    }

    const syncedObjectives = syncObjectiveOriginalIds(refreshedGoalsResponse.data || [])
    onUpdateCourseInfo?.({ courseId, majorId: Number.parseInt(extractNumericId(selectedPath.majorId || ""), 10), objectives: syncedObjectives })
    console.log("[CanvasSaveWizard] 教学目标保存成功, 指标点组数:", groupedGoals.length)
  }, [buildObjectiveDeleteIds, buildObjectiveGroupsForApi, objectives.length, onUpdateCourseInfo, selectedPath.majorId, syncObjectiveOriginalIds])

  // 处理保存操作（主函数）
  const handleSave = useCallback(async () => {
    if (!validateBeforeSave()) return

    setSaveStepState(createInitialSaveStepState())
    setSaveStepMessage("正在准备更新课程")
    setSaveErrorMessage("")
    setSaveFlowStatus("saving")
    try {
      const majorId = extractNumericId(selectedPath.majorId!)
      const majorIdNum = parseInt(majorId, 10)

      // 1. 获取选中的课程ID（用户从列表中选择的占位课程）
      const courseId = getSelectedCourseId(majorIdNum)

      const latestCanvasOssKey = await (onEnsureLatestCanvasOssKey?.() ?? Promise.resolve(canvasOssKey))
      if (typeof latestCanvasOssKey === "string" && latestCanvasOssKey.length > 0) {
        setSaveStepMessage("正在基于最新画布快照覆盖课程数据")
        markSaveStep("course", "in_progress", "正在同步课程画布快照")

        const syncResponse = await courseCanvasSyncApi.syncCourseFromCanvasStream(
          String(courseId),
          latestCanvasOssKey,
          (event: CourseCanvasSyncEvent) => {
            const mappedStep = mapCanvasSyncStepToSaveStep(event.step)
            const isErrorEvent = event.type === "error" || event.status === "error"

            if (isErrorEvent) {
              markSaveStepFailure(mappedStep, event.message)
              return
            }

            if (mappedStep) {
              const nextStatus = event.status === "completed" ? "completed" : "in_progress"
              markSaveStep(mappedStep, nextStatus, event.message)
            } else {
              setSaveStepMessage(event.message)
            }
          }
        )

        onUpdateCourseInfo?.({
          courseId: syncResponse.courseId,
          majorId: syncResponse.majorId,
        })

        SAVE_STEP_ITEMS.forEach((item) => {
          markSaveStep(item.key, "completed", `${item.label.replace("正在", "已")}（画布快照同步）`)
        })

        setSaveFlowStatus("success")
        toast.success("课程数据已按画布快照覆盖更新")
        onSaveSuccess?.(majorId, String(syncResponse.courseId))
        return
      }

      // 2. 保存课程单元（必须成功）
      markSaveStep("course", "in_progress", "正在更新课程基本信息")
      await saveCourseUnit(courseId, majorIdNum)
      markSaveStep("course", "completed", "课程基本信息已更新")

      // 3-7. 依次保存其余数据，任一步失败都中断流程
      markSaveStep("objectives", "in_progress", "正在更新教学目标")
      await saveObjectiveIndicatorMapping(courseId)
      markSaveStep("objectives", "completed", "教学目标已更新")

      markSaveStep("coursePoints", "in_progress", "正在更新课点")
      const syncedCoursePoints = await saveCoursePoints(courseId, majorIdNum)
      markSaveStep("coursePoints", "completed", "课点已更新")

      markSaveStep("ksa", "in_progress", "正在更新 KSA")
      const syncedKsaItems = await saveKsaItems(courseId, majorIdNum)
      markSaveStep("ksa", "completed", "KSA 已更新")

      markSaveStep("courseMatrix", "in_progress", "正在更新课程矩阵")
      await saveCourseMatrix(courseId, syncedCoursePoints)
      markSaveStep("courseMatrix", "completed", "课程矩阵已更新")

      markSaveStep("projectMatrix", "in_progress", "正在更新项目矩阵")
      await saveProjectMatrix(courseId, majorIdNum, syncedCoursePoints, syncedKsaItems)
      markSaveStep("projectMatrix", "completed", "项目矩阵已更新")

      // 保存成功
      setSaveFlowStatus("success")
      toast.success("课程数据已成功更新")
      onSaveSuccess?.(majorId, String(courseId))

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "更新失败，请稍后重试"
      markSaveStepFailure(null, errorMessage)
      setSaveFlowStatus("error")
      console.error("[CanvasSaveWizard] 更新课程失败:", error)
      toast.error(errorMessage)
    }
  }, [
    validateBeforeSave, getSelectedCourseId, saveCourseUnit,
    saveObjectiveIndicatorMapping, saveCoursePoints, saveKsaItems, saveCourseMatrix, saveProjectMatrix,
    selectedPath, onSaveSuccess, markSaveStep, markSaveStepFailure, onEnsureLatestCanvasOssKey, canvasOssKey, onUpdateCourseInfo
  ])

  // 是否可以保存（必须选中课程、专业，且所有教学目标都已关联）
  const canSave = Boolean(
    selectedPath.majorId &&
    (hasCurrentCourseContext || selectedCourseId) &&
    courseInfo?.name &&
    objectives.length > 0
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[52.5vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Save className="h-6 w-6 text-primary" />
              更新课程
            </DialogTitle>
            <DialogDescription className="text-base">
              {hasCurrentCourseContext
                ? "当前画布来自课程详情页，将直接使用画布中的数据更新当前课程"
                : "当前画布仅支持更新已有课程，请在当前专业下选择一门课程进行更新"}
            </DialogDescription>
          </DialogHeader>

        {/* 保存成功状态 */}
        {saveSuccess ? (
          <div className="py-6">
            <div className="rounded-xl border border-border bg-secondary/20 p-5">
              <div className="flex items-center gap-3 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-base font-medium text-foreground">课程更新完成</p>
                  <p className="text-sm text-muted-foreground">当前课程已完成更新，可以继续导出 docx</p>
                </div>
              </div>
              <div className="space-y-3">
                {SAVE_STEP_ITEMS.map((item) => (
                  <div key={item.key} className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-foreground">
                      {item.label.replace("正在", "已")}
                    </span>
                  </div>
                ))}
              </div>
              <DialogFooter className="mt-5 gap-3">
                <Button
                  onClick={onExportWord}
                  disabled={!canExportWord || isExportingWord}
                  className="gap-2 px-6"
                  title={canExportWord ? "导出当前最新课程数据的 docx" : exportWordDisabledReason}
                >
                  {isExportingWord ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      导出中...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      导出 docx
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="gap-2 px-6"
                >
                  <X className="h-4 w-4" />
                  关闭
                </Button>
              </DialogFooter>
            </div>
          </div>
        ) : isSaving || hasSaveError ? (
          <div className="py-6">
            <div className="rounded-xl border border-border bg-secondary/20 p-5">
              <div className="flex items-center gap-3 pb-4">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  hasSaveError ? "bg-red-100" : "bg-primary/10"
                )}>
                  {hasSaveError ? (
                    <X className="h-5 w-5 text-red-600" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-base font-medium text-foreground">
                    {hasSaveError ? "课程更新失败" : "正在更新课程"}
                  </p>
                  <p className={cn(
                    "text-sm",
                    hasSaveError ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {hasSaveError ? saveErrorMessage : saveStepMessage}
                  </p>
                </div>
              </div>
              {hasSaveError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {saveErrorMessage}
                </div>
              ) : null}
              <div className="space-y-3">
                {SAVE_STEP_ITEMS.map((item) => {
                  const status = saveStepState[item.key]
                  return (
                    <div key={item.key} className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3">
                      {status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : status === "failed" ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                          <X className="h-3.5 w-3.5 text-red-600" />
                        </div>
                      ) : status === "in_progress" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className={cn(
                        "text-sm",
                        status === "completed" && "text-foreground",
                        status === "failed" && "text-red-600",
                        status === "in_progress" && "text-primary",
                        status === "pending" && "text-muted-foreground"
                      )}>
                        {getSaveStepDisplayLabel(item.label, status)}
                      </span>
                    </div>
                  )
                })}
              </div>
              {hasSaveError ? (
                <DialogFooter className="mt-5 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="gap-2 px-6"
                  >
                    <X className="h-4 w-4" />
                    关闭
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!canSave}
                    className="gap-2 px-6"
                  >
                    <Save className="h-4 w-4" />
                    重新更新
                  </Button>
                </DialogFooter>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <MajorSelector
              treeData={treeData}
              selectedPath={selectedPath}
              onPathChange={setSelectedPath}
              onMajorSelected={handleMajorSelected}
              disabled={shouldLockOrganizationSelection}
            />

            {shouldLockOrganizationSelection ? (
              <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                学校、院系、专业由当前画布中的支撑关系自动确定，更新时不允许切换组织信息。
              </div>
            ) : null}

            {/* 课程列表区 */}
            <div className="flex-1 min-h-0 overflow-hidden pt-3">
              {hasCurrentCourseContext ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">当前将直接更新课程</p>
                      <p className="text-base font-medium text-foreground">
                        {selectedCourseName || courseInfo?.name || savedCourseId}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <CoursePicker
                  courses={courses}
                  isLoading={isLoadingCourses}
                  selectedCourseId={selectedCourseId}
                  onSelectCourse={handleCourseSelect}
                  searchTerm={courseSearchTerm}
                  onSearchChange={setCourseSearchTerm}
                  majorId={selectedPath.majorId}
                />
              )}
            </div>

            <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
              {hasCurrentCourseContext ? (
                <span>
                  即将把当前画布中的课程内容直接更新到当前课程：`{selectedCourseName || courseInfo?.name || savedCourseId}`
                </span>
              ) : selectedCourseId ? (
                <span>
                  即将把当前画布中的课程内容更新到课程：`{selectedCourseName || selectedCourseId}`
                </span>
              ) : (
                <span>请选择当前专业下的一门已有课程，系统将直接使用当前画布中已配置的教学目标、支撑关系、课点和矩阵数据进行更新。</span>
              )}
            </div>

            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="px-6"
              >
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={!canSave || isSaving}
                className="gap-2 px-6"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    更新中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    更新课程
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
