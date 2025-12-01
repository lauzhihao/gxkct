import * as React from 'react'
import { cn } from '@/shared/utils/utils'

/**
 * Divider 组件 - 分隔线
 * 用于区分不同的内容区块
 */
interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 线条样式变体 */
  variant?: 'solid' | 'dashed'
  /** 上下间距 */
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}

export function Divider({
  variant = 'dashed',
  spacing = 'md',
  className,
  ...props
}: DividerProps) {
  return (
    <div
      className={cn(
        'border-t border-border',
        // 线条样式
        variant === 'dashed' && 'border-dashed',
        // 间距
        spacing === 'none' && '',
        spacing === 'sm' && 'my-2',
        spacing === 'md' && 'my-4',
        spacing === 'lg' && 'my-6',
        className
      )}
      {...props}
    />
  )
}

