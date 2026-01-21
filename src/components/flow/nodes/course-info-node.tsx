"use client"

import { memo, useCallback, useMemo } from "react"
import { type NodeProps } from "@xyflow/react"
import {
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  Users,
} from "lucide-react"
import { BaseFlowNode } from "./base-flow-node"
import type { CourseInfoData } from "@/components/canvas-elements/types"

/**
 * 扩展的课程信息数据类型，包含注入的回调
 */
interface CourseInfoNodeData extends CourseInfoData {
  highlighted?: boolean
  isDeleting?: boolean
  isRefreshing?: boolean
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  onRefresh?: (nodeId: string) => void
}

/**
 * 格式化日期显示
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return ""
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("zh-CN")
  } catch {
    return dateStr
  }
}

/**
 * 信息项组件 - 紧凑显示单个字段
 */
function InfoItem({
  icon: Icon,
  label,
  value,
  className = "",
}: {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  value?: string | number
  className?: string
}) {
  if (!value && value !== 0) return null
  return (
    <div className={`flex items-center gap-1.5 text-xs ${className}`}>
      {Icon && <Icon className="w-3 h-3 text-gray-400 flex-shrink-0" />}
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-gray-600 truncate">{value}</span>
    </div>
  )
}

/**
 * 课程基本信息节点
 * 显示完整的课程信息，通过编辑图标触发编辑弹窗
 */
export const CourseInfoNode = memo(function CourseInfoNode({
  id,
  data,
  selected,
}: NodeProps<CourseInfoNodeData>) {
  // 处理编辑按钮点击
  const handleEdit = useCallback(() => {
    data.onEdit?.(id)
  }, [data, id])

  // 处理删除按钮点击
  const handleDelete = useCallback(() => {
    data.onDelete?.(id)
  }, [data, id])

  // 处理重做按钮点击
  const handleRefresh = useCallback(() => {
    data.onRefresh?.(id)
  }, [data, id])

  // 从 metadata 中提取渲染所需字段
  const metadata = data.metadata
  const theoryPeriod = metadata?.theoryPeriod ?? 0
  const practicePeriod = metadata?.practicePeriod ?? 0

  // 解析授课时间
  const teachingTimeDisplay = useMemo(() => {
    if (!metadata?.teachingTime) return null
    try {
      const scheduleData = typeof metadata.teachingTime === "string"
        ? JSON.parse(metadata.teachingTime)
        : metadata.teachingTime
      const scheduleRows = Array.isArray(scheduleData) ? scheduleData : [scheduleData]
      // 返回简化显示：只显示有内容的行数
      const validRows = scheduleRows.filter((row: any) =>
        row.period || row.sessions || row.monday || row.tuesday ||
        row.wednesday || row.thursday || row.friday || row.saturday || row.sunday
      )
      if (validRows.length === 0) return null
      return `${validRows.length}个时段`
    } catch {
      return metadata.teachingTime
    }
  }, [metadata?.teachingTime])

  return (
    <BaseFlowNode
      id={id}
      selected={selected}
      highlighted={data.highlighted}
      isDeleting={data.isDeleting}
      isRefreshing={data.isRefreshing}
      icon={<BookOpen className="h-4 w-4" />}
      title={data.name || "未命名课程"}
      headerColorClass="bg-sky-100"
      borderColorClass="border-sky-200"
      textColorClass="text-sky-700"
      handleColorClass="!bg-sky-500"
      width={520}
      showTargetHandle={true}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onRefresh={handleRefresh}
    >
      <div className="space-y-3 text-sm">
        {/* 课程类型、课程性质和学时标签 */}
        <div className="flex items-center gap-2 flex-wrap">
          {metadata?.courseType && (
            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs rounded border border-amber-200">
              {metadata.courseType}
            </span>
          )}
          {metadata?.courseNatureName && (
            <span className="px-2 py-0.5 bg-sky-50 text-sky-600 text-xs rounded border border-sky-200">
              {metadata.courseNatureName}
            </span>
          )}
          {theoryPeriod > 0 && (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded border border-blue-200">
              理论{theoryPeriod}学时
            </span>
          )}
          {practicePeriod > 0 && (
            <span className="px-2 py-0.5 bg-teal-50 text-teal-600 text-xs rounded border border-teal-200">
              实践{practicePeriod}学时
            </span>
          )}
          {metadata?.credits !== undefined && metadata.credits > 0 && (
            <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs rounded border border-purple-200">
              {metadata.credits}学分
            </span>
          )}
        </div>

        {/* 基本信息网格 */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <InfoItem icon={Calendar} label="开课日期" value={formatDate(metadata?.openingDate)} />
          <InfoItem icon={Users} label="学生人数" value={metadata?.studentCount ? `${metadata.studentCount}人` : undefined} />
          <InfoItem icon={MapPin} label="授课地点" value={metadata?.teachingLocation} />
          <InfoItem icon={Clock} label="授课时间" value={teachingTimeDisplay} />
        </div>

        {/* 课程简介 */}
        {metadata?.introduction && (
          <div className="border-t border-gray-100 pt-2">
            <p className="text-gray-500 text-xs line-clamp-3">
              {metadata.introduction}
            </p>
          </div>
        )}
      </div>
    </BaseFlowNode>
  )
})

export default CourseInfoNode
