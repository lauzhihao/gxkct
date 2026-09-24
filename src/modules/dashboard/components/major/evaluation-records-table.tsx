import type { ReactNode } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { formatScore } from "@/modules/dashboard/format"
import { DEFINITIONS } from "@/modules/dashboard/labels"
import type { EvaluationCell, EvaluationColumn, EvaluationRecord } from "@/modules/dashboard/types"

interface EvaluationRecordsTableProps {
  columns: EvaluationColumn[]
  records: EvaluationRecord[]
}

/** 已出分的格子：未达合格线的在分数旁标"不合格"，不只靠颜色 */
function renderCell(cell: EvaluationCell): ReactNode {
  if (cell.kind === "absent") return <span className="text-muted-foreground">-</span>
  if (cell.kind === "pending") return <span className="text-muted-foreground">未出分</span>
  if (cell.passed === false) {
    return (
      <span className="text-destructive">
        {formatScore(cell.score)}
        <span className="ml-1 text-xs">不合格</span>
      </span>
    )
  }
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
      <p className="text-xs leading-5 text-muted-foreground">
        {DEFINITIONS.score}，未完成学校评价显示"未出分"；{DEFINITIONS.passLine}。
      </p>
    </div>
  )
}
