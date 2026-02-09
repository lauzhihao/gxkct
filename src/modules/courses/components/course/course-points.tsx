"use client"

import { useState } from "react"
import { Search, ChevronDown } from "lucide-react"
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/shared/components/ui/accordion"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Divider } from "@/shared/components/design-system"
import type { CoursePoint } from "@/lib/api/course-points-api"

interface CoursePointsProps {
  objectives: CoursePoint[]
}

const highlightKeyword = (text: string, keyword: string) => {
  if (!keyword || !text) return text
  const parts = text.split(new RegExp(`(${keyword})`, "gi"))
  return parts.map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 text-foreground">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

export function CoursePoints({ objectives }: CoursePointsProps) {
  const [search, setSearch] = useState("")
  const [expandedIndex, setExpandedIndex] = useState<Set<number>>(new Set())

  // 提取标题中的数字用于排序（如 "课点9" -> 9, "课点11" -> 11）
  const extractNumber = (title: string): number => {
    const match = title?.match(/\d+/)
    return match ? parseInt(match[0], 10) : Infinity
  }

  const filteredObjectives = objectives
    .filter((objective: CoursePoint) => {
      if (!search) return true
      const searchLower = search.toLowerCase()
      const contentMatch = objective.title?.toLowerCase().includes(searchLower)
      const descriptionMatch = objective.description?.toLowerCase().includes(searchLower)
      return contentMatch || descriptionMatch
    })
    // 按标题中的数字排序，确保 9 < 11
    .sort((a: CoursePoint, b: CoursePoint) => extractNumber(a.title) - extractNumber(b.title))

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedIndex)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedIndex(newExpanded)
  }

  // 检测文本是否超过3行
  const isTextOverflow = (text: string): boolean => {
    if (!text) return false
    // 粗略估计：text-sm 字体，每行约50个字符，3行约150个字符
    return text.length > 150
  }

  return (
    <AccordionItem
      value="course-points"
      className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm"
    >
      <AccordionTrigger className="px-5 hover:no-underline">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-primary" />
          <h3 className="text-base font-semibold text-foreground">课点信息</h3>
          {objectives.length > 0 && (
            <Badge variant="default" className="ml-2 bg-primary text-primary-foreground">
              {objectives.length}
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-5 pb-5">
        <Divider spacing="none" className="mb-4" />
        <div className="mb-4">
          <div className="relative w-[30%]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索课点信息..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        {filteredObjectives.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {objectives.length === 0 ? "暂无课点信息" : "无相关结果"}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {filteredObjectives.map((objective: CoursePoint, objIndex: number) => {
              const isExpanded = expandedIndex.has(objIndex)
              const hasOverflow = isTextOverflow(objective.description || "")
              return (
                <div
                  key={objIndex}
                  className={`rounded-lg border border-border bg-background/50 hover:bg-background transition-all flex flex-col gap-2 p-4 ${
                    isExpanded ? "" : "overflow-hidden"
                  }`}
                  style={!isExpanded ? { maxHeight: "110px" } : undefined}
                >
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {objIndex + 1}
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {highlightKeyword(objective.title || "未设置", search)}
                    </p>
                  </div>
                  {objective.description && (
                    <p className={`text-sm text-muted-foreground ${isExpanded ? "" : "line-clamp-3"}`}>
                      {highlightKeyword(objective.description, search)}
                    </p>
                  )}
                  {hasOverflow && !isExpanded && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full h-7 text-sm mt-auto"
                      onClick={() => toggleExpanded(objIndex)}
                    >
                      <ChevronDown className="w-4 h-4 mr-1" />
                      展开
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
