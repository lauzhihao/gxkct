"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Label } from "@/shared/components/ui/label"
import type { TreeNode } from "@/types"
import { LoadingState } from "@/shared/components/ui/loading-state"
import { Building2, GraduationCap, BookOpen, FileText, Search, User } from "lucide-react"
import cn from "classnames"
import { useDepartmentMajorsPreferences } from "@/modules/departments/hooks/use-department-majors-preferences"
import { buildApiUrl } from "@/lib/api/config"
import { getStoredAuthToken } from "@/lib/api/auth-config"

// 接口返回的专业数据结构
interface MajorItem {
  lang: number
  parent: { value: string; label: string } | null
  self: { value: string; label: string } | null
  manager: Array<{ value: string; label: string }> | null
  info: Record<string, unknown> | null
  cover: Record<string, unknown> | null
  btnMenus: Array<Record<string, unknown>>
  coverMenus: Array<Record<string, unknown>>
  props: Record<string, unknown> | null
}

const isCourseLevelPayload = (items: MajorItem[], datatype: unknown) => {
  if (typeof datatype === "number" && datatype === 3) {
    return true
  }

  return items.some((item) => {
    if (!Array.isArray(item.btnMenus)) {
      return false
    }

    return item.btnMenus.some((menu) => {
      const menuValue = (menu as { value?: unknown }).value
      return menuValue === "courseedit" || menuValue === "coursedel"
    })
  })
}

const buildVirtualMajorsFromCourses = (courseItems: MajorItem[]): MajorItem[] => {
  const majorMap = new Map<string, MajorItem>()
  const majorCourseMap = new Map<string, MajorItem[]>()

  courseItems.forEach((course) => {
    const majorId = course.parent?.value?.trim()
    const majorName = course.parent?.label?.trim()
    const mapKey = majorId || majorName || ""

    if (!mapKey) {
      return
    }

    const currentCourses = majorCourseMap.get(mapKey) || []
    majorCourseMap.set(mapKey, [...currentCourses, course])

    const existed = majorMap.get(mapKey)
    if (!existed) {
      majorMap.set(mapKey, {
        lang: course.lang,
        parent: null,
        self: {
          value: majorId || mapKey,
          label: majorName || "未命名专业",
        },
        manager: [...(course.manager || [])],
        info: null,
        cover: null,
        btnMenus: [],
        coverMenus: [],
        props: {
          source: "course-level-switchDpt",
        },
      })
      return
    }

    const mergedManagers = [...(existed.manager || []), ...(course.manager || [])]
    const uniqueManagers = new Map<string, { value: string; label: string }>()

    mergedManagers.forEach((manager) => {
      const managerKey = `${manager.value}-${manager.label}`
      uniqueManagers.set(managerKey, manager)
    })

    existed.manager = Array.from(uniqueManagers.values())
  })

  return Array.from(majorMap.entries()).map(([mapKey, major]) => {
    const prefetchedCourses = majorCourseMap.get(mapKey) || []

    return {
      ...major,
      props: {
        ...(major.props || {}),
        prefetchedCourses,
      },
    }
  })
}

interface StatisticsCardsProps {
  node: TreeNode
  onNodeSelect?: (node: TreeNode) => void
  headerAction?: React.ReactNode
  currentUser?: { username: string; role: string } | null
  // 用于外部设置初始搜索值（如创建专业后自动填充）
  initialMajorSearch?: string
  // 用于触发重新获取专业列表
  refreshKey?: number
}

export function StatisticsCards({ node, onNodeSelect, headerAction, currentUser, initialMajorSearch, refreshKey }: StatisticsCardsProps) {
  const [departmentSearch, setDepartmentSearch] = useState("")
  const [majorSearch, setMajorSearch] = useState("")

  // 监听 initialMajorSearch 变化，自动填充搜索框
  useEffect(() => {
    if (initialMajorSearch !== undefined) {
      setMajorSearch(initialMajorSearch)
    }
  }, [initialMajorSearch])

  // 院系详情独立获取的专业列表数据
  const [majors, setMajors] = useState<MajorItem[]>([])
  const [isLoadingMajors, setIsLoadingMajors] = useState(false)

  // 使用 hook 管理"我的专业"偏好设置，仅在部门节点时使用
  const { showMyMajors, setShowMyMajors } = useDepartmentMajorsPreferences()
  const showMyMajorsOnly = node.nodeType === "department" ? showMyMajors : false

  const departments = node.children?.filter((child) => child.nodeType === "department") || []

  const allMajors =
    node.children?.flatMap((dept) => dept.children?.filter((child) => child.nodeType === "major") || []) || []
  const courses =
    node.children?.flatMap(
      (dept) =>
        dept.children?.flatMap((major) => major.children?.filter((child) => child.nodeType === "course") || []) || [],
    ) || []

  const isUniversity = node.nodeType === "university"
  const isDepartment = node.nodeType === "department"

  // 当节点为院系时，根据院系ID调用接口获取专业列表
  useEffect(() => {
    const fetchMajors = async () => {
      if (!isDepartment || !node.id) return

      setIsLoadingMajors(true)
      try {
        const url = buildApiUrl(`/api/v4/webpage/home/switchDpt?dptId=${node.id}&lang=80101`)
        const headers: Record<string, string> = {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
        const authToken = getStoredAuthToken()
        if (authToken) {
          headers['authToken'] = authToken
        }

        const response = await fetch(url, {
          method: 'GET',
          headers,
        })

        if (response.ok) {
          const result = await response.json()
          if (result.code === '0' && Array.isArray(result.data?.data)) {
            const responseItems = result.data.data as MajorItem[]
            const shouldConvertToVirtualMajors = isCourseLevelPayload(responseItems, result.data?.datatype)
            const normalizedMajors = shouldConvertToVirtualMajors
              ? buildVirtualMajorsFromCourses(responseItems)
              : responseItems

            setMajors(normalizedMajors)
          } else {
            setMajors([])
          }
        } else {
          setMajors([])
        }
      } catch (error) {
        console.error('[StatisticsCards] 获取专业列表失败:', error)
        setMajors([])
      } finally {
        setIsLoadingMajors(false)
      }
    }

    fetchMajors()
  }, [isDepartment, node.id, refreshKey])

  // 获取专业ID
  const getMajorId = (major: MajorItem) => major.self?.value || ''

  // 获取专业名称
  const getMajorName = (major: MajorItem) => major.self?.label || ''

  // 获取管理员数组
  const getManagers = (major: MajorItem) => major.manager || []

  // Filter departments by search
  const filteredDepartments = departments.filter((dept) =>
    dept.nodeName.toLowerCase().includes(departmentSearch.toLowerCase()),
  )

  // Filter majors by search and "my majors" filter
  const filteredMajors = majors.filter((major) => {
    const majorName = getMajorName(major)
    // 先按名称搜索
    const matchesSearch = majorName.toLowerCase().includes(majorSearch.toLowerCase())

    // 如果勾选了"我的专业"，则还需要检查专业管理员中是否包含当前用户
    if (showMyMajorsOnly) {
      const managers = getManagers(major)
      const hasMe = managers.some((manager) => manager.label === currentUser?.username)
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

  const userCount = 0

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

        <div className={cn("grid gap-4", isDepartment && userCount > 0 ? "grid-cols-3" : isUniversity ? "grid-cols-3" : "grid-cols-2")}>
          {isUniversity && (
            <Card
              className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 hover:shadow-lg transition-all"
              // onClick={() => {
              //   if (departments.length > 0 && onNodeSelect) {
              //     onNodeSelect(departments[0])
              //   }
              // }}
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
                <div className="text-3xl font-bold text-foreground">
                  {isDepartment ? majors.length : allMajors.length}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span>专业</span>
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
          {isUniversity && (
            <Card className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="text-3xl font-bold text-foreground">{courses.length}</div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>课程</span>
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
                const deptMajors = dept.children?.filter((child) => child.nodeType === "major") || []
                const deptCourses =
                  dept.children?.flatMap((major) => major.children?.filter((child) => child.nodeType === "course") || []) ||
                  []

                return (
                  <Card
                    key={dept.nodeId}
                    className="cursor-pointer hover:shadow-md transition-shadow border-border bg-card/50 backdrop-blur-sm relative"
                    onClick={() => {
                      onNodeSelect?.(dept)
                    }}
                  >
                    <Badge
                      variant="secondary"
                      className="absolute top-2 right-2 text-xs flex items-center gap-1 bg-primary/10 text-primary border-primary/20"
                    >
                      {getNodeTypeIcon(dept.nodeType)}
                      {getNodeTypeLabel(dept.nodeType)}
                    </Badge>

                    <CardContent className="p-4 pt-8 pb-3">
                      <div className="space-y-3">
                        <div className="text-center">
                          <h4 className="font-semibold text-foreground text-lg mb-2">{dept.nodeName}</h4>
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
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {isDepartment && (
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
                    onCheckedChange={(checked) => setShowMyMajors(checked as boolean)}
                  />
                  <Label htmlFor="my-majors" className="text-sm font-medium cursor-pointer">
                    我的专业
                  </Label>
                </div>
              </div>
            </div>

            {isLoadingMajors ? (
              <LoadingState variant="card" />
            ) : filteredMajors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">暂无专业数据</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {filteredMajors.map((major) => {
                  const majorId = getMajorId(major)
                  const majorName = getMajorName(major)
                  const managers = getManagers(major)
                  const isVirtualMajor = (major.props as { source?: string } | null)?.source === "course-level-switchDpt"
                  const prefetchedCourses = (major.props as { prefetchedCourses?: MajorItem[] } | null)?.prefetchedCourses || []

                  return (
                    <button
                      key={majorId}
                      onClick={() => {
                        // 构造节点对象，硬编码 nodeType 为 major
                        onNodeSelect?.({
                          id: majorId,
                          nodeId: `major_${majorId}`,
                          name: majorName,
                          nodeName: majorName,
                          type: 'major',
                          nodeType: 'major',
                          manager: isVirtualMajor ? [] : managers,
                          metadata: {
                            managers: isVirtualMajor ? [] : managers,
                            source: (major.props as { source?: string } | null)?.source,
                            prefetchedCourses,
                          },
                        })
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
                            {majorName}
                          </div>
                        </div>
                      </div>

                      {!isVirtualMajor && managers.length > 0 && (
                        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
                          {managers.map((manager, index) => (
                            <div key={index} className="flex items-center gap-[6px] px-[8px] py-[2px] rounded bg-primary border border-primary">
                              <User className="w-[13px] h-[13px] text-white" />
                              <span className="text-[13px] text-white font-medium">{manager.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
