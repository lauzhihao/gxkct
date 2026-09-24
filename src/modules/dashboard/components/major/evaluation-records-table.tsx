import type { ReactNode } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { formatScore } from "@/modules/dashboard/format"
import { NA_REASONS } from "@/modules/dashboard/labels"
import type { EvaluationCell, EvaluationColumn, EvaluationRecord } from "@/modules/dashboard/types"

interface EvaluationRecordsTableProps {
  columns: EvaluationColumn[]
  records: EvaluationRecord[]
}

function renderCell(cell: EvaluationCell): ReactNode {
  if (cell.kind === "absent") return <span className="text-muted-foreground">-</span>
  if (cell.kind === "pending") return <span className="text-muted-foreground">未出分</span>
  return formatScore(cell.score)
}

/** 历次评估结果汇总：列为本学期的评估任务，"-" 表示该课程未参加这次评估 */
export function EvaluationRecordsTable({ columns, records }: EvaluationRecordsTableProps) {
  if (records.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">本学期本专业课程没有参加评估任务</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="max-h-[420px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>课程</TableHead>
              {columns.map((column) => (
                <TableHead key={column.taskId} className="text-right" title={column.endDate !== null ? `截止 ${column.endDate}` : undefined}>
                  {column.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.courseId}>
                <TableCell className="font-medium">{record.courseName}</TableCell>
                {record.cells.map((cell, index) => (
                  <TableCell key={columns[index].taskId} className="text-right tabular-nums">
                    {renderCell(cell)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        合格线 <NaValue reason={NA_REASONS.passLine} showReason />；得分为评估任务的最终得分。
      </p>
    </div>
  )
}
