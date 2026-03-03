import * as React from 'react'
import { cn } from '@/shared/utils/utils'

interface ExpandableTextareaProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  onBlur?: () => void
  onFocus?: () => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  maxLength?: number
  rows?: number
  className?: string
  autoFocus?: boolean
  expandThreshold?: number // 当内容长度超过此值时自动展开（可选）
  hideCounter?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

export const ExpandableTextarea = React.forwardRef<
  HTMLTextAreaElement,
  ExpandableTextareaProps
>(
  (
    {
      value,
      onChange,
      disabled = false,
      onBlur,
      onFocus,
      placeholder,
      maxLength = 500,
      rows = 4,
      className,
      autoFocus,
      expandThreshold,
      hideCounter,
      onExpandedChange,
      onKeyDown,
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = React.useState(false)

    // 根据焦点状态或内容长度决定是否展开
    const isExpanded = isFocused || (expandThreshold !== undefined && value.length > expandThreshold)

    React.useEffect(() => {
      onExpandedChange?.(isExpanded)
    }, [isExpanded, onExpandedChange])

    const handleFocus = () => {
      setIsFocused(true)
      onFocus?.()
    }

    const handleBlur = () => {
      // 延迟处理blur，避免与click事件冲突导致需要二次点击
      setTimeout(() => {
        setIsFocused(false)
        onBlur?.()
      }, 150)
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value.slice(0, maxLength)
      onChange(newValue)
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      onKeyDown?.(event)
    }

    // 计算高度：收起时约40px（单行），展开时根据rows计算
    const collapsedHeight = '40px'
    const expandedHeight = `${rows * 24 + 32}px` // 每行约24px + padding

    return (
      <div className="relative w-full flex-1 min-w-0">
        <textarea
          ref={ref}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 border rounded-md bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--naive-primary-light)] focus:animate-shadow-flash resize-none overflow-hidden transition-[height] duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-60',
            className,
            isExpanded ? 'pb-8' : 'leading-6',
          )}
          style={{
            height: isExpanded ? expandedHeight : collapsedHeight,
          }}
          rows={1}
          autoFocus={autoFocus}
        />
        {!hideCounter && isExpanded && (
          <div className="absolute right-3 bottom-2 text-xs text-muted-foreground pointer-events-none">
            {value.length}/{maxLength}
          </div>
        )}
      </div>
    )
  },
)

ExpandableTextarea.displayName = 'ExpandableTextarea'
