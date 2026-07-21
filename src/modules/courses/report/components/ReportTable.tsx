import type { ColumnOption, TableOption } from "../types"

interface ReportTableProps {
  data: Array<{ data: string[] }>
  options: TableOption
  title?: string | string[]
}

interface HeaderCell {
  label: string
  colSpan: number
  rowSpan: number
  width?: number
  nowrap?: boolean
}

function replaceSupportMark(value: string): string {
  return value.replaceAll("{$strong}", "★").replaceAll("{$weak}", "☆")
}

function isSupportMarkOnly(value: string): boolean {
  return value === "★" || value === "☆"
}

function getColumnDepth(column: ColumnOption): number {
  if (!column.children || column.children.length === 0) {
    return 1
  }

  return 1 + Math.max(...column.children.map(getColumnDepth))
}

function countLeafColumns(column: ColumnOption): number {
  if (!column.children || column.children.length === 0) {
    return 1
  }

  return column.children.reduce((total, child) => total + countLeafColumns(child), 0)
}

function collectLeafColumns(columns: ColumnOption[]): ColumnOption[] {
  return columns.flatMap((column) => {
    if (!column.children || column.children.length === 0) {
      return [column]
    }

    return collectLeafColumns(column.children)
  })
}

function buildHeaderRows(columns: ColumnOption[]): HeaderCell[][] {
  const maxDepth = columns.length > 0 ? Math.max(...columns.map(getColumnDepth)) : 1
  const rows: HeaderCell[][] = Array.from({ length: maxDepth }, () => [])

  const appendColumn = (column: ColumnOption, level: number) => {
    const hasChildren = Boolean(column.children && column.children.length > 0)

    rows[level].push({
      label: column.label,
      colSpan: hasChildren ? countLeafColumns(column) : 1,
      rowSpan: hasChildren ? 1 : maxDepth - level,
      width: !hasChildren ? column.width : undefined,
      nowrap: !hasChildren ? column.width !== undefined && !column.label.includes("\n") : false,
    })

    if (hasChildren) {
      column.children?.forEach((child) => appendColumn(child, level + 1))
    }
  }

  columns.forEach((column) => appendColumn(column, 0))
  return rows
}

export function ReportTable({ data, options, title = "" }: ReportTableProps) {
  const headerSource = title || options.header?.text || ""
  const headerText = typeof headerSource === "string"
    ? options.header.format
      ? options.header.format.replaceAll("{$1}", headerSource)
      : headerSource
    : headerSource.reduce((acc, item, index) => acc.replaceAll(`{$${index + 1}}`, item), options.header.format)

  const leafColumns = collectLeafColumns(options.column)
  const headerRows = buildHeaderRows(options.column)
  const titleAlignClass = options.style.titleAlign === "left"
    ? "text-left"
    : options.style.titleAlign === "right"
      ? "text-right"
      : "text-center"

  return (
    <div>
      <div className={`font-semibold text-[10.5pt] leading-[22pt] ${titleAlignClass}`}>{headerText}</div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[9pt] leading-[20pt]">
          <thead>
            {headerRows.map((headerRow, rowIndex) => (
              <tr key={`header-row-${rowIndex}`}>
                {rowIndex === 0 ? <th rowSpan={headerRows.length} className="border border-slate-300 px-2 py-1 text-center">&nbsp;</th> : null}
                {headerRow.map((cell, cellIndex) => (
                  <th
                    key={`header-cell-${rowIndex}-${cellIndex}`}
                    colSpan={cell.colSpan}
                    rowSpan={cell.rowSpan}
                    className="border border-slate-300 px-2 py-1 text-center"
                    style={cell.width ? {
                      width: `${cell.width}px`,
                      minWidth: `${cell.width}px`,
                      whiteSpace: cell.nowrap ? "nowrap" : "normal",
                    } : undefined}
                  >
                    {cell.label}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                <td className="border border-slate-300 px-2 py-1 align-top whitespace-pre-wrap">
                  {replaceSupportMark(row.data[0] ?? "")}
                </td>
                {leafColumns.map((_, colIndex) => (
                <td key={`row-${rowIndex}-${colIndex}`} className="border border-slate-300 px-2 py-1 align-top whitespace-pre-wrap">
                    {isSupportMarkOnly(replaceSupportMark(row.data[colIndex + 1] ?? "")) ? (
                      <span className="block text-center text-[11.5pt] leading-[20pt]">{replaceSupportMark(row.data[colIndex + 1] ?? "")}</span>
                    ) : (
                      replaceSupportMark(row.data[colIndex + 1] ?? "")
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-[9pt] leading-[22pt] whitespace-pre-line">{options.footer?.text ?? ""}</div>
    </div>
  )
}
