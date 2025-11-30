import * as React from 'react'
import { cn } from '@/shared/utils/utils'
import { Input } from './input'

interface ExpandableTextareaProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onFocus?: () => void
  placeholder?: string
  maxLength?: number
  rows?: number
  className?: string
  autoFocus?: boolean
  expandThreshold?: number // 当内容长度超过此值时自动展开（可选）
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
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = React.useState(false)

    // 根据焦点状态或内容长度决定是否展开
    const isExpanded = isFocused || (expandThreshold !== undefined && value.length > expandThreshold)

    const handleFocus = () => {
      setIsFocused(true)
      onFocus?.()
    }

    const handleBlur = () => {
      setIsFocused(false)
      onBlur?.()
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value.slice(0, maxLength)
      onChange(newValue)
    }

    if (isExpanded) {
      return (
        <div className="relative">
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            maxLength={maxLength}
            className={cn(
              'w-full px-3 py-2 pb-8 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 resize-none',
              className,
            )}
            rows={rows}
            autoFocus
          />
          <div className="absolute right-3 bottom-2 text-xs text-muted-foreground pointer-events-none">
            {value.length}/{maxLength}
          </div>
        </div>
      )
    }

    return (
      <div className="relative">
        <Input
          ref={ref as React.Ref<HTMLInputElement>}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          className={cn('cursor-text pr-12', className)}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          {value.length}/{maxLength}
        </div>
      </div>
    )
  },
)

ExpandableTextarea.displayName = 'ExpandableTextarea'

