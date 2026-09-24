import { Lock } from "lucide-react"
import { Meter } from "@/modules/dashboard/components/shared/meter"
import { formatPercent } from "@/modules/dashboard/format"

interface ProgressReferenceProps {
  percentile: number
  departmentName: string
}

/** 进度参照：只给本人所处区间，用于激励，不公开个人排名 */
export function ProgressReference({ percentile, departmentName }: ProgressReferenceProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground">
        你的课程建设进度超过{departmentName}
        <span className="mx-1 text-2xl font-semibold text-primary">{formatPercent(percentile, 0)}</span>
        的教师
      </p>
      <Meter value={percentile} ariaLabel="进度所处区间" />
      <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="size-3.5" aria-hidden />
        仅本人可见，不做个人排名公开
      </p>
    </div>
  )
}
