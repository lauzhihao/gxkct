import * as React from 'react'
import { cn } from '@/shared/utils/utils'
import { Input } from './input'

interface ExpandableTextareaProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onFocus?: () => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
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
  HTMLInputElement | HTMLTextAreaElement,
  ExpandableTextareaProps
>(
  (
    {
      value,
      onChange,
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value.slice(0, maxLength)
      onChange(newValue)
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onKeyDown?.(event)
    }

    if (isExpanded) {
      return (
        <div className="relative w-full flex-1 min-w-0">
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            maxLength={maxLength}
            className={cn(
              'w-full px-3 py-2 pb-8 border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--naive-primary-light)] focus:animate-shadow-flash resize-none',
              className,
            )}
            rows={rows}
            autoFocus
          />
          {!hideCounter && (
            <div className="absolute right-3 bottom-2 text-xs text-muted-foreground pointer-events-none">
              {value.length}/{maxLength}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="relative w-full flex-1 min-w-0">
        <Input
          ref={ref as React.Ref<HTMLInputElement>}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className={cn('cursor-text', className, 'pr-16')}
        />
        {!hideCounter && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {value.length}/{maxLength}
          </div>
        )}
      </div>
    )
  },
)

ExpandableTextarea.displayName = 'ExpandableTextarea'
