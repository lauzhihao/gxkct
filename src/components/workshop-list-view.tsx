"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Building2 } from "lucide-react"
import { workshopApi } from "@/lib/api/workshop-api"
import type { WorkshopListItem } from "@/types/workshop"
import { Button } from "@/shared/components/ui/button"
import { Spinner } from "@/shared/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"

interface WorkshopListViewProps {
  searchKeyword: string
  refreshToken?: number
}

function extractNumber(value: number | string | null): number {
  if (typeof value === "number") {
    return value
  }
  if (typeof value !== "string") {
    return 0
  }

  const matched = value.match(/\d+/)
  if (!matched) {
    return 0
  }

  const parsed = Number(matched[0])
  if (Number.isNaN(parsed)) {
    return 0
  }

  return parsed
}

export function WorkshopListView({ searchKeyword, refreshToken }: WorkshopListViewProps) {
  const [workshops, setWorkshops] = useState<WorkshopListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const loadWorkshops = useCallback(async () => {
    setIsLoading(true)
    setError("")

    const response = await workshopApi.getWorkshops()
    setIsLoading(false)

    if (response.error || !response.data) {
      const message = response.error ? response.error : "加载工作坊列表失败"
      setError(message)
      setWorkshops([])
      return
    }

    setWorkshops(response.data)
  }, [])

  useEffect(() => {
    void loadWorkshops()
  }, [loadWorkshops, refreshToken])

  const filteredWorkshops = useMemo(() => {
    const keyword = searchKeyword.trim()
    if (keyword === "") {
      return workshops
    }
    return workshops.filter((item) => item.name.toLowerCase().includes(keyword.toLowerCase()))
  }, [searchKeyword, workshops])

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border border-dashed p-6">
          <Spinner className="w-4 h-4 text-primary" />
          正在加载工作坊列表...
        </div>
      )}

      {!isLoading && error !== "" && (
        <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="text-sm text-destructive">{error}</div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadWorkshops()}>
            重试
          </Button>
        </div>
      )}

      {!isLoading && error === "" && filteredWorkshops.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {workshops.length === 0 ? "暂无工作坊数据" : "未找到匹配的工作坊"}
        </div>
      )}

      {!isLoading && error === "" && filteredWorkshops.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredWorkshops.map((workshop) => {
            const majorCount = extractNumber(workshop.major)
            const courseCount = extractNumber(workshop.course)
            const memberCount = extractNumber(workshop.fresh) + extractNumber(workshop.old)

            return (
              <div
                key={workshop.id}
                className="rounded-xl border border-primary/15 bg-white/70 backdrop-blur-sm p-4 hover:border-primary/35 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground truncate">{workshop.name}</h3>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex" aria-label={`查看工作坊ID ${workshop.id}`}>
                        <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">ID: {workshop.id}</TooltipContent>
                  </Tooltip>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-primary/5 py-2">
                    <div className="text-lg font-semibold text-foreground">{majorCount}</div>
                    <div className="text-xs text-muted-foreground">专业</div>
                  </div>
                  <div className="rounded-md bg-primary/5 py-2">
                    <div className="text-lg font-semibold text-foreground">{courseCount}</div>
                    <div className="text-xs text-muted-foreground">课程</div>
                  </div>
                  <div className="rounded-md bg-primary/5 py-2">
                    <div className="text-lg font-semibold text-foreground">{memberCount}</div>
                    <div className="text-xs text-muted-foreground">成员</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
