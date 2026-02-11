"use client"

import { useState, useEffect } from "react"
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { LoadingState } from "@/shared/components/ui/loading-state"
import { api } from "@/lib/api"
import type { TeachingSupervisoryTask, TreeNode, Long } from "@/types"
import { CourseEvaluationList, MajorEvaluationList } from "@/shared/components/supervision"
import { courseTeachingTasksApi } from "@/modules/courses/api/courseTeachingTasksApi"

interface TeachingQualityStatsProps {
  node: TreeNode
  nodeType: "department" | "major"
  treeData?: TreeNode
}

export function TeachingQualityStats({ node, nodeType, treeData }: TeachingQualityStatsProps) {
  const [tasks, setTasks] = useState<TeachingSupervisoryTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TeachingSupervisoryTask | null>(null)

  // 从 node.nodeId 中提取数字部分（处理 "major_123" 格式）
  const getMajorId = (): Long | null => {
    if (nodeType !== "major") return null
    const idMatch = node.nodeId?.match(/\d+/)
    return idMatch ? (Number(idMatch[0]) as Long) : null
  }

  // 从 node.nodeId 中提取院系ID（处理 "dept_123" 格式）
  const getDeptId = (): Long | null => {
    if (nodeType !== "department") return null
    const idMatch = node.nodeId?.match(/\d+/)
    return idMatch ? (Number(idMatch[0]) as Long) : null
  }

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true)

        if (nodeType === "major") {
          // 专业使用专业 API
          const majorId = getMajorId()
          if (!majorId) {
            console.warn("无法找到 majorId")
            setIsLoading(false)
            return
          }
          const response = await api.teachingTasks.getTasksByMajor(majorId)
          if (response.data) {
            setTasks(response.data)
          }
        } else if (nodeType === "department") {
          // 院系使用院系 API
          const deptId = getDeptId()
          if (!deptId) {
            console.warn("无法找到 deptId")
            setIsLoading(false)
            return
          }
          const response = await courseTeachingTasksApi.getTasksByDept(deptId)
          if (response.data) {
            // 转换为 TeachingSupervisoryTask 格式
            const mappedTasks: TeachingSupervisoryTask[] = response.data.map((task) => ({
              id: task.taskId,
              taskId: task.taskId,
              title: task.title,
              description: "",
              startDate: task.startDate,
              endDate: task.endDate,
              status: task.status,
              creator: task.deptName || "",
              courseCount: task.courseCount,
              majorCount: task.majorCount,
              avgDeptScore: task.avgDeptScore,
            }))
            setTasks(mappedTasks)
          }
        }
      } catch (error) {
        console.error("获取教学督导任务失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id, node.nodeId, node.parentId, treeData, nodeType])

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      not_started: "未开始",
      in_progress: "进行中",
      completed: "已结束",
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      not_started: "bg-gray-100 text-gray-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
    }
    return colorMap[status] || "bg-gray-100 text-gray-800"
  }

  if (isLoading) {
    return <LoadingState variant="card" />
  }

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">暂无进行中的任务</p>
      </div>
    )
  }

  // 专业级别：选中任务后显示课程列表
  if (selectedTask && nodeType === "major") {
    const majorId = getMajorId()
    if (majorId) {
      return (
        <CourseEvaluationList
          task={selectedTask}
          majorId={majorId}
          majorName={node.nodeName || node.name}
          onBack={() => setSelectedTask(null)}
        />
      )
    }
  }

  // 院系级别：选中任务后显示专业列表
  if (selectedTask && nodeType === "department") {
    const deptId = getDeptId()
    if (deptId) {
      return (
        <MajorEvaluationList
          task={selectedTask}
          deptId={deptId}
          deptName={node.nodeName || node.name}
          onBack={() => setSelectedTask(null)}
        />
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => {
          const taskKey = task.taskId ?? task.id

          return (
            <Card
              key={taskKey}
              className="p-6 hover:shadow-md transition-shadow border-border bg-card/50 backdrop-blur-sm flex flex-col cursor-pointer hover:border-primary/50"
              onClick={() => setSelectedTask(task)}
            >
              <div className="space-y-4 flex-1">
                {/* 标题和状态 */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-foreground text-sm line-clamp-2 flex-1">{task.title}</h4>
                  <Badge className={`text-xs whitespace-nowrap ${getStatusColor(task.status)}`}>
                    {getStatusLabel(task.status)}
                  </Badge>
                </div>

                {/* 统计指标 - 数字在上，指标在下 */}
                <div className="py-4">
                  {nodeType === "department" ? (
                    <div className="grid grid-cols-3 gap-4">
                      {/* 专业 */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-primary">{task.majorCount ?? 0}</div>
                        <div className="text-xs text-muted-foreground mt-1">专业</div>
                      </div>
                      {/* 课程 */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-primary">{task.courseCount ?? 0}</div>
                        <div className="text-xs text-muted-foreground mt-1">课程</div>
                      </div>
                      {/* 平均 */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-primary">{task.avgDeptScore != null ? task.avgDeptScore.toFixed(1) : "-"}</div>
                        <div className="text-xs text-muted-foreground mt-1">平均</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-around">
                      {/* 课程 */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-primary">{task.courseCount ?? 0}</div>
                        <div className="text-xs text-muted-foreground mt-1">课程</div>
                      </div>
                      {/* 平均 */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-primary">{task.avgDeptScore != null ? task.avgDeptScore.toFixed(1) : "-"}</div>
                        <div className="text-xs text-muted-foreground mt-1">平均</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 日期 - 右下角，分割线和底边框之间垂直居中 */}
              <div className="text-xs text-muted-foreground text-right border-t border-border flex items-center justify-end min-h-8">
                {new Date(task.startDate).toLocaleDateString("zh-CN")} ~ {new Date(task.endDate).toLocaleDateString("zh-CN")}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
