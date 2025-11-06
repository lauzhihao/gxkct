"use client"

import React from "react"
import type { ReactElement } from "react"
import { useState, useEffect } from "react"
import {
  ChevronRight,
  ChevronDown,
  Building2,
  GraduationCap,
  BookOpen,
  FileText,
  Search,
  MoreHorizontal,
  X,
  Plus,
  Star,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { TreeNode } from "@/types"
import { api } from "@/lib/api"

export const initialTreeData: TreeNode = {
  id: "root",
  name: "根节点",
  type: "university",
  children: [
    {
      id: "univ-1",
      name: "齐齐哈尔工程学院",
      type: "university",
      description: "黑龙江省应用型本科高校",
      children: [
        {
          id: "dept-1",
          name: "信息学院",
          type: "department",
          description: "培养信息技术与计算机科学人才",
          children: [
            {
              id: "major-1",
              name: "计算机科学与技术",
              type: "major",
              description: "本科四年制,工学学士学位",
              children: [
                {
                  id: "course-1",
                  name: "数据库基础",
                  type: "course",
                  description: "学习关系型数据库设计与SQL编程",
                  metadata: {
                    credits: 4,
                    hours: 64,
                    semester: "第三学期",
                    instructor: "张教授",
                    resources: ["教材PDF", "课件PPT", "实验指导书"],
                    matrix: {
                      knowledge: ["数据库设计", "SQL语言", "事务处理"],
                      skills: ["数据建模", "查询优化", "数据库管理"],
                      quality: ["逻辑思维", "问题解决", "团队协作"],
                    },
                  },
                },
                {
                  id: "course-2",
                  name: "Python编程",
                  type: "course",
                  description: "Python语言基础与应用开发",
                  metadata: {
                    credits: 3,
                    hours: 48,
                    semester: "第二学期",
                    instructor: "李教授",
                    resources: ["在线教程", "代码示例", "项目模板"],
                    matrix: {
                      knowledge: ["Python语法", "面向对象", "标准库"],
                      skills: ["编程实践", "调试技巧", "代码规范"],
                      quality: ["创新思维", "自主学习", "代码质量"],
                    },
                  },
                },
                {
                  id: "course-3",
                  name: "Java编程",
                  type: "course",
                  description: "Java面向对象编程与企业级开发",
                  metadata: {
                    credits: 4,
                    hours: 64,
                    semester: "第三学期",
                    instructor: "王教授",
                    resources: ["视频课程", "API文档", "实战项目"],
                    matrix: {
                      knowledge: ["Java语法", "OOP设计", "框架应用"],
                      skills: ["企业开发", "设计模式", "性能优化"],
                      quality: ["工程思维", "文档能力", "持续学习"],
                    },
                  },
                },
                {
                  id: "course-8",
                  name: "数据结构与算法",
                  type: "course",
                  description: "学习常用数据结构和算法设计",
                },
                {
                  id: "course-9",
                  name: "操作系统",
                  type: "course",
                  description: "操作系统原理与实践",
                },
                {
                  id: "course-10",
                  name: "计算机网络",
                  type: "course",
                  description: "网络协议与网络编程",
                },
                {
                  id: "course-11",
                  name: "软件工程",
                  type: "course",
                  description: "软件开发方法与项目管理",
                },
                {
                  id: "course-12",
                  name: "Web开发技术",
                  type: "course",
                  description: "前端与后端Web开发",
                },
                {
                  id: "course-13",
                  name: "移动应用开发",
                  type: "course",
                  description: "Android和iOS应用开发",
                },
                {
                  id: "course-14",
                  name: "人工智能基础",
                  type: "course",
                  description: "AI基本概念与应用",
                },
                {
                  id: "course-15",
                  name: "机器学习",
                  type: "course",
                  description: "机器学习算法与实践",
                },
                {
                  id: "course-16",
                  name: "深度学习",
                  type: "course",
                  description: "神经网络与深度学习框架",
                },
                {
                  id: "course-17",
                  name: "云计算技术",
                  type: "course",
                  description: "云平台架构与服务",
                },
                {
                  id: "course-18",
                  name: "大数据技术",
                  type: "course",
                  description: "大数据处理与分析",
                },
                {
                  id: "course-19",
                  name: "信息安全",
                  type: "course",
                  description: "网络安全与密码学",
                },
                {
                  id: "course-20",
                  name: "编译原理",
                  type: "course",
                  description: "编译器设计与实现",
                },
                {
                  id: "course-21",
                  name: "计算机组成原理",
                  type: "course",
                  description: "计算机硬件系统结构",
                },
                {
                  id: "course-22",
                  name: "离散数学",
                  type: "course",
                  description: "离散结构与数学基础",
                },
                {
                  id: "course-23",
                  name: "线性代数",
                  type: "course",
                  description: "矩阵理论与线性方程组",
                },
                {
                  id: "course-24",
                  name: "概率论与数理统计",
                  type: "course",
                  description: "概率分布与统计推断",
                },
                {
                  id: "course-25",
                  name: "数字电路",
                  type: "course",
                  description: "数字逻辑与电路设计",
                },
                {
                  id: "course-26",
                  name: "微机原理与接口技术",
                  type: "course",
                  description: "微处理器与接口编程",
                },
                {
                  id: "course-27",
                  name: "嵌入式系统",
                  type: "course",
                  description: "嵌入式开发与应用",
                },
                {
                  id: "course-28",
                  name: "物联网技术",
                  type: "course",
                  description: "IoT架构与传感器网络",
                },
                {
                  id: "course-29",
                  name: "区块链技术",
                  type: "course",
                  description: "分布式账本与智能合约",
                },
                {
                  id: "course-30",
                  name: "计算机图形学",
                  type: "course",
                  description: "图形渲染与可视化",
                },
                {
                  id: "course-31",
                  name: "数字图像处理",
                  type: "course",
                  description: "图像处理算法与应用",
                },
                {
                  id: "course-32",
                  name: "自然语言处理",
                  type: "course",
                  description: "文本分析与语言模型",
                },
              ],
            },
            {
              id: "major-2",
              name: "软件工程",
              type: "major",
              description: "本科四年制，工学学士学位",
              children: [
                {
                  id: "course-4",
                  name: "软件工程导论",
                  type: "course",
                  description: "软件开发生命周期与项目管理",
                  metadata: {
                    credits: 3,
                    hours: 48,
                    semester: "第一学期",
                    instructor: "赵教授",
                    resources: ["课程大纲", "案例分析", "工具软件"],
                    matrix: {
                      knowledge: ["软件过程", "需求分析", "项目管理"],
                      skills: ["需求建模", "文档编写", "团队协作"],
                      quality: ["系统思维", "沟通能力", "责任意识"],
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          id: "dept-2",
          name: "工程学院",
          type: "department",
          description: "培养工程技术与管理人才",
          children: [
            {
              id: "major-3",
              name: "工程造价",
              type: "major",
              description: "本科四年制，工学学士学位",
              children: [
                {
                  id: "course-5",
                  name: "工程经济学",
                  type: "course",
                  description: "工程项目经济评价与决策",
                  metadata: {
                    credits: 3,
                    hours: 48,
                    semester: "第四学期",
                    instructor: "刘教授",
                    resources: ["教材", "案例库", "计算软件"],
                    matrix: {
                      knowledge: ["经济评价", "成本分析", "投资决策"],
                      skills: ["数据分析", "报告撰写", "软件应用"],
                      quality: ["经济思维", "严谨态度", "职业道德"],
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          id: "dept-3",
          name: "医学院",
          type: "department",
          description: "培养医疗卫生专业人才",
          children: [
            {
              id: "major-4",
              name: "护理学",
              type: "major",
              description: "本科四年制，理学学士学位",
              children: [
                {
                  id: "course-6",
                  name: "基础护理学",
                  type: "course",
                  description: "护理学基本理论与技能",
                  metadata: {
                    credits: 5,
                    hours: 80,
                    semester: "第二学期",
                    instructor: "陈教授",
                    resources: ["实训视频", "操作手册", "模拟系统"],
                    matrix: {
                      knowledge: ["护理理论", "操作规范", "安全管理"],
                      skills: ["临床技能", "应急处理", "沟通技巧"],
                      quality: ["人文关怀", "责任心", "职业素养"],
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          id: "dept-4",
          name: "马克思主义学院",
          type: "department",
          description: "思想政治理论课教学与研究",
          children: [
            {
              id: "major-5",
              name: "思想政治教育",
              type: "major",
              description: "本科四年制，法学学士学位",
              children: [
                {
                  id: "course-7",
                  name: "马克思主义基本原理",
                  type: "course",
                  description: "马克思主义哲学、政治经济学和科学社会主义",
                  metadata: {
                    credits: 3,
                    hours: 48,
                    semester: "第一学期",
                    instructor: "孙教授",
                    resources: ["经典著作", "专题讲座", "讨论材料"],
                    matrix: {
                      knowledge: ["哲学原理", "政治经济", "社会理论"],
                      skills: ["理论分析", "批判思维", "论文写作"],
                      quality: ["政治素养", "理论修养", "社会责任"],
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "workshop-1",
      name: "第75期四真三化工作坊",
      type: "university",
      description: "专注于教学改革与创新实践",
      children: [
        {
          id: "dept-5",
          name: "教学改革组",
          type: "department",
          description: "推动教学方法创新",
          children: [],
        },
        {
          id: "dept-6",
          name: "课程建设组",
          type: "department",
          description: "优化课程体系设计",
          children: [],
        },
      ],
    },
  ],
}

function highlightText(text: string, searchTerm: string) {
  if (!searchTerm.trim()) {
    return text
  }

  const lowerText = text.toLowerCase()
  const lowerSearch = searchTerm.toLowerCase()
  const index = lowerText.indexOf(lowerSearch)

  if (index === -1) {
    return text
  }

  const before = text.slice(0, index)
  const match = text.slice(index, index + searchTerm.length)
  const after = text.slice(index + searchTerm.length)

  return (
    <>
      {before}
      <span className="bg-yellow-300/60 text-foreground font-semibold px-0.5 rounded">{match}</span>
      {highlightText(after, searchTerm)}
    </>
  )
}

const getIcon = (type: string) => {
  switch (type) {
    case "university":
      return Building2
    case "department":
      return GraduationCap
    case "major":
      return BookOpen
    case "course":
      return FileText
    default:
      return FileText
  }
}

function hasMatchingDescendant(node: TreeNode, matchingIds: Set<string>): boolean {
  if (matchingIds.has(node.id)) return true
  if (node.children) {
    return node.children.some((child) => hasMatchingDescendant(child, matchingIds))
  }
  return false
}

interface TreeNodeProps {
  node: TreeNode
  level: number
  onSelect: (node: TreeNode) => void
  selectedNodeId: string | null
  expandedNodes: Set<string>
  onToggleExpand: (nodeId: string) => void
  visibleCourseCounts: Map<string, number>
  onLoadMoreCourses: (majorId: string) => void
  searchTerm: string
  currentSchoolId: string | null
  onSetCurrentSchool?: (schoolId: string) => void
  onToggleStar?: (nodeId: string) => void
  matchingNodeIds?: Set<string>
  pathNodeIds?: Set<string>
  isFirstMatch?: boolean
  departmentMajors?: Map<string, TreeNode[]>
  majorCourses?: Map<string, TreeNode[]>
  loadedMajorsWithNoCourses?: Set<string>
}

function TreeNodeComponent({
  node,
  level,
  onSelect,
  selectedNodeId,
  expandedNodes,
  onToggleExpand,
  visibleCourseCounts,
  onLoadMoreCourses,
  searchTerm,
  currentSchoolId,
  onSetCurrentSchool,
  onToggleStar,
  matchingNodeIds,
  pathNodeIds,
  isFirstMatch = false,
  departmentMajors,
  majorCourses,
  loadedMajorsWithNoCourses,
}: TreeNodeProps): ReactElement {
  const Icon = getIcon(node.type)

  // 如果是department节点，合并动态加载的专业数据
  let actualChildren = node.children || []
  if (node.type === "department" && departmentMajors?.has(node.id)) {
    const loadedMajors = departmentMajors.get(node.id) || []
    actualChildren = loadedMajors
  }

  // 如果是major节点，合并动态加载的课程数据
  if (node.type === "major") {
    console.log(`[v0] TreeNodeComponent: 检查major节点 ${node.id}`)
    console.log(`[v0] TreeNodeComponent: majorCourses?.has(${node.id}) =`, majorCourses?.has(node.id))
    if (majorCourses?.has(node.id)) {
      const loadedCourses = majorCourses.get(node.id) || []
      console.log(`[v0] TreeNodeComponent: 合并课程数据, 课程数量=${loadedCourses.length}`)
      actualChildren = loadedCourses
    }
  }

  // department节点应该始终显示展开箭头（可能需要动态加载）
  // major节点也应该始终显示展开箭头，除非已加载且确实没有课程
  // 其他节点根据实际children判断
  const hasChildren = node.type === "department"
    ? true  // department节点始终可展开（会动态加载专业）
    : node.type === "major"
    ? !loadedMajorsWithNoCourses?.has(node.id)  // major节点：如果已加载且无课程则不显示箭头
    : (actualChildren && actualChildren.length > 0)

  const isExpanded = expandedNodes.has(node.id)
  const isSelected = selectedNodeId === node.id
  const isStarred = node.isStarred || false

  const nodeRef = React.createRef<HTMLButtonElement>()

  useEffect(() => {
    if (isFirstMatch && nodeRef.current && searchTerm.trim()) {
      setTimeout(() => {
        nodeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
    }
  }, [isFirstMatch, searchTerm])

  let displayChildren = actualChildren
  let showLoadMore = false
  let remainingCount = 0

  if (searchTerm.trim() && hasChildren && matchingNodeIds && pathNodeIds) {
    displayChildren = displayChildren.filter(
      (child) =>
        matchingNodeIds.has(child.id) || pathNodeIds.has(child.id) || hasMatchingDescendant(child, matchingNodeIds),
    )
  } else if (node.type === "major" && hasChildren) {
    if (!searchTerm.trim()) {
      const visibleCount = visibleCourseCounts.get(node.id) || 5
      const totalCourses = actualChildren.length

      if (totalCourses > visibleCount) {
        displayChildren = actualChildren.slice(0, visibleCount)
        showLoadMore = true
        remainingCount = totalCourses - visibleCount
      }
    }
  }

  const handleClick = () => {
    onSelect(node)
    // department和major节点始终触发展开（会动态加载数据）
    // 其他节点只有在有children时才展开
    if (node.type === "department" || node.type === "major" || hasChildren) {
      onToggleExpand(node.id)
    }
  }

  const handleLoadMore = (e: React.MouseEvent) => {
    e.stopPropagation()
    onLoadMoreCourses(node.id)
  }

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggleStar) {
      onToggleStar(node.id)
    }
  }

  const indentPadding = level * 24

  return (
    <div className="select-none">
      <button
        ref={nodeRef}
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-3 py-3 rounded-lg transition-all duration-200",
          "backdrop-blur-sm border",
          "hover:bg-card/50 hover:border-primary/50 hover:shadow-lg",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          "group",
          isSelected && "bg-primary/10 border-primary/50 shadow-md",
        )}
        style={{ paddingLeft: `${16 + indentPadding}px`, paddingRight: "16px" }}
      >
        {hasChildren && (
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform" />
            )}
          </div>
        )}
        {!hasChildren && <div className="w-4 flex-shrink-0" />}

        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
            "bg-gradient-to-br from-primary/20 to-accent/20",
            "border border-primary/30",
            "group-hover:from-primary/30 group-hover:to-accent/30",
            "transition-all duration-200",
            isSelected && "from-primary/30 to-accent/30 border-primary/50",
          )}
        >
          <Icon className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 text-left min-w-0 overflow-hidden">
          <div
            className={cn(
              "font-medium text-foreground group-hover:text-primary transition-colors truncate",
              isSelected && "text-primary",
            )}
          >
            {highlightText(node.name, searchTerm)}
          </div>
          {node.description && (
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {highlightText(node.description, searchTerm)}
            </div>
          )}
        </div>

        {level === 0 && onToggleStar && (
          <div
            onClick={handleStarClick}
            className={cn(
              "flex-shrink-0 p-1.5 rounded-md transition-all duration-200 cursor-pointer",
              "hover:bg-primary/20",
              isStarred ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500",
            )}
            aria-label={isStarred ? "已设为星标" : "设为星标"}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                handleStarClick(e as any)
              }
            }}
          >
            <Star className={cn("w-5 h-5 transition-all", isStarred && "fill-yellow-500")} />
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {displayChildren.length > 0 ? (
            displayChildren.map((child, index) => (
              <TreeNodeComponent
                key={child.id}
                node={child}
                level={level + 1}
                onSelect={onSelect}
                selectedNodeId={selectedNodeId}
                expandedNodes={expandedNodes}
                onToggleExpand={onToggleExpand}
                visibleCourseCounts={visibleCourseCounts}
                onLoadMoreCourses={onLoadMoreCourses}
                searchTerm={searchTerm}
                currentSchoolId={currentSchoolId || null}
                onSetCurrentSchool={onSetCurrentSchool}
                onToggleStar={onToggleStar}
                matchingNodeIds={matchingNodeIds}
                pathNodeIds={pathNodeIds}
                isFirstMatch={isFirstMatch && index === 0 && matchingNodeIds?.has(child.id)}
                departmentMajors={departmentMajors}
                majorCourses={majorCourses}
                loadedMajorsWithNoCourses={loadedMajorsWithNoCourses}
              />
            ))
          ) : node.type === "department" || node.type === "major" ? (
            <div
              className="text-sm text-muted-foreground py-2"
              style={{ paddingLeft: `${16 + (level + 1) * 24}px` }}
            >
              加载中...
            </div>
          ) : null}

          {showLoadMore && (
            <button
              onClick={handleLoadMore}
              className={cn(
                "w-full flex items-center gap-3 py-3 rounded-lg transition-all duration-200",
                "backdrop-blur-sm border border-dashed border-primary/30",
                "hover:bg-primary/10 hover:border-primary/50",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                "group",
              )}
              style={{ paddingLeft: `${16 + (level + 1) * 24}px`, paddingRight: "16px" }}
            >
              <div className="w-4 flex-shrink-0" />

              <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/30 group-hover:bg-primary/20">
                <MoreHorizontal className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 text-left">
                <div className="font-medium text-primary">查看更多{remainingCount}门课程</div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface TreeViewProps {
  treeData: TreeNode | null
  onNodeSelect: (node: TreeNode | null) => void
  selectedNode: TreeNode | null
  onAddSchool?: (newSchool: Omit<TreeNode, "id">) => void
  currentSchoolId?: string | null
  onSetCurrentSchool?: (schoolId: string) => void
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onDepartmentMajorsChange?: (majors: Map<string, TreeNode[]>) => void
  onMajorCoursesChange?: (courses: Map<string, TreeNode[]>) => void
}

export function TreeView({
  treeData,
  onNodeSelect,
  selectedNode,
  onAddSchool,
  currentSchoolId,
  onSetCurrentSchool,
  onUpdateNode,
  isCollapsed = false,
  onToggleCollapse,
  onDepartmentMajorsChange,
  onMajorCoursesChange,
}: TreeViewProps): ReactElement {
  // 如果treeData为null,返回空状态
  if (!treeData) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <div className="text-muted-foreground">暂无数据</div>
      </div>
    )
  }
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["root"]))
  const [visibleCourseCounts, setVisibleCourseCounts] = useState<Map<string, number>>(new Map())
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddSchoolDialogOpen, setIsAddSchoolDialogOpen] = useState(false)
  const [newSchoolName, setNewSchoolName] = useState("")
  const [newSchoolDesc, setNewSchoolDesc] = useState("")
  const [newSchoolType, setNewSchoolType] = useState<"school" | "workshop">("school")
  // 跟踪已加载专业数据的department节点
  const [loadedDepartments, setLoadedDepartments] = useState<Set<string>>(new Set())
  // 存储动态加载的专业数据
  const [departmentMajors, setDepartmentMajors] = useState<Map<string, TreeNode[]>>(new Map())
  // 跟踪已加载课程数据的major节点
  const [loadedMajors, setLoadedMajors] = useState<Set<string>>(new Set())
  // 存储动态加载的课程数据
  const [majorCourses, setMajorCourses] = useState<Map<string, TreeNode[]>>(new Map())
  // 跟踪已加载但没有课程的major节点
  const [loadedMajorsWithNoCourses, setLoadedMajorsWithNoCourses] = useState<Set<string>>(new Set())

  // 当departmentMajors变化时通知父组件
  useEffect(() => {
    if (onDepartmentMajorsChange) {
      onDepartmentMajorsChange(departmentMajors)
    }
  }, [departmentMajors, onDepartmentMajorsChange])

  // 当majorCourses变化时通知父组件
  useEffect(() => {
    if (onMajorCoursesChange) {
      onMajorCoursesChange(majorCourses)
    }
  }, [majorCourses, onMajorCoursesChange])

  const handleToggleExpand = async (nodeId: string) => {
    // 检查当前是否已展开
    const isCurrentlyExpanded = expandedNodes.has(nodeId)

    // 切换展开状态
    setExpandedNodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })

    // 只在展开时才加载数据（收起时不需要加载）
    if (isCurrentlyExpanded) {
      return
    }

    // 查找节点（包括动态加载的节点）
    const findNodeById = (node: TreeNode, targetId: string): TreeNode | null => {
      if (node.id === targetId) return node
      if (node.children) {
        for (const child of node.children) {
          const found = findNodeById(child, targetId)
          if (found) return found
        }
      }
      return null
    }

    let node = findNodeById(treeData, nodeId)

    // 如果在treeData中没找到，尝试在动态加载的专业数据中查找
    if (!node) {
      for (const [deptId, majors] of departmentMajors.entries()) {
        const found = majors.find(m => m.id === nodeId)
        if (found) {
          node = found
          break
        }
      }
    }

    // 如果是department节点且未加载过专业数据，则加载
    if (node && node.type === "department" && !loadedDepartments.has(nodeId)) {
      console.log(`[v0] 加载department ${nodeId} 的专业数据`)
      const response = await api.tree.getDepartmentMajors(nodeId)

      if (response.data && response.data.length > 0) {
        console.log(`[v0] 成功加载 ${response.data.length} 个专业`)
        setDepartmentMajors((prev) => {
          const newMap = new Map(prev)
          newMap.set(nodeId, response.data!)
          return newMap
        })
        setLoadedDepartments((prev) => new Set(prev).add(nodeId))
      } else {
        console.log(`[v0] 未找到专业数据或加载失败:`, response.error)
      }
    }

    // 如果是major节点且未加载过课程数据，则加载
    if (node && node.type === "major" && !loadedMajors.has(nodeId)) {
      console.log(`[v0] handleToggleExpand: 开始加载major ${nodeId} 的课程数据`)
      console.log(`[v0] handleToggleExpand: node.metadata =`, node.metadata)
      // 从metadata中获取majorId
      const majorId = node.metadata?.majorId || nodeId.replace("major-", "")
      console.log(`[v0] handleToggleExpand: 使用majorId = ${majorId}`)

      const response = await api.tree.getMajorCourses(majorId)
      console.log(`[v0] handleToggleExpand: API响应 =`, response)

      if (response.data && response.data.length > 0) {
        console.log(`[v0] handleToggleExpand: 成功加载 ${response.data.length} 个课程，准备更新状态`)
        console.log(`[v0] handleToggleExpand: 前3个课程 =`, response.data.slice(0, 3).map(c => ({ id: c.id, name: c.name })))

        setMajorCourses((prev) => {
          const newMap = new Map(prev)
          newMap.set(nodeId, response.data!)
          console.log(`[v0] handleToggleExpand: 更新majorCourses, nodeId=${nodeId}, 课程数=${response.data!.length}`)
          console.log(`[v0] handleToggleExpand: majorCourses.has(${nodeId}) =`, newMap.has(nodeId))
          return newMap
        })
        setLoadedMajors((prev) => new Set(prev).add(nodeId))
        console.log(`[v0] handleToggleExpand: 状态更新完成`)
      } else if (response.data && response.data.length === 0) {
        console.log(`[v0] handleToggleExpand: 该专业没有课程数据`)
        // 标记为已加载但无课程
        setLoadedMajorsWithNoCourses((prev) => new Set(prev).add(nodeId))
        setLoadedMajors((prev) => new Set(prev).add(nodeId))
      } else {
        console.log(`[v0] handleToggleExpand: 加载课程数据失败:`, response.error)
      }
    }
  }

  const handleLoadMoreCourses = (majorId: string) => {
    setVisibleCourseCounts((prev) => {
      const newMap = new Map(prev)
      const currentCount = newMap.get(majorId) || 5
      newMap.set(majorId, currentCount + 5)
      return newMap
    })
  }

  const handleCreateSchool = () => {
    if (!newSchoolName.trim() || !onAddSchool) return

    onAddSchool({
      name: newSchoolName,
      type: "university" as const,
      description: newSchoolDesc || undefined,
      children: [],
    })

    setNewSchoolName("")
    setNewSchoolDesc("")
    setNewSchoolType("school")
    setIsAddSchoolDialogOpen(false)
  }

  // 处理星标切换，确保只有一个一级节点被星标
  const handleToggleStar = (nodeId: string) => {
    if (!onUpdateNode || !treeData.children) return

    // 找到要切换星标的节点
    const targetNode = treeData.children.find(child => child.id === nodeId)
    if (!targetNode) return

    const isCurrentlyStarred = targetNode.isStarred || false

    // 如果当前节点未被星标，则取消所有其他节点的星标，并设置当前节点为星标
    if (!isCurrentlyStarred) {
      // 取消所有一级节点的星标
      treeData.children.forEach(child => {
        if (child.isStarred) {
          onUpdateNode(child.id, { isStarred: false })
        }
      })
      // 设置当前节点为星标
      onUpdateNode(nodeId, { isStarred: true })
    } else {
      // 如果当前节点已被星标，则取消星标
      onUpdateNode(nodeId, { isStarred: false })
    }
  }

  useEffect(() => {
    if (selectedNode) {
      const path = findPathToNode(treeData, selectedNode.id)
      if (path) {
        setExpandedNodes((prev) => {
          const newSet = new Set(prev)
          path.forEach((nodeId) => newSet.add(nodeId))
          newSet.add(selectedNode.id)
          return newSet
        })
      }
    }
  }, [selectedNode])

  useEffect(() => {
    if (searchTerm.trim()) {
      const matchingNodes = searchNodes(treeData, searchTerm)
      const newExpandedNodes = new Set<string>([treeData.id])

      matchingNodes.forEach((node) => {
        const path = findPathToNode(treeData, node.id)
        if (path) {
          path.forEach((nodeId) => newExpandedNodes.add(nodeId))
          newExpandedNodes.add(node.id)
        }
      })

      setExpandedNodes(newExpandedNodes)
    }
  }, [searchTerm])

  const findPathToNode = (root: TreeNode, targetId: string, path: string[] = []): string[] | null => {
    if (root.id === targetId) {
      return path
    }
    if (root.children) {
      for (const child of root.children) {
        const result = findPathToNode(child, targetId, [...path, root.id])
        if (result) return result
      }
    }
    return null
  }

  const searchNodes = (node: TreeNode, searchTerm: string, results: TreeNode[] = []): TreeNode[] => {
    const lowerSearch = searchTerm.toLowerCase()
    if (node.name.toLowerCase().includes(lowerSearch) || node.description?.toLowerCase().includes(lowerSearch)) {
      results.push(node)
    }
    if (node.children) {
      node.children.forEach((child) => searchNodes(child, searchTerm, results))
    }
    return results
  }

  const matchingNodeIds = React.useMemo(() => {
    if (!searchTerm.trim()) return undefined
    const matches = searchNodes(treeData, searchTerm)
    return new Set(matches.map((n) => n.id))
  }, [searchTerm, treeData])

  const pathNodeIds = React.useMemo(() => {
    if (!searchTerm.trim() || !matchingNodeIds) return undefined
    const paths = new Set<string>()
    matchingNodeIds.forEach((nodeId) => {
      const path = findPathToNode(treeData, nodeId)
      if (path) {
        path.forEach((id) => paths.add(id))
      }
    })
    return paths
  }, [searchTerm, matchingNodeIds, treeData])

  const firstMatchId = React.useMemo(() => {
    if (!matchingNodeIds || matchingNodeIds.size === 0) return null
    return Array.from(matchingNodeIds)[0]
  }, [matchingNodeIds])

  return (
    <>
      {/* 展开/收起按钮 - 压在右边框中间 */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute top-1/2 -right-3 -translate-y-1/2 z-20 w-6 h-6 bg-card border border-border rounded-full shadow-md hover:bg-primary hover:border-primary transition-all flex items-center justify-center group"
          aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white transition-colors" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white transition-colors" />
          )}
        </button>
      )}

      {/* 收起状态下显示搜索图标和一级节点图标 */}
      {isCollapsed && (
        <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl p-2 h-full flex flex-col items-center">
          {/* 搜索图标 */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="w-12 h-12 flex items-center justify-center hover:bg-primary rounded-md transition-all group flex-shrink-0"
              aria-label="展开侧边栏"
            >
              <Search className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors" />
            </button>
          )}

          {/* 分隔线 */}
          {treeData.children && treeData.children.length > 0 && (
            <div className="w-full h-px bg-border my-2 flex-shrink-0" />
          )}

          {/* 一级节点图标列表 - 可滚动区域 */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col items-center gap-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent py-2 px-1">
            {treeData.children?.map((child) => {
              const Icon = getIcon(child.type)
              const isSelected = selectedNode?.id === child.id
              const isStarred = child.isStarred || false

              return (
                <div key={child.id} className="relative flex-shrink-0">
                  <button
                    onClick={() => onNodeSelect(child)}
                    className={cn(
                      "w-12 h-12 flex items-center justify-center rounded-md transition-all group",
                      isSelected
                        ? "bg-primary text-white shadow-md"
                        : "hover:bg-primary text-muted-foreground hover:text-white hover:shadow-md"
                    )}
                    aria-label={child.name}
                    title={child.name}
                  >
                    <Icon className="w-5 h-5 transition-colors" />
                  </button>
                  {isStarred && (
                    <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-yellow-500 rounded-full border border-card shadow-sm" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className={cn("rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl p-6", isCollapsed && "hidden")}>
        <div className="mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="快速查找"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 bg-white/40 backdrop-blur-sm border-primary/20 focus:border-primary/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="清空搜索"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {onAddSchool && (
            <Dialog open={isAddSchoolDialogOpen} onOpenChange={setIsAddSchoolDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="flex-shrink-0 hover:bg-primary/10"
                  aria-label="新增学校/工作坊"
                >
                  <Plus className="w-5 h-5 text-primary" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>新增学校/工作坊</DialogTitle>
                  <DialogDescription>填写基本信息，创建新的学校或工作坊节点</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="school-name">名称</Label>
                    <Input
                      id="school-name"
                      placeholder="例如：齐齐哈尔工程学院"
                      value={newSchoolName}
                      onChange={(e) => setNewSchoolName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="school-desc">简介</Label>
                    <Textarea
                      id="school-desc"
                      placeholder="简要描述学校或工作坊的特色"
                      rows={3}
                      value={newSchoolDesc}
                      onChange={(e) => setNewSchoolDesc(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="gap-2" onClick={handleCreateSchool} disabled={!newSchoolName.trim()}>
                    <Plus className="w-4 h-4" />
                    创建
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {treeData.children?.map((child, index) => (
          <TreeNodeComponent
            key={child.id}
            node={child}
            level={0}
            onSelect={onNodeSelect}
            selectedNodeId={selectedNode?.id || null}
            expandedNodes={expandedNodes}
            onToggleExpand={handleToggleExpand}
            visibleCourseCounts={visibleCourseCounts}
            onLoadMoreCourses={handleLoadMoreCourses}
            searchTerm={searchTerm}
            currentSchoolId={currentSchoolId || null}
            onSetCurrentSchool={onSetCurrentSchool}
            onToggleStar={handleToggleStar}
            matchingNodeIds={matchingNodeIds}
            pathNodeIds={pathNodeIds}
            isFirstMatch={child.id === firstMatchId}
            departmentMajors={departmentMajors}
            majorCourses={majorCourses}
            loadedMajorsWithNoCourses={loadedMajorsWithNoCourses}
          />
        ))}
      </div>
      </div>
    </>
  )
}
