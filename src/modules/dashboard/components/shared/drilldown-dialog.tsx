"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { StageTag } from "@/modules/dashboard/components/shared/stage-tag"
import type { DrilldownRequest } from "@/modules/dashboard/types"

interface DrilldownDialogProps {
  request: DrilldownRequest | null
  onClose: () => void
}

/** 统计数字下钻到课程清单 */
export function DrilldownDialog({ request, onClose }: DrilldownDialogProps) {
  return (
    <Dialog open={request !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-3xl">
        {request ? (
          <>
            <DialogHeader>
              <DialogTitle>{request.title}</DialogTitle>
              <DialogDescription>
                共 {request.total} 门课程
                {request.total > request.courses.length ? `，示例数据仅列出前 ${request.courses.length} 门` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>课程</TableHead>
                    <TableHead>专业</TableHead>
                    <TableHead>院系</TableHead>
                    <TableHead>负责人</TableHead>
                    <TableHead>建设阶段</TableHead>
                    <TableHead className="text-right">最近更新</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {request.courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.courseName}</TableCell>
                      <TableCell>{course.majorName}</TableCell>
                      <TableCell>{course.departmentName}</TableCell>
                      <TableCell>
                        {course.ownerName !== null ? course.ownerName : <span className="text-destructive">未设置</span>}
                      </TableCell>
                      <TableCell>
                        <StageTag stage={course.stage} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{course.lastUpdated}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
