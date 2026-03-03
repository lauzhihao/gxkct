"use client"

import { useEffect, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"

interface ReportSelectProps {
  name: string
  title: string
  options: string[]
  revisable?: boolean
  data: string
  onChange?: (name: string, value: string) => void
}

export function ReportSelect({ name, title, options, revisable = false, data, onChange }: ReportSelectProps) {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState("")

  useEffect(() => {
    setLocalValue(data)
  }, [data])

  return (
    <div className="inline-block align-top mr-8">
      <div className="inline-block align-top text-[12pt] leading-[22pt]">{title}</div>
      <div className="inline-block align-top">
        {editing ? (
          <Select value={localValue} onValueChange={setLocalValue}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {options.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="inline-block align-top text-[12pt] leading-[22pt]">{localValue}</div>
        )}
      </div>
      {revisable && (
        <span className="inline-flex items-center gap-2 ml-3 align-bottom">
          {editing ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onChange?.(name, localValue)
                  setEditing(false)
                }}
              >
                保存
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setLocalValue(data)
                  setEditing(false)
                }}
              >
                取消
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              修改
            </Button>
          )}
        </span>
      )}
    </div>
  )
}
