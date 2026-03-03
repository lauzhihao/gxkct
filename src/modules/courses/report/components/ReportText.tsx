"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"

interface ReportTextProps {
  name?: string
  type?: "normal" | "number" | "custom"
  title: string
  subtitle?: string
  data: string | number | string[] | string[][]
  nowrap?: boolean
  textwrap?: boolean
  textformat?: string
  revisable?: boolean
  hideTitle?: boolean
  onChange?: (name: string, value: string) => void
}

function formatCustomData(value: ReportTextProps["data"], textformat: string): string {
  if (textformat && Array.isArray(value)) {
    if (Array.isArray(value[0])) {
      return (value as string[][])
        .map((line) => line.reduce((acc, item, index) => acc.replaceAll(`{$${index + 1}}`, item), textformat))
        .join("; ")
    }
    return (value as string[])
      .reduce((acc, item, index) => acc.replaceAll(`{$${index + 1}}`, item), textformat)
  }
  if (Array.isArray(value)) {
    if (Array.isArray(value[0])) {
      return (value as string[][]).map((line) => line.join(",")).join("; ")
    }
    return (value as string[]).join(", ")
  }
  return String(value ?? "")
}

export function ReportText({
  name = "",
  type = "normal",
  title,
  subtitle = "",
  data,
  nowrap = true,
  textwrap = false,
  textformat = "",
  revisable = false,
  hideTitle = false,
  onChange,
}: ReportTextProps) {
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState("")

  const displayValue = useMemo(() => {
    if (type === "custom") {
      return formatCustomData(data, textformat)
    }
    return String(data ?? "")
  }, [data, textformat, type])

  useEffect(() => {
    setInputValue(displayValue)
  }, [displayValue])

  return (
    <div className={nowrap ? "inline-block align-top mr-8" : "block"}>
      {!hideTitle && (
        <div className={textwrap ? "block text-[12pt] leading-[22pt]" : "inline-block align-top text-[12pt] leading-[22pt]"}>
          {title}
          {subtitle ? `:${subtitle}` : ":"}
        </div>
      )}

      <div className="inline-block align-top">
        {editing ? (
          type === "number" ? (
            <Input
              type="number"
              value={inputValue}
              onChange={(event) => {
                const next = event.target.value.slice(0, 4)
                setInputValue(next)
              }}
              className="w-40"
            />
          ) : (
            <Textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              className="min-w-[280px]"
              rows={3}
            />
          )
        ) : (
          <div className={textwrap ? "inline-block align-top text-[12pt] leading-[22pt] whitespace-pre-wrap" : "inline-block align-top text-[12pt] leading-[22pt]"}>
            {displayValue}
          </div>
        )}

        {revisable && (
          <span className="inline-flex items-center gap-2 ml-3 align-bottom">
            {editing ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onChange?.(name, inputValue)
                    setEditing(false)
                  }}
                >
                  保存
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setInputValue(displayValue)
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
    </div>
  )
}
