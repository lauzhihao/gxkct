"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { TaskStatusTag } from "@/modules/dashboard/components/department/task-status-tag"
import { NaPanelBody } from "@/modules/dashboard/components/shared/na-panel-body"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { formatCount } from "@/modules/dashboard/format"
import { NA_REASONS } from "@/modules/dashboard/labels"
import type { DepartmentTask, IdleTeacher } from "@/modules/dashboard/types"

interface DepartmentListsProps {
  registeredTeacherCount: number
  idleTeachers: IdleTeacher[]
  tasks: DepartmentTask[]
}

/** 清单区：未达标课程 / 零建设教师 / 评估与整改事项 */
export function DepartmentLists({ registeredTeacherCount, idleTeachers, tasks }: DepartmentListsProps) {
  return (
    <Tabs defaultValue="teachers" className="gap-3">
      <TabsList>
        <TabsTrigger value="courses">未达标课程 N/A</TabsTrigger>
        <TabsTrigger value="teachers">零建设教师 {idleTeachers.length}</TabsTrigger>
        <TabsTrigger value="tasks">评估与整改 {tasks.length}</TabsTrigger>
      </TabsList>

      <TabsContent value="courses">
        <NaPanelBody reason={NA_REASONS.qualified} minHeight={140} />
      </TabsContent>

      <TabsContent value="teachers" className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          本系在册教师中未担任本系任何课程负责人的人（{NA_REASONS.idleActivity}，按是否负责课程判定）。
        </p>
        {idleTeachers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {registeredTeacherCount === 0 ? "本系没有在册教师" : "在册教师均已担任课程负责人"}
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
                    <TableCell className="text-right">
                      <NaValue reason={NA_REASONS.idleActivity} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="tasks" className="flex flex-col gap-2">
        {tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">本学期本系没有评估任务</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>类型</TableHead>
                <TableHead>事项</TableHead>
                <TableHead className="text-right">已完成 / 参评</TableHead>
                <TableHead className="text-right">截止</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
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
            </TableBody>
          </Table>
        )}
        <p className="text-xs text-muted-foreground">
          待整改事项：<NaValue reason={NA_REASONS.rectification} showReason />
        </p>
      </TabsContent>
    </Tabs>
  )
}
