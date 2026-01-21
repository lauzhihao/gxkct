'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/shared/utils/utils'
import { Button } from '@/shared/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command'

/**
 * 可搜索选择器选项接口
 */
export interface SearchableSelectOption {
  /** 选项值 */
  value: string
  /** 选项显示文本 */
  label: string
}

/**
 * 可搜索选择器组件Props
 */
export interface SearchableSelectProps {
  /** 当前选中值 */
  value?: string
  /** 值变化回调 */
  onValueChange?: (value: string) => void
  /** 未选择时的占位文本 */
  placeholder?: string
  /** 搜索框占位文本 */
  searchPlaceholder?: string
  /** 无匹配结果时的提示文本 */
  emptyText?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 选项列表 */
  options: SearchableSelectOption[]
  /** 自定义样式类名 */
  className?: string
  /** 触发器宽度类名 */
  triggerClassName?: string
}

/**
 * 防抖Hook
 * @param value 需要防抖的值
 * @param delay 延迟时间（毫秒）
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * 可搜索选择器组件
 * 基于 Popover + Command 实现，支持输入筛选和防抖
 */
export function SearchableSelect({
  value,
  onValueChange,
  placeholder = '请选择...',
  searchPlaceholder = '搜索...',
  emptyText = '无匹配结果',
  disabled = false,
  options,
  className,
  triggerClassName,
}: SearchableSelectProps) {
  // 弹出层开关状态
  const [open, setOpen] = React.useState(false)
  // 搜索关键词
  const [searchValue, setSearchValue] = React.useState('')
  // 防抖后的搜索关键词（300ms）
  const debouncedSearch = useDebounce(searchValue, 300)

  // 筛选后的选项列表
  const filteredOptions = React.useMemo(() => {
    if (!debouncedSearch.trim()) {
      return options
    }
    const lowerSearch = debouncedSearch.toLowerCase()
    return options.filter((option) =>
      option.label.toLowerCase().includes(lowerSearch)
    )
  }, [options, debouncedSearch])

  // 获取当前选中项的显示文本
  const selectedLabel = React.useMemo(() => {
    const selected = options.find((option) => option.value === value)
    return selected?.label
  }, [options, value])

  // 处理选项选中
  const handleSelect = React.useCallback(
    (selectedValue: string) => {
      onValueChange?.(selectedValue)
      setOpen(false)
      setSearchValue('')
    },
    [onValueChange]
  )

  // 弹出层关闭时清空搜索
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchValue('')
    }
  }, [])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            triggerClassName
          )}
        >
          <span className="truncate">
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('w-[--radix-popover-trigger-width] p-0', className)}
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
