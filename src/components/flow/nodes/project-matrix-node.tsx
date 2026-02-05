"use client"

import { memo, useCallback } from "react"
import { type Node, type NodeProps } from "@xyflow/react"
import { LayoutGrid, Star } from "lucide-react"
import { BaseFlowNode } from "./base-flow-node"
import type { ProjectMatrixData, ProjectMatrixKsaItem, KsaItemData } from "@/components/canvas-elements/types"
import { FlowNodeType } from "@/components/flow/utils/types"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/shared/components/ui/tooltip"
import { SupportLabel } from "@/shared/components/support-label"

/**
 * 项目矩阵节点扩展数据类型
 * 包含高亮状态和点击回调
 * 注意：ksaItemsMap 使用普通对象而非 Map，以满足 @xyflow/react 的 Record<string, unknown> 约束
 */
export interface ProjectMatrixNodeData extends ProjectMatrixData {
  highlighted?: boolean
  isDeleting?: boolean
  isRefreshing?: boolean
  progressMessage?: string | null
  onCoursePointClick?: (coursePointId: string) => void
  onDelete?: (nodeId: string) => void
  onRefresh?: (nodeId: string) => void
  onEdit?: (nodeId: string) => void
  /** KSA 卡片数据映射（从 KSA 面板注入），用于通过 id 匹配获取完整信息 */
  ksaItemsMap?: Record<string, KsaItemData>
  /** 允许额外的未知属性 */
  [key: string]: unknown
}

/**
 * 项目矩阵节点类型定义
 * 使用索引签名满足 @xyflow/react 的 Node 泛型约束
 */
export type ProjectMatrixNode = Node<ProjectMatrixNodeData, FlowNodeType.PROJECT_MATRIX>

/**
 * KSA支撑标签组件 - 带Tooltip展示完整描述
 * 显示序号标签格式（如 K1, S2, A3），若无 category/index 则从 ksaItemsMap 中查找
 * hover时显示手型图标，尺寸扩大1.2倍，无位移
 */
function KsaLabel({
  item,
  ksaItemsMap,
}: {
  item: ProjectMatrixKsaItem
  ksaItemsMap?: Record<string, KsaItemData>
}) {
  const isStrong = item.level === "strong"

  // 尝试从 ksaItemsMap 中获取完整的 KSA 数据（通过 id 匹配）
  const fullKsaData = ksaItemsMap?.[item.id]

  // 生成序号标签，如 K1, S2, A3
  // 优先级：item 自带 → ksaItemsMap 匹配 → 降级显示 name 或 id
  let label: string
  if (item.category && item.index != null) {
    label = `${item.category}${item.index}`
  } else if (fullKsaData) {
    label = `${fullKsaData.category}${fullKsaData.index}`
  } else {
    label = item.name || item.id
  }

  // Tooltip 展示的内容：优先使用 item 的 description，其次 fullKsaData 的 content，最后使用标签+支撑类型
  const tooltipContent = item.description || fullKsaData?.content || item.name || `${label} - ${isStrong ? "强支撑" : "弱支撑"}`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer transition-transform duration-150 ease-out origin-center hover:scale-[1.2] canvas-ksa-tag ${
            isStrong
              ? "bg-orange-100 border border-orange-300 text-orange-700 hover:bg-orange-200"
              : "bg-green-100 border border-green-300 text-green-700 hover:bg-green-200"
          }`}
        >
          <Star className={`w-3 h-3 ${isStrong ? "fill-current" : ""}`} />
          <span>{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[300px]">
        <div className={`flex items-start gap-1.5 ${isStrong ? "text-orange-700" : "text-green-700"}`}>
          <Star className={`w-3 h-3 flex-shrink-0 mt-0.5 ${isStrong ? "fill-current" : ""}`} />
          <span className="leading-relaxed">{tooltipContent}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * 项目矩阵节点 - 支持高亮联动和行点击事件
 */
export const ProjectMatrixNodeComponent = memo(function ProjectMatrixNodeComponent({
  id,
  data,
  selected,
}: NodeProps<ProjectMatrixNode>) {
  const highlighted = data.highlighted ?? false
  const taskObjectives = data.task_objectives || []

  // 处理课点行点击
  const handleCoursePointClick = useCallback((coursePointId: string) => {
    data.onCoursePointClick?.(coursePointId)
  }, [data])

  // 处理删除按钮点击
  const handleDelete = useCallback(() => {
    data.onDelete?.(id)
  }, [data, id])

  // 处理重做按钮点击
  const handleRefresh = useCallback(() => {
    data.onRefresh?.(id)
  }, [data, id])

  // 处理编辑按钮点击
  const handleEdit = useCallback(() => {
    data.onEdit?.(id)
  }, [data, id])

  // 计算表格宽度：基础列 + 动态任务目标列
  const baseWidth = 900
  const extraWidth = Math.max(0, taskObjectives.length - 1) * 120
  const tableWidth = baseWidth + extraWidth

  return (
    <BaseFlowNode
      id={id}
      selected={selected}
      highlighted={highlighted}
      isDeleting={data.isDeleting}
      isRefreshing={data.isRefreshing}
      progressMessage={data.progressMessage}
      icon={<LayoutGrid className="h-4 w-4" />}
      title={`第${data.chapter_index}章 ${data.chapter_name}`}
      headerColorClass="bg-slate-100"
      borderColorClass="border-slate-300"
      textColorClass="text-slate-700"
      handleColorClass="!bg-slate-500"
      showLeftHandle={true}
      showRightHandle={true}
      width={tableWidth}
      onDelete={handleDelete}
      onRefresh={handleRefresh}
      onEdit={handleEdit}
    >
      {/* 矩阵表格 */}
      {data.rows && data.rows.length > 0 ? (
        <div className="max-h-[1200px] overflow-auto rounded border border-slate-200" data-scrollable>
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                {/* 课点列 */}
                <th className="px-3 py-2 text-left text-slate-600 font-medium border-b border-r border-slate-200 whitespace-nowrap">
                  课点
                </th>
                {/* 动态任务目标列 */}
                {taskObjectives.map((obj) => (
                  <th
                    key={obj.id}
                    className="px-3 py-2 text-center text-slate-600 font-medium border-b border-r border-slate-200 min-w-[100px] max-w-[160px]"
                    title={obj.description}
                  >
                    <div className="text-xs leading-tight line-clamp-2">
                      {obj.description}
                    </div>
                  </th>
                ))}
                {/* 固定列 */}
                <th className="px-3 py-2 text-center text-slate-600 font-medium border-b border-r border-slate-200 whitespace-nowrap w-20">
                  学法
                </th>
                <th className="px-3 py-2 text-center text-slate-600 font-medium border-b border-r border-slate-200 whitespace-nowrap w-24">
                  教法
                </th>
                <th className="px-3 py-2 text-center text-slate-600 font-medium border-b border-r border-slate-200 whitespace-nowrap min-w-[120px]">
                  学习产出
                </th>
                <th className="px-3 py-2 text-center text-slate-600 font-medium border-b border-r border-slate-200 whitespace-nowrap w-14">
                  周次
                </th>
                <th className="px-3 py-2 text-center text-slate-600 font-medium border-b border-r border-slate-200 whitespace-nowrap w-14">
                  理论
                </th>
                <th className="px-3 py-2 text-center text-slate-600 font-medium border-b border-slate-200 whitespace-nowrap w-14">
                  实践
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr
                  key={row.course_point_id}
                  onClick={() => handleCoursePointClick(row.course_point_id)}
                  className="border-t border-slate-100 cursor-pointer canvas-table-row"
                >
                  {/* 课点名称 - 使用 SupportLabel 标签渲染 */}
                  <td className="px-3 py-2 text-gray-700 border-r border-slate-200">
                    <SupportLabel
                      title={row.course_point_name}
                      desc={row.course_point_description}
                      type="strong"
                      size="sm"
                      tipsPosition="right"
                    />
                  </td>
                  {/* 任务目标交叉单元格 - 显示KSA支撑 */}
                  {taskObjectives.map((obj) => {
                    const support = row.objective_supports?.find(
                      (s) => s.task_objective_id === obj.id
                    )
                    const ksaItems = support?.ksa_items || []
                    return (
                      <td
                        key={obj.id}
                        className="px-2 py-2 text-center border-r border-slate-200"
                      >
                        {ksaItems.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {ksaItems.map((item) => (
                              <KsaLabel key={item.id} item={item} ksaItemsMap={data.ksaItemsMap} />
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    )
                  })}
                  {/* 学法 */}
                  <td className="px-3 py-2 text-center text-gray-600 border-r border-slate-200 whitespace-nowrap">
                    {row.learning_method || "-"}
                  </td>
                  {/* 教法 */}
                  <td className="px-3 py-2 text-center text-gray-600 border-r border-slate-200 whitespace-nowrap">
                    {row.teaching_method || "-"}
                  </td>
                  {/* 学习产出 */}
                  <td
                    className="px-3 py-2 text-gray-600 border-r border-slate-200 max-w-[150px]"
                    title={row.learning_output}
                  >
                    <div className="text-xs leading-tight line-clamp-2">
                      {row.learning_output || "-"}
                    </div>
                  </td>
                  {/* 周次 */}
                  <td className="px-3 py-2 text-center text-gray-500 border-r border-slate-200">
                    {row.week || "-"}
                  </td>
                  {/* 理论学时 */}
                  <td className="px-3 py-2 text-center text-gray-500 border-r border-slate-200">
                    {row.theory_hours ?? "-"}
                  </td>
                  {/* 实践学时 */}
                  <td className="px-3 py-2 text-center text-gray-500">
                    {row.practice_hours ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-sm text-gray-400 text-center py-4">暂无课点数据</div>
      )}
    </BaseFlowNode>
  )
})

// 导出带类型的命名组件供 @xyflow/react 使用
export { ProjectMatrixNodeComponent as ProjectMatrixNode }
