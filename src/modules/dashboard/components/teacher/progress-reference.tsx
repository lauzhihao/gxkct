import { Lock } from "lucide-react"
import { NaPanelBody } from "@/modules/dashboard/components/shared/na-panel-body"
import { NA_REASONS } from "@/modules/dashboard/labels"

/** 进度参照：只给本人所处区间，不公开个人排名；建设进度口径待定义，暂显示 N/A */
export function ProgressReference() {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <NaPanelBody reason={`本人进度在系内所处区间：${NA_REASONS.percentile}`} minHeight={120} />
      <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="size-3.5" aria-hidden />
        仅本人可见，不做个人排名公开
      </p>
    </div>
  )
}
