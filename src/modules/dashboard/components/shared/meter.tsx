import { SERIES_COLORS } from "@/modules/dashboard/palette"
import { cn } from "@/shared/utils/utils"

interface MeterProps {
  value: number
  ariaLabel: string
  color?: string
  className?: string
}

/** 单比例进度条：未填充部分用同色相的浅色轨道，整条都能读出状态 */
export function Meter({ value, ariaLabel, color = SERIES_COLORS.blue, className }: MeterProps) {
  const clamped = Math.min(1, Math.max(0, value))
  return (
    <div
      role="meter"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[#e3edfa]", className)}
    >
      <div className="h-full rounded-full" style={{ width: `${clamped * 100}%`, backgroundColor: color }} />
    </div>
  )
}
