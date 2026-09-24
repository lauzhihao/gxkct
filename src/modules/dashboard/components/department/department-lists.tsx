"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { TaskStatusTag } from "@/modules/dashboard/components/department/task-status-tag"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { formatCount, formatPercent } from "@/modules/dashboard/format"
import { DEFINITIONS, NA_REASONS } from "@/modules/dashboard/labels"
import type { DepartmentTask, IdleTeacher, RectifyCourse, UnqualifiedCourse } from "@/modules/dashboard/types"

interface DepartmentListsProps {
  registeredTeacherCount: number
  unqualifiedCourses: UnqualifiedCourse[]
  idleTeachers: IdleTeacher[]
  tasks: DepartmentTask[]
  rectifyCourses: RectifyCourse[]
}

/** 清单区：未达标课程 / 零建设教师 / 评估与整改事项 */
export function DepartmentLists({ registeredTeacherCount, unqualifiedCourses, idleTeachers, tasks, rectifyCourses }: DepartmentListsProps) {
  return (
    <Tabs defaultValue="courses" className="gap-3">
      <TabsList>
        <TabsTrigger value="courses">未达标课程 {unqualifiedCourses.length}</TabsTrigger>
        <TabsTrigger value="teachers">零建设教师 {idleTeachers.length}</TabsTrigger>
        <TabsTrigger value="tasks">评估与整改 {tasks.length + rectifyCourses.length}</TabsTrigger>
      </TabsList>

      <TabsContent value="courses" className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">{DEFINITIONS.qualified}，缺任一项即未达标。</p>
        {unqualifiedCourses.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">本系课程均已达标</p>
        ) : (
          <div className="max-h-[360px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>课程</TableHead>
                  <TableHead>专业</TableHead>
                  <TableHead>缺少</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unqualifiedCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="max-w-[220px] truncate font-medium" title={course.courseName}>
                      {course.courseName}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-muted-foreground" title={course.majorName}>
                      {course.majorName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-destructive">{course.missingMaterials.join("、")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="teachers" className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">{DEFINITIONS.idle}；改 KSA、改矩阵不在操作日志里，未计入。</p>
        {idleTeachers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {registeredTeacherCount === 0 ? "本系没有在册教师" : "在册教师近 60 天都有课程建设操作"}
          </p>
        ) : (
          <div className="max-h-[360px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>教师</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead className="text-right">最近一次建设</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {idleTeachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">{teacher.teacherName}</TableCell>
                    <TableCell className="text-muted-foreground">{teacher.roleLabel !== null ? teacher.roleLabel : "-"}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {teacher.lastOperatedDay !== null ? teacher.lastOperatedDay : "无记录"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="tasks" className="flex flex-col gap-2">
        {tasks.length === 0 && rectifyCourses.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">本学期本系没有评估任务</p>
        ) : (
          <div className="max-h-[360px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类型</TableHead>
                  <TableHead>事项</TableHead>
                  <TableHead className="text-right">进度 / 得分率</TableHead>
                  <TableHead className="text-right">截止</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={`task-${task.id}`}>
                    <TableCell className="whitespace-nowrap">评估任务</TableCell>
                    <TableCell className="max-w-[260px] truncate" title={task.title}>
                      {task.title}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(task.completedCount)} / {formatCount(task.targetCount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{task.deadline !== null ? task.deadline : "-"}</TableCell>
                    <TableCell>
                      <TaskStatusTag status={task.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {rectifyCourses.map((course) => (
                  <TableRow key={`rectify-${course.id}`}>
                    <TableCell className="whitespace-nowrap text-destructive">待整改</TableCell>
                    <TableCell className="max-w-[260px]">
                      <p className="truncate font-medium" title={course.courseName}>
                        {course.courseName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground" title={course.taskTitle !== null ? course.taskTitle : undefined}>
                        {course.majorName} · {course.taskTitle !== null ? course.taskTitle : "评估任务不在本系任务列表中"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{formatPercent(course.rate)}</TableCell>
                    <TableCell className="text-right">
                      <NaValue reason={NA_REASONS.rectificationDeadline} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">未达合格线</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">待整改：最近一次学校评价未达合格线。{DEFINITIONS.passLine}；整改时限系统里没有，显示 N/A。</p>
      </TabsContent>
    </Tabs>
  )
}
