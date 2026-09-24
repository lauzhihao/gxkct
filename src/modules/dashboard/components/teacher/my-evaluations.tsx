import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import type { TeacherEvaluation } from "@/modules/dashboard/types"

interface MyEvaluationsProps {
  evaluations: TeacherEvaluation[]
}

/** 我的评估：得分、等级，以及需要整改的意见与时限 */
export function MyEvaluations({ evaluations }: MyEvaluationsProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>课程</TableHead>
          <TableHead>学期</TableHead>
          <TableHead className="text-right">得分</TableHead>
          <TableHead className="text-center">等级</TableHead>
          <TableHead>整改意见</TableHead>
          <TableHead className="text-right">整改时限</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {evaluations.map((evaluation) => (
          <TableRow key={evaluation.id}>
            <TableCell className="font-medium">{evaluation.courseName}</TableCell>
            <TableCell>{evaluation.termLabel}</TableCell>
            <TableCell className="text-right tabular-nums">{evaluation.score}</TableCell>
            <TableCell className="text-center">{evaluation.level}</TableCell>
            <TableCell className="max-w-[320px] whitespace-normal text-muted-foreground">
              {evaluation.comment !== null ? evaluation.comment : "无"}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {evaluation.rectifyDeadline !== null ? evaluation.rectifyDeadline : "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
