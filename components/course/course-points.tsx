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

  // 过滤数据
  const filteredPoints = coursePoints.filter((point: any) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    const titleMatch = point.title?.toLowerCase().includes(searchLower)
    const descriptionMatch = point.description?.toLowerCase().includes(searchLower)
    return titleMatch || descriptionMatch
  })

  // 过滤后按类型分组
  const filteredGroupedByType = filteredPoints.reduce((acc: any, point: any) => {
    const type = point.title || "其他"
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(point)
    return acc
  }, {})

  const filteredKData = filteredGroupedByType["K"] || []
  const filteredSData = filteredGroupedByType["S"] || []
  const filteredAData = filteredGroupedByType["A"] || []

  return (
    <AccordionItem value="course-points" className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm">
      <AccordionTrigger className="px-5 hover:no-underline">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-primary" />
          <h3 className="text-base font-semibold text-foreground">课点信息</h3>
          {coursePoints.length > 0 && (
            <Badge variant="default" className="ml-2 bg-primary text-primary-foreground">
              {coursePoints.length}
            </Badge>
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-primary/10">
                  <th className="border border-border px-4 py-3 text-center text-base font-semibold text-foreground">序号</th>
                  <th className="border border-border px-4 py-3 text-center text-base font-semibold text-foreground">Knowledge - 知识</th>
                  <th className="border border-border px-4 py-3 text-center text-base font-semibold text-foreground">Skill - 技能</th>
                  <th className="border border-border px-4 py-3 text-center text-base font-semibold text-foreground">Attitude - 态度</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.max(filteredKData.length, filteredSData.length, filteredAData.length) }).map((_, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                    <td className="border border-border px-4 py-3 text-center text-sm font-semibold text-foreground">
                      {String(rowIndex + 1).padStart(2, '0')}
                    </td>
                    <td className="border border-border px-4 py-3 text-sm text-foreground">
                      {filteredKData[rowIndex] ? (
                        highlightKeyword(filteredKData[rowIndex].description || "未设置", search)
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="border border-border px-4 py-3 text-sm text-foreground">
                      {filteredSData[rowIndex] ? (
                        highlightKeyword(filteredSData[rowIndex].description || "未设置", search)
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="border border-border px-4 py-3 text-sm text-foreground">
                      {filteredAData[rowIndex] ? (
                        highlightKeyword(filteredAData[rowIndex].description || "未设置", search)
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
