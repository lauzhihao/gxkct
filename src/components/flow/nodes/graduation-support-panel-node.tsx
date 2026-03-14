"use client"

import { memo, useCallback, useMemo } from "react"
import { Shield } from "lucide-react"
import { BasePanelNode } from "./base-panel-node"
import { SupportLabel } from "@/shared/components/support-label"
import type { GraduationSupportData } from "@/components/canvas-elements/types"

const EMPTY_STATE_DESCRIPTION = "根据“四真三化FT”课程开发规范的要求，本课程需要先设置毕业要求支撑关系。"

interface GraduationSupportPanelNodeProps {
  id: string
  data: GraduationSupportData & {
    isDeleting?: boolean
    isRefreshing?: boolean
    isLoading?: boolean
    onDelete?: (nodeId: string) => void
    onRefresh?: (nodeId: string) => void
    onEdit?: (nodeId: string) => void
    childCount?: number
    onAdd?: () => void
  }
  selected?: boolean
}

/**
 * 专业矩阵 Panel 节点组件
 * 作为 COURSE_INFO 和 OBJECTIVE_PANEL 之间的中间节点
 * 显示已选指标点的强弱支撑标签
 */
export const GraduationSupportPanelNode = memo(function GraduationSupportPanelNode({
  id,
  data,
  selected,
}: GraduationSupportPanelNodeProps) {
  const formatLabelTitle = useCallback((description: string) => {
    const trimmedText = description.trim()
    if (!trimmedText) return "未命名指标点"
    const characters = Array.from(trimmedText)
    return characters.length > 6 ? `${characters.slice(0, 6).join("")}...` : trimmedText
  }, [])

  const handleDelete = useCallback(() => {
    data.onDelete?.(id)
  }, [data, id])

  const handleEdit = useCallback(() => {
    data.onEdit?.(id)
  }, [data, id])

  // 提取所有已设置支撑等级的指标点
  const supportedIndicators = useMemo(() => {
    if (!data.requirements) return []
    const result: Array<{
      reqIndex: number
      indicatorIndex: number
      description: string
      supportLevel: "strong" | "weak"
    }> = []
    data.requirements.forEach((req, reqIdx) => {
      req.indicators.forEach((ind, indIdx) => {
        if (ind.supportLevel) {
          result.push({
            reqIndex: reqIdx + 1,
            indicatorIndex: indIdx + 1,
            description: ind.description,
            supportLevel: ind.supportLevel,
          })
        }
      })
    })
    return result
  }, [data.requirements])

  const hasData = supportedIndicators.length > 0

  return (
    <BasePanelNode
      id={id}
      selected={selected}
      isDeleting={data.isDeleting}
      isLoading={data.isLoading}
      isRefreshing={data.isRefreshing}
      icon={<Shield className="h-4 w-4" />}
      title="专业支撑关系"
      headerColorClass="bg-teal-100/70"
      borderColorClass="border-teal-400/70"
      bgColorClass="bg-teal-50/40 backdrop-blur-sm"
      textColorClass="text-teal-900"
      handleColorClass="!bg-teal-700"
      showLeftHandle={true}
      showRightHandle={true}
      childCount={hasData ? supportedIndicators.length : 0}
      onAdd={handleEdit}
      emptyStateDescription={EMPTY_STATE_DESCRIPTION}
      onDelete={handleDelete}
      onEdit={handleEdit}
    >
      {/* 支撑标签展示区域：1.4倍缩放，一行5个 */}
      {hasData ? (
        <div className="h-full overflow-auto pointer-events-none">
          <div
            className="grid grid-cols-3 gap-1.5 p-2 pointer-events-auto"
            style={{ transform: "scale(1.4)", transformOrigin: "top left", width: "calc(100% / 1.4)" }}
          >
            {supportedIndicators.map((item) => (
              <SupportLabel
                key={`${item.reqIndex}-${item.indicatorIndex}`}
                title={formatLabelTitle(item.description)}
                desc={item.description}
                type={item.supportLevel}
                size="sm"
                disableInnerTruncate={true}
              />
            ))}
          </div>
        </div>
      ) : null}
    </BasePanelNode>
  )
})

export default GraduationSupportPanelNode
