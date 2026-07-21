import * as React from 'react'
import { cn } from '@/shared/utils/utils'

/**
 * SectionCard 组件 - 带有透明背景和模糊效果的卡片容器
 * 用于包裹各种信息展示区块
 */
interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  /** 卡片变体样式 */
  variant?: 'default' | 'outlined' | 'elevated'
  /** 内边距大小 */
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

export function SectionCard({
  children,
  variant = 'default',
  padding = 'md',
  className,
  ...props
}: SectionCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border backdrop-blur-sm',
        // 变体样式
        variant === 'default' && 'bg-secondary/30',
        variant === 'outlined' && 'bg-transparent',
        variant === 'elevated' && 'bg-card shadow-lg',
        // 内边距
        padding === 'none' && '',
        padding === 'sm' && 'p-4',
        padding === 'md' && 'p-5',
        padding === 'lg' && 'p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

