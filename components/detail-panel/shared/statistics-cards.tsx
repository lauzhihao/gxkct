"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { TreeNode } from "@/components/tree-view"
import { Building2, GraduationCap, BookOpen, FileText, Search, User } from "lucide-react"
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
  const [showMyMajorsOnly, setShowMyMajorsOnly] = useState(false)

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

  // Filter majors by search and "my majors" filter
  const filteredMajors = majors.filter((major) => {
    // 先按名称搜索
    const matchesSearch = major.name.toLowerCase().includes(majorSearch.toLowerCase())

    // 如果勾选了"我的专业"，则还需要检查专业负责人中是否包含"我"
    if (showMyMajorsOnly) {
      const directors = major.metadata?.directors || []
      const hasMe = directors.some((director: string) => director.includes("我") || director === "我")
      return matchesSearch && hasMe
    }

    return matchesSearch
  })

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
              <div className="flex items-center gap-4">
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
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="my-majors"
                    checked={showMyMajorsOnly}
                    onCheckedChange={(checked) => setShowMyMajorsOnly(checked as boolean)}
                  />
                  <Label htmlFor="my-majors" className="text-sm font-medium cursor-pointer">
                    我的专业
                  </Label>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {filteredMajors.map((major) => {
                // 优先使用动态加载的课程数据
                const courses = majorCourses?.has(major.id)
                  ? majorCourses.get(major.id) || []
                  : major.children?.filter((child) => child.type === "course") || []

                return (
                  <button
                    key={major.id}
                    onClick={() => {
                      onNodeSelect?.(major)
                      // 点击卡片时触发展开，动态加载该专业的课程数据
                      onToggleExpand?.(major.id)
                    }}
                    className={cn(
                      "relative flex flex-col p-5 rounded-xl border transition-all duration-200 min-h-[165px]",
                      "bg-white/40 backdrop-blur-md border-primary/20",
                      "hover:bg-white/60 hover:shadow-lg hover:scale-105 hover:border-primary/40",
                      "group cursor-pointer",
                    )}
                  >
                    <div className="absolute top-3 left-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          "bg-white/50 backdrop-blur-sm",
                          "border border-primary/30",
                          "group-hover:bg-white/70 group-hover:border-primary/50",
                          "transition-all duration-200",
                        )}
                      >
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                    </div>

                    <div className="absolute top-3 right-3">
                      <div className="px-2 py-0.5 rounded-full bg-white/60 backdrop-blur-sm border border-primary/30 text-xs font-medium text-primary">
                        专业
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center justify-center px-12">
                        <div className="font-semibold text-foreground text-lg text-center line-clamp-2 leading-tight">
                          {major.name}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-muted-foreground justify-center mt-1">
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>{courses.length}门课程</span>
                        </div>
                      </div>
                    </div>

                    {major.metadata?.directors && major.metadata.directors.length > 0 && (
                      <div className="absolute bottom-3 left-3">
                        <div className="flex items-center gap-[6px] px-[8px] py-[2px] rounded bg-primary border border-primary">
                          <User className="w-[13px] h-[13px] text-white" />
                          <span className="text-[13px] text-white font-medium">{major.metadata.directors[0]}</span>
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
