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
import { Label } from "@/shared/components/ui/label"
import { SearchableSelect } from "@/shared/components/ui/searchable-select"
import { toast } from "sonner"
import { cn } from "@/shared/utils/utils"
import type { TreeNode } from "@/types"
import type { CourseInfoData, CanvasElementData, ObjectiveCardData } from "./canvas-elements/types"
import { CanvasComponentType } from "./canvas-elements/types"
import { CourseDetailApi, type SaveCourseUnitRequest } from "@/lib/api/course-detail-api"
import { api } from "@/lib/api"

/**
 * 支撑强度类型
 */
type SupportStrength = "strong" | "weak" | null

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

/**
 * 毕业要求数据结构
 */
interface GraduationRequirement {
  id: string
  content: string
  indicators: string[]
}

/**
 * 教学目标与毕业要求指标点的关联关系（含支撑强度）
 * key: "objectiveId-requirementId-indicatorIndex", value: 支撑强度
 */
type ObjectiveIndicatorMapping = Record<string, SupportStrength>

/**
 * 从 nodeId 中提取数字ID
 * 例如 "dept_266" -> "266"
 */
function extractNumericId(nodeId: string): string {
  const match = nodeId.match(/\d+/)
  return match ? match[0] : nodeId
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

  // 教学目标与指标点的关联关系（含支撑强度）
  const [supportMapping, setSupportMapping] = useState<ObjectiveIndicatorMapping>({})

  // 保存状态
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // 表头展开状态
  const [expandedReqs, setExpandedReqs] = useState<Set<number>>(new Set())
  const [clampedReqs, setClampedReqs] = useState<Set<number>>(new Set())
  const textRefsMap = useRef<Map<number, HTMLDivElement>>(new Map())

  // 从画布元素中获取教学目标列表
  const objectives = useMemo(() => {
    return canvasElements
      .filter(el => el.type === CanvasComponentType.OBJECTIVE_CARD)
      .map(el => el.data as ObjectiveCardData)
      .sort((a, b) => a.index - b.index)
  }, [canvasElements])

  // 对话框关闭时重置状态（包括下拉框选择状态）
  useEffect(() => {
    if (!open) {
      setSaveSuccess(false)
      setGraduationRequirements([])
      setSupportMapping({})
      setExpandedReqs(new Set())
      setClampedReqs(new Set())
      // 重置三个下拉框的选择状态
      setSelectedPath({
        universityId: null,
        universityName: null,
        departmentId: null,
        departmentName: null,
        majorId: null,
        majorName: null,
      })
    }
  }, [open])

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
    }, 100)
    return () => clearTimeout(timer)
  }, [expandedReqs, graduationRequirements])

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
    setSelectedPath({
      universityId: nodeId,
      universityName: university?.nodeName || null,
      departmentId: null,
      departmentName: null,
      majorId: null,
      majorName: null,
    })
  }, [universities])

  // 处理院系选择变化
  const handleDepartmentChange = useCallback((nodeId: string) => {
    const department = departments.find(d => d.nodeId === nodeId)
    setSelectedPath(prev => ({
      ...prev,
      departmentId: nodeId,
      departmentName: department?.nodeName || null,
      majorId: null,
      majorName: null,
    }))
  }, [departments])

  // 加载专业毕业要求
  const loadGraduationRequirements = useCallback(async (majorId: string) => {
    setIsLoadingRequirements(true)
    try {
      const numericId = extractNumericId(majorId)
      const response = await api.tree.getMajorDetail(numericId)

      if (response.data?.requiresVOS && response.data.requiresVOS.length > 0) {
        const requirements: GraduationRequirement[] = response.data.requiresVOS.map((req: any) => ({
          id: String(req.id),
          content: req.description || "",
          indicators: req.children?.map((child: any) => child.description || "") || [],
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

  // 处理专业选择变化 - 选择后自动加载毕业要求
  const handleMajorChange = useCallback((nodeId: string) => {
    const major = majors.find(m => m.nodeId === nodeId)
    setSelectedPath(prev => ({
      ...prev,
      majorId: nodeId,
      majorName: major?.nodeName || null,
    }))
    // 自动加载该专业的毕业要求数据
    loadGraduationRequirements(nodeId)
  }, [majors, loadGraduationRequirements])

  // 计算总指标点数量
  const totalIndicators = useMemo(() => {
    return graduationRequirements.reduce((sum, req) => sum + (req.indicators?.length || 0), 0)
  }, [graduationRequirements])

  // 处理支撑强度变化
  const handleSupportChange = useCallback((objectiveId: string, reqId: string, indicatorIdx: number, strength: SupportStrength) => {
    const key = `${objectiveId}-${reqId}-${indicatorIdx}`
    setSupportMapping(prev => {
      if (strength === null) {
        const { [key]: _, ...rest } = prev
        return rest
      }
      return {
        ...prev,
        [key]: strength,
      }
    })
  }, [])

  // 获取当前支撑强度
  const getSupportStrength = useCallback((objectiveId: string, reqId: string, indicatorIdx: number): SupportStrength => {
    const key = `${objectiveId}-${reqId}-${indicatorIdx}`
    return supportMapping[key] || null
  }, [supportMapping])

  // 检查是否所有教学目标都已关联至少一个指标点
  const allObjectivesMapped = useMemo(() => {
    if (objectives.length === 0) return false
    return objectives.every(obj => {
      // 检查该教学目标是否有任何关联
      return Object.keys(supportMapping).some(key => key.startsWith(`${obj.id}-`))
    })
  }, [objectives, supportMapping])

  // 处理保存操作
  const handleSave = useCallback(async () => {
    if (!selectedPath.majorId || !courseInfo) {
      toast.error("请先选择专业")
      return
    }

    if (!allObjectivesMapped) {
      toast.error("请为所有教学目标至少关联一个毕业要求指标点")
      return
    }

    setIsSaving(true)

    try {
      // 构建保存请求数据
      const majorId = extractNumericId(selectedPath.majorId)

      // 从courseInfo中提取课程数据
      const metadata = courseInfo.metadata || {}

      // 构建课程矩阵数据（教学目标与毕业要求指标点的关联，含支撑强度）
      const courseMatrixVOS = objectives.map(obj => {
        const indicatorSupports: Array<{ indicatorKey: string; supportStrength: SupportStrength }> = []

        // 遍历所有关联
        Object.entries(supportMapping).forEach(([key, strength]) => {
          if (key.startsWith(`${obj.id}-`)) {
            // key 格式: objectiveId-reqId-indicatorIdx
            const parts = key.split("-")
            const reqId = parts[1]
            const indicatorIdx = parts[2]
            indicatorSupports.push({
              indicatorKey: `${reqId}-${indicatorIdx}`,
              supportStrength: strength,
            })
          }
        })

        return {
          teachingObjectiveId: obj.id,
          teachingObjectiveContent: obj.content,
          teachingObjectiveIndex: obj.index,
          indicatorSupports,
        }
      })

      const saveRequest: SaveCourseUnitRequest = {
        course: {
          id: 0, // 新建课程，ID为0
          majorId: parseInt(majorId, 10),
          classId: 0, // 默认班级ID
          typeId: metadata.courseNatureId || 1, // 课程性质ID
          name: courseInfo.name || "未命名课程",
          introduction: metadata.introduction || null,
          criterion: null,
          theoryPeriod: metadata.theoryPeriod || 0,
          practicePeriod: metadata.practicePeriod || 0,
          courseMatrixVOS,
          position: null,
          // 扩展字段
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

      // 调用保存API
      const apiInstance = new CourseDetailApi()
      const response = await apiInstance.saveCourseUnit(saveRequest)

      if (response.error) {
        throw new Error(response.error)
      }

      // 保存成功
      setSaveSuccess(true)
      toast.success(`课程已成功保存到「${selectedPath.majorName}」专业`)

      // 调用成功回调
      const newCourseId = response.data?.id || response.data?.courseId || "0"
      onSaveSuccess?.(majorId, String(newCourseId))

      // 延迟关闭对话框，让用户看到成功状态
      setTimeout(() => {
        onOpenChange(false)
      }, 1500)

    } catch (error) {
      console.error("[CanvasSaveWizard] 保存课程失败:", error)
      toast.error(error instanceof Error ? error.message : "保存失败，请稍后重试")
    } finally {
      setIsSaving(false)
    }
  }, [selectedPath, courseInfo, objectives, supportMapping, allObjectivesMapped, onSaveSuccess, onOpenChange])

  // 是否可以保存
  const canSave = Boolean(selectedPath.majorId && courseInfo?.name && allObjectivesMapped && totalIndicators > 0 && objectives.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[35vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Save className="h-6 w-6 text-primary" />
            保存课程到专业
          </DialogTitle>
          <DialogDescription className="text-base">
            选择课程归属的专业，并建立教学目标与毕业要求指标点的关联关系
          </DialogDescription>
        </DialogHeader>

        {/* 保存成功状态 */}
        {saveSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 gap-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div className="text-center">
              <p className="text-xl font-medium text-foreground">保存成功</p>
              <p className="text-base text-muted-foreground mt-2">
                课程已成功保存到「{selectedPath.majorName}」专业
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 顶部选择区：三个下拉框水平排列 */}
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

            {/* 矩阵表格区域 */}
            <div className="flex-1 min-h-0 py-4 overflow-hidden">
              {/* 未选择专业时的占位状态 */}
              {!selectedPath.majorId ? (
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
              ) : isLoadingRequirements ? (
                /* 正在加载毕业要求 */
                <div className="h-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/20 bg-primary/5">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-lg font-medium text-primary/80">正在构建专业矩阵</p>
                  </div>
                </div>
              ) : totalIndicators === 0 ? (
                <div className="h-full flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50/50">
                  <div className="flex flex-col items-center gap-2 text-center px-8">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                      <Target className="h-8 w-8 text-gray-500" />
                    </div>
                    <p className="text-base text-gray-600">
                      该专业暂无毕业要求
                    </p>
                  </div>
                </div>
              ) : objectives.length === 0 ? (
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
              ) : (
                <div className="h-full overflow-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      {/* 第一层表头：毕业要求和教学目标 */}
                      <tr className="border-b border-border bg-secondary/80 backdrop-blur-sm">
                        <th
                          className="text-left p-3 text-foreground font-semibold border-r border-border bg-secondary sticky left-0 z-20 min-w-[200px]"
                        >
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
                              style={{ minWidth: `${indicatorCount * 100}px` }}
                            >
                              <div className="flex items-center justify-center gap-2">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary">
                                  {reqIndex + 1}
                                </div>
                                <div className="flex-1 text-left flex items-center gap-1">
                                  <div
                                    ref={(el) => {
                                      if (el) {
                                        textRefsMap.current.set(reqIndex, el)
                                      }
                                    }}
                                    className={cn("text-sm font-medium", isExpanded ? "" : "line-clamp-2")}
                                  >
                                    {req.content}
                                  </div>
                                  {isClamped && (
                                    <button
                                      onClick={() => {
                                        const newExpanded = new Set(expandedReqs)
                                        if (isExpanded) {
                                          newExpanded.delete(reqIndex)
                                        } else {
                                          newExpanded.add(reqIndex)
                                        }
                                        setExpandedReqs(newExpanded)
                                      }}
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
                        {/* 教学目标列的占位单元格 */}
                        <th className="border-r border-border bg-secondary sticky left-0 z-20 min-w-[200px]"></th>
                        {graduationRequirements.flatMap((req, reqIndex) => {
                          return (req.indicators || []).map((indicator, indicatorIdx) => (
                            <th
                              key={`${req.id}-${indicatorIdx}`}
                              className="text-center p-2 text-muted-foreground border-r border-border min-w-[100px]"
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
                          {graduationRequirements.flatMap((req) => {
                            return (req.indicators || []).map((_, indicatorIdx) => {
                              const strength = getSupportStrength(objective.id, req.id, indicatorIdx)

                              return (
                                <td key={`${objective.id}-${req.id}-${indicatorIdx}`} className="p-2 text-center border-r border-border">
                                  <div className="flex flex-col items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSupportChange(
                                        objective.id,
                                        req.id,
                                        indicatorIdx,
                                        strength === "strong" ? null : "strong"
                                      )}
                                      className={cn(
                                        "w-full px-2 py-1 rounded text-xs font-medium transition-all cursor-pointer border",
                                        strength === "strong"
                                          ? "bg-orange-500 text-white border-orange-500"
                                          : "bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-400 hover:bg-orange-100"
                                      )}
                                    >
                                      强
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSupportChange(
                                        objective.id,
                                        req.id,
                                        indicatorIdx,
                                        strength === "weak" ? null : "weak"
                                      )}
                                      className={cn(
                                        "w-full px-2 py-1 rounded text-xs font-medium transition-all cursor-pointer border",
                                        strength === "weak"
                                          ? "bg-green-500 text-white border-green-500"
                                          : "bg-green-50 text-green-600 border-green-200 hover:border-green-400 hover:bg-green-100"
                                      )}
                                    >
                                      弱
                                    </button>
                                  </div>
                                </td>
                              )
                            })
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    保存课程
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
