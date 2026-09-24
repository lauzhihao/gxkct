import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { formatPp, formatSignedPercent } from "@/modules/dashboard/format"
import { cn } from "@/shared/utils/utils"

interface DeltaTextProps {
  delta: number
  kind: "pp" | "percent"
  period: string
  higherIsBetter?: boolean
}

/** 变化量：方向用图标 + 符号表达，颜色只做辅助（上升是否为好由调用方决定） */
export function DeltaText({ delta, kind, period, higherIsBetter = true }: DeltaTextProps) {
  const isFlat = Math.abs(delta) < 1e-9
  const isGood = isFlat ? null : delta > 0 === higherIsBetter
  const Icon = isFlat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight
  const text = kind === "pp" ? formatPp(delta) : formatSignedPercent(delta)

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          "inline-flex items-center font-medium",
          isGood === null ? "text-muted-foreground" : isGood ? "text-success" : "text-destructive",
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        {text}
      </span>
      <span>{period}</span>
    </span>
  )
}
