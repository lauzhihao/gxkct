import { Download } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { formatCount } from "@/modules/dashboard/format"
import { NA_REASONS } from "@/modules/dashboard/labels"
import type { TeacherCourse } from "@/modules/dashboard/types"

const EXPORTS = ["矩阵表", "课点清单", "产出测量表"] as const

interface MyCourseCardProps {
  course: TeacherCourse
}

export function MyCourseCard({ course }: MyCourseCardProps) {
  return (
    <article className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-foreground" title={course.courseName}>
            {course.courseName}
          </h4>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{course.majorName}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          阶段 <NaValue reason={NA_REASONS.stage} />
        </span>
      </header>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">建设进度</dt>
        <dd className="text-right">
          <NaValue reason={NA_REASONS.completion} />
        </dd>
        <dt className="text-muted-foreground">一 / 二 / 三级矩阵</dt>
        <dd className="text-right">
          <NaValue reason={NA_REASONS.matrixLevel} />
        </dd>
        <dt className="text-muted-foreground">课程资源</dt>
        <dd className="text-right tabular-nums text-foreground">{formatCount(course.resourceCount)} 个</dd>
      </dl>

      <dl className="grid grid-cols-3 gap-2 rounded-sm bg-muted/60 px-3 py-2 text-center">
        <div>
          <dt className="text-[11px] text-muted-foreground">知识 K</dt>
          <dd className="text-sm font-semibold tabular-nums text-foreground">{course.ksa.knowledge}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">技能 S</dt>
          <dd className="text-sm font-semibold tabular-nums text-foreground">{course.ksa.skill}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">素养 A</dt>
          <dd className="text-sm font-semibold tabular-nums text-foreground">{course.ksa.attitude}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2" title="成果导出暂未开放">
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
