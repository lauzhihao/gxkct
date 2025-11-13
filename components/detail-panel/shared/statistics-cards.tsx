"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { TreeNode } from "@/components/tree-view"
import { Building2, GraduationCap, BookOpen, FileText, Search } from "lucide-react"
import cn from "classnames"

interface StatisticsCardsProps {
  node: TreeNode
  onNodeSelect?: (node: TreeNode) => void
  headerAction?: React.ReactNode
  departmentMajors?: Map<string, TreeNode[]>
  majorCourses?: Map<string, TreeNode[]>
  onToggleExpand?: (nodeId: string) => void
}

export function StatisticsCards({ node, onNodeSelect, headerAction, departmentMajors, majorCourses, onToggleExpand }: StatisticsCardsProps) {
  const [departmentSearch, setDepartmentSearch] = useState("")
  const [majorSearch, setMajorSearch] = useState("")

  const departments = node.children?.filter((child) => child.type === "department") || []

  // 对于院系节点，优先使用动态加载的专业数据
  const majors = node.type === "department" && departmentMajors?.has(node.id)
    ? departmentMajors.get(node.id) || []
    : node.children?.filter((child) => child.type === "major") || []

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

  // 对于院系节点，计算课程数时使用动态加载的课程数据
  const displayCourses = isDepartment
    ? majors.flatMap((major) => {
        // 如果该专业有动态加载的课程数据，使用动态数据
        if (majorCourses?.has(major.id)) {
          return majorCourses.get(major.id) || []
        }
        // 否则使用静态数据
        return major.children?.filter((child) => child.type === "course") || []
      })
    : courses

  // Filter departments by search
  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(departmentSearch.toLowerCase()),
  )

  // Filter majors by search
  const filteredMajors = majors.filter((major) => major.name.toLowerCase().includes(majorSearch.toLowerCase()))

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
      department: <GraduationCap className="w-3 h-3" />,
      major: <BookOpen className="w-3 h-3" />,
      course: <FileText className="w-3 h-3" />,
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
            <h3 className="text-base font-medium text-foreground">数据统计</h3>
            {headerAction}
          </div>
        )}

        <div className={cn("grid gap-4", isDepartment && userCount > 0 ? "grid-cols-4" : "grid-cols-3")}>
          {isUniversity && (
            <Card
              className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => {
                if (departments.length > 0 && onNodeSelect) {
                  onNodeSelect(departments[0])
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="text-3xl font-bold text-foreground">{departments.length}</div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <span>院系</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="text-3xl font-bold text-foreground">{displayMajors.length}</div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span>专业</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="text-3xl font-bold text-foreground">{displayCourses.length}</div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>课程</span>
                </div>
              </div>
            </CardContent>
          </Card>
          {isDepartment && (
            <Card className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="text-3xl font-bold text-foreground">{userCount}</div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span>用户</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {isUniversity && departments.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-foreground">下属院系</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索院系..."
                  value={departmentSearch}
                  onChange={(e) => setDepartmentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {filteredDepartments.map((dept) => {
                const deptMajors = dept.children?.filter((child) => child.type === "major") || []
                const deptCourses =
                  dept.children?.flatMap((major) => major.children?.filter((child) => child.type === "course") || []) ||
                  []

                return (
                  <Card
                    key={dept.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-border bg-card/50 backdrop-blur-sm relative"
                    onClick={() => {
                      onNodeSelect?.(dept)
                      // 点击卡片时触发展开，动态加载该院系的专业数据
                      onToggleExpand?.(dept.id)
                    }}
                  >
                    <Badge
                      variant="secondary"
                      className="absolute top-2 right-2 text-xs flex items-center gap-1 bg-primary/10 text-primary border-primary/20"
                    >
                      {getNodeTypeIcon(dept.type)}
                      {getNodeTypeLabel(dept.type)}
                    </Badge>

                    <CardContent className="p-4 pt-8 pb-3">
                      <div className="space-y-3">
                        <div className="text-center">
                          <h4 className="font-semibold text-foreground text-lg mb-2">{dept.name}</h4>
                        </div>
                        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4 text-primary" />
                            <span className="font-medium">{deptMajors.length}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="font-medium">{deptCourses.length}</span>
                          </div>
                        </div>
                      </div>
                      {dept.metadata?.director && (
                        <div className="mt-3">
                          <Badge variant="outline" className="text-xs">
                            {dept.metadata.director}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {isDepartment && majors.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-foreground">开设专业</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索专业..."
                  value={majorSearch}
                  onChange={(e) => setMajorSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {filteredMajors.map((major) => {
                // 优先使用动态加载的课程数据
                const courses = majorCourses?.has(major.id)
                  ? majorCourses.get(major.id) || []
                  : major.children?.filter((child) => child.type === "course") || []

                return (
                  <Card
                    key={major.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-border bg-card/50 backdrop-blur-sm relative"
                    onClick={() => {
                      onNodeSelect?.(major)
                      // 点击卡片时触发展开，动态加载该专业的课程数据
                      onToggleExpand?.(major.id)
                    }}
                  >
                    <Badge
                      variant="secondary"
                      className="absolute top-2 right-2 text-xs flex items-center gap-1 bg-primary/10 text-primary border-primary/20"
                    >
                      {getNodeTypeIcon(major.type)}
                      {getNodeTypeLabel(major.type)}
                    </Badge>

                    <CardContent className="p-4 pt-8 pb-3">
                      <div className="space-y-3">
                        <div className="text-center">
                          <h4 className="font-semibold text-foreground text-lg mb-2">{major.name}</h4>
                        </div>
                        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="font-medium">{courses.length}</span>
                          </div>
                        </div>
                      </div>
                      {major.metadata?.director && (
                        <div className="mt-3">
                          <Badge variant="outline" className="text-xs">
                            {major.metadata.director}
                          </Badge>
                        </div>
                      )}
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
