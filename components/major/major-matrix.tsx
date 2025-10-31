"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { BookMarked, Pencil, X, Loader2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TreeNode } from "@/types"

interface MajorMatrixProps {
  node: TreeNode
  onUpdateNode?: (nodeId: string, updates: any) => void
}

export function MajorMatrix({ node, onUpdateNode }: MajorMatrixProps) {
  const [isEditingMatrix, setIsEditingMatrix] = useState(false)
  const [matrixSupportLevels, setMatrixSupportLevels] = useState<Record<string, string>>({})
  const [isSavingMatrix, setIsSavingMatrix] = useState(false)

  useEffect(() => {
    if (node?.metadata?.matrixSupportLevels) {
      setMatrixSupportLevels(node.metadata.matrixSupportLevels)
    }
  }, [node])

  useEffect(() => {
    if (!isEditingMatrix) return

    const autoSaveInterval = setInterval(() => {
      handleSaveMatrix(true)
    }, 10000)

    return () => clearInterval(autoSaveInterval)
  }, [isEditingMatrix, matrixSupportLevels])

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
          matrixSupportLevels,
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
    if (node?.metadata?.matrixSupportLevels) {
      setMatrixSupportLevels(node.metadata.matrixSupportLevels)
    } else {
      setMatrixSupportLevels({})
    }
    setIsEditingMatrix(false)
  }

  return (
    <div className="rounded-lg border border-border bg-white/40 backdrop-blur-md p-6 space-y-4">
      {node.metadata?.graduationRequirements && node.metadata.graduationRequirements.length > 0 ? (
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
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left p-3 text-muted-foreground font-medium w-[35%]">毕业要求</th>
                  <th className="text-left p-3 text-muted-foreground font-medium w-[45%]">指标点</th>
                  <th className="text-center p-3 text-muted-foreground font-medium w-[20%]">支撑度</th>
                </tr>
              </thead>
              <tbody>
                {node.metadata.graduationRequirements.map((req: any, reqIndex: number) => {
                  const indicators = req.indicators || []
                  const rowCount = indicators.length || 1

                  return indicators.length > 0 ? (
                    indicators.map((indicator: string, indicatorIdx: number) => {
                      const key = `${req.id}-${indicatorIdx}`
                      const supportLevel = matrixSupportLevels[key] || "未设置"

                      return (
                        <tr key={key} className="border-b border-border hover:bg-white/50 transition-colors">
                          {indicatorIdx === 0 && (
                            <td rowSpan={rowCount} className="p-3 align-top border-r border-border bg-secondary/20">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-medium text-primary">
                                  {reqIndex + 1}
                                </div>
                                <div className="flex-1 text-sm text-foreground leading-relaxed">{req.content}</div>
                              </div>
                            </td>
                          )}

                          <td className="p-3 border-r border-border">
                            <div className="flex items-start gap-2">
                              <span className="text-sm text-muted-foreground flex-shrink-0 mt-0.5">
                                {reqIndex + 1}.{indicatorIdx + 1}
                              </span>
                              <div className="text-sm text-foreground leading-relaxed">{indicator}</div>
                            </div>
                          </td>

                          <td className="p-3 text-center">
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
                        </tr>
                      )
                    })
                  ) : (
                    <tr key={req.id} className="border-b border-border hover:bg-white/50 transition-colors">
                      <td className="p-3 border-r border-border bg-secondary/20">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-medium text-primary">
                            {reqIndex + 1}
                          </div>
                          <div className="flex-1 text-sm text-foreground leading-relaxed">{req.content}</div>
                        </div>
                      </td>
                      <td className="p-3 text-center text-muted-foreground text-sm" colSpan={2}>
                        暂无指标点
                      </td>
                    </tr>
                  )
                })}
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
