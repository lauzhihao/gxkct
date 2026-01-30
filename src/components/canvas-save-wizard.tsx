"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { Save, Building2, GraduationCap, BookOpen, Loader2, CheckCircle2, Target } from "lucide-react"
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
import { api, type CourseGoal } from "@/lib/api"
import { buildApiUrl } from "@/lib/api/config"
import { getStoredAuthToken } from "@/lib/api/auth-config"

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
  isUpdateMode: boolean
  onMajorSelected: (majorId: string) => void
}

/**
 * 毕业要求数据结构
 */
interface GraduationRequirement {
  id: string
  content: string
  indicators: string[]
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
 * 专业选择器子组件
 * 提供学校/院系/专业三级联动选择
 */
function MajorSelector({
  treeData,
  selectedPath,
  onPathChange,
  isUpdateMode,
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
    <div className="flex items-end gap-4 py-4 border-b border-border">
      {/* 学校选择 */}
      <div className="flex-1 min-w-0">
        <Label className="flex items-center gap-1.5 text-sm font-medium mb-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          学校
        </Label>
        <SearchableSelect
          value={selectedPath.universityId || ""}
          onValueChange={handleUniversityChange}
          disabled={isUpdateMode}
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
          disabled={isUpdateMode || !selectedPath.universityId}
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
          disabled={isUpdateMode || !selectedPath.departmentId}
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

  // 获取该教学目标已关联的指标点 key（用于禁用本行其他 Checkbox）
  const getRowSelectedKey = useCallback((objectiveId: string): string | null => {
    return Array.from(relationMapping).find(key => key.startsWith(`${objectiveId}-`)) || null
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

  // 渲染教学目标行的单元格（替代 IIFE）
  const renderObjectiveCells = useCallback((objective: ObjectiveCardData) => {
    const rowSelectedKey = getRowSelectedKey(objective.id)

    return graduationRequirements.flatMap((req) => {
      return (req.indicators || []).map((_, indicatorIdx) => {
        const currentKey = `${objective.id}-${req.id}-${indicatorIdx}`
        const related = isRelated(objective.id, req.id, indicatorIdx)
        const disabled = rowSelectedKey !== null && rowSelectedKey !== currentKey

        return (
          <td key={currentKey} className="p-2 text-center border-r border-border">
            <div className="flex items-center justify-center">
              <Checkbox
                checked={related}
                onCheckedChange={() => onToggleRelation(objective.id, req.id, indicatorIdx)}
                disabled={disabled}
                className={cn("h-5 w-5", disabled && "opacity-30 cursor-not-allowed")}
              />
            </div>
          </td>
        )
      })
    })
  }, [graduationRequirements, isRelated, getRowSelectedKey, onToggleRelation])

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
          <p className="text-lg font-medium text-primary/80">正在构建专业矩阵</p>
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
                        <span className="text-xs line-clamp-2 cursor-help">{indicator}</span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[300px]">
                        {indicator}
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
 * 保存向导组件
 * 用于将画布中的课程保存到系统中的某个专业下
 */
export function CanvasSaveWizard({
  open,
  onOpenChange,
  courseInfo,
  canvasElements,
  canvasOssKey,
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

  // 判断是否是更新模式（已有课程ID）
  const isUpdateMode = Boolean(courseInfo?.metadata?.courseId)
  const existingMajorId = courseInfo?.metadata?.majorId

  // 根据 majorId 在树结构中反向查找学校/院系/专业路径
  const findPathByMajorId = useCallback((majorId: number): SelectedPath | null => {
    if (!treeData?.children || !majorId) return null

    for (const university of treeData.children) {
      if (university.nodeType !== "university" || !university.children) continue

      for (const department of university.children) {
        if (department.nodeType !== "department" || !department.children) continue

        for (const major of department.children) {
          if (major.nodeType !== "major") continue

          // 从 nodeId 中提取数字ID进行比较
          const majorNumericId = parseInt(extractNumericId(major.nodeId), 10)
          if (majorNumericId === majorId) {
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
  }, [treeData])

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
          indicators: req.children?.map((child: RequirementChildVO) => child.description || "") || [],
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

  // 对话框打开/关闭时的状态处理
  useEffect(() => {
    if (!open) {
      // 关闭时重置状态
      setSaveSuccess(false)
      setGraduationRequirements([])
      setRelationMapping(new Set())
      // 重置三个下拉框的选择状态
      setSelectedPath({
        universityId: null,
        universityName: null,
        departmentId: null,
        departmentName: null,
        majorId: null,
        majorName: null,
      })
    } else if (isUpdateMode && existingMajorId) {
      // 更新模式：打开时根据 majorId 反向填充路径
      const path = findPathByMajorId(existingMajorId)
      if (path) {
        setSelectedPath(path)
        // 自动加载毕业要求
        if (path.majorId) {
          loadGraduationRequirements(path.majorId)
        }
      }
    }
  }, [open, isUpdateMode, existingMajorId, findPathByMajorId, loadGraduationRequirements])

  // 计算总指标点数量
  const totalIndicators = useMemo(() => {
    return graduationRequirements.reduce((sum, req) => sum + (req.indicators?.length || 0), 0)
  }, [graduationRequirements])

  // 处理关联关系切换（单选逻辑：每个教学目标只能关联一个指标点）
  const handleToggleRelation = useCallback((objectiveId: string, reqId: string, indicatorIdx: number) => {
    const key = `${objectiveId}-${reqId}-${indicatorIdx}`
    setRelationMapping(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        // 取消选中
        newSet.delete(key)
      } else {
        // 选中前先清除该教学目标的其他关联
        Array.from(newSet).forEach(existingKey => {
          if (existingKey.startsWith(`${objectiveId}-`)) {
            newSet.delete(existingKey)
          }
        })
        newSet.add(key)
      }
      return newSet
    })
  }, [])

  // 检查是否所有教学目标都已关联一个指标点
  const allObjectivesMapped = useMemo(() => {
    if (objectives.length === 0) return false
    return objectives.every(obj => {
      // 检查该教学目标是否有关联（每个目标只能有一个）
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
    if (!allObjectivesMapped) {
      toast.error("请为所有教学目标至少关联一个毕业要求")
      return false
    }
    return true
  }, [selectedPath.majorId, courseInfo, allObjectivesMapped])

  // 创建或获取课程ID
  const createOrGetCourseId = useCallback(async (majorIdNum: number): Promise<number> => {
    const metadata = courseInfo?.metadata || {}
    const existingCourseId = metadata.courseId

    if (existingCourseId) {
      console.log("[CanvasSaveWizard] 更新模式, 使用已有courseId:", existingCourseId)
      return existingCourseId
    }

    // 创建模式：调用快速开课接口创建课程基础记录
    const createCourseUrl = buildApiUrl("/api/v5/tree/course")
    const headers: Record<string, string> = {
      "Accept": "application/json",
      "Content-Type": "application/json",
    }
    const authToken = getStoredAuthToken()
    if (authToken) {
      headers["authToken"] = authToken
    }

    const createResponse = await fetch(createCourseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        majorId: majorIdNum,
        name: courseInfo?.name?.trim() || "未命名课程",
      }),
    })

    const createResult = await createResponse.json()
    if (createResult.code !== "0" && createResult.code !== 0) {
      throw new Error(createResult.msg || "创建课程失败")
    }

    const courseId = createResult.data?.id || createResult.data?.courseId
    if (!courseId) {
      throw new Error("创建课程成功但未返回课程ID")
    }

    console.log("[CanvasSaveWizard] 课程基础记录创建成功, courseId:", courseId)
    onUpdateCourseInfo?.({ courseId, majorId: majorIdNum })
    return courseId
  }, [courseInfo, onUpdateCourseInfo])

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

  // 保存教学目标数据
  const saveCourseGoals = useCallback(async (courseId: number, majorId: string): Promise<void> => {
    if (objectives.length === 0) return

    const courseGoals: CourseGoal[] = objectives.map((obj) => ({
      id: Date.now() + Math.random(),
      description: obj.content,
      children: null,
    }))

    try {
      await api.courseGoals.updateCourseGoals(String(courseId), majorId, courseGoals)
      console.log("[CanvasSaveWizard] 教学目标保存成功")
    } catch (goalError) {
      console.error("[CanvasSaveWizard] 教学目标保存失败:", goalError)
    }
  }, [objectives])

  // 保存课点数据
  const saveCoursePoints = useCallback(async (courseId: number, majorId: string): Promise<void> => {
    if (coursePoints.length === 0) return

    const points = coursePoints.map(point => ({
      id: NEW_RECORD_ID,
      title: point.name,
      description: point.description || "",
    }))

    try {
      await api.coursePoints.saveCoursePoints(majorId, String(courseId), points)
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
      id: parseInt(row.chapter_id, 10) || 0,
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
    const items: CourseMatrixPayloadItem["data"] = []
    row.supports.forEach((support) => {
      support.course_points.forEach((cp) => {
        items.push({
          id: NEW_RECORD_ID,
          courseUnitId: courseId,
          projectId: parseInt(row.chapter_id, 10) || 0,
          graduateRequireId: parseInt(support.objective_id, 10) || 0,
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
  }, [])

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

  // 处理保存操作（主函数）
  const handleSave = useCallback(async () => {
    if (!validateBeforeSave()) return

    setIsSaving(true)
    try {
      const majorId = extractNumericId(selectedPath.majorId!)
      const majorIdNum = parseInt(majorId, 10)
      const isUpdateMode = !!courseInfo?.metadata?.courseId

      // 1. 创建或获取课程ID
      const courseId = await createOrGetCourseId(majorIdNum)

      // 2. 保存课程单元（必须成功）
      await saveCourseUnit(courseId, majorIdNum)

      // 3-6. 并行保存其他数据（失败不阻断主流程）
      await Promise.allSettled([
        saveCourseGoals(courseId, majorId),
        saveCoursePoints(courseId, majorId),
        saveCourseMatrix(courseId),
        saveProjectMatrix(courseId),
      ])

      // 保存成功
      setSaveSuccess(true)
      toast.success(isUpdateMode
        ? `课程已成功更新`
        : `课程已成功保存到「${selectedPath.majorName}」专业`
      )
      onSaveSuccess?.(majorId, String(courseId))
      setTimeout(() => onOpenChange(false), SUCCESS_DIALOG_CLOSE_DELAY_MS)

    } catch (error) {
      console.error("[CanvasSaveWizard] 保存课程失败:", error)
      toast.error(error instanceof Error ? error.message : "保存失败，请稍后重试")
    } finally {
      setIsSaving(false)
    }
  }, [
    validateBeforeSave, createOrGetCourseId, saveCourseUnit,
    saveCourseGoals, saveCoursePoints, saveCourseMatrix, saveProjectMatrix,
    selectedPath, courseInfo, onSaveSuccess, onOpenChange
  ])

  // 是否可以保存
  const canSave = Boolean(selectedPath.majorId && courseInfo?.name && allObjectivesMapped && totalIndicators > 0 && objectives.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[52.5vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Save className="h-6 w-6 text-primary" />
            {isUpdateMode ? "更新课程" : "保存课程到专业"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isUpdateMode
              ? "更新课程数据和教学目标与毕业要求指标点的关联关系"
              : "选择课程归属的专业，并建立教学目标与毕业要求指标点的关联关系"
            }
          </DialogDescription>
        </DialogHeader>

        {/* 保存成功状态 */}
        {saveSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 gap-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div className="text-center">
              <p className="text-xl font-medium text-foreground">
                {isUpdateMode ? "更新成功" : "保存成功"}
              </p>
              <p className="text-base text-muted-foreground mt-2">
                {isUpdateMode
                  ? "课程数据已成功更新"
                  : `课程已成功保存到「${selectedPath.majorName}」专业`
                }
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 顶部选择区：学校/院系/专业三级联动 */}
            <MajorSelector
              treeData={treeData}
              selectedPath={selectedPath}
              onPathChange={setSelectedPath}
              isUpdateMode={isUpdateMode}
              onMajorSelected={loadGraduationRequirements}
            />

            {/* 矩阵表格区域 */}
            <div className="flex-1 min-h-0 py-4 overflow-hidden">
              <ObjectiveIndicatorMatrix
                objectives={objectives}
                graduationRequirements={graduationRequirements}
                relationMapping={relationMapping}
                onToggleRelation={handleToggleRelation}
                majorId={selectedPath.majorId}
                isLoadingRequirements={isLoadingRequirements}
                totalIndicators={totalIndicators}
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
              <Button
                onClick={handleSave}
                disabled={!canSave || isSaving}
                className="gap-2 px-6"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isUpdateMode ? "更新中..." : "保存中..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isUpdateMode ? "更新课程" : "保存课程"}
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
