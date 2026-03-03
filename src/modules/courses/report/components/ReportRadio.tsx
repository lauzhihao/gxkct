"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group"

interface RadioOptionMap {
  label: string | number
  text: string
}

interface ReportRadioProps {
  data: string | number
  options: {
    labels: Array<string | number>
    texts: string[]
    maps: RadioOptionMap[]
  }
  name?: string
  title?: string
  revisable?: boolean
  onChange?: (name: string, value: string | number) => void
}

export function ReportRadio({
  data,
  options,
  name = "",
  title = "",
  revisable = false,
  onChange,
}: ReportRadioProps) {
  const [editing, setEditing] = useState(false)
  const [localStatus, setLocalStatus] = useState<string>(String(data))

  useEffect(() => {
    setLocalStatus(String(data))
  }, [data])

  const localText = useMemo(() => {
    const mapped = options.maps.find((item) => String(item.label) === localStatus)
    return mapped?.text ?? ""
  }, [localStatus, options.maps])

  return (
    <div>
      {editing ? (
        <div className="inline-flex items-center gap-3 text-[12pt] leading-[22pt]">
          <span>{title}</span>
          <RadioGroup value={localStatus} onValueChange={setLocalStatus} className="flex items-center gap-4">
            {options.labels.map((value, index) => (
              <label key={`${value}-${index}`} className="inline-flex items-center gap-2 text-sm">
                <RadioGroupItem value={String(value)} />
                <span>{options.texts[index]}</span>
              </label>
            ))}
          </RadioGroup>
        </div>
      ) : (
        <div className="inline-block text-[12pt] leading-[22pt]">{title}{localText}</div>
      )}

      {revisable && (
        <span className="inline-flex items-center gap-2 ml-3 align-bottom">
          {editing ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const payload = Number.isNaN(Number(localStatus)) ? localStatus : Number(localStatus)
                  onChange?.(name, payload)
                  setEditing(false)
                }}
              >
                保存
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setLocalStatus(String(data))
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
