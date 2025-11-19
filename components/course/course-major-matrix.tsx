"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { BookMarked, Pencil, X, Loader2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TreeNode } from "@/types"

interface CourseMajorMatrixProps {
  node: TreeNode
  majorNode?: TreeNode
  onUpdateNode?: (nodeId: string, updates: any) => void
}

export function CourseMajorMatrix({ node, majorNode, onUpdateNode }: CourseMajorMatrixProps) {
  const [isEditingMatrix, setIsEditingMatrix] = useState(false)
  const [matrixSupportLevels, setMatrixSupportLevels] = useState<Record<string, string>>({})
  const [isSavingMatrix, setIsSavingMatrix] = useState(false)
  const [expandedReqs, setExpandedReqs] = useState<Set<number>>(new Set())
  const [clampedReqs, setClampedReqs] = useState<Set<number>>(new Set())
  const textRefsMap = useRef<Map<number, HTMLDivElement>>(new Map())
  const [expandedIndicators, setExpandedIndicators] = useState<Set<string>>(new Set())
  const [clampedIndicators, setClampedIndicators] = useState<Set<string>>(new Set())
  const indicatorRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())

  // 获取毕业要求数据
  const getGraduationRequirements = () => {
    if (majorNode?.metadata?.requiresVOS && majorNode.metadata.requiresVOS.length > 0) {
      return majorNode.metadata.requiresVOS.map((req: any) => ({
        id: req.id,
        content: req.description || "",
        indicators: req.children?.map((child: any) => child.description || "") || [],
      }))
    }
    return []
  }

  useEffect(() => {
    if (node?.metadata?.courseMajorMatrixSupportLevels) {
      setMatrixSupportLevels(node.metadata.courseMajorMatrixSupportLevels)
    }
  }, [node])

  useEffect(() => {
    if (!isEditingMatrix) return

    const autoSaveInterval = setInterval(() => {
      handleSaveMatrix(true)
    }, 10000)

    return () => clearInterval(autoSaveInterval)
  }, [isEditingMatrix, matrixSupportLevels])

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
  }, [majorNode])

  const handleSupportLevelChange = (reqId: number, indicatorIdx: number, value: string) => {
    const key = `${reqId}-${indicatorIdx}`
    setMatrixSupportLevels((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSaveMatrix = async (isAutoSave = false) => {
    setIsSavingMatrix(true)

    if (onUpdateNode) {
      onUpdateNode(node.id, {
        metadata: {
          ...node.metadata,
          courseMajorMatrixSupportLevels: matrixSupportLevels,
        },
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsSavingMatrix(false)

    if (!isAutoSave) {
      setIsEditingMatrix(false)
    }
  }

  const handleCancelMatrix = () => {
    if (node?.metadata?.courseMajorMatrixSupportLevels) {
      setMatrixSupportLevels(node.metadata.courseMajorMatrixSupportLevels)
    } else {
      setMatrixSupportLevels({})
    }
    setIsEditingMatrix(false)
  }

  const graduationRequirements = getGraduationRequirements()

  return (
    <div className="rounded-lg border border-border bg-white/40 backdrop-blur-md p-6 space-y-4">
      {graduationRequirements.length > 0 ? (
        <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-primary" />
              专业矩阵
            </h3>
            {!isEditingMatrix ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditingMatrix(true)}
                className="gap-2 bg-transparent"
              >
                <Pencil className="w-3.5 h-3.5" />
                编辑
              </Button>
            ) : (
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
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
            )}
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
                    const rowKey = req.id
                    const isRowExpanded = indicators.some((_: any, idx: number) => expandedIndicators.has(`${req.id}-${idx}`))
                    const hasClampedInRow = indicators.some((_: any, idx: number) => clampedIndicators.has(`${req.id}-${idx}`))

                    return indicators.map((indicator: string, indicatorIdx: number) => {
                      const indicatorKey = `${req.id}-${indicatorIdx}`
                      const isExpanded = expandedIndicators.has(indicatorKey)
                      const isClamped = clampedIndicators.has(indicatorKey)

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
                      const supportLevel = matrixSupportLevels[key] || "未设置"

                      return (
                        <td key={key} className="p-3 text-center border-r border-border">
                          {isEditingMatrix ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSupportLevelChange(req.id, indicatorIdx, "强支撑")}
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
                                onClick={() => handleSupportLevelChange(req.id, indicatorIdx, "弱支撑")}
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
          <p className="text-xs">请先在专业详情中添加毕业要求</p>
        </div>
      )}
    </div>
  )
}

