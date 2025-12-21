"use client"

import { useState, useMemo, useEffect } from "react"
import { Search } from "lucide-react"
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/shared/components/ui/accordion"
import { Accordion } from "@/shared/components/ui/accordion"
import { Badge } from "@/shared/components/ui/badge"
import { Divider } from "@/shared/components/design-system"
import type { CourseGoal } from "@/lib/api/course-goals-api"

interface CourseGoalsProps {
  courseGoals: CourseGoal[]
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

export function CourseGoals({ courseGoals }: CourseGoalsProps) {
  const [search, setSearch] = useState("")

  // 只保留有教学目标的课程目标
  const goalsWithChildren = useMemo(() =>
    courseGoals.filter((goal) => goal.children && goal.children.length > 0),
    [courseGoals]
  )

  // 计算所有课程目标的展开值
  const allGoalValues = useMemo(() =>
    goalsWithChildren.map((goal) => `goal-${goal.id}`),
    [goalsWithChildren]
  )

  const [expandedGoals, setExpandedGoals] = useState<string[]>([])

  // 当数据加载完成时，默认展开所有课程目标
  useEffect(() => {
    if (allGoalValues.length > 0) {
      setExpandedGoals(allGoalValues)
    }
  }, [allGoalValues])

  // 计算所有教学目标的总数
  const totalObjectivesCount = goalsWithChildren.reduce((total, goal) => {
    return total + (goal.children?.length || 0)
  }, 0)

  // 过滤数据（基于搜索关键字）
  const filteredGoals = goalsWithChildren.filter((goal) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    // 检查课程目标描述
    const descriptionMatch = goal.description?.toLowerCase().includes(searchLower)
    // 检查子目标（教学目标）
    const childrenMatch = goal.children?.some(
      (child) => child.description?.toLowerCase().includes(searchLower)
    )
    return descriptionMatch || childrenMatch
  })

  return (
    <AccordionItem
      value="course-goals"
      className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm"
    >
      <AccordionTrigger className="px-5 hover:no-underline">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-primary" />
          <h3 className="text-base font-semibold text-foreground">教学目标</h3>
          {totalObjectivesCount > 0 && (
            <Badge variant="default" className="ml-2 bg-primary text-primary-foreground">
              {totalObjectivesCount}
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
              placeholder="搜索教学目标..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        {filteredGoals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {goalsWithChildren.length === 0 ? "暂无教学目标" : "无相关结果"}
          </div>
        ) : (
          <Accordion
            type="multiple"
            value={expandedGoals}
            onValueChange={setExpandedGoals}
            className="space-y-3"
          >
            {filteredGoals.map((goal, goalIdx) => {
              const accordionValue = `goal-${goal.id}`
              const children = goal.children || []

              return (
                <AccordionItem
                  key={goal.id}
                  value={accordionValue}
                  className="rounded-lg border border-border bg-background/50"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary">
                        {goalIdx + 1}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {highlightKeyword(goal.description || "未设置", search)}
                        </p>
                      </div>
                      {children.length > 0 && (
                        <Badge variant="default" className="ml-2 bg-primary text-primary-foreground">
                          {children.length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-4">
                    <div className="space-y-2 pl-12 pr-4">
                      {children.map((objective, objIdx) => (
                        <div key={objective.id} className="flex gap-2 items-start">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[0.7rem] font-medium text-primary mt-0.5">
                            {String.fromCharCode(97 + objIdx)}
                          </div>
                          <p className="text-sm text-muted-foreground flex-1">
                            {highlightKeyword(objective.description || "未设置", search)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
