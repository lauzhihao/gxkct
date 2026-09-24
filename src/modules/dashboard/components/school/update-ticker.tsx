"use client"

import { useEffect, useState } from "react"
import { Radio } from "lucide-react"
import type { CourseUpdateEvent } from "@/modules/dashboard/types"

interface UpdateTickerProps {
  events: CourseUpdateEvent[]
}

const ROTATE_INTERVAL_MS = 3500

/** 动态滚动条：逐条轮播最近更新的课程；悬停暂停，系统开启"减少动态效果"时不做位移动画 */
export function UpdateTicker({ events }: UpdateTickerProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || events.length < 2) return
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % events.length)
    }, ROTATE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [paused, events.length])

  if (events.length === 0) return null
  const safeIndex = activeIndex % events.length
  const event = events[safeIndex]

  return (
    <div
      className="flex h-10 items-center gap-3 overflow-hidden rounded-md border border-border bg-card px-4 text-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="off"
    >
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary">
        <Radio className="size-3.5" aria-hidden />
        最近更新
      </span>
      <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
      <div key={event.id} className="flex min-w-0 flex-1 items-center gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
        <span className="shrink-0 tabular-nums text-muted-foreground">{event.date}</span>
        <span className="shrink-0 text-muted-foreground">{event.departmentName}</span>
        <span className="truncate text-foreground">
          《{event.courseName}》{event.action}
        </span>
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {safeIndex + 1}/{events.length}
      </span>
    </div>
  )
}
