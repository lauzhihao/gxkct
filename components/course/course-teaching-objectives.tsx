"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

interface CourseTeachingObjectivesProps {
  objectives: any[]
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

export function CourseTeachingObjectives({ objectives }: CourseTeachingObjectivesProps) {
  const [search, setSearch] = useState("")

  const filteredObjectives = objectives.filter((objective: any) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    const contentMatch = objective.content?.toLowerCase().includes(searchLower)
    const pointsMatch = objective.points?.some((point: string) => point.toLowerCase().includes(searchLower))
    return contentMatch || pointsMatch
  })

  return (
    <AccordionItem
      value="teaching-objectives"
      className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm"
    >
      <AccordionTrigger className="px-5 hover:no-underline">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-primary" />
          <h3 className="text-base font-semibold text-foreground">课程教学目标</h3>
          {objectives.length > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">({objectives.length} 个目标)</span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-5 pb-5">
        <div className="border-t border-dashed border-border mb-4" />
        <div className="mb-4">
          <div className="relative w-[30%]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索教学目标..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        {filteredObjectives.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {objectives.length === 0 ? "暂无教学目标" : "无相关结果"}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredObjectives.map((objective: any, objIndex: number) => (
              <div
                key={objIndex}
                className="p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {objIndex + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground leading-relaxed">
                      {highlightKeyword(objective.content || "未设置", search)}
                    </p>
                    {objective.points && objective.points.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {objective.points.map((point: string, pointIndex: number) => (
                          <div key={pointIndex} className="flex items-start gap-2 text-sm">
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{highlightKeyword(point, search)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
