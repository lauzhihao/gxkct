"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

interface CourseChaptersProps {
  chapters: any[]
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

export function CourseChapters({ chapters }: CourseChaptersProps) {
  const [search, setSearch] = useState("")

  const filteredChapters = chapters.filter((chapter: any) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return chapter.name?.toLowerCase().includes(searchLower)
  })

  const chapterCount = filteredChapters.filter((ch: any) => ch.name?.includes("章")).length
  const projectCount = filteredChapters.filter((ch: any) => ch.name?.includes("项目")).length
  const totalTheoryHours = filteredChapters.reduce((sum: number, ch: any) => sum + (ch.theoryHours || 0), 0)
  const totalPracticeHours = filteredChapters.reduce((sum: number, ch: any) => sum + (ch.practiceHours || 0), 0)
  const totalHours = totalTheoryHours + totalPracticeHours

  return (
    <AccordionItem value="chapters" className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm">
      <AccordionTrigger className="px-5 hover:no-underline">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-primary" />
          <h3 className="text-base font-semibold text-foreground">章节项目列表</h3>
          {chapters.length > 0 && <span className="ml-2 text-xs text-muted-foreground">({chapters.length} 项)</span>}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-5 pb-6">
        <div className="border-t border-dashed border-border mb-4" />
        <div className="mb-4">
          <div className="relative w-[30%]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索章节项目..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        {chapters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">暂无章节项目</div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden mb-4">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                    序号
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                    名称
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                    理论学时
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">实践学时</th>
                </tr>
              </thead>
              <tbody>
                {filteredChapters.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      暂无相关结果
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredChapters.map((chapter: any, index: number) => (
                      <tr key={chapter.id || index} className="border-t border-border hover:bg-secondary/30">
                        <td className="px-4 py-3 text-sm text-foreground border-r border-border">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-foreground border-r border-border">
                          {highlightKeyword(chapter.name || "未命名", search)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground border-r border-border">
                          {chapter.theoryHours || 0} 学时
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{chapter.practiceHours || 0} 学时</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-primary/30 bg-primary/5">
                      <td
                        colSpan={2}
                        className="px-4 py-3 text-sm font-semibold text-foreground border-r border-border"
                      >
                        统计：{chapterCount} 个章节，{projectCount} 个项目
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground border-r border-border">
                        {totalTheoryHours} 学时
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">
                        {totalPracticeHours} 学时
                        <span className="ml-2 text-muted-foreground">(合计：{totalHours} 学时)</span>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
