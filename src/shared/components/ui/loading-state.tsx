import { cn } from "@/shared/utils/utils"

const AI_DIVIDER_SPINNER_GRADIENT = "conic-gradient(from 0deg, #f79533 0%, #f37055 14%, #ef4e7b 30%, #a166ab 48%, #5073b8 66%, #1098ad 82%, #07b39b 92%, transparent 92%, transparent 100%)"

type LoadingStateVariant = "plain" | "card"

interface LoadingStateProps {
  title?: string
  description?: string
  variant?: LoadingStateVariant
  className?: string
  contentClassName?: string
  spinnerClassName?: string
}

export function LoadingState({
  title = "加载中",
  description,
  variant = "plain",
  className,
  contentClassName,
  spinnerClassName,
}: LoadingStateProps) {
  const wrapperClassName = variant === "card"
    ? "rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl p-6 flex items-center justify-center min-h-[500px]"
    : "flex items-center justify-center h-full"

  return (
    <div className={cn(wrapperClassName, className)}>
      <div className={cn("text-center", contentClassName)}>
        <div
          className={cn("mx-auto mb-3 h-12 w-12 animate-[spin_0.85s_linear_infinite] rounded-full", spinnerClassName)}
          style={{
            background: AI_DIVIDER_SPINNER_GRADIENT,
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0)",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0)",
          }}
        />
        <div className="text-lg text-muted-foreground">{title}</div>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  )
}
