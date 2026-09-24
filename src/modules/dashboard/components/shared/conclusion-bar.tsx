import { Lightbulb } from "lucide-react"

interface ConclusionBarProps {
  text: string
}

/** 一句话结论：由统计数据自动拼出，便于快速掌握要点 */
export function ConclusionBar({ text }: ConclusionBarProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-primary/25 bg-primary/5 px-4 py-3">
      <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary">
        <Lightbulb className="size-4" aria-hidden />
        一句话结论
      </span>
      <p className="text-sm leading-6 text-foreground">{text}</p>
    </div>
  )
}
