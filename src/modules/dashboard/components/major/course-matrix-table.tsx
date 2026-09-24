import { AlertTriangle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { CheckMark } from "@/modules/dashboard/components/shared/check-mark"
import { StageTag } from "@/modules/dashboard/components/shared/stage-tag"
import type { CourseMatrixRow } from "@/modules/dashboard/types"

/** 超过该天数未更新的课程标出提醒 */
const STALE_DAYS = 60

interface CourseMatrixTableProps {
  courses: CourseMatrixRow[]
}

/** 课程 × 建设步骤矩阵：哪门课、差什么、该催谁一目了然 */
export function CourseMatrixTable({ courses }: CourseMatrixTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>课程</TableHead>
            <TableHead>负责人</TableHead>
            <TableHead>毕业要求指标点</TableHead>
            <TableHead className="text-center">设置完整</TableHead>
            <TableHead className="text-center">大纲</TableHead>
            <TableHead className="text-center">教案</TableHead>
            <TableHead className="text-center">课件</TableHead>
            <TableHead className="text-right">资源数</TableHead>
            <TableHead className="text-right">最近更新</TableHead>
            <TableHead className="text-right">评估分（专业内排名）</TableHead>
            <TableHead>阶段</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course) => (
            <TableRow key={course.id}>
              <TableCell className="font-medium">{course.courseName}</TableCell>
              <TableCell>
                {course.ownerName !== null ? course.ownerName : <span className="text-destructive">未设置</span>}
              </TableCell>
              <TableCell className="text-muted-foreground">{course.indicatorPoints.join("、")}</TableCell>
              <TableCell className="text-center">
                <CheckMark done={course.setupComplete} label="课程设置" />
              </TableCell>
              <TableCell className="text-center">
                <CheckMark done={course.hasSyllabus} label="大纲" />
              </TableCell>
              <TableCell className="text-center">
                <CheckMark done={course.hasLessonPlan} label="教案" />
              </TableCell>
              <TableCell className="text-center">
                <CheckMark done={course.hasCourseware} label="课件" />
              </TableCell>
              <TableCell className="text-right tabular-nums">{course.resourceCount}</TableCell>
              <TableCell className="text-right tabular-nums">
                <span className="inline-flex items-center gap-1">
                  {course.daysSinceUpdate > STALE_DAYS ? (
                    <AlertTriangle className="size-3.5 text-warning" aria-label={`超过 ${STALE_DAYS} 天未更新`} />
                  ) : null}
                  {course.lastUpdated}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {course.evaluationScore !== null && course.evaluationRank !== null ? (
                  <span>
                    {course.evaluationScore}
                    <span className="ml-1 text-xs text-muted-foreground">（第 {course.evaluationRank}）</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">未评</span>
                )}
              </TableCell>
              <TableCell>
                <StageTag stage={course.stage} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
