import { AlertOctagon, RotateCw } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { LoadingState } from "@/shared/components/ui/loading-state"

interface LoadStateProps {
  state: { status: "loading" } | { status: "error"; message: string }
  loadingText: string
  onRetry: () => void
}

/** 看板取数中 / 取数失败：加载时用系统进入时的 loading 样式，失败时给出原因与重试 */
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
    <div className="h-full" aria-busy="true">
      <LoadingState title={loadingText} className="min-h-[360px]" />
    </div>
  )
}
