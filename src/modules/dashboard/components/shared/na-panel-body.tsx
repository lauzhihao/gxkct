interface NaPanelBodyProps {
  reason: string
  minHeight?: number
}

/** 整块图表取不到时保留版位：大号 N/A + 原因，评审时能看到这里原本要放什么 */
export function NaPanelBody({ reason, minHeight = 176 }: NaPanelBodyProps) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center"
      style={{ minHeight }}
    >
      <span className="text-2xl font-semibold tracking-wide text-muted-foreground">N/A</span>
      <span className="max-w-[280px] text-xs leading-5 text-muted-foreground">{reason}</span>
    </div>
  )
}
