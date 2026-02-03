"use client"

import { memo, useCallback } from "react"
import { type NodeProps } from "@xyflow/react"
import { Table } from "lucide-react"
import { BaseFlowNode } from "./base-flow-node"
import type { CourseMatrixData } from "@/components/canvas-elements/types"
import { SupportLabel } from "@/shared/components/support-label"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/shared/components/ui/tooltip"

/**
 * 扩展的课程矩阵数据类型
 */
interface CourseMatrixNodeData extends CourseMatrixData {
  highlighted?: boolean
  isDeleting?: boolean
  isRefreshing?: boolean
  progressMessage?: string | null
  onDelete?: (nodeId: string) => void
  onRefresh?: (nodeId: string) => void
  onEdit?: (nodeId: string) => void
}

/**
 * 课程矩阵节点
 */
export const CourseMatrixNode = memo(function CourseMatrixNode({
  id,
  data,
  selected,
}: NodeProps<any>) {
  // [MOD] 使用类型断言确保 data 类型正确推导
  const nodeData = data as CourseMatrixNodeData
  const objectiveCount = nodeData.objectives?.length || 0
  const rowCount = nodeData.rows?.length || 0

  // 处理删除按钮点击
  const handleDelete = useCallback(() => {
    nodeData.onDelete?.(id)
  }, [nodeData, id])

  // 处理重做按钮点击
  const handleRefresh = useCallback(() => {
    nodeData.onRefresh?.(id)
  }, [nodeData, id])

  // 处理编辑按钮点击
  const handleEdit = useCallback(() => {
    nodeData.onEdit?.(id)
  }, [nodeData, id])

  return (
    <BaseFlowNode
      id={id}
      selected={selected}
      highlighted={nodeData.highlighted}
      isDeleting={nodeData.isDeleting}
      isRefreshing={nodeData.isRefreshing}
      progressMessage={nodeData.progressMessage}
      onDelete={handleDelete}
      onRefresh={handleRefresh}
      onEdit={handleEdit}
      icon={<Table className="h-6 w-6" />}
      title={nodeData.course_name ? `课程矩阵 - ${nodeData.course_name}` : "课程矩阵"}
      headerColorClass="bg-indigo-100"
      borderColorClass="border-indigo-200"
      textColorClass="text-indigo-700"
      handleColorClass="!bg-indigo-500"
      showLeftHandle={true}
      width={1040}
    >
      <div>
        {/* 矩阵表格 */}
        {nodeData.rows && nodeData.rows.length > 0 && (
          <div className="max-h-[480px] overflow-auto rounded border border-indigo-100" data-scrollable>
            <table className="w-full text-base">
              <thead className="bg-indigo-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-indigo-600 font-medium">章节</th>
                  {nodeData.objectives?.slice(0, 4).map((obj: { id: string; index: number; content: string }) => (
                    <th key={obj.id} className="px-4 py-3 text-center text-indigo-600 font-medium">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help border-b border-dashed border-indigo-300 hover:border-indigo-500 transition-colors">
                            教学目标{obj.index}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="font-medium text-indigo-600 mb-1">教学目标 {obj.index}</p>
                          <p className="text-gray-600">{obj.content}</p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                  ))}
                  {objectiveCount > 4 && (
                    <th className="px-4 py-3 text-center text-indigo-400">...</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {nodeData.rows.slice(0, 5).map((row: { chapter_id: string; chapter_name: string; supports?: Array<{ objective_id: string; course_points?: Array<{ id?: string; name: string; description?: string; level: "strong" | "weak" }> }> }) => (
                  <tr key={row.chapter_id} className="border-t border-indigo-50">
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]">
                      {row.chapter_name}
                    </td>
                    {nodeData.objectives?.slice(0, 4).map((obj: { id: string; index: number }) => {
                      const support = row.supports?.find((s: { objective_id: string }) => s.objective_id === obj.id)
                      return (
                        <td key={obj.id} className="px-4 py-3">
                          {support?.course_points && support.course_points.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {/* 每个课点显示为小标签，使用统一的 SupportLabel 组件 */}
                              {support?.course_points.map((cp: { id?: string; name: string; description?: string; level: "strong" | "weak" }, idx: number) => (
                                <SupportLabel
                                  key={cp.id || idx}
                                  title={cp.name}
                                  desc={cp.description}
                                  type={cp.level}
                                  size="sm"
                                  tipsPosition="top"
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-center block">-</span>
                          )}
                        </td>
                      )
                    })}
                    {objectiveCount > 4 && (
                      <td className="px-4 py-3 text-center text-gray-300">...</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {rowCount > 5 && (
              <div className="px-4 py-3 text-base text-center text-indigo-400 bg-indigo-50">
                还有 {rowCount - 5} 个章节...
              </div>
            )}
          </div>
        )}
      </div>
    </BaseFlowNode>
  )
})

export default CourseMatrixNode
