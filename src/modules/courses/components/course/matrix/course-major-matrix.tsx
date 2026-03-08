"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/shared/components/ui/button"
import { BookMarked, Info, X, Check } from "lucide-react"
import { LoadingState } from "@/shared/components/ui/loading-state"
import { Spinner } from "@/shared/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"
import { cn } from "@/shared/utils/utils"
import { courseDetailApi } from "@/modules/courses/api/courseDetailApi"
import { api } from "@/lib/api"
import type { TreeNode } from "@/types"
import type { MajorMatrixItemResponse } from "@/lib/api/matrix-api"

interface CourseMajorMatrixProps {
  node: TreeNode
  majorNode?: TreeNode
  majorId?: string | number
  courseEditable?: boolean
}

export function CourseMajorMatrix({ node, majorNode, majorId, courseEditable = false }: CourseMajorMatrixProps) {
  const canManageMatrix = courseEditable
  const [isEditingMatrix, setIsEditingMatrix] = useState(false)
  const [matrixData, setMatrixData] = useState<MajorMatrixItemResponse[]>([])
  const [isSavingMatrix, setIsSavingMatrix] = useState(false)
  const [expandedReqs, setExpandedReqs] = useState<Set<number>>(new Set())
  const [clampedReqs, setClampedReqs] = useState<Set<number>>(new Set())
  const textRefsMap = useRef<Map<number, HTMLDivElement>>(new Map())
  const [expandedIndicators, setExpandedIndicators] = useState<Set<string>>(new Set())
  const [clampedIndicators, setClampedIndicators] = useState<Set<string>>(new Set())
  const indicatorRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())
  const [majorDetailData, setMajorDetailData] = useState<any>(null)
  // 派生值：专业详情加载完成即可渲染（matrixData 通过 Promise.all 同步加载）
  const isDataReady = majorDetailData !== null

  // 并行加载专业详情和矩阵数据，使用 Promise.all 避免竞态条件
  const loadAllData = useCallback(async () => {
    if (!majorId || !node?.id) return

    try {
      const [majorDetailResponse, matrixResponse] = await Promise.all([
        courseDetailApi.getMajorDetail(majorId),
        api.matrices.getMajorMatrix(String(node.id)),
      ])

      if (majorDetailResponse.data) {
        setMajorDetailData(majorDetailResponse.data)
      }
      if (matrixResponse.data) {
        setMatrixData(matrixResponse.data)
      }
    } catch (error) {
      console.error("[CourseMajorMatrix] 加载数据失败:", error)
    }
  }, [majorId, node?.id])

  // 获取毕业要求数据
  const getGraduationRequirements = () => {
    // 优先使用从API加载的专业详情数据
    if (majorDetailData?.requiresVOS && majorDetailData.requiresVOS.length > 0) {
      return majorDetailData.requiresVOS.map((req: any) => ({
        id: req.id,
        content: req.description || "",
        indicators: req.children?.map((child: any) => child.description || "") || [],
      }))
    }
    return []
  }

  // 根据 graduateRequireId 获取支撑级别
  const getSupportLevel = (reqId: number, indicatorIdx: number): string => {
    const req = majorDetailData?.requiresVOS?.find((r: any) => r.id === reqId)
    if (!req?.children?.[indicatorIdx]) {
      return "未设置"
    }
    const graduateRequireId = req.children[indicatorIdx].id
    const matrixItem = matrixData.find(
      (item) => item.graduateRequireId === graduateRequireId
    )
    if (!matrixItem) return "未设置"
    return matrixItem.relate === 0 ? "强支撑" : "弱支撑"
  }

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  const handleSaveMatrix = useCallback(async (isAutoSave = false) => {
    if (!canManageMatrix) return

    setIsSavingMatrix(true)

    try {
      // 构建保存数据，id为0表示新增
      const saveData = matrixData.map((item) => ({
        id: item.id > 0 ? item.id : 0,
        majorId: item.majorId,
        courseUnitId: item.courseUnitId,
        courseUnitName: item.courseUnitName || "",
        graduateRequireId: item.graduateRequireId,
        relate: item.relate,
      }))

      await api.matrices.updateMajorMatrix(String(node.id), saveData)
      console.log("[CourseMajorMatrix] 专业矩阵保存成功")
    } catch (error) {
      console.error("保存专业矩阵数据失败:", error)
    } finally {
      setIsSavingMatrix(false)

      if (!isAutoSave) {
        setIsEditingMatrix(false)
      }
    }
  }, [canManageMatrix, matrixData, node.id])

  useEffect(() => {
    if (!canManageMatrix || !isEditingMatrix) return

    const autoSaveInterval = setInterval(() => {
      handleSaveMatrix(true)
    }, 10000)

    return () => clearInterval(autoSaveInterval)
  }, [canManageMatrix, isEditingMatrix, matrixData, handleSaveMatrix])

  // 检测毕业要求文本是否被截断
  useEffect(() => {
    const newClampedReqs = new Set<number>()
    textRefsMap.current.forEach((element, index) => {
      if (!expandedReqs.has(index) && element.scrollHeight > element.clientHeight) {
        newClampedReqs.add(index)
      }
    })
    setClampedReqs(newClampedReqs)
  }, [expandedReqs])

  // 检测指标点文本是否被截断
  useEffect(() => {
    const newClampedIndicators = new Set<string>()
    indicatorRefsMap.current.forEach((element, key) => {
      if (!expandedIndicators.has(key) && element.scrollHeight > element.clientHeight) {
        newClampedIndicators.add(key)
      }
    })
    setClampedIndicators(newClampedIndicators)
  }, [expandedIndicators])

  // 初始化时检测指标点截断状态
  useEffect(() => {
    const timer = setTimeout(() => {
      const newClampedIndicators = new Set<string>()
      indicatorRefsMap.current.forEach((element, key) => {
        if (!expandedIndicators.has(key) && element.scrollHeight > element.clientHeight) {
          newClampedIndicators.add(key)
        }
      })
      setClampedIndicators(newClampedIndicators)
    }, 100)
    return () => clearTimeout(timer)
  }, [majorNode, expandedIndicators])

  // 处理支撑级别变更（编辑模式），支持点击切换选中/取消选中
  const handleSupportLevelChange = (reqId: number, indicatorIdx: number, value: number) => {
    if (!canManageMatrix) return

    const req = majorDetailData?.requiresVOS?.find((r: any) => r.id === reqId)
    if (!req?.children?.[indicatorIdx]) return

    const graduateRequireId = req.children[indicatorIdx].id
    const existingIndex = matrixData.findIndex((item) => item.graduateRequireId === graduateRequireId)

    const newData = [...matrixData]
    if (existingIndex >= 0) {
      // 已存在该项
      if (newData[existingIndex].relate === value) {
        // 再次点击相同按钮，取消选中（删除该项）
        newData.splice(existingIndex, 1)
      } else {
        // 点击不同按钮，切换支撑级别
        newData[existingIndex] = {
          ...newData[existingIndex],
          relate: value,
        }
      }
    } else {
      // 添加新项
      newData.push({
        id: 0, // 新增时id为0，由后端生成
        majorId: Number(majorId) || 0,
        courseUnitId: Number(node.id) || 0,
        courseUnitName: node.name || "",
        graduateRequireId,
        relate: value,
      })
    }
    setMatrixData(newData)
  }

  // 取消编辑
  const handleCancelMatrix = () => {
    if (!canManageMatrix) return

    // 重新从API加载数据
    loadAllData()
    setIsEditingMatrix(false)
  }

  const graduationRequirements = getGraduationRequirements()

  return (
    <div className="rounded-lg border border-border bg-white/40 backdrop-blur-md p-6 space-y-4">
      {!isDataReady ? (
        <LoadingState title="加载中" variant="card" />
      ) : graduationRequirements.length > 0 ? (
        <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-primary" />
              专业矩阵
            </h3>
            {!isEditingMatrix ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="专业矩阵编辑说明"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-primary/30 bg-primary/5 text-primary transition-colors hover:border-primary/50 hover:bg-primary/10"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" align="end">
                  专业矩阵现在由专业负责人统一设置
                </TooltipContent>
              </Tooltip>
            ) : isEditingMatrix && canManageMatrix ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelMatrix}
                  className="gap-2 bg-transparent"
                  disabled={isSavingMatrix}
                >
                  <X className="w-3.5 h-3.5" />
                  取消
                </Button>
                <Button size="sm" onClick={() => handleSaveMatrix(false)} className="gap-2" disabled={isSavingMatrix}>
                  {isSavingMatrix ? (
                    <>
                      <Spinner className="w-3.5 h-3.5" />
                      保存中
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      保存
                    </>
                  )}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {/* 第一层表头：毕业要求 */}
                <tr className="border-b border-border bg-secondary/50">
                  {graduationRequirements.map((req: any, reqIndex: number) => {
                    const indicatorCount = (req.indicators || []).length || 1
                    const isExpanded = expandedReqs.has(reqIndex)
                    const isClamped = clampedReqs.has(reqIndex)

                    return (
                      <th
                        key={req.id}
                        colSpan={indicatorCount}
                        className="text-center p-3 text-muted-foreground font-medium border-r border-border"
                        style={{ width: "1000px", minWidth: "1000px" }}
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
                              className={isExpanded ? "" : "line-clamp-2"}
                              style={{ fontSize: "0.96rem", fontWeight: 600 }}
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
                <tr className="border-b border-border bg-secondary/30">
                  {graduationRequirements.map((req: any, reqIndex: number) => {
                    const indicators = req.indicators || []
                    const isRowExpanded = indicators.some((_: any, idx: number) => expandedIndicators.has(`${req.id}-${idx}`))
                    const hasClampedInRow = indicators.some((_: any, idx: number) => clampedIndicators.has(`${req.id}-${idx}`))

                    return indicators.map((indicator: string, indicatorIdx: number) => {
                      const indicatorKey = `${req.id}-${indicatorIdx}`
                      const isExpanded = expandedIndicators.has(indicatorKey)

                      return (
                        <th
                          key={indicatorKey}
                          className="text-center p-3 text-muted-foreground border-r border-border"
                          style={{ width: "250px", minWidth: "250px" }}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-sm" style={{ fontSize: "0.96rem", fontWeight: 600 }}>{reqIndex + 1}.{indicatorIdx + 1}</span>
                            <div
                              ref={(el) => {
                                if (el) {
                                  indicatorRefsMap.current.set(indicatorKey, el)
                                }
                              }}
                              className={isExpanded ? "break-words" : "line-clamp-3 break-words"}
                              style={{ fontSize: "0.96rem", fontWeight: 600 }}
                            >
                              {indicator}
                            </div>
                            {hasClampedInRow && (
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedIndicators)
                                  if (isRowExpanded) {
                                    indicators.forEach((_: any, idx: number) => {
                                      newExpanded.delete(`${req.id}-${idx}`)
                                    })
                                  } else {
                                    indicators.forEach((_: any, idx: number) => {
                                      newExpanded.add(`${req.id}-${idx}`)
                                    })
                                  }
                                  setExpandedIndicators(newExpanded)
                                }}
                                className="text-xs text-primary hover:underline cursor-pointer"
                              >
                                {isRowExpanded ? "收起" : "展开"}
                              </button>
                            )}
                          </div>
                        </th>
                      )
                    })
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border hover:bg-white/50 transition-colors">
                  {graduationRequirements.flatMap((req: any) => {
                    const indicators = req.indicators || []
                    return indicators.map((_indicator: string, indicatorIdx: number) => {
                      const key = `${req.id}-${indicatorIdx}`
                      const supportLevel = getSupportLevel(req.id, indicatorIdx)

                      return (
                        <td key={key} className="p-3 text-center border-r border-border">
                          {isEditingMatrix && canManageMatrix ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSupportLevelChange(req.id, indicatorIdx, 0)}
                                className={cn(
                                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                                  "border hover:shadow-sm",
                                  supportLevel === "强支撑"
                                    ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                                    : "bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400 hover:bg-orange-100",
                                )}
                              >
                                强支撑
                              </button>
                              <button
                                onClick={() => handleSupportLevelChange(req.id, indicatorIdx, 1)}
                                className={cn(
                                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                                  "border hover:shadow-sm",
                                  supportLevel === "弱支撑"
                                    ? "bg-green-500 text-white border-green-500 shadow-sm"
                                    : "bg-green-50 text-green-700 border-green-200 hover:border-green-400 hover:bg-green-100",
                                )}
                              >
                                弱支撑
                              </button>
                            </div>
                          ) : (
                            <span
                              className={cn(
                                "inline-block px-3 py-1 rounded-full text-xs font-medium",
                                supportLevel === "强支撑" && "bg-orange-100 border border-orange-300 text-orange-700",
                                supportLevel === "弱支撑" && "bg-green-100 border border-green-300 text-green-700",
                                supportLevel === "未设置" && "bg-muted/50 border border-border text-muted-foreground",
                              )}
                            >
                              {supportLevel}
                            </span>
                          )}
                        </td>
                      )
                    })
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm mb-2">暂无毕业要求数据</p>
          <p className="text-xs">请等待专业管理员设置课程支撑关系</p>
        </div>
      )}
    </div>
  )
}
