"use client"

import { memo, useCallback, useMemo } from "react"
import { type NodeProps } from "@xyflow/react"
import { FileText, Calendar, User } from "lucide-react"
import { BaseFlowNode } from "./base-flow-node"
import type { SourceDocumentCardData } from "@/components/canvas-elements/types"

/**
 * 文件类型图标映射
 */
const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  doc: "DOC",
  txt: "TXT",
  md: "MD",
  xlsx: "XLSX",
  xls: "XLS",
  csv: "CSV",
  json: "JSON",
}

/**
 * 文件类型颜色映射
 */
const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: "bg-red-100 text-red-600 border-red-200",
  docx: "bg-blue-100 text-blue-600 border-blue-200",
  doc: "bg-blue-100 text-blue-600 border-blue-200",
  txt: "bg-gray-100 text-gray-600 border-gray-200",
  md: "bg-purple-100 text-purple-600 border-purple-200",
  xlsx: "bg-green-100 text-green-600 border-green-200",
  xls: "bg-green-100 text-green-600 border-green-200",
  csv: "bg-emerald-100 text-emerald-600 border-emerald-200",
  json: "bg-amber-100 text-amber-600 border-amber-200",
}

/**
 * 扩展的源文档卡片数据类型，包含注入的回调
 */
interface SourceDocumentNodeData extends SourceDocumentCardData {
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
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

/**
 * 源文档卡片节点
 * 显示用户上传的文件信息，支持编辑、删除、重做
 */
// 使用 any 类型绕过 @xyflow/react 的严格 Node 泛型约束
// 组件内部通过类型断言确保 data 属性类型安全
export const SourceDocumentNode = memo(function SourceDocumentNode(
  props: NodeProps<any>
) {
  const { id, data, selected } = props as {
    id: string
    data: SourceDocumentNodeData
    selected?: boolean
  }
  // 处理编辑按钮点击
  const handleEdit = useCallback(() => {
    data.onEdit?.(id)
  }, [data, id])

  // 处理删除按钮点击
  const handleDelete = useCallback(() => {
    data.onDelete?.(id)
  }, [data, id])

  // 处理重做按钮点击（重新解析原始文件）
  const handleRefresh = useCallback(() => {
    data.onRefresh?.(id)
  }, [data, id])

  // 获取文件类型标签和颜色
  const fileTypeLabel = useMemo(() => {
    const type = data.fileType?.toLowerCase() || "unknown"
    return FILE_TYPE_ICONS[type] || type.toUpperCase()
  }, [data.fileType])

  const fileTypeColorClass = useMemo(() => {
    const type = data.fileType?.toLowerCase() || "unknown"
    return FILE_TYPE_COLORS[type] || "bg-gray-100 text-gray-600 border-gray-200"
  }, [data.fileType])

  return (
    <BaseFlowNode
      id={id}
      selected={selected}
      highlighted={data.highlighted}
      isDeleting={data.isDeleting}
      isRefreshing={data.isRefreshing}
      icon={<FileText className="h-4 w-4" />}
      title="您输入的文件"
      headerColorClass="bg-orange-100"
      borderColorClass="border-orange-200"
      textColorClass="text-orange-700"
      handleColorClass="!bg-orange-500"
      width={280}
      showLeftHandle={false}
      showRightHandle={false}
      showSourceHandle={true}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onRefresh={handleRefresh}
    >
      <div className="space-y-2 text-xs">
        {/* 文件名 */}
        <div className="text-sm font-medium text-gray-800 truncate">
          {data.filename || "未命名文件"}
        </div>

        {/* 创建时间 */}
        {data.createdAt && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>{formatDate(data.createdAt)}</span>
          </div>
        )}

        {/* 创建人 */}
        {data.createdBy && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <User className="w-3 h-3 flex-shrink-0" />
            <span>{data.createdBy}</span>
          </div>
        )}

        {/* 文件类型标签 - 右下角 */}
        <div className="flex justify-end">
          <span className={`px-2 py-0.5 rounded border text-xs font-medium ${fileTypeColorClass}`}>
            {fileTypeLabel}
          </span>
        </div>
      </div>
    </BaseFlowNode>
  )
})

export default SourceDocumentNode
