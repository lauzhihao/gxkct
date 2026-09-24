import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { formatScore } from "@/modules/dashboard/format"
import { EVALUATION_STATUS_LABELS, NA_REASONS } from "@/modules/dashboard/labels"
import type { TeacherEvaluation } from "@/modules/dashboard/types"

interface MyEvaluationsProps {
  evaluations: TeacherEvaluation[]
}

/** 我的评估：本人课程在本学期各评估任务中的得分与整体状态；等级与整改信息系统里没有，显示 N/A */
export function MyEvaluations({ evaluations }: MyEvaluationsProps) {
  if (evaluations.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">本学期本人课程没有参加评估任务</p>
  }

  return (
    <div className="max-h-[420px] overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>课程</TableHead>
            <TableHead>评估任务</TableHead>
            <TableHead className="text-right">得分</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="text-center">等级</TableHead>
            <TableHead className="text-center">整改意见</TableHead>
            <TableHead className="text-center">整改时限</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {evaluations.map((evaluation) => (
            <TableRow key={evaluation.id}>
              <TableCell className="max-w-[240px]">
                <p className="truncate font-medium" title={evaluation.courseName}>
                  {evaluation.courseName}
                </p>
                <p className="truncate text-xs text-muted-foreground" title={evaluation.majorName}>
                  {evaluation.majorName}
                </p>
              </TableCell>
              <TableCell className="max-w-[220px] truncate" title={evaluation.taskTitle}>
                {evaluation.taskTitle}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {evaluation.score !== null ? formatScore(evaluation.score) : <span className="text-muted-foreground">未出分</span>}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {evaluation.status !== null ? EVALUATION_STATUS_LABELS[evaluation.status] : "-"}
              </TableCell>
              <TableCell className="text-center">
                <NaValue reason={NA_REASONS.evaluationLevel} />
              </TableCell>
              <TableCell className="text-center">
                <NaValue reason={NA_REASONS.rectifyComment} />
              </TableCell>
              <TableCell className="text-center">
                <NaValue reason={NA_REASONS.rectifyComment} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
