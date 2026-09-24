import { AlertOctagon, Loader2, RotateCw } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"

interface LoadStateProps {
  state: { status: "loading" } | { status: "error"; message: string }
  loadingText: string
  onRetry: () => void
}

/** 看板取数中 / 取数失败：加载时保留骨架版位，失败时给出原因与重试 */
export function LoadState({ state, loadingText, onRetry }: LoadStateProps) {
  if (state.status === "error") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <AlertOctagon className="size-4 text-destructive" aria-hidden />
          数据加载失败
        </p>
        <p className="break-all text-xs text-muted-foreground">{state.message}</p>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onRetry}>
          <RotateCw className="size-3.5" aria-hidden />
          重试
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4" aria-busy="true">
      <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        {loadingText}
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-[104px] rounded-md" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[260px] rounded-md" />
        ))}
      </div>
    </div>
  )
}
