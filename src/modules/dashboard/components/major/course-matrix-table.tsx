import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { CheckMark } from "@/modules/dashboard/components/shared/check-mark"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { OwnerNames } from "@/modules/dashboard/components/shared/owner-names"
import { formatCount, formatScore } from "@/modules/dashboard/format"
import { NA_REASONS } from "@/modules/dashboard/labels"
import type { CourseMatrixRow } from "@/modules/dashboard/types"

interface CourseMatrixTableProps {
  courses: CourseMatrixRow[]
}

/** 课程 × 建设步骤矩阵：哪门课、差什么、该催谁一目了然 */
export function CourseMatrixTable({ courses }: CourseMatrixTableProps) {
  if (courses.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">本学期本专业没有课程</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>课程</TableHead>
              <TableHead>负责人</TableHead>
              <TableHead className="text-right">支撑指标点</TableHead>
              <TableHead className="text-center">设置完整</TableHead>
              <TableHead className="text-center">大纲</TableHead>
              <TableHead className="text-center">教案</TableHead>
              <TableHead className="text-center">课件</TableHead>
              <TableHead className="text-right">资源数</TableHead>
              <TableHead className="text-right">最近上传</TableHead>
              <TableHead className="text-center">最近更新</TableHead>
              <TableHead className="text-right">评估分（专业内排名）</TableHead>
              <TableHead className="text-center">阶段</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">{course.courseName}</TableCell>
                <TableCell>
                  <OwnerNames names={course.ownerNames} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {course.supportedPointCount > 0 ? `${course.supportedPointCount} 个` : <span className="text-muted-foreground">未关联</span>}
                </TableCell>
                <TableCell className="text-center">
                  <NaValue reason={NA_REASONS.setupComplete} />
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
                <TableCell className="text-right tabular-nums">{formatCount(course.resourceCount)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {course.latestUploadDate !== null ? course.latestUploadDate : "从未上传"}
                </TableCell>
                <TableCell className="text-center">
                  <NaValue reason={NA_REASONS.lastUpdated} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {course.evaluationScore !== null && course.evaluationRank !== null ? (
                    <span>
                      {formatScore(course.evaluationScore)}
                      <span className="ml-1 text-xs text-muted-foreground">（第 {course.evaluationRank}）</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">未出分</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <NaValue reason={NA_REASONS.stage} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        大纲 / 教案 / 课件按课程资源里同名预置目录是否有文件判断；资源数为各目录下的文件与子目录数；评估分取本学期最近一次出分的评估任务。
      </p>
    </div>
  )
}
