import * as React from 'react'
import { cn } from '@/shared/utils/utils'

/**
 * SectionHeader 组件 - 带有彩色标记的节标题
 * 用于各个信息区块的标题展示
 */
interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 标题文本 */
  title: string
  /** 是否显示彩色强调标记 */
  accent?: boolean
  /** 自定义图标 */
  icon?: React.ReactNode
  /** 右侧操作区域 */
  action?: React.ReactNode
}

export function SectionHeader({
  title,
  accent = true,
  icon,
  action,
  className,
  children,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn('flex items-center justify-between mb-4', className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        {accent && <div className="w-2 h-2 rounded-sm bg-primary" />}
        {icon}
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {children}
      </div>
      {action}
    </div>
  )
}

