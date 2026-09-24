import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { formatScore } from "@/modules/dashboard/format"
import { DEFINITIONS, EVALUATION_STATUS_LABELS, NA_REASONS } from "@/modules/dashboard/labels"
import type { EvaluationRemark, TeacherEvaluation } from "@/modules/dashboard/types"

interface MyEvaluationsProps {
  evaluations: TeacherEvaluation[]
}

function remarkText(remark: EvaluationRemark): string {
  return `${remark.source}·${remark.criterionName}：${remark.comment}`
}

/** 我的评估：本人课程在本学期各评估任务中的学校评价得分、等级与院系 / 学校评语；整改时限系统里没有，显示 N/A */
export function MyEvaluations({ evaluations }: MyEvaluationsProps) {
  if (evaluations.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">本学期本人课程没有参加评估任务</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="max-h-[420px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>课程</TableHead>
              <TableHead>评估任务</TableHead>
              <TableHead className="text-right">得分</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-center">等级</TableHead>
              <TableHead>整改意见</TableHead>
              <TableHead className="text-center">整改时限</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evaluations.map((evaluation) => (
              <TableRow key={evaluation.id}>
                <TableCell className="max-w-[200px]">
                  <p className="truncate font-medium" title={evaluation.courseName}>
                    {evaluation.courseName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground" title={evaluation.majorName}>
                    {evaluation.majorName}
                  </p>
                </TableCell>
                <TableCell className="max-w-[180px] truncate" title={evaluation.taskTitle}>
                  {evaluation.taskTitle}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {evaluation.score === null ? (
                    <span className="text-muted-foreground">未出分</span>
                  ) : evaluation.passed === false ? (
                    <span className="text-destructive">
                      {formatScore(evaluation.score)}
                      <span className="ml-1 text-xs">不合格</span>
                    </span>
                  ) : (
                    formatScore(evaluation.score)
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {evaluation.status !== null ? EVALUATION_STATUS_LABELS[evaluation.status] : "-"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-center tabular-nums">
                  {evaluation.levelSummary !== null ? evaluation.levelSummary : <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell className="min-w-[200px] max-w-[280px] whitespace-normal">
                  {evaluation.remarks.length === 0 ? (
                    <span className="text-muted-foreground">无</span>
                  ) : (
                    <p className="line-clamp-2 text-xs leading-5" title={evaluation.remarks.map(remarkText).join("\n")}>
                      {evaluation.remarks.map(remarkText).join("；")}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <NaValue reason={NA_REASONS.rectificationDeadline} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        {DEFINITIONS.score}，{DEFINITIONS.passLine}；等级为学校评价各标准选中的等级汇总；整改意见取院系评价与学校评价的评语。
      </p>
    </div>
  )
}
