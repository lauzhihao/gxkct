/**
 * 阶段进度组件
 *
 * 显示当前流程进度
 */

"use client"

import { cn } from "@/shared/utils/utils"
import { Check } from "lucide-react"
import type { StageProgressProps } from "../types"
import { STAGE_ORDER } from "../constants"

export function StageProgress({ currentStage, stages }: StageProgressProps) {
  // 过滤掉 welcome 和 complete 阶段，只显示主要步骤
  const mainStages = stages.filter(s => !['welcome', 'complete'].includes(s.id))
  const currentOrder = STAGE_ORDER[currentStage]

  return (
    <div className="flex items-center gap-1 py-2">
      {mainStages.map((stage, index) => {
        const stageOrder = STAGE_ORDER[stage.id]
        const isCompleted = currentOrder > stageOrder
        const isCurrent = currentStage === stage.id
        const isPending = currentOrder < stageOrder

        return (
          <div key={stage.id} className="flex items-center">
            {/* 步骤指示器 */}
            <div
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-all duration-300",
                isCompleted && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary/20 text-primary border-2 border-primary",
                isPending && "bg-muted text-muted-foreground"
              )}
              title={stage.name}
            >
              {isCompleted ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>

            {/* 步骤名称（仅显示当前步骤） */}
            {isCurrent && (
              <span className="ml-1.5 text-xs font-medium text-primary">
                {stage.name}
              </span>
            )}

            {/* 连接线 */}
            {index < mainStages.length - 1 && (
              <div
                className={cn(
                  "w-4 h-0.5 mx-1 transition-all duration-300",
                  isCompleted ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * 简化版进度条（显示百分比）
 */
export function SimpleProgress({ currentStage }: { currentStage: string }) {
  const stagePercent: Record<string, number> = {
    welcome: 0,
    basic_info: 20,
    chapters: 40,
    points: 60,
    ksa: 80,
    preview: 95,
    complete: 100,
  }

  const percent = stagePercent[currentStage] ?? 0

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>课程开发进度</span>
        <span>{percent}%</span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
