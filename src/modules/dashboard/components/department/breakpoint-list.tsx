import { ChevronRight } from "lucide-react"
import { formatCount } from "@/modules/dashboard/format"
import type { DepartmentBreakpoints } from "@/modules/dashboard/types"

interface BreakpointListProps {
  ownerMissingCount: number
  breakpoints: DepartmentBreakpoints
  courseTotal: number
  onOpenOwnerMissing: () => void
  onOpenBreakpoint: (key: keyof DepartmentBreakpoints) => void
}

const BREAKPOINT_LABELS: Record<keyof DepartmentBreakpoints, string> = {
  noSyllabus: "无大纲",
  noLessonPlanOrCourseware: "无教案或课件",
  noResource: "无资源",
}

const BREAKPOINT_ORDER: (keyof DepartmentBreakpoints)[] = ["noSyllabus", "noLessonPlanOrCourseware", "noResource"]

/** 建设断点分布：本系课程卡在哪一步，每项可点击查看课程清单；一门课可能同时卡在多步 */
export function BreakpointList({ ownerMissingCount, breakpoints, courseTotal, onOpenOwnerMissing, onOpenBreakpoint }: BreakpointListProps) {
  const rows = [
    { key: "ownerMissing", label: "无负责人", count: ownerMissingCount, onClick: onOpenOwnerMissing },
    ...BREAKPOINT_ORDER.map((key) => ({
      key,
      label: BREAKPOINT_LABELS[key],
      count: breakpoints[key].length,
      onClick: () => onOpenBreakpoint(key),
    })),
  ]

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y divide-border">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              onClick={row.onClick}
              className="group flex w-full items-center gap-3 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex-1 text-foreground">{row.label}</span>
              <span className="font-semibold tabular-nums text-foreground group-hover:text-primary">{formatCount(row.count)} 门</span>
              <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">/ {formatCount(courseTotal)}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-5 text-muted-foreground">
        按本系全部课程统计，一门课可能同时卡在多步；大纲、教案、课件按课程资源里同名预置目录是否有文件判断。
      </p>
    </div>
  )
}
