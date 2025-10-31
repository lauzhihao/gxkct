"use client"

import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { TreeNode } from "@/components/tree-view"
import { Building2, GraduationCap, BookOpen, FolderKanban } from "lucide-react"
import cn from "classnames"

interface StatisticsCardsProps {
  node: TreeNode
  onNodeSelect?: (node: TreeNode) => void
  headerAction?: React.ReactNode
}

export function StatisticsCards({ node, onNodeSelect, headerAction }: StatisticsCardsProps) {
  const departments = node.children?.filter((child) => child.type === "department") || []
  const majors = node.children?.filter((child) => child.type === "major") || []
  const allMajors =
    node.children?.flatMap((dept) => dept.children?.filter((child) => child.type === "major") || []) || []
  const courses =
    node.children?.flatMap(
      (dept) =>
        dept.children?.flatMap((major) => major.children?.filter((child) => child.type === "course") || []) || [],
    ) || []

  const isUniversity = node.type === "university"
  const isDepartment = node.type === "department"

  const displayMajors = isDepartment ? majors : allMajors
  const displayCourses = isDepartment
    ? majors.flatMap((major) => major.children?.filter((child) => child.type === "course") || [])
    : courses

  const getNodeTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      university: "学校",
      department: "院系",
      major: "专业",
      course: "课程",
      project: "项目",
    }
    return typeMap[type] || type
  }

  const getNodeTypeIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      university: <Building2 className="w-3 h-3" />,
      department: <Building2 className="w-3 h-3" />,
      major: <GraduationCap className="w-3 h-3" />,
      course: <BookOpen className="w-3 h-3" />,
      project: <FolderKanban className="w-3 h-3" />,
    }
    return iconMap[type] || null
  }

  const userCount = node.metadata?.users?.length || 0

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="space-y-6">
        {/* Header with action button */}
        {headerAction && (
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-foreground">组织架构</h3>
            {headerAction}
          </div>
        )}

        <div className={cn("grid gap-4", isDepartment && userCount > 0 ? "grid-cols-4" : "grid-cols-3")}>
          {isUniversity && (
            <Card
              className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                if (departments.length > 0 && onNodeSelect) {
                  onNodeSelect(departments[0])
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="text-3xl font-bold text-blue-600">{departments.length}</div>
                  <div className="text-sm text-blue-700">院系</div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="text-3xl font-bold text-green-600">{displayMajors.length}</div>
                <div className="text-sm text-green-700">专业</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="text-3xl font-bold text-purple-600">{displayCourses.length}</div>
                <div className="text-sm text-purple-700">课程</div>
              </div>
            </CardContent>
          </Card>
          {isDepartment && (
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="text-3xl font-bold text-orange-600">{userCount}</div>
                  <div className="text-sm text-orange-700">用户</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {isUniversity && departments.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-medium text-foreground">院系列表</h3>
            <div className="grid grid-cols-4 gap-4">
              {departments.map((dept) => {
                const deptMajors = dept.children?.filter((child) => child.type === "major") || []
                const deptCourses =
                  dept.children?.flatMap((major) => major.children?.filter((child) => child.type === "course") || []) ||
                  []

                return (
                  <Card
                    key={dept.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-border bg-card/50 backdrop-blur-sm relative"
                    onClick={() => onNodeSelect?.(dept)}
                  >
                    <Badge
                      variant="secondary"
                      className="absolute top-2 right-2 text-xs flex items-center gap-1 bg-primary/10 text-primary border-primary/20"
                    >
                      {getNodeTypeIcon(dept.type)}
                      {getNodeTypeLabel(dept.type)}
                    </Badge>

                    <CardContent className="p-4 pt-8">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-foreground mb-1">{dept.name}</h4>
                          {dept.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{dept.description}</p>
                          )}
                        </div>
                        <div className="flex gap-3 text-sm text-muted-foreground">
                          <span>{deptMajors.length} 专业</span>
                          <span>{deptCourses.length} 课程</span>
                        </div>
                        {dept.metadata?.director && (
                          <div className="pt-2 border-t border-border">
                            <Badge variant="outline" className="text-xs">
                              负责人: {dept.metadata.director}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {isDepartment && majors.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-medium text-foreground">专业列表</h3>
            <div className="grid grid-cols-4 gap-4">
              {majors.map((major) => {
                const majorCourses = major.children?.filter((child) => child.type === "course") || []

                return (
                  <Card
                    key={major.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-border bg-card/50 backdrop-blur-sm relative"
                    onClick={() => onNodeSelect?.(major)}
                  >
                    <Badge
                      variant="secondary"
                      className="absolute top-2 right-2 text-xs flex items-center gap-1 bg-primary/10 text-primary border-primary/20"
                    >
                      {getNodeTypeIcon(major.type)}
                      {getNodeTypeLabel(major.type)}
                    </Badge>

                    <CardContent className="p-4 pt-8">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-foreground mb-1">{major.name}</h4>
                          {major.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{major.description}</p>
                          )}
                        </div>
                        <div className="flex gap-3 text-sm text-muted-foreground">
                          <span>{majorCourses.length} 课程</span>
                        </div>
                        {major.metadata?.director && (
                          <div className="pt-2 border-t border-border">
                            <Badge variant="outline" className="text-xs">
                              负责人: {major.metadata.director}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
