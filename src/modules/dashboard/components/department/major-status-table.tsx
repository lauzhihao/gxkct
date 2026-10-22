import { ChevronRight } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { OwnerNames } from "@/modules/dashboard/components/shared/owner-names"
import { StageComposition } from "@/modules/dashboard/components/shared/stage-composition"
import { formatCount, formatPercent } from "@/modules/dashboard/format"
import { DEFINITIONS, NA_REASONS } from "@/modules/dashboard/labels"
import type { MajorStatus } from "@/modules/dashboard/types"

interface MajorStatusTableProps {
  majors: MajorStatus[]
  onSelectMajor: (majorId: string) => void
}

/** 课程建设状态表：每个专业一行，点击进入该专业看板 */
export function MajorStatusTable({ majors, onSelectMajor }: MajorStatusTableProps) {
  if (majors.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">本学期本系没有专业</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>专业</TableHead>
          <TableHead>专业负责人</TableHead>
          <TableHead className="text-right">课程数</TableHead>
          <TableHead className="text-right">负责人未设置</TableHead>
          <TableHead className="text-right" title="课程每参加一次评估任务计一门次">本学期评估完成（门次）</TableHead>
          <TableHead className="min-w-[140px]" title={DEFINITIONS.stage}>
            建设阶段构成
          </TableHead>
          <TableHead className="text-right" title={DEFINITIONS.completion}>
            完成率
          </TableHead>
          <TableHead className="w-8" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {majors.map((major) => (
          <TableRow key={major.majorId} className="cursor-pointer" onClick={() => onSelectMajor(major.majorId)}>
            <TableCell className="font-medium">{major.majorName}</TableCell>
            <TableCell>
              <OwnerNames names={major.leadNames} />
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatCount(major.courseCount)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {major.ownerMissingCount > 0 ? (
                <span className="font-medium text-destructive">{formatCount(major.ownerMissingCount)}</span>
              ) : (
                0
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {major.evaluationTargetCount > 0
                ? `${formatCount(major.evaluationCompletedCount)} / ${formatCount(major.evaluationTargetCount)}`
                : "未参评"}
            </TableCell>
            <TableCell>
              <StageComposition counts={major.stageCounts} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {major.completion === null ? <NaValue reason={NA_REASONS.noCourses} /> : formatPercent(major.completion)}
            </TableCell>
            <TableCell>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
