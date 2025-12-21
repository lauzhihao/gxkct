"use client"

import { useState, useEffect } from "react"
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Users, TrendingUp } from "lucide-react"
import { api } from "@/lib/api"
import type { TeachingSupervisoryTask, TreeNode, Long } from "@/types"

interface TeachingQualityStatsProps {
  node: TreeNode
  nodeType: "department" | "major"
  treeData?: TreeNode
  departmentMajors?: Map<string, TreeNode[]>
  majorCourses?: Map<string, TreeNode[]>
}

export function TeachingQualityStats({ node, nodeType, treeData, departmentMajors, majorCourses }: TeachingQualityStatsProps) {
  const [tasks, setTasks] = useState<TeachingSupervisoryTask[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 获取 collegeId - 从 parentId 中提取
  const getCollegeId = (): string | null => {
    if (nodeType === "department") {
      // 院系节点从 parentId 中提取 collegeId（格式如 "university_123"）
      return node.parentId?.replace("university_", "") || null
    } else if (nodeType === "major") {
      // 专业节点需要从父院系获取 collegeId
      const parentDeptId = node.parentId
      if (!parentDeptId || !treeData) return null

      // 从树中查找父院系
      const findDepartment = (searchNode: TreeNode): TreeNode | null => {
        if (searchNode.nodeId === parentDeptId && searchNode.nodeType === "department") {
          return searchNode
        }
        if (searchNode.children) {
          for (const child of searchNode.children) {
            const found = findDepartment(child)
            if (found) return found
          }
        }
        return null
      }

      const parentDept = findDepartment(treeData)
      return parentDept?.parentId?.replace("university_", "") || null
    }
    return null
  }

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true)
        const collegeId = getCollegeId()
        if (!collegeId) {
          console.warn("无法找到 collegeId")
          setIsLoading(false)
          return
        }
        const response = await api.teachingTasks.getTasks(Number(collegeId) as Long)
        if (response.data) {
          setTasks(response.data)
        }
      } catch (error) {
        console.error("获取教学督导任务失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [node.id, node.parentId, treeData, nodeType])

  // Mock数据：生成参与数和平均分
  const getTaskStats = (taskId: string) => {
    // 根据taskId生成稳定的mock数据
    const hash = taskId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return {
      participantCount: 5 + (hash % 10), // 5-14个参与者
      averageScore: 75 + (hash % 20), // 75-95分
    }
  }

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

  // 计算院系的专业数和课程数
  const getDepartmentStats = () => {
    if (nodeType !== "department") return { majorCount: 0, courseCount: 0 }

    const majors = departmentMajors?.get(node.id) || []
    let courseCount = 0

    majors.forEach((major) => {
      const courses = majorCourses?.get(major.id) || []
      courseCount += courses.length
    })

    return {
      majorCount: majors.length,
      courseCount,
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">暂无进行中的任务</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => {
          const stats = getTaskStats(task.id)
          const deptStats = nodeType === "department" ? getDepartmentStats() : null

          return (
            <Card key={task.id} className="p-6 hover:shadow-md transition-shadow border-border bg-card/50 backdrop-blur-sm flex flex-col">
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
                  {nodeType === "department" && deptStats ? (
                    <div className="grid grid-cols-3 gap-4">
                      {/* 专业数 */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-primary">{deptStats.majorCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">专业</div>
                      </div>
                      {/* 课程数 */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-primary">{deptStats.courseCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">课程</div>
                      </div>
                      {/* 平均分 */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-primary">{stats.averageScore}</div>
                        <div className="text-xs text-muted-foreground mt-1">平均分</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-around">
                      {/* 参与课程数 */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-primary">{stats.participantCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">课程</div>
                      </div>
                      {/* 平均分 */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-primary">{stats.averageScore}</div>
                        <div className="text-xs text-muted-foreground mt-1">平均分</div>
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
