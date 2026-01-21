"use client"

import { memo, useEffect, useRef } from "react"
import { Target, BookOpen, FileText, Layers, Table, LayoutGrid } from "lucide-react"
import { FlowNodeType } from "./utils/types"

// 菜单项配置
export interface ConnectionMenuItem {
  // 菜单项标识
  type: FlowNodeType | string
  // 显示标签
  label: string
  // 图标
  icon: React.ReactNode
  // 图标背景色
  iconBgClass: string
  // 图标颜色
  iconColorClass: string
}

// 各节点类型对应的菜单配置
export const CONNECTION_MENU_CONFIG: Partial<Record<FlowNodeType, ConnectionMenuItem[]>> = {
  // 课程信息 → 可创建四个 Panel
  [FlowNodeType.COURSE_INFO]: [
    {
      type: FlowNodeType.OBJECTIVE_PANEL,
      label: "教学目标",
      icon: <Target className="h-4 w-4" />,
      iconBgClass: "bg-blue-100",
      iconColorClass: "text-blue-600",
    },
    {
      type: FlowNodeType.COURSE_POINT_PANEL,
      label: "课点列表",
      icon: <BookOpen className="h-4 w-4" />,
      iconBgClass: "bg-green-100",
      iconColorClass: "text-green-600",
    },
    {
      type: FlowNodeType.CHAPTER_PANEL,
      label: "章节列表",
      icon: <FileText className="h-4 w-4" />,
      iconBgClass: "bg-purple-100",
      iconColorClass: "text-purple-600",
    },
    {
      type: FlowNodeType.KSA_PANEL,
      label: "KSA",
      icon: <Layers className="h-4 w-4" />,
      iconBgClass: "bg-amber-100",
      iconColorClass: "text-amber-600",
    },
  ],
  // 教学目标 Panel → 可创建课程矩阵
  [FlowNodeType.OBJECTIVE_PANEL]: [
    {
      type: FlowNodeType.COURSE_MATRIX,
      label: "课程矩阵",
      icon: <Table className="h-4 w-4" />,
      iconBgClass: "bg-indigo-100",
      iconColorClass: "text-indigo-600",
    },
  ],
  // 课点列表 Panel → 可创建课程矩阵
  [FlowNodeType.COURSE_POINT_PANEL]: [
    {
      type: FlowNodeType.COURSE_MATRIX,
      label: "课程矩阵",
      icon: <Table className="h-4 w-4" />,
      iconBgClass: "bg-indigo-100",
      iconColorClass: "text-indigo-600",
    },
  ],
  // 章节列表 Panel → 可创建课程矩阵
  [FlowNodeType.CHAPTER_PANEL]: [
    {
      type: FlowNodeType.COURSE_MATRIX,
      label: "课程矩阵",
      icon: <Table className="h-4 w-4" />,
      iconBgClass: "bg-indigo-100",
      iconColorClass: "text-indigo-600",
    },
  ],
  // KSA Panel → 可创建课程矩阵
  [FlowNodeType.KSA_PANEL]: [
    {
      type: FlowNodeType.COURSE_MATRIX,
      label: "课程矩阵",
      icon: <Table className="h-4 w-4" />,
      iconBgClass: "bg-indigo-100",
      iconColorClass: "text-indigo-600",
    },
  ],
  // 课程矩阵 → 可创建项目矩阵
  [FlowNodeType.COURSE_MATRIX]: [
    {
      type: FlowNodeType.PROJECT_MATRIX,
      label: "项目矩阵",
      icon: <LayoutGrid className="h-4 w-4" />,
      iconBgClass: "bg-teal-100",
      iconColorClass: "text-teal-600",
    },
  ],
}

export interface ConnectionMenuProps {
  // 菜单位置（屏幕坐标）
  position: { x: number; y: number }
  // 源节点类型
  sourceNodeType: FlowNodeType
  // 源节点 ID
  sourceNodeId: string
  // 菜单项点击回调
  onSelect: (item: ConnectionMenuItem, sourceNodeId: string, position: { x: number; y: number }) => void
  // 关闭菜单回调
  onClose: () => void
}

/**
 * 连接菜单组件
 * 从连接点拖拽松开后显示的上下文菜单
 */
export const ConnectionMenu = memo(function ConnectionMenu({
  position,
  sourceNodeType,
  sourceNodeId,
  onSelect,
  onClose,
}: ConnectionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // 获取当前节点类型的菜单配置
  const menuItems = CONNECTION_MENU_CONFIG[sourceNodeType] || []

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    // 按 ESC 关闭菜单
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  // 如果没有可用菜单项，不显示
  if (menuItems.length === 0) {
    return null
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1.5 px-1.5 min-w-[160px]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="px-2 py-1.5 text-xs text-gray-400 border-b border-gray-100 mb-1">
        创建并连接
      </div>
      {menuItems.map((item) => (
        <button
          key={item.type}
          onClick={() => onSelect(item, sourceNodeId, position)}
          className="w-full flex items-center gap-2 px-2 py-2 hover:bg-gray-100 rounded-md transition-colors text-left"
        >
          <span className={`p-1 rounded ${item.iconBgClass} ${item.iconColorClass}`}>
            {item.icon}
          </span>
          <span className="text-sm text-gray-700">{item.label}</span>
        </button>
      ))}
    </div>
  )
})

export default ConnectionMenu
