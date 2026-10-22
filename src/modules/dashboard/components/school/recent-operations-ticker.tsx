import { Radio } from "lucide-react"
import type { RecentOperation } from "@/modules/dashboard/types"

interface RecentOperationsTickerProps {
  operations: RecentOperation[]
}

function describe(operation: RecentOperation): string {
  return `${operation.operatedAt} ${operation.userName}${operation.operation}《${operation.courseName}》`
}

/** 最近更新：课程操作日志里最近的建设操作，单行放不下的部分在悬停时给出完整的最近 10 条 */
export function RecentOperationsTicker({ operations }: RecentOperationsTickerProps) {
  return (
    <div className="flex h-10 items-center gap-3 rounded-md border border-border bg-card px-4 text-sm">
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary">
        <Radio className="size-3.5" aria-hidden />
        最近更新
      </span>
      <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
      {operations.length === 0 ? (
        <span className="truncate text-xs text-muted-foreground">近期没有课程建设操作</span>
      ) : (
        <p className="min-w-0 flex-1 truncate text-xs text-foreground" title={operations.map(describe).join("\n")}>
          {operations.slice(0, 3).map((operation, index) => (
            <span key={operation.id}>
              {index > 0 ? <span className="mx-2 text-muted-foreground">·</span> : null}
              <span className="tabular-nums text-muted-foreground">{operation.operatedAt}</span> {operation.userName}
              {operation.operation}《{operation.courseName}》
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
