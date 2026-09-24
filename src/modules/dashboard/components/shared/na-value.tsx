import { cn } from "@/shared/utils/utils"

interface NaValueProps {
  reason: string
  /** 原因直接跟在 N/A 后面显示；默认只在悬停和读屏时给出 */
  showReason?: boolean
  className?: string
}

/** 行内的取不到指标：显示 N/A 并给出原因 */
export function NaValue({ reason, showReason = false, className }: NaValueProps) {
  if (showReason) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        <span className="font-medium">N/A</span>（{reason}）
      </span>
    )
  }

  return (
    <span className={cn("font-medium text-muted-foreground", className)} title={reason}>
      N/A
      <span className="sr-only">（{reason}）</span>
    </span>
  )
}
