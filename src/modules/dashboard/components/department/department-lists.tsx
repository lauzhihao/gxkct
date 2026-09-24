"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { StageTag } from "@/modules/dashboard/components/shared/stage-tag"
import { TaskStatusTag } from "@/modules/dashboard/components/department/task-status-tag"
import type { DepartmentTask, IdleTeacher, UnqualifiedCourse } from "@/modules/dashboard/types"

interface DepartmentListsProps {
  unqualifiedCourses: UnqualifiedCourse[]
  idleTeachers: IdleTeacher[]
  tasks: DepartmentTask[]
}

/** 清单区：未达标课程 / 零建设教师 / 评估与整改事项 */
export function DepartmentLists({ unqualifiedCourses, idleTeachers, tasks }: DepartmentListsProps) {
  return (
    <Tabs defaultValue="courses" className="gap-3">
      <TabsList>
        <TabsTrigger value="courses">未达标课程 {unqualifiedCourses.length}</TabsTrigger>
        <TabsTrigger value="teachers">零建设教师 {idleTeachers.length}</TabsTrigger>
        <TabsTrigger value="tasks">评估与整改 {tasks.length}</TabsTrigger>
      </TabsList>

      <TabsContent value="courses">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>课程</TableHead>
              <TableHead>专业</TableHead>
              <TableHead>负责人</TableHead>
              <TableHead>阶段</TableHead>
              <TableHead>缺少</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unqualifiedCourses.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">{course.courseName}</TableCell>
                <TableCell>{course.majorName}</TableCell>
                <TableCell>
                  {course.ownerName !== null ? course.ownerName : <span className="text-destructive">未设置</span>}
                </TableCell>
                <TableCell>
                  <StageTag stage={course.stage} />
                </TableCell>
                <TableCell className="text-muted-foreground">{course.missing.join("、")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>

      <TabsContent value="teachers">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>教师</TableHead>
              <TableHead>专业</TableHead>
              <TableHead className="text-right">负责课程</TableHead>
              <TableHead className="text-right">最近一次建设</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {idleTeachers.map((teacher) => (
              <TableRow key={teacher.id}>
                <TableCell className="font-medium">{teacher.teacherName}</TableCell>
                <TableCell>{teacher.majorName}</TableCell>
                <TableCell className="text-right tabular-nums">{teacher.courseCount} 门</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {teacher.lastActiveDate !== null ? teacher.lastActiveDate : "从未参与"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>

      <TabsContent value="tasks">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>类型</TableHead>
              <TableHead>事项</TableHead>
              <TableHead>课程</TableHead>
              <TableHead className="text-right">时限</TableHead>
              <TableHead>状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="whitespace-nowrap">{task.kind === "evaluation" ? "评估任务" : "待整改"}</TableCell>
                <TableCell className="max-w-[260px] truncate" title={task.title}>
                  {task.title}
                </TableCell>
                <TableCell>{task.courseName}</TableCell>
                <TableCell className="text-right tabular-nums">{task.deadline}</TableCell>
                <TableCell>
                  <TaskStatusTag status={task.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  )
}
