import { Check, X } from "lucide-react"

interface CheckMarkProps {
  done: boolean
  label: string
  /** 悬停补充说明，例如缺了哪几项；不传时只说明齐备或缺失 */
  hint?: string
}

/** 齐备 / 缺失：图标 + 屏幕阅读器文字，不单靠颜色；relative 让绝对定位的读屏文字留在图标内，不撑高页面 */
export function CheckMark({ done, label, hint }: CheckMarkProps) {
  const status = done ? "已具备" : "缺失"
  const title = hint === undefined ? `${label}：${status}` : `${label}：${status}（${hint}）`
  return done ? (
    <span className="relative inline-flex text-success" title={title}>
      <Check className="size-4" aria-hidden />
      <span className="sr-only">{title}</span>
    </span>
  ) : (
    <span className="relative inline-flex text-destructive" title={title}>
      <X className="size-4" aria-hidden />
      <span className="sr-only">{title}</span>
    </span>
  )
}
