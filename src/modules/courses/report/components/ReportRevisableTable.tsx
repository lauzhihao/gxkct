"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import type { RevisableGroup, RevisableRow, TableOption } from "../types"

interface ReportRevisableTableProps {
  data: { label: string; data: RevisableGroup[] }
  options: TableOption
  name?: string
  revisable?: boolean
  onChange?: (name: string, value: { label: string; data: RevisableGroup[] }) => void
}

function cloneData(data: RevisableGroup[]): RevisableGroup[] {
  return JSON.parse(JSON.stringify(data)) as RevisableGroup[]
}

interface SpanCellState {
  rowSpan?: number
  colSpan?: number
  hidden?: boolean
}

function buildSpanMatrix(
  rowCount: number,
  colCount: number,
  spans: { location: [number, number]; status: [number, number]; covers: [number, number][] }[]
): SpanCellState[][] {
  const matrix = Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => ({} as SpanCellState))
  )

  spans.forEach((item) => {
    const [rowIndex, colIndex] = item.location
    const [rowSpan, colSpan] = item.status
    if (rowIndex >= rowCount || colIndex >= colCount) {
      return
    }

    matrix[rowIndex][colIndex] = {
      rowSpan,
      colSpan,
      hidden: false,
    }

    item.covers.forEach(([coverRow, coverCol]) => {
      if (coverRow < rowCount && coverCol < colCount) {
        matrix[coverRow][coverCol] = { hidden: true }
      }
    })
  })

  return matrix
}

export function ReportRevisableTable({
  data,
  options,
  name = "",
  revisable = false,
  onChange,
}: ReportRevisableTableProps) {
  const [editing, setEditing] = useState(false)
  const [localData, setLocalData] = useState<RevisableGroup[]>(data.data)
  const [tempData, setTempData] = useState<RevisableGroup[]>(data.data)

  useEffect(() => {
    setLocalData(data.data)
    setTempData(data.data)
  }, [data])

  const rows = useMemo<RevisableRow[]>(() => {
    const converter = options.rowDataCoverter
    if (!converter) return []
    return converter(editing ? tempData : localData)
  }, [editing, localData, options, tempData])

  const columnCount = useMemo(() => {
    if (rows.length === 0) return 0
    return rows.reduce((max, row) => Math.max(max, row.data.length), 0)
  }, [rows])

  const spanState = useMemo(() => {
    if (editing || !options.spanFormat || rows.length === 0 || columnCount === 0) {
      return null
    }
    const spans = options.spanFormat(localData)
    return buildSpanMatrix(rows.length, columnCount, spans)
  }, [columnCount, editing, localData, options, rows.length])

  const updateByMarker = (marker: number[], value: string) => {
    setTempData((prev) => {
      const next = cloneData(prev)
      if (marker.length === 2) {
        next[marker[1]].label = value
      } else if (marker.length === 3) {
        next[marker[1]].data[marker[2]].label = value
      } else if (marker.length === 4) {
        next[marker[1]].data[marker[2]].data[marker[3]].label = value
      }
      return next
    })
  }

  const handleAddOrDelete = (
    marker: number[],
    mode: "add" | "del",
    direct: number
  ) => {
    if (!options.addDelData) return
    setTempData((prev) => options.addDelData?.(cloneData(prev), marker, mode, direct) ?? prev)
  }

  return (
    <div>
      {options.header.show !== false && (
        <div className="text-[9pt] leading-[12pt] text-right">{options.header.text}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[9pt] leading-[18pt]">
          {options.showHeader !== false && options.column.length > 0 && (
            <thead>
              <tr>
                {options.column.map((column, idx) => (
                  <th key={`head-${idx}`} className="border border-slate-300 px-2 py-1 text-center">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(columnCount, options.column.length, 1)} className="border border-slate-300 px-2 py-4 text-center text-slate-500">
                  暂无数据
                </td>
              </tr>
            ) : rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {row.data.map((cell, colIndex) => {
                  const cellSpan = spanState?.[rowIndex]?.[colIndex]
                  if (!editing && cellSpan?.hidden) {
                    return null
                  }

                  const rowSpan = !editing && cellSpan?.rowSpan ? cellSpan.rowSpan : undefined
                  const colSpan = !editing && cellSpan?.colSpan ? cellSpan.colSpan : undefined

                  return (
                    <td
                      key={`cell-${rowIndex}-${colIndex}`}
                      className="border border-slate-300 px-2 py-1 align-top"
                      rowSpan={rowSpan}
                      colSpan={colSpan}
                    >
                      {editing ? (
                        <div className="space-y-1">
                          <Input
                            value={cell.label === "{$hold}" ? "" : cell.label}
                            onChange={(event) => updateByMarker(cell.marker, event.target.value)}
                            className="h-8"
                          />
                          {cell.revisableType !== "none" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAddOrDelete(cell.marker, "add", 1)}
                              >
                                {cell.revisableType === "column" ? "添加列" : "添加行"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAddOrDelete(cell.marker, "del", 0)}
                              >
                                删除
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{cell.label === "{$hold}" ? "" : cell.label}</div>
                      )}
                    </td>
                  )
                })}
                {Array.from({ length: Math.max(0, columnCount - row.data.length) }).map((_, i) => (
                  <td key={`fill-${rowIndex}-${i}`} className="border border-slate-300 px-2 py-1" />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {options.footer?.show !== false && (
        <div className="text-[9pt] leading-[12pt] whitespace-pre-line">{options.footer?.text ?? ""}</div>
      )}

      {revisable && (
        <div className="mt-2 flex gap-2">
          {editing ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setLocalData(tempData)
                  onChange?.(name, { ...data, data: tempData })
                  setEditing(false)
                }}
              >
                保存
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTempData(cloneData(localData))
                  setEditing(false)
                }}
              >
                取消
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setTempData(cloneData(localData))
                setEditing(true)
              }}
            >
              编辑表格
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
