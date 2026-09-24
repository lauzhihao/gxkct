import { Check, Download, X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Meter } from "@/modules/dashboard/components/shared/meter"
import { StageTag } from "@/modules/dashboard/components/shared/stage-tag"
import { formatPercent } from "@/modules/dashboard/format"
import type { TeacherCourse } from "@/modules/dashboard/types"

const MATRIX_LEVELS = [
  { key: "level1", label: "一级矩阵" },
  { key: "level2", label: "二级矩阵" },
  { key: "level3", label: "三级矩阵" },
] as const

const EXPORTS = ["矩阵表", "课点清单", "产出测量表"] as const

interface MyCourseCardProps {
  course: TeacherCourse
}

export function MyCourseCard({ course }: MyCourseCardProps) {
  return (
    <article className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-foreground">{course.courseName}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">{course.majorName}</p>
        </div>
        <StageTag stage={course.stage} />
      </header>

      <div className="flex items-center gap-3">
        <Meter value={course.progress} ariaLabel={`${course.courseName}建设进度`} />
        <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-foreground">
          {formatPercent(course.progress, 0)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {MATRIX_LEVELS.map((level) => {
          const done = course.matrix[level.key]
          return (
            <span
              key={level.key}
              className="inline-flex items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-xs text-foreground"
            >
              {done ? (
                <Check className="size-3.5 text-success" aria-hidden />
              ) : (
                <X className="size-3.5 text-destructive" aria-hidden />
              )}
              {level.label}
              <span className="sr-only">{done ? "已完成" : "未完成"}</span>
            </span>
          )
        })}
      </div>

      <dl className="grid grid-cols-3 gap-2 rounded-sm bg-muted/60 px-3 py-2 text-center">
        <div>
          <dt className="text-[11px] text-muted-foreground">知识 K</dt>
          <dd className="text-sm font-semibold text-foreground">{course.ksa.knowledge}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">技能 S</dt>
          <dd className="text-sm font-semibold text-foreground">{course.ksa.skill}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">素养 A</dt>
          <dd className="text-sm font-semibold text-foreground">{course.ksa.attitude}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2" title="接入真实数据后可导出">
        {EXPORTS.map((label) => (
          <Button key={label} type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" disabled>
            <Download className="size-3.5" aria-hidden />
            {label}
          </Button>
        ))}
      </div>
    </article>
  )
}
