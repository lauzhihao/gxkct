import { ChevronRight } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { StageStackBar } from "@/modules/dashboard/components/department/stage-stack-bar"
import { formatPercent } from "@/modules/dashboard/format"
import { STAGE_LABELS, STAGE_ORDER } from "@/modules/dashboard/labels"
import { STAGE_COLORS } from "@/modules/dashboard/palette"
import { countOfStage } from "@/modules/dashboard/stage-utils"
import type { MajorProgress } from "@/modules/dashboard/types"

interface MajorStatusTableProps {
  majors: MajorProgress[]
  onSelectMajor: (majorName: string) => void
}

/** 课程建设状态表：每个专业一行，点击进入该专业看板 */
export function MajorStatusTable({ majors, onSelectMajor }: MajorStatusTableProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {STAGE_ORDER.map((stage) => (
          <span key={stage} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: STAGE_COLORS[stage] }} aria-hidden />
            {STAGE_LABELS[stage]}
          </span>
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>专业（年级）</TableHead>
            <TableHead className="text-right">课程数</TableHead>
            <TableHead className="w-[34%]">阶段构成</TableHead>
            {STAGE_ORDER.map((stage) => (
              <TableHead key={stage} className="text-right">
                {STAGE_LABELS[stage]}
              </TableHead>
            ))}
            <TableHead className="text-right">完成率</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {majors.map((major) => (
            <TableRow key={major.majorId} className="cursor-pointer" onClick={() => onSelectMajor(major.majorName)}>
              <TableCell className="font-medium">
                {major.majorName}
                <span className="ml-1 text-xs font-normal text-muted-foreground">{major.gradeLabel}</span>
              </TableCell>
              <TableCell className="text-right tabular-nums">{major.courseCount}</TableCell>
              <TableCell>
                <StageStackBar stages={major.stages} />
              </TableCell>
              {STAGE_ORDER.map((stage) => (
                <TableCell key={stage} className="text-right tabular-nums">
                  {countOfStage(major.stages, stage)}
                </TableCell>
              ))}
              <TableCell className="text-right tabular-nums">{formatPercent(major.completionRate)}</TableCell>
              <TableCell>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
