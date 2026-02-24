/**
 * 职业信息Section
 * 负责职业信息的管理：职业方向选择、职业级别、工作任务等
 */

"use client"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Label } from "@/shared/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { Plus, Trash2, ChevronRight, Search, X } from "lucide-react"
import type { UseCareerInfoResult } from "@/modules/majors/hooks/use-career-info"
import { usePermission } from "@/shared/hooks/use-permission"
import type { PermissionAction } from "@/shared/permissions/types"
import type { WorkCategory } from "../types"

const MANAGE_MAJOR_ACTION: PermissionAction = "department.major.create"
const MANAGE_MAJOR_CONTEXT = { scope: "department" as const }

interface CareerInfoSectionProps {
  careerInfo: UseCareerInfoResult
  worksData: WorkCategory[]
}

export function CareerInfoSection({ careerInfo, worksData }: CareerInfoSectionProps) {
  const { can } = usePermission()
  const canManageMajor = can(MANAGE_MAJOR_ACTION, MANAGE_MAJOR_CONTEXT)

  const {
    careerInfoList,
    careerSearchMap,
    careerPopoverOpenMap,
    addCareerInfo,
    removeCareerInfo,
    updateCareerInfo,
    setCareerSearchMap,
    setCareerPopoverOpenMap,
    handleCareerDirectionSelect,
  } = careerInfo

  // 根据选择的分类获取子分类
  const getCategory2Options = (category1Label: string): WorkCategory[] => {
    const category1 = worksData.find((item) => item.label === category1Label)
    return category1?.children || []
  }

  const getCategory3Options = (category1Label: string, category2Label: string): WorkCategory[] => {
    const category1 = worksData.find((item: WorkCategory) => item.label === category1Label)
    const category2 = category1?.children.find((item: WorkCategory) => item.label === category2Label)
    return category2?.children || []
  }

  const getCategory4Options = (
    category1Label: string,
    category2Label: string,
    category3Label: string
  ): WorkCategory[] => {
    const category1 = worksData.find((item: WorkCategory) => item.label === category1Label)
    const category2 = category1?.children.find((item: WorkCategory) => item.label === category2Label)
    const category3 = category2?.children.find((item: WorkCategory) => item.label === category3Label)
    return category3?.children || []
  }

  // 搜索职业方向（递归搜索所有层级，只返回第4级的完整路径）
  interface SearchResult {
    category1: WorkCategory
    category2: WorkCategory
    category3: WorkCategory
    category4: WorkCategory
    matchedText: string
    matchLevel: number
  }

  const searchCareerDirection = (searchText: string): SearchResult[] => {
    if (!searchText.trim()) return []

    const results: SearchResult[] = []
    const lowerSearch = searchText.toLowerCase()

    worksData.forEach((cat1: WorkCategory) => {
      cat1.children?.forEach((cat2: WorkCategory) => {
        cat2.children?.forEach((cat3: WorkCategory) => {
          cat3.children?.forEach((cat4: WorkCategory) => {
            let matchLevel = 0
            let matchedText = ""

            if (cat4.label.toLowerCase().includes(lowerSearch)) {
              matchLevel = 4
              matchedText = cat4.label
            } else if (cat3.label.toLowerCase().includes(lowerSearch)) {
              matchLevel = 3
              matchedText = cat3.label
            } else if (cat2.label.toLowerCase().includes(lowerSearch)) {
              matchLevel = 2
              matchedText = cat2.label
            } else if (cat1.label.toLowerCase().includes(lowerSearch)) {
              matchLevel = 1
              matchedText = cat1.label
            }

            if (matchLevel > 0) {
              results.push({
                category1: cat1,
                category2: cat2,
                category3: cat3,
                category4: cat4,
                matchedText,
                matchLevel,
              })
            }
          })
        })
      })
    })

    return results
  }

  // 高亮搜索文本
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text

    const parts = text.split(new RegExp(`(${search})`, "gi"))
    return parts.map((part, index) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 text-black group-hover:bg-yellow-400 group-hover:text-white">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  const handleAddCareerInfo = () => {
    if (!can(MANAGE_MAJOR_ACTION, MANAGE_MAJOR_CONTEXT)) return
    addCareerInfo()
  }

  const handleRemoveCareerInfo = (id: string) => {
    if (!can(MANAGE_MAJOR_ACTION, MANAGE_MAJOR_CONTEXT)) return
    removeCareerInfo(id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
          <h3 className="text-base font-semibold text-foreground">职业信息</h3>
        </div>
        {canManageMajor && (
          <Button size="sm" variant="outline" onClick={handleAddCareerInfo} className="gap-2 bg-transparent">
            <Plus className="w-4 h-4" />
            添加职业信息
          </Button>
        )}
      </div>
      <div className="border-t border-dashed border-border" />
      <div className="space-y-4">
        {careerInfoList.map((careerInfoItem, index) => (
          <div key={careerInfoItem.id} className="p-4 rounded-lg border border-border bg-card/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">职业信息 {index + 1}</span>
              {canManageMajor && careerInfoList.length > 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveCareerInfo(careerInfoItem.id)}
                  className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>职业方向</Label>
                <Popover
                  open={careerPopoverOpenMap[careerInfoItem.id]}
                  onOpenChange={(open) => {
                    setCareerPopoverOpenMap((prev) => ({ ...prev, [careerInfoItem.id]: open }))
                    if (!open) {
                      setCareerSearchMap((prev) => ({ ...prev, [careerInfoItem.id]: "" }))
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between bg-transparent">
                      <span className="truncate">
                        {careerInfoItem.direction.category1 &&
                        careerInfoItem.direction.category2 &&
                        careerInfoItem.direction.category3 &&
                        careerInfoItem.direction.category4
                          ? `${careerInfoItem.direction.category1}/${careerInfoItem.direction.category2}/${careerInfoItem.direction.category3}/${careerInfoItem.direction.category4}`
                          : "请选择职业方向"}
                      </span>
                      <ChevronRight className="w-4 h-4 ml-2 flex-shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    {/* 搜索框 */}
                    <div className="p-3 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="搜索职业方向..."
                          value={careerSearchMap[careerInfoItem.id] || ""}
                          onChange={(e) =>
                            setCareerSearchMap((prev) => ({ ...prev, [careerInfoItem.id]: e.target.value }))
                          }
                          className="pl-8 h-8"
                        />
                      </div>
                    </div>

                    {/* 搜索结果 */}
                    {careerSearchMap[careerInfoItem.id]?.trim() ? (
                      <div className="p-2 max-h-[400px] overflow-y-auto w-[500px]">
                        {searchCareerDirection(careerSearchMap[careerInfoItem.id]).length > 0 ? (
                          <div className="space-y-1">
                            {searchCareerDirection(careerSearchMap[careerInfoItem.id]).map((result, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  handleCareerDirectionSelect(
                                    careerInfoItem.id,
                                    result.category1.label,
                                    result.category2.label,
                                    result.category3.label,
                                    result.category4.label
                                  )
                                  setCareerPopoverOpenMap((prev) => ({ ...prev, [careerInfoItem.id]: false }))
                                  setCareerSearchMap((prev) => ({ ...prev, [careerInfoItem.id]: "" }))
                                }}
                                className="w-full text-left px-3 py-2 rounded text-sm hover:bg-primary transition-colors group"
                              >
                                <div className="flex items-center gap-2 text-xs group-hover:text-white/90">
                                  <span className={result.matchLevel === 1 ? "font-medium" : ""}>
                                    {result.matchLevel === 1
                                      ? highlightText(result.category1.label, careerSearchMap[careerInfoItem.id])
                                      : result.category1.label}
                                  </span>
                                  <span className="text-muted-foreground group-hover:text-white/60">/</span>
                                  <span className={result.matchLevel === 2 ? "font-medium" : ""}>
                                    {result.matchLevel === 2
                                      ? highlightText(result.category2.label, careerSearchMap[careerInfoItem.id])
                                      : result.category2.label}
                                  </span>
                                  <span className="text-muted-foreground group-hover:text-white/60">/</span>
                                  <span className={result.matchLevel === 3 ? "font-medium" : ""}>
                                    {result.matchLevel === 3
                                      ? highlightText(result.category3.label, careerSearchMap[careerInfoItem.id])
                                      : result.category3.label}
                                  </span>
                                  <span className="text-muted-foreground group-hover:text-white/60">/</span>
                                  <span className={result.matchLevel === 4 ? "font-medium" : ""}>
                                    {result.matchLevel === 4
                                      ? highlightText(result.category4.label, careerSearchMap[careerInfoItem.id])
                                      : result.category4.label}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-sm text-muted-foreground">未找到匹配的职业方向</div>
                        )}
                      </div>
                    ) : (
                      /* 级联选择器 */
                      <div className="flex divide-x">
                        <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto min-w-[180px] max-w-[280px]">
                          {worksData.map((category) => (
                            <button
                              key={category.value}
                              onClick={() =>
                                updateCareerInfo(careerInfoItem.id, "direction", {
                                  category1: category.label,
                                  category2: "",
                                  category3: "",
                                  category4: "",
                                })
                              }
                              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                                careerInfoItem.direction.category1 === category.label
                                  ? "bg-primary text-white"
                                  : "hover:bg-primary hover:text-white"
                              }`}
                            >
                              <span className="flex-1 break-words pr-2">{category.label}</span>
                              <ChevronRight className="w-3 h-3 flex-shrink-0" />
                            </button>
                          ))}
                        </div>

                        {careerInfoItem.direction.category1 && (
                          <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto min-w-[180px] max-w-[280px]">
                            {getCategory2Options(careerInfoItem.direction.category1).map((category) => (
                              <button
                                key={category.value}
                                onClick={() =>
                                  updateCareerInfo(careerInfoItem.id, "direction", {
                                    ...careerInfoItem.direction,
                                    category2: category.label,
                                    category3: "",
                                    category4: "",
                                  })
                                }
                                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                                  careerInfoItem.direction.category2 === category.label
                                    ? "bg-primary text-white"
                                    : "hover:bg-primary hover:text-white"
                                }`}
                              >
                                <span className="flex-1 break-words pr-2">{category.label}</span>
                                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                              </button>
                            ))}
                          </div>
                        )}

                        {careerInfoItem.direction.category1 && careerInfoItem.direction.category2 && (
                          <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto min-w-[180px] max-w-[280px]">
                            {getCategory3Options(
                              careerInfoItem.direction.category1,
                              careerInfoItem.direction.category2
                            ).map((category) => (
                              <button
                                key={category.value}
                                onClick={() =>
                                  updateCareerInfo(careerInfoItem.id, "direction", {
                                    ...careerInfoItem.direction,
                                    category3: category.label,
                                    category4: "",
                                  })
                                }
                                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                                  careerInfoItem.direction.category3 === category.label
                                    ? "bg-primary text-white"
                                    : "hover:bg-primary hover:text-white"
                                }`}
                              >
                                <span className="flex-1 break-words pr-2">{category.label}</span>
                                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                              </button>
                            ))}
                          </div>
                        )}

                        {careerInfoItem.direction.category1 &&
                          careerInfoItem.direction.category2 &&
                          careerInfoItem.direction.category3 && (
                            <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto min-w-[180px] max-w-[280px]">
                              {getCategory4Options(
                                careerInfoItem.direction.category1,
                                careerInfoItem.direction.category2,
                                careerInfoItem.direction.category3
                              ).map((category) => (
                                <button
                                  key={category.value}
                                  onClick={() => {
                                    handleCareerDirectionSelect(
                                      careerInfoItem.id,
                                      careerInfoItem.direction.category1,
                                      careerInfoItem.direction.category2,
                                      careerInfoItem.direction.category3,
                                      category.label
                                    )
                                    setCareerPopoverOpenMap((prev) => ({ ...prev, [careerInfoItem.id]: false }))
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                                    careerInfoItem.direction.category4 === category.label
                                      ? "bg-primary text-white"
                                      : "hover:bg-primary hover:text-white"
                                  }`}
                                >
                                  <span className="flex-1 break-words">{category.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>职业级别</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={careerInfoItem.level === "高级" ? "default" : "outline"}
                    onClick={() => updateCareerInfo(careerInfoItem.id, "level", "高级")}
                    className="flex-1"
                  >
                    高级
                  </Button>
                  <Button
                    type="button"
                    variant={careerInfoItem.level === "中级" ? "default" : "outline"}
                    onClick={() => updateCareerInfo(careerInfoItem.id, "level", "中级")}
                    className="flex-1"
                  >
                    中级
                  </Button>
                  <Button
                    type="button"
                    variant={careerInfoItem.level === "初级" ? "default" : "outline"}
                    onClick={() => updateCareerInfo(careerInfoItem.id, "level", "初级")}
                    className="flex-1"
                  >
                    初级
                  </Button>
                  <Button
                    type="button"
                    variant={careerInfoItem.level === "无定级" ? "default" : "outline"}
                    onClick={() => updateCareerInfo(careerInfoItem.id, "level", "无定级")}
                    className="flex-1"
                  >
                    无定级
                  </Button>
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <Label>工作任务</Label>
                <div className="relative">
                  <Textarea
                    placeholder="描述该职业方向的主要工作任务"
                    rows={3}
                    value={careerInfoItem.tasks}
                    onChange={(e) => updateCareerInfo(careerInfoItem.id, "tasks", e.target.value.slice(0, 1024))}
                    maxLength={1024}
                    className="pr-20"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{careerInfoItem.tasks.length}/1024</span>
                    {careerInfoItem.tasks && (
                      <button
                        type="button"
                        onClick={() => updateCareerInfo(careerInfoItem.id, "tasks", "")}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
