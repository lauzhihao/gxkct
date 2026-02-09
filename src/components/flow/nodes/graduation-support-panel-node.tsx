"use client"

import { memo, useCallback, useMemo } from "react"
import { Shield } from "lucide-react"
import { BasePanelNode } from "./base-panel-node"
import { SupportLabel } from "@/shared/components/support-label"
import type { GraduationSupportData } from "@/components/canvas-elements/types"

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
    <div className="relative">
      <BasePanelNode
        id={id}
        selected={selected}
        isDeleting={data.isDeleting}
        isLoading={data.isLoading}
        isRefreshing={data.isRefreshing}
        icon={<Shield className="h-4 w-4" />}
        title="毕业要求指标点"
        headerColorClass="bg-emerald-100/90"
        borderColorClass="border-emerald-300"
        bgColorClass="bg-emerald-50/60 backdrop-blur-sm"
        textColorClass="text-emerald-700"
        handleColorClass="!bg-emerald-500"
        showLeftHandle={true}
        showRightHandle={true}
        childCount={hasData ? supportedIndicators.length : 0}
        onAdd={handleEdit}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />
      {/* 支撑标签展示区域：1.4倍缩放，一行5个 */}
      {hasData && (
        <div className="absolute top-[45px] left-2 right-2 bottom-2 overflow-auto pointer-events-none">
          <div
            className="grid grid-cols-5 gap-1.5 p-2 pointer-events-auto"
            style={{ transform: "scale(1.4)", transformOrigin: "top left", width: "calc(100% / 1.4)" }}
          >
            {supportedIndicators.map((item) => (
              <SupportLabel
                key={`${item.reqIndex}-${item.indicatorIndex}`}
                title={`${item.reqIndex}.${item.indicatorIndex}`}
                desc={item.description}
                type={item.supportLevel}
                size="sm"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

export default GraduationSupportPanelNode
