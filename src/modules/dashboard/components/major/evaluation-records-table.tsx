import { AlertTriangle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import type { EvaluationRecord } from "@/modules/dashboard/types"

interface EvaluationRecordsTableProps {
  terms: string[]
  passScore: number
  records: EvaluationRecord[]
}

/** 历次评估结果汇总：低于合格线的分数带图标提示，便于提前整改 */
export function EvaluationRecordsTable({ terms, passScore, records }: EvaluationRecordsTableProps) {
  return (
    <div className="flex flex-col gap-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>课程</TableHead>
            {terms.map((term) => (
              <TableHead key={term} className="text-right">
                {term}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.courseId}>
              <TableCell className="font-medium">{record.courseName}</TableCell>
              {record.results.map((result) => (
                <TableCell key={result.termLabel} className="text-right tabular-nums">
                  {result.score === null ? (
                    <span className="text-muted-foreground">-</span>
                  ) : result.score < passScore ? (
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      <AlertTriangle className="size-3.5 text-destructive" aria-label="低于合格线" />
                      {result.score}
                    </span>
                  ) : (
                    result.score
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground">合格线 {passScore} 分；"-" 表示该学期未参评。</p>
    </div>
  )
}
