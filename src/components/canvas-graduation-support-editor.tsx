"use client"

/**
 * 专业矩阵编辑器组件
 * 用于在抽屉中编辑毕业要求指标点的强弱支撑关系
 * - 三级级联选择：学校 -> 院系 -> 专业（使用组件库 Select）
 * - 快速筛选区域：全部 / 强支撑 / 弱支撑 / 未设置
 * - 加载毕业要求和指标点数据（只读）
 * - 每个指标点右侧显示强支撑/弱支撑按钮
 */

import { useState, useCallback, useEffect, useMemo } from "react"
import { Loader2, ChevronDown, ChevronRight, Shield, Search, X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Input } from "@/shared/components/ui/input"
import { cn } from "@/shared/utils/utils"
import { TreeApi } from "@/lib/api/tree-api"
import type { TreeNode } from "@/types"
import type { GraduationSupportData } from "./canvas-elements/types"

const treeApiInstance = new TreeApi()

/**
 * 将文本中匹配关键字的部分用 <mark> 高亮包裹
 * 不匹配时原样返回纯文本，避免不必要的 React 节点
 */
function highlightText(text: string, keyword: string): React.ReactNode {
  if (!keyword) return text
  const lowerText = text.toLowerCase()
  const lowerKw = keyword.toLowerCase()
  const idx = lowerText.indexOf(lowerKw)
  if (idx === -1) return text
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + keyword.length)
  const after = text.slice(idx + keyword.length)
  return (
    <>
      {before}
      <mark className="bg-yellow-200 text-inherit rounded-sm px-0.5">{match}</mark>
      {typeof after === "string" && after.length > 0 ? highlightText(after, keyword) : null}
    </>
  )
}

// 毕业要求内部数据结构
interface RequirementItem {
  id: number
  content: string
  indicators: Array<{
    id: number
    description: string
    supportLevel?: "strong" | "weak"
  }>
}

interface CanvasGraduationSupportEditorProps {
  data: GraduationSupportData
  onSave: (data: GraduationSupportData) => void
  onClose: () => void
  isSaving?: boolean
}

export function CanvasGraduationSupportEditor({
  data,
  onSave,
  onClose,
  isSaving = false,
}: CanvasGraduationSupportEditorProps) {
  // 组织选择状态
  const [universities, setUniversities] = useState<TreeNode[]>([])
  const [departments, setDepartments] = useState<TreeNode[]>([])
  const [majors, setMajors] = useState<TreeNode[]>([])

  const [selectedUniversityId, setSelectedUniversityId] = useState(data.universityId || "")
  const [selectedUniversityName, setSelectedUniversityName] = useState(data.universityName || "")
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(data.departmentId || "")
  const [selectedDepartmentName, setSelectedDepartmentName] = useState(data.departmentName || "")
  const [selectedMajorId, setSelectedMajorId] = useState(data.majorId || "")
  const [selectedMajorName, setSelectedMajorName] = useState(data.majorName || "")

  // 毕业要求数据
  const [requirements, setRequirements] = useState<RequirementItem[]>(data.requirements || [])
  const [isLoadingTree, setIsLoadingTree] = useState(false)
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(false)

  // 搜索关键字
  const [searchKeyword, setSearchKeyword] = useState("")

  // 折叠状态
  const [expandedReqs, setExpandedReqs] = useState<Set<number>>(() => new Set(
    (data.requirements || []).map((_, i) => i)
  ))

  // 加载树形数据
  useEffect(() => {
    const loadTree = async () => {
      setIsLoadingTree(true)
      try {
        const response = await treeApiInstance.getTree()
        if (response.data?.children) {
          setUniversities(response.data.children.filter(n => n.nodeType === "university"))
        }
      } catch (error) {
        console.error("Failed to load tree data:", error)
      } finally {
        setIsLoadingTree(false)
      }
    }
    loadTree()
  }, [])

  // 学校变化时更新院系列表
  useEffect(() => {
    if (!selectedUniversityId) {
      setDepartments([])
      return
    }
    const university = universities.find(u => u.id === selectedUniversityId)
    if (university?.children) {
      setDepartments(university.children.filter(n => n.nodeType === "department"))
    } else {
      setDepartments([])
    }
  }, [selectedUniversityId, universities])

  // 院系变化时更新专业列表
  useEffect(() => {
    if (!selectedDepartmentId) {
      setMajors([])
      return
    }
    const department = departments.find(d => d.id === selectedDepartmentId)
    if (department?.children) {
      setMajors(department.children.filter(n => n.nodeType === "major"))
    } else {
      setMajors([])
    }
  }, [selectedDepartmentId, departments])

  // 专业变化时加载毕业要求
  useEffect(() => {
    if (!selectedMajorId) return

    if (selectedMajorId === data.majorId && data.requirements && data.requirements.length > 0) {
      return
    }

    const loadRequirements = async () => {
      setIsLoadingRequirements(true)
      try {
        const response = await treeApiInstance.getMajorDetail(selectedMajorId)
        if (response.data?.requiresVOS) {
          const reqs: RequirementItem[] = response.data.requiresVOS.map((req: Record<string, unknown>) => ({
            id: req.id as number,
            content: (req.description as string) || "",
            indicators: ((req.children as Array<Record<string, unknown>>) || []).map((child) => ({
              id: child.id as number,
              description: (child.description as string) || "",
              supportLevel: undefined,
            })),
          }))
          setRequirements(reqs)
          setExpandedReqs(new Set(reqs.map((_, i) => i)))
        } else {
          setRequirements([])
        }
      } catch (error) {
        console.error("Failed to load graduation requirements:", error)
        setRequirements([])
      } finally {
        setIsLoadingRequirements(false)
      }
    }

    loadRequirements()
  }, [selectedMajorId, data.majorId, data.requirements])

  // 处理学校选择
  const handleUniversityChange = useCallback((value: string) => {
    const university = universities.find(u => u.id === value)
    setSelectedUniversityId(value)
    setSelectedUniversityName(university?.nodeName || "")
    setSelectedDepartmentId("")
    setSelectedDepartmentName("")
    setSelectedMajorId("")
    setSelectedMajorName("")
    setRequirements([])
  }, [universities])

  // 处理院系选择
  const handleDepartmentChange = useCallback((value: string) => {
    const department = departments.find(d => d.id === value)
    setSelectedDepartmentId(value)
    setSelectedDepartmentName(department?.nodeName || "")
    setSelectedMajorId("")
    setSelectedMajorName("")
    setRequirements([])
  }, [departments])

  // 处理专业选择
  const handleMajorChange = useCallback((value: string) => {
    const major = majors.find(m => m.id === value)
    setSelectedMajorId(value)
    setSelectedMajorName(major?.nodeName || "")
  }, [majors])

  // 处理支撑等级切换
  const handleSupportLevelChange = useCallback((reqIndex: number, indicatorIndex: number, level: "strong" | "weak") => {
    setRequirements(prev => prev.map((req, ri) => {
      if (ri !== reqIndex) return req
      return {
        ...req,
        indicators: req.indicators.map((ind, ii) => {
          if (ii !== indicatorIndex) return ind
          return {
            ...ind,
            supportLevel: ind.supportLevel === level ? undefined : level,
          }
        }),
      }
    }))
  }, [])

  // 折叠/展开切换
  const toggleExpand = useCallback((reqIndex: number) => {
    setExpandedReqs(prev => {
      const next = new Set(prev)
      if (next.has(reqIndex)) {
        next.delete(reqIndex)
      } else {
        next.add(reqIndex)
      }
      return next
    })
  }, [])

  // 已设置支撑关系的数量
  const supportCount = useMemo(() => {
    let count = 0
    requirements.forEach(req => {
      req.indicators.forEach(ind => {
        if (ind.supportLevel) count++
      })
    })
    return count
  }, [requirements])

  // 根据搜索关键字过滤指标点
  const filteredRequirements = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()
    if (!keyword) return null // null 表示不筛选
    return requirements.map(req => {
      // 毕业要求标题匹配时，显示其下所有指标点
      const reqMatches = req.content.toLowerCase().includes(keyword)
      return {
        ...req,
        visibleIndicatorIndices: reqMatches
          ? req.indicators.map((_, i) => i)
          : req.indicators
              .map((ind, idx) => ({ ind, idx }))
              .filter(({ ind }) => ind.description.toLowerCase().includes(keyword))
              .map(({ idx }) => idx),
      }
    })
  }, [requirements, searchKeyword])

  // 保存
  const handleSave = useCallback(() => {
    const saveData: GraduationSupportData = {
      id: data.id,
      universityId: selectedUniversityId,
      universityName: selectedUniversityName,
      departmentId: selectedDepartmentId,
      departmentName: selectedDepartmentName,
      majorId: selectedMajorId,
      majorName: selectedMajorName,
      requirements,
    }
    onSave(saveData)
  }, [
    data.id,
    selectedUniversityId, selectedUniversityName,
    selectedDepartmentId, selectedDepartmentName,
    selectedMajorId, selectedMajorName,
    requirements, onSave,
  ])

  return (
    <div className="flex flex-col h-full">
      {/* 编辑区域 */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full flex flex-col">
          {/* 标题 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm bg-emerald-500" />
              <h3 className="text-base font-semibold text-foreground">专业矩阵管理</h3>
              {supportCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({supportCount} 个支撑关系)
                </span>
              )}
            </div>
          </div>
          <div className="border-t border-dashed border-border mb-4" />

          {/* 三级级联选择器 */}
          <div className="space-y-3 mb-4">
            {/* 学校选择 */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted-foreground w-14 flex-shrink-0">学校</label>
              <Select
                value={selectedUniversityId || undefined}
                onValueChange={handleUniversityChange}
                disabled={isLoadingTree}
              >
                <SelectTrigger className="w-1/2">
                  <SelectValue placeholder={isLoadingTree ? "加载中..." : "请选择学校"} />
                </SelectTrigger>
                <SelectContent>
                  {universities.map(u => (
                    <SelectItem key={u.id} value={u.id || ""}>{u.nodeName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 院系选择 */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted-foreground w-14 flex-shrink-0">院系</label>
              <Select
                value={selectedDepartmentId || undefined}
                onValueChange={handleDepartmentChange}
                disabled={!selectedUniversityId || departments.length === 0}
              >
                <SelectTrigger className="w-1/2">
                  <SelectValue
                    placeholder={
                      !selectedUniversityId ? "请先选择学校" : departments.length === 0 ? "暂无院系" : "请选择院系"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id || ""}>{d.nodeName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 专业选择 */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted-foreground w-14 flex-shrink-0">专业</label>
              <Select
                value={selectedMajorId || undefined}
                onValueChange={handleMajorChange}
                disabled={!selectedDepartmentId || majors.length === 0}
              >
                <SelectTrigger className="w-1/2">
                  <SelectValue
                    placeholder={
                      !selectedDepartmentId ? "请先选择院系" : majors.length === 0 ? "暂无专业" : "请选择专业"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {majors.map(m => (
                    <SelectItem key={m.id} value={m.id || ""}>{m.nodeName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-dashed border-border mb-4" />

          {/* 搜索区域 - 宽度 = label(w-14) + gap(gap-3) + select(w-1/2)，与上方对齐 */}
          {requirements.length > 0 && (
            <div className="relative mb-4" style={{ width: "calc(3.5rem + 0.75rem + 50%)" }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索毕业要求或指标点..."
                className="pl-9 pr-8 h-9"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-sm hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* 毕业要求 + 指标点列表 */}
          <div className="flex-1 overflow-auto">
            {isLoadingRequirements ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-emerald-500" />
                <p className="text-sm">加载毕业要求数据...</p>
              </div>
            ) : requirements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Shield className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm mb-1">
                  {selectedMajorId ? "该专业暂无毕业要求数据" : "请先选择专业"}
                </p>
                <p className="text-xs opacity-70">
                  选择专业后将自动加载毕业要求和指标点
                </p>
              </div>
            ) : filteredRequirements && filteredRequirements.every(r => r.visibleIndicatorIndices.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm mb-1">未找到匹配内容</p>
                <p className="text-xs opacity-70">
                  尝试更换关键字搜索
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {requirements.map((req, reqIndex) => {
                  const isExpanded = expandedReqs.has(reqIndex)
                  const indicatorSupportCount = req.indicators.filter(ind => ind.supportLevel).length

                  // 获取当前筛选下可见的指标点索引
                  const visibleIndices = filteredRequirements
                    ? filteredRequirements[reqIndex]?.visibleIndicatorIndices || []
                    : req.indicators.map((_, i) => i)

                  // 筛选模式下，如果该毕业要求没有可见指标点，隐藏整个块
                  if (filteredRequirements && visibleIndices.length === 0) return null

                  return (
                    <div
                      key={req.id}
                      className="rounded-lg border border-border bg-secondary/20 overflow-hidden"
                    >
                      {/* 毕业要求标题行 */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(reqIndex)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-secondary/40 transition-colors text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                          {reqIndex + 1}
                        </div>
                        <span className="flex-1 text-sm font-medium text-foreground line-clamp-2">
                          {highlightText(req.content, searchKeyword.trim())}
                        </span>
                        {filteredRequirements ? (
                          <span className="flex-shrink-0 text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                            {visibleIndices.length}/{req.indicators.length}
                          </span>
                        ) : indicatorSupportCount > 0 ? (
                          <span className="flex-shrink-0 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {indicatorSupportCount}/{req.indicators.length}
                          </span>
                        ) : null}
                      </button>

                      {/* 指标点列表 */}
                      {isExpanded && (
                        <div className="border-t border-border">
                          {req.indicators.map((indicator, indIndex) => {
                            // 筛选模式下隐藏不可见的指标点
                            if (filteredRequirements && !visibleIndices.includes(indIndex)) return null

                            return (
                              <div
                                key={indicator.id}
                                className="flex items-start gap-3 px-3 py-2.5 border-b last:border-b-0 border-border/50 hover:bg-secondary/30 transition-colors"
                              >
                                {/* 指标点序号 */}
                                <span className="flex-shrink-0 text-xs font-medium text-muted-foreground mt-0.5 w-8">
                                  {reqIndex + 1}.{indIndex + 1}
                                </span>
                                {/* 指标点描述 */}
                                <span className="flex-1 text-sm text-foreground/80 leading-relaxed">
                                  {highlightText(indicator.description, searchKeyword.trim())}
                                </span>
                                {/* 强弱支撑按钮 */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleSupportLevelChange(reqIndex, indIndex, "strong")}
                                    className={cn(
                                      "px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer",
                                      "border hover:shadow-sm",
                                      indicator.supportLevel === "strong"
                                        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                                        : "bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400 hover:bg-orange-100",
                                    )}
                                  >
                                    强支撑
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSupportLevelChange(reqIndex, indIndex, "weak")}
                                    className={cn(
                                      "px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer",
                                      "border hover:shadow-sm",
                                      indicator.supportLevel === "weak"
                                        ? "bg-green-500 text-white border-green-500 shadow-sm"
                                        : "bg-green-50 text-green-700 border-green-200 hover:border-green-400 hover:bg-green-100",
                                    )}
                                  >
                                    弱支撑
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-border flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          取消
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            "保存"
          )}
        </Button>
      </div>
    </div>
  )
}

export default CanvasGraduationSupportEditor
