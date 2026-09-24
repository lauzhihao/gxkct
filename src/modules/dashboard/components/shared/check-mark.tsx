import { Check, X } from "lucide-react"

interface CheckMarkProps {
  done: boolean
  label: string
}

/** 齐备 / 缺失：图标 + 屏幕阅读器文字，不单靠颜色 */
export function CheckMark({ done, label }: CheckMarkProps) {
  return done ? (
    <span className="inline-flex text-success" title={`${label}：已具备`}>
      <Check className="size-4" aria-hidden />
      <span className="sr-only">{label}已具备</span>
    </span>
  ) : (
    <span className="inline-flex text-destructive" title={`${label}：缺失`}>
      <X className="size-4" aria-hidden />
      <span className="sr-only">{label}缺失</span>
    </span>
  )
}
