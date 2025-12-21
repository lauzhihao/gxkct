/**
 * 思考过程组件
 *
 * 显示 AI 的思考步骤，带有动画效果
 */

"use client"

import { cn } from "@/shared/utils/utils"
import type { ThinkingProcessProps } from "../types"

export function ThinkingProcess({ steps, isActive }: ThinkingProcessProps) {
  if (!isActive || steps.length === 0) return null

  return (
    <div className="space-y-2 py-3 px-4 bg-muted/30 rounded-lg border border-border/40">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <span>AI 正在思考...</span>
      </div>

      <div className="space-y-1.5">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-2 text-xs transition-all duration-300",
              step.status === 'pending' && "text-muted-foreground/50",
              step.status === 'processing' && "text-primary",
              step.status === 'done' && "text-muted-foreground"
            )}
          >
            {/* 状态图标 */}
            <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
              {step.status === 'pending' && (
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              )}
              {step.status === 'processing' && (
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
              {step.status === 'done' && (
                <svg
                  className="w-3.5 h-3.5 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </span>

            {/* 步骤内容 */}
            <span
              className={cn(
                "transition-opacity duration-300",
                step.status === 'pending' && "opacity-50"
              )}
            >
              {step.content}
            </span>

            {/* 处理中动画 */}
            {step.status === 'processing' && (
              <span className="inline-flex gap-0.5 ml-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1 h-1 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
