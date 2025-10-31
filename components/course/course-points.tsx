"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

interface CoursePointsProps {
  coursePoints: any[]
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

export function CoursePoints({ coursePoints }: CoursePointsProps) {
  const [search, setSearch] = useState("")

  const filteredPoints = coursePoints.filter((point: any) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    const contentMatch = point.content?.toLowerCase().includes(searchLower)
    const infoPointsMatch = point.infoPoints?.some((infoPoint: any) =>
      infoPoint.content?.toLowerCase().includes(searchLower),
    )
    return contentMatch || infoPointsMatch
  })

  return (
    <AccordionItem value="course-points" className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm">
      <AccordionTrigger className="px-5 hover:no-underline">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-primary" />
          <h3 className="text-base font-semibold text-foreground">课点信息库</h3>
          {coursePoints.length > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">({coursePoints.length} 个课点)</span>
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
              placeholder="搜索课点信息..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        {filteredPoints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {coursePoints.length === 0 ? "暂无课点信息" : "无相关结果"}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPoints.map((point: any, pointIndex: number) => (
              <div
                key={pointIndex}
                className="p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {pointIndex + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground leading-relaxed">
                      {highlightKeyword(point.content || "未设置", search)}
                    </p>
                    {point.infoPoints && point.infoPoints.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {point.infoPoints.map((infoPoint: any, infoIndex: number) => (
                          <Badge
                            key={infoIndex}
                            variant="outline"
                            className={`text-xs ${
                              infoPoint.type === "K"
                                ? "bg-blue-50 border-blue-200 text-blue-700"
                                : infoPoint.type === "S"
                                  ? "bg-green-50 border-green-200 text-green-700"
                                  : "bg-purple-50 border-purple-200 text-purple-700"
                            }`}
                            title={infoPoint.content}
                          >
                            {infoPoint.id}
                          </Badge>
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
