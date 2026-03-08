"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { Save, Building2, GraduationCap, BookOpen, Loader2, CheckCircle2, Target, Search, X, User, FileText, ArrowLeft } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Label } from "@/shared/components/ui/label"
import { SearchableSelect } from "@/shared/components/ui/searchable-select"
import { toast } from "sonner"
import { cn } from "@/shared/utils/utils"
import type { TreeNode } from "@/types"
import type { CourseInfoData, CanvasElementData, ObjectiveCardData, CoursePointCardData, ChapterCardData, CourseMatrixData } from "./canvas-elements/types"
import { CanvasComponentType } from "./canvas-elements/types"
import { CourseDetailApi, type SaveCourseUnitRequest } from "@/lib/api/course-detail-api"
import { api } from "@/lib/api"
import { buildApiUrl } from "@/lib/api/config"
import { getStoredAuthToken, getStoredAuthUser } from "@/lib/api/auth-config"

// ============ 常量定义 ============
const CLAMP_DETECTION_DELAY_MS = 100
const SUCCESS_DIALOG_CLOSE_DELAY_MS = 1500
const DEFAULT_CLASS_ID = 0
const DEFAULT_COURSE_TYPE_ID = 1
const NEW_RECORD_ID = 0

// ============ 类型定义 ============
/** 毕业要求指标点数据结构（API 响应） */
interface RequirementChildVO {
  id: number
  description: string
}

/** 毕业要求数据结构（API 响应） */
interface RequirementVO {
  id: number
  description: string
  children?: RequirementChildVO[]
}

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
  props: any
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
  onUpdateCourseInfo?: (updates: { courseId?: number; majorId?: number }) => void
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
}

/** CoursePicker 子组件 Props */
interface CoursePickerProps {
  courses: CourseItem[]
  isLoading: boolean
  onSelectCourse: (courseId: string) => void
  searchTerm: string
  onSearchChange: (term: string) => void
  majorId: string | null
}

/**
 * 毕业要求指标点数据结构
 */
interface IndicatorPoint {
  id: number
  description: string
}

/**
 * 毕业要求数据结构
 */
interface GraduationRequirement {
  id: string
  content: string
  indicators: IndicatorPoint[]
}

/**
 * 教学目标与毕业要求指标点的关联关系
 * Set 中存储 "objectiveId-requirementId-indicatorIndex" 格式的 key
 */
type ObjectiveIndicatorMapping = Set<string>

/** ObjectiveIndicatorMatrix 子组件 Props */
interface ObjectiveIndicatorMatrixProps {
  objectives: ObjectiveCardData[]
  graduationRequirements: GraduationRequirement[]
  relationMapping: ObjectiveIndicatorMapping
  onToggleRelation: (objectiveId: string, reqId: string, indicatorIdx: number) => void
  majorId: string | null
  isLoadingRequirements: boolean
  totalIndicators: number
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

/**
 * 专业选择器子组件
 * 提供学校/院系/专业三级联动选择
 */
function MajorSelector({
  treeData,
  selectedPath,
  onPathChange,
  onMajorSelected,
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
          disabled={!selectedPath.universityId}
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
          disabled={!selectedPath.departmentId}
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
 * 教学目标-毕业要求指标点矩阵子组件
 * 显示教学目标与毕业要求指标点的关联关系表格
 */
function ObjectiveIndicatorMatrix({
  objectives,
  graduationRequirements,
  relationMapping,
  onToggleRelation,
  majorId,
  isLoadingRequirements,
  totalIndicators,
}: ObjectiveIndicatorMatrixProps) {
  // 表头展开状态
  const [expandedReqs, setExpandedReqs] = useState<Set<number>>(new Set())
  const [clampedReqs, setClampedReqs] = useState<Set<number>>(new Set())
  const textRefsMap = useRef<Map<number, HTMLDivElement>>(new Map())

  // 检测毕业要求文本是否被截断
  useEffect(() => {
    const timer = setTimeout(() => {
      const newClampedReqs = new Set<number>()
      textRefsMap.current.forEach((element, index) => {
        if (!expandedReqs.has(index) && element.scrollHeight > element.clientHeight) {
          newClampedReqs.add(index)
        }
      })
      setClampedReqs(newClampedReqs)
    }, CLAMP_DETECTION_DELAY_MS)
    return () => clearTimeout(timer)
  }, [expandedReqs, graduationRequirements])

  // 检查是否已关联
  const isRelated = useCallback((objectiveId: string, reqId: string, indicatorIdx: number): boolean => {
    const key = `${objectiveId}-${reqId}-${indicatorIdx}`
    return relationMapping.has(key)
  }, [relationMapping])

  // 处理展开/收起切换
  const handleToggleExpand = useCallback((reqIndex: number) => {
    setExpandedReqs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reqIndex)) {
        newSet.delete(reqIndex)
      } else {
        newSet.add(reqIndex)
      }
      return newSet
    })
  }, [])

  // [MOD] 渲染教学目标行的单元格（多选模式：同一教学目标可关联多个指标点）
  const renderObjectiveCells = useCallback((objective: ObjectiveCardData) => {
    return graduationRequirements.flatMap((req) => {
      return (req.indicators || []).map((_, indicatorIdx) => {
        const currentKey = `${objective.id}-${req.id}-${indicatorIdx}`
        const related = isRelated(objective.id, req.id, indicatorIdx)

        return (
          <td key={currentKey} className="p-2 text-center border-r border-border">
            <div className="flex items-center justify-center">
              <Checkbox
                checked={related}
                onCheckedChange={() => onToggleRelation(objective.id, req.id, indicatorIdx)}
                className="h-5 w-5"
              />
            </div>
          </td>
        )
      })
    })
  }, [graduationRequirements, isRelated, onToggleRelation])

  // 未选择专业时的占位状态
  if (!majorId) {
    return (
      <div className="h-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/5">
        <div className="flex flex-col items-center gap-4 text-center px-8">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
            <Target className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-lg font-medium text-muted-foreground/70">请先选择课程归属的专业</p>
            <p className="text-sm text-muted-foreground/50 mt-1">选择专业后将自动加载该专业的毕业要求矩阵</p>
          </div>
        </div>
      </div>
    )
  }

  // 正在加载毕业要求
  if (isLoadingRequirements) {
    return (
      <div className="h-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/20 bg-primary/5">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium text-primary/80">正在加载毕业要求</p>
        </div>
      </div>
    )
  }

  // 该专业暂无毕业要求
  if (totalIndicators === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50/50">
        <div className="flex flex-col items-center gap-2 text-center px-8">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Target className="h-8 w-8 text-gray-500" />
          </div>
          <p className="text-base text-gray-600">该专业暂无毕业要求</p>
        </div>
      </div>
    )
  }

  // 课程暂无教学目标
  if (objectives.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50/50">
        <div className="flex flex-col items-center gap-4 text-center px-8">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <Target className="h-8 w-8 text-amber-600" />
          </div>
          <p className="text-base text-amber-700">
            课程暂无教学目标，<br />
            请先在画布中添加教学目标后再保存课程。
          </p>
        </div>
      </div>
    )
  }

  // 正常渲染矩阵表格
  return (
    <div className="h-full overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          {/* 第一层表头：毕业要求和教学目标 */}
          <tr className="border-b border-border bg-secondary/80 backdrop-blur-sm">
            <th className="text-left p-3 text-foreground font-semibold border-r border-border bg-secondary sticky left-0 z-20 min-w-[200px]">
              教学目标
            </th>
            {graduationRequirements.map((req, reqIndex) => {
              const indicatorCount = req.indicators?.length || 1
              const isExpanded = expandedReqs.has(reqIndex)
              const isClamped = clampedReqs.has(reqIndex)

              return (
                <th
                  key={req.id}
                  colSpan={indicatorCount}
                  className="text-center p-3 text-muted-foreground font-medium border-r border-border"
                  style={{ minWidth: `${indicatorCount * 80}px` }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary">
                      {reqIndex + 1}
                    </div>
                    <div className="flex-1 text-left flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            ref={(el) => {
                              if (el) {
                                textRefsMap.current.set(reqIndex, el)
                              }
                            }}
                            className={cn("text-sm font-medium cursor-help", isExpanded ? "" : "line-clamp-2")}
                          >
                            {req.content}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[300px]">
                          {req.content}
                        </TooltipContent>
                      </Tooltip>
                      {isClamped && (
                        <button
                          onClick={() => handleToggleExpand(reqIndex)}
                          className="text-xs text-primary hover:underline cursor-pointer flex-shrink-0 whitespace-nowrap"
                        >
                          {isExpanded ? "收起" : "展开"}
                        </button>
                      )}
                    </div>
                  </div>
                </th>
              )
            })}
          </tr>
          {/* 第二层表头：指标点 */}
          <tr className="border-b border-border bg-secondary/60 backdrop-blur-sm">
            <th className="border-r border-border bg-secondary sticky left-0 z-20 min-w-[200px]"></th>
            {graduationRequirements.flatMap((req, reqIndex) => {
              return (req.indicators || []).map((indicator, indicatorIdx) => (
                <th
                  key={`${req.id}-${indicatorIdx}`}
                  className="text-center p-2 text-muted-foreground border-r border-border min-w-[80px]"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-xs">{reqIndex + 1}.{indicatorIdx + 1}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs line-clamp-2 cursor-help">{indicator.description}</span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[300px]">
                        {indicator.description}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>
              ))
            })}
          </tr>
        </thead>
        <tbody>
          {objectives.map((objective) => (
            <tr key={objective.id} className="border-b border-border hover:bg-muted/30 transition-colors">
              <td className="p-3 border-r border-border bg-background sticky left-0 z-10 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
                    {objective.index}
                  </div>
                  <span className="text-sm line-clamp-2" title={objective.content}>{objective.content}</span>
                </div>
              </td>
              {renderObjectiveCells(objective)}
            </tr>
          ))}
        </tbody>
      </table>
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
  onSelectCourse,
  searchTerm,
  onSearchChange,
  majorId,
}: CoursePickerProps) {
  // 获取当前登录用户名（从 localStorage 中读取）
  const currentUserName = useMemo(() => {
    const authUser = getStoredAuthUser()
    return authUser?.userName ?? ""
  }, [])

  // 获取课程ID
  const getCourseId = (course: CourseItem) => course.self?.value || ""

  // 获取课程名称
  const getCourseName = (course: CourseItem) => course.self?.label || ""

  // 获取讲师数组
  const getInstructors = (course: CourseItem) => {
    const managers = course.manager || []
    const instructors = managers.map((m) => m.label).filter(Boolean)
    return instructors.length > 0 ? instructors : ["未设置"]
  }

  // 判断讲师是否已设置
  const isInstructorSet = (course: CourseItem) => {
    const managers = course.manager || []
    return managers.length > 0
  }

  // 筛选"我的课程"：只显示当前用户是负责人的课程
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const courseName = getCourseName(course)
      const matchesSearch = !searchTerm || courseName.toLowerCase().includes(searchTerm.toLowerCase())
      const instructors = getInstructors(course)
      const isMyCourseCourse = instructors.includes(currentUserName)
      // 必须是"我的课程"且匹配搜索条件
      return isMyCourseCourse && matchesSearch
    })
  }, [courses, searchTerm, currentUserName])

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
                "border-border bg-background",
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
  canvasElements,
  treeData,
  onSaveSuccess,
  onUpdateCourseInfo,
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

  // 毕业要求列表
  const [graduationRequirements, setGraduationRequirements] = useState<GraduationRequirement[]>([])
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(false)

  // 教学目标与毕业要求指标点的关联关系
  const [relationMapping, setRelationMapping] = useState<ObjectiveIndicatorMapping>(new Set())

  // 课程列表状态
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [courseSearchTerm, setCourseSearchTerm] = useState("")

  // 已有关联关系加载状态
  const [isLoadingExistingMappings, setIsLoadingExistingMappings] = useState(false)

  // 当前步骤：'course-select' 选择课程 | 'matrix-edit' 编辑矩阵
  const [currentStep, setCurrentStep] = useState<'course-select' | 'matrix-edit'>('course-select')

  // 选中课程的名称（用于显示）
  const [selectedCourseName, setSelectedCourseName] = useState<string>("")

  // 课程关联的指标点ID集合（用于过滤矩阵表头）
  const [courseIndicatorIds, setCourseIndicatorIds] = useState<Set<number>>(new Set())

  // 保存状态
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // [MOD] 合并 4 个 useMemo 为 1 个，减少对 canvasElements 的遍历次数 (4次 → 1次)
  const { objectives, coursePoints, chapters, courseMatrixData } = useMemo(() => {
    const result = {
      objectives: [] as ObjectiveCardData[],
      coursePoints: [] as CoursePointCardData[],
      chapters: [] as ChapterCardData[],
      courseMatrixData: undefined as CourseMatrixData | undefined,
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
        case CanvasComponentType.COURSE_MATRIX:
          result.courseMatrixData = el.data as CourseMatrixData
          break
      }
    }

    result.objectives.sort((a, b) => a.index - b.index)
    result.coursePoints.sort((a, b) => a.index - b.index)
    result.chapters.sort((a, b) => a.index - b.index)

    return result
  }, [canvasElements])

  // 加载专业课程列表
  const loadCourses = useCallback(async (majorId: string) => {
    setIsLoadingCourses(true)
    setSelectedCourseId(null)
    setCourseSearchTerm("")
    try {
      const numericId = extractNumericId(majorId)
      const url = buildApiUrl(`/api/v4/webpage/majorindex/courses?majorId=${numericId}&lang=80101`)
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "Content-Type": "application/json",
      }
      const authToken = getStoredAuthToken()
      if (authToken) {
        headers["authToken"] = authToken
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
      })

      if (response.ok) {
        const result = await response.json()
        if (result.code === "0" && Array.isArray(result.data)) {
          setCourses(result.data)
        } else {
          setCourses([])
        }
      } else {
        setCourses([])
      }
    } catch (error) {
      console.error("[CanvasSaveWizard] 获取课程列表失败:", error)
      setCourses([])
    } finally {
      setIsLoadingCourses(false)
    }
  }, [])

  // 加载专业毕业要求（需要在 useEffect 之前定义）
  const loadGraduationRequirements = useCallback(async (majorId: string) => {
    setIsLoadingRequirements(true)
    try {
      const numericId = extractNumericId(majorId)
      const response = await api.tree.getMajorDetail(numericId)

      if (response.data?.requiresVOS && response.data.requiresVOS.length > 0) {
        const requirements: GraduationRequirement[] = response.data.requiresVOS.map((req: RequirementVO) => ({
          id: String(req.id),
          content: req.description || "",
          indicators: req.children?.map((child: RequirementChildVO) => ({
            id: child.id,
            description: child.description || "",
          })) || [],
        }))
        setGraduationRequirements(requirements)
      } else {
        setGraduationRequirements([])
      }
    } catch (error) {
      console.error("[CanvasSaveWizard] 加载毕业要求失败:", error)
      toast.error("加载毕业要求失败")
      setGraduationRequirements([])
    } finally {
      setIsLoadingRequirements(false)
    }
  }, [])

  // 加载课程已有的教学目标与指标点关联关系，同时提取课程关联的指标点ID用于过滤表头
  const loadExistingMappings = useCallback(async (courseId: string, majorId: string) => {
    setIsLoadingExistingMappings(true)
    setRelationMapping(new Set())
    setCourseIndicatorIds(new Set())

    try {
      const response = await api.courseGoals.getCourseGoals(courseId, majorId)
      const courseGoalsData = response.data

      if (!courseGoalsData || courseGoalsData.length === 0) {
        console.log("[CanvasSaveWizard] 该课程暂无教学目标数据")
        return
      }

      // result.data 结构: [{ id: 指标点ID, description: 指标点描述, children: [{ id, description }] }]
      const newMapping = new Set<string>()
      const indicatorIds = new Set<number>()

      // [MOD] 辅助函数：标准化文本用于匹配（去除空格和标点差异）
      const normalizeText = (text: string): string => {
        return text
          .replace(/\s+/g, '')  // 去除所有空格
          .replace(/[，。、；：""''【】（）]/g, '')  // 去除中文标点
          .replace(/[,.;:'"()\[\]]/g, '')  // 去除英文标点
          .toLowerCase()
      }

      // [MOD] 辅助函数：查找匹配的教学目标（优先精确匹配，其次标准化匹配）
      const findMatchingObjective = (childDescription: string) => {
        const childContent = childDescription.trim()
        // 1. 精确匹配
        let matched = objectives.find(obj => obj.content.trim() === childContent)
        if (matched) return matched

        // 2. 标准化匹配（忽略空格和标点差异）
        const normalizedChild = normalizeText(childContent)
        matched = objectives.find(obj => normalizeText(obj.content) === normalizedChild)
        return matched
      }

      courseGoalsData.forEach((indicatorGoal) => {
        const indicatorId = indicatorGoal.id
        indicatorIds.add(indicatorId)

        // 在 graduationRequirements 中找到该指标点对应的 reqId 和 indicatorIdx
        for (const req of graduationRequirements) {
          const indicatorIdx = req.indicators.findIndex(ind => ind.id === indicatorId)
          if (indicatorIdx !== -1 && indicatorGoal.children) {
            // 找到匹配的指标点，遍历其关联的教学目标（children）
            indicatorGoal.children.forEach((child) => {
              const matchedObjective = findMatchingObjective(child.description)
              if (matchedObjective) {
                const key = `${matchedObjective.id}-${req.id}-${indicatorIdx}`
                newMapping.add(key)
                console.log("[CanvasSaveWizard] 匹配成功:", child.description, "->", matchedObjective.content)
              } else {
                console.log("[CanvasSaveWizard] 未找到匹配的教学目标:", child.description)
              }
            })
            break
          }
        }
      })

      setCourseIndicatorIds(indicatorIds)
      setRelationMapping(newMapping)
      console.log("[CanvasSaveWizard] 课程指标点ID:", Array.from(indicatorIds), "毕业要求指标点ID:", graduationRequirements.flatMap(r => r.indicators.map(i => i.id)), "已有关联:", newMapping.size)
    } catch (error) {
      console.error("[CanvasSaveWizard] 加载已有关联关系失败:", error)
    } finally {
      setIsLoadingExistingMappings(false)
    }
  }, [graduationRequirements, objectives])

  // 处理课程选择（点击课程卡片进入矩阵编辑步骤）
  const handleCourseSelect = useCallback((courseId: string | null) => {
    if (courseId && selectedPath.majorId) {
      // 找到选中课程的名称
      const selectedCourse = courses.find(c => c.self?.value === courseId)
      setSelectedCourseName(selectedCourse?.self?.label || "")
      setSelectedCourseId(courseId)
      // 加载已有关联关系（同时提取课程关联的指标点ID用于过滤表头）
      const majorId = extractNumericId(selectedPath.majorId)
      loadExistingMappings(courseId, majorId)
      // 进入矩阵编辑步骤
      setCurrentStep('matrix-edit')
    }
  }, [selectedPath.majorId, courses, loadExistingMappings])

  // 返回课程选择步骤
  const handleBackToCourseSelect = useCallback(() => {
    setCurrentStep('course-select')
    setSelectedCourseId(null)
    setSelectedCourseName("")
    setRelationMapping(new Set())
    setCourseIndicatorIds(new Set())
  }, [])

  // 选择专业后同时加载课程列表和毕业要求
  const handleMajorSelected = useCallback((majorId: string) => {
    loadCourses(majorId)
    loadGraduationRequirements(majorId)
  }, [loadCourses, loadGraduationRequirements])

  // 对话框打开/关闭时的状态处理
  useEffect(() => {
    if (!open) {
      // 关闭时重置状态
      setSaveSuccess(false)
      setGraduationRequirements([])
      setRelationMapping(new Set())
      // 重置课程相关状态
      setCourses([])
      setSelectedCourseId(null)
      setSelectedCourseName("")
      setCourseSearchTerm("")
      setIsLoadingExistingMappings(false)
      setCourseIndicatorIds(new Set())
      // 重置步骤状态
      setCurrentStep('course-select')
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
      // [MOD] 打开时：如果 courseInfo 中已有 majorId，自动初始化路径选择
      const savedMajorId = courseInfo?.metadata?.majorId
      if (savedMajorId && treeData) {
        const foundPath = findMajorPathInTree(treeData, savedMajorId)
        if (foundPath) {
          setSelectedPath(foundPath)
          // 触发加载课程列表和毕业要求
          loadCourses(foundPath.majorId!)
          loadGraduationRequirements(foundPath.majorId!)
        }
      }
    }
  }, [open, courseInfo?.metadata?.majorId, treeData, loadCourses, loadGraduationRequirements])

  // [MOD] 课程列表和毕业要求都加载完成后：如果 courseInfo 中已有 courseId，自动选中并进入矩阵编辑步骤
  useEffect(() => {
    const savedCourseId = courseInfo?.metadata?.courseId
    if (
      open &&
      savedCourseId &&
      courses.length > 0 &&
      graduationRequirements.length > 0 &&  // 确保毕业要求已加载完成
      !selectedCourseId &&
      currentStep === 'course-select'
    ) {
      const savedCourseIdStr = String(savedCourseId)
      const matchedCourse = courses.find(c => c.self?.value === savedCourseIdStr)
      if (matchedCourse && selectedPath.majorId) {
        // 自动选中该课程并进入矩阵编辑步骤
        setSelectedCourseName(matchedCourse.self?.label || "")
        setSelectedCourseId(savedCourseIdStr)
        const majorId = extractNumericId(selectedPath.majorId)
        loadExistingMappings(savedCourseIdStr, majorId)
        setCurrentStep('matrix-edit')
      }
    }
  }, [open, courseInfo?.metadata?.courseId, courses, graduationRequirements.length, selectedCourseId, currentStep, selectedPath.majorId, loadExistingMappings])

  // 根据课程关联的指标点ID过滤毕业要求（仅保留包含关联指标点的毕业要求及其对应指标点）
  const filteredGraduationRequirements = useMemo(() => {
    // 未加载到课程指标点数据时，显示全部毕业要求
    if (courseIndicatorIds.size === 0) return graduationRequirements

    return graduationRequirements
      .map((req) => ({
        ...req,
        indicators: req.indicators.filter((ind) => courseIndicatorIds.has(ind.id)),
      }))
      .filter((req) => req.indicators.length > 0)
  }, [graduationRequirements, courseIndicatorIds])

  // 过滤后的总指标点数量
  const filteredTotalIndicators = useMemo(() => {
    return filteredGraduationRequirements.reduce((sum, req) => sum + (req.indicators?.length || 0), 0)
  }, [filteredGraduationRequirements])

  // [MOD] 处理关联关系切换（多选模式：同一教学目标可关联多个指标点）
  const handleToggleRelation = useCallback((objectiveId: string, reqId: string, indicatorIdx: number) => {
    const key = `${objectiveId}-${reqId}-${indicatorIdx}`
    setRelationMapping(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }, [])

  // [MOD] 检查是否所有教学目标都已关联至少一个指标点（多选模式）
  const allObjectivesMapped = useMemo(() => {
    if (objectives.length === 0) return false
    return objectives.every(obj => {
      // 检查该教学目标是否有至少一个关联
      return Array.from(relationMapping).some(key => key.startsWith(`${obj.id}-`))
    })
  }, [objectives, relationMapping])

  // [MOD] 拆分 handleSave 为多个子函数，提高可读性和可维护性

  // 验证保存前置条件
  const validateBeforeSave = useCallback((): boolean => {
    if (!selectedPath.majorId || !courseInfo) {
      toast.error("请先选择专业")
      return false
    }
    if (!selectedCourseId) {
      toast.error("请选择要更新的课程")
      return false
    }
    if (!allObjectivesMapped) {
      toast.error("请为所有教学目标至少关联一个毕业要求")
      return false
    }
    return true
  }, [selectedPath.majorId, courseInfo, selectedCourseId, allObjectivesMapped])

  // 获取选中的课程ID（直接使用用户选择的占位课程）
  const getSelectedCourseId = useCallback((majorIdNum: number): number => {
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
  }, [selectedCourseId, onUpdateCourseInfo])

  // 保存课程单元基本信息
  const saveCourseUnit = useCallback(async (courseId: number, majorIdNum: number): Promise<void> => {
    const metadata = courseInfo?.metadata || {}
    const saveRequest: SaveCourseUnitRequest = {
      course: {
        id: courseId,
        majorId: majorIdNum,
        classId: DEFAULT_CLASS_ID,
        typeId: metadata.courseNatureId || DEFAULT_COURSE_TYPE_ID,
        name: courseInfo?.name || "未命名课程",
        introduction: metadata.introduction || null,
        criterion: null,
        theoryPeriod: metadata.theoryPeriod || 0,
        practicePeriod: metadata.practicePeriod || 0,
        courseMatrixVOS: [],
        position: null,
        teachingClass: metadata.teachingClass,
        teachingLocation: metadata.teachingLocation,
        teachingTime: metadata.teachingTime,
        studentCount: metadata.studentCount,
        credits: metadata.credits,
        mainTextbook: metadata.mainTextbook,
        referenceResources: metadata.referenceResources,
        attendancePolicy: metadata.attendancePolicy,
        assignmentPolicy: metadata.assignmentPolicy,
        conductRequirements: metadata.conductRequirements,
        practiceRequirements: metadata.practiceRequirements,
        teamworkRequirements: metadata.teamworkRequirements,
        bonusRequirements: metadata.bonusRequirements,
        otherSuggestions: metadata.otherSuggestions,
        assessmentMethod: metadata.assessmentMethod,
        assessmentForm: metadata.assessmentForm,
        scoreType: metadata.scoreType,
        scoreTable: metadata.scoreTable,
        assessmentDescription: metadata.assessmentDescription,
      },
    }

    const apiInstance = new CourseDetailApi()
    const response = await apiInstance.saveCourseUnit(saveRequest)
    if (response.error) {
      throw new Error(response.error)
    }
  }, [courseInfo])

  // 保存课点数据
  const saveCoursePoints = useCallback(async (courseId: number, majorId: number): Promise<void> => {
    if (coursePoints.length === 0) return

    const points = coursePoints.map(point => ({
      id: point.originalId ?? NEW_RECORD_ID,
      title: typeof point.content === "string"
        ? point.content
        : (typeof point.name === "string" ? point.name : ""),
      description: typeof point.description === 'string' ? point.description : "",
    }))

    try {
      await api.coursePoints.saveCoursePoints(majorId, courseId, points)
      console.log("[CanvasSaveWizard] 课点保存成功, 数量:", points.length)
    } catch (pointError) {
      console.error("[CanvasSaveWizard] 课点保存失败:", pointError)
    }
  }, [coursePoints])

  // [MOD] 构建课程矩阵的 project 数据
  const buildMatrixProject = useCallback((
    row: CourseMatrixData["rows"][number],
    courseId: number
  ) => {
    const chapterCard = chapters.find(ch => ch.id === row.chapter_id)
    return {
      id: chapterCard?.originalId ?? 0,
      uniqueCode: "",
      courseUnitId: courseId,
      name: row.chapter_name,
      product: "",
      theoryPeriod: chapterCard?.theory_hours?.toString() || "0",
      practicePeriod: chapterCard?.practice_hours?.toString() || "0",
      indexNo: row.chapter_index,
    }
  }, [chapters])

  // [MOD] 构建课程矩阵的 data 数组
  const buildMatrixDataItems = useCallback((
    row: CourseMatrixData["rows"][number],
    courseId: number
  ): CourseMatrixPayloadItem["data"] => {
    const chapterCard = chapters.find(ch => ch.id === row.chapter_id)
    const items: CourseMatrixPayloadItem["data"] = []
    row.supports.forEach((support) => {
      // 从 courseMatrixData.objectives 或 support 自身查找 originalGraduateRequireId
      const objOriginalId = courseMatrixData?.objectives?.find(
        o => o.id === support.objective_id
      )?.originalId
      const graduateRequireId = support.originalGraduateRequireId ?? objOriginalId ?? 0

      support.course_points.forEach((cp) => {
        items.push({
          id: NEW_RECORD_ID,
          courseUnitId: courseId,
          projectId: chapterCard?.originalId ?? 0,
          graduateRequireId,
          point: {
            id: parseInt(cp.id, 10) || 0,
            title: cp.name,
            description: cp.description || "",
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
  }, [chapters, courseMatrixData])

  // 保存课程矩阵数据
  const saveCourseMatrix = useCallback(async (courseId: number): Promise<void> => {
    if (!courseMatrixData?.rows?.length) return

    try {
      const payload = courseMatrixData.rows.map((row) => ({
        project: buildMatrixProject(row, courseId),
        data: buildMatrixDataItems(row, courseId),
      }))

      await api.matrices.updateCourseMatrix(String(courseId), payload as CourseMatrixPayloadItem[])
      console.log("[CanvasSaveWizard] 课程矩阵保存成功, 章节数量:", payload.length)
    } catch (matrixError) {
      console.error("[CanvasSaveWizard] 课程矩阵保存失败:", matrixError)
    }
  }, [courseMatrixData, buildMatrixProject, buildMatrixDataItems])

  // 保存项目矩阵数据
  const saveProjectMatrix = useCallback(async (courseId: number): Promise<void> => {
    if (chapters.length === 0) return

    const projects = chapters.map((chapter, index) => ({
      id: chapter.id,
      name: chapter.name,
      theoryPeriod: chapter.theory_hours?.toString() || "0",
      practicePeriod: chapter.practice_hours?.toString() || "0",
      courseUnitId: courseId,
      indexNo: index + 1,
    }))

    try {
      await api.projectTeachGoal.updateProjectTeachGoal(String(courseId), {
        projects,
        goals: [],
      })
      console.log("[CanvasSaveWizard] 项目矩阵保存成功, 章节数量:", projects.length)
    } catch (projectError) {
      console.error("[CanvasSaveWizard] 项目矩阵保存失败:", projectError)
    }
  }, [chapters])

  // 保存教学目标与毕业要求指标点的关联关系
  const saveObjectiveIndicatorMapping = useCallback(async (courseId: number): Promise<void> => {
    if (relationMapping.size === 0 || objectives.length === 0) return

    try {
      // 构建请求体: [{id, parentId, courseId, description}]
      const payload: Array<{
        id: number
        parentId: number
        courseId: number
        description: string
      }> = []

      relationMapping.forEach((key) => {
        // key 格式: "objectiveId-reqId-indicatorIdx"
        const parts = key.split("-")
        if (parts.length < 3) return

        const objectiveId = parts[0]
        const reqId = parts[1]
        const indicatorIdx = parseInt(parts[2], 10)

        // 查找教学目标内容
        const objective = objectives.find((obj) => obj.id === objectiveId)
        if (!objective) return

        // 查找指标点的真实 ID
        const requirement = graduationRequirements.find((req) => req.id === reqId)
        if (!requirement || !requirement.indicators[indicatorIdx]) return

        const indicatorId = requirement.indicators[indicatorIdx].id

        payload.push({
          id: objective.originalId ?? NEW_RECORD_ID,
          parentId: indicatorId,
          courseId: courseId,
          description: objective.content,
        })
      })

      if (payload.length === 0) return

      // 调用后端接口保存
      const url = buildApiUrl("/api/course/updateCourseGoals")
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "Content-Type": "application/json",
      }
      const authToken = getStoredAuthToken()
      if (authToken) {
        headers["authToken"] = authToken
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (result.code !== "0" && result.code !== 0) {
        throw new Error(result.msg || "保存教学目标失败")
      }

      console.log("[CanvasSaveWizard] 教学目标-指标点关联保存成功, 数量:", payload.length)
    } catch (error) {
      console.error("[CanvasSaveWizard] 教学目标-指标点关联保存失败:", error)
    }
  }, [relationMapping, objectives, graduationRequirements])

  // 处理保存操作（主函数）
  const handleSave = useCallback(async () => {
    if (!validateBeforeSave()) return

    setIsSaving(true)
    try {
      const majorId = extractNumericId(selectedPath.majorId!)
      const majorIdNum = parseInt(majorId, 10)

      // 1. 获取选中的课程ID（用户从列表中选择的占位课程）
      const courseId = getSelectedCourseId(majorIdNum)

      // 2. 保存课程单元（必须成功）
      await saveCourseUnit(courseId, majorIdNum)

      // 3-6. 并行保存其他数据（失败不阻断主流程）
      await Promise.allSettled([
        saveObjectiveIndicatorMapping(courseId),
        saveCoursePoints(courseId, majorIdNum),
        saveCourseMatrix(courseId),
        saveProjectMatrix(courseId),
      ])

      // 保存成功
      setSaveSuccess(true)
      toast.success("课程数据已成功更新")
      onSaveSuccess?.(majorId, String(courseId))
      setTimeout(() => onOpenChange(false), SUCCESS_DIALOG_CLOSE_DELAY_MS)

    } catch (error) {
      console.error("[CanvasSaveWizard] 更新课程失败:", error)
      toast.error(error instanceof Error ? error.message : "更新失败，请稍后重试")
    } finally {
      setIsSaving(false)
    }
  }, [
    validateBeforeSave, getSelectedCourseId, saveCourseUnit,
    saveObjectiveIndicatorMapping, saveCoursePoints, saveCourseMatrix, saveProjectMatrix,
    selectedPath, onSaveSuccess, onOpenChange
  ])

  // 是否可以保存（必须选中课程、专业，且所有教学目标都已关联）
  const canSave = Boolean(
    selectedPath.majorId &&
    selectedCourseId &&
    courseInfo?.name &&
    allObjectivesMapped &&
    filteredTotalIndicators > 0 &&
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
            选择要更新的课程，并建立教学目标与毕业要求指标点的关联关系
          </DialogDescription>
        </DialogHeader>

        {/* 保存成功状态 */}
        {saveSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 gap-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div className="text-center">
              <p className="text-xl font-medium text-foreground">更新成功</p>
              <p className="text-base text-muted-foreground mt-2">
                课程数据已成功更新
              </p>
            </div>
          </div>
        ) : currentStep === 'course-select' ? (
          /* ========== 步骤1：选择课程 ========== */
          <>
            {/* 顶部选择区：学校/院系/专业三级联动 */}
            <MajorSelector
              treeData={treeData}
              selectedPath={selectedPath}
              onPathChange={setSelectedPath}
              onMajorSelected={handleMajorSelected}
            />

            {/* 课程列表区 */}
            <div className="flex-1 min-h-0 overflow-hidden pt-3">
              <CoursePicker
                courses={courses}
                isLoading={isLoadingCourses}
                onSelectCourse={handleCourseSelect}
                searchTerm={courseSearchTerm}
                onSearchChange={setCourseSearchTerm}
                majorId={selectedPath.majorId}
              />
            </div>

            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="px-6"
              >
                取消
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* ========== 步骤2：编辑矩阵 ========== */
          <>
            {/* 顶部信息栏：显示选中的课程，带返回按钮 */}
            <div className="flex items-center gap-4 py-3 px-4 bg-secondary/30 rounded-lg border border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToCourseSelect}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                返回
              </Button>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm text-muted-foreground">已选课程：</span>
                <span className="text-sm font-medium text-foreground truncate">{selectedCourseName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>专业：</span>
                <span className="font-medium text-foreground">{selectedPath.majorName}</span>
              </div>
            </div>

            {/* 矩阵表格区域 */}
            <div className="flex-1 min-h-0 py-4 overflow-hidden">
              {isLoadingExistingMappings ? (
                <div className="h-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/20 bg-primary/5">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-lg font-medium text-primary/80">正在加载课程已有关联关系</p>
                  </div>
                </div>
              ) : (
                <ObjectiveIndicatorMatrix
                  objectives={objectives}
                  graduationRequirements={filteredGraduationRequirements}
                  relationMapping={relationMapping}
                  onToggleRelation={handleToggleRelation}
                  majorId={selectedPath.majorId}
                  isLoadingRequirements={isLoadingRequirements}
                  totalIndicators={filteredTotalIndicators}
                />
              )}
            </div>

            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={handleBackToCourseSelect}
                className="px-6"
              >
                上一步
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
