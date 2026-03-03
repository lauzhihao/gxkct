import type { TableOption } from "../types"

interface ReportTableProps {
  data: Array<{ data: string[] }>
  options: TableOption
  title?: string | string[]
}

function replaceSupportMark(value: string): string {
  return value.replaceAll("{$strong}", "★").replaceAll("{$weak}", "☆")
}

export function ReportTable({ data, options, title = "" }: ReportTableProps) {
  const headerSource = title || options.header?.text || ""
  const headerText = typeof headerSource === "string"
    ? options.header.format
      ? options.header.format.replaceAll("{$1}", headerSource)
      : headerSource
    : headerSource.reduce((acc, item, index) => acc.replaceAll(`{$${index + 1}}`, item), options.header.format)

  const leafColumns = options.column.flatMap((col) => {
    if (col.children && col.children.length > 0) {
      return col.children
    }
    return [col]
  })

  return (
    <div>
      <div className="font-semibold text-[10.5pt] leading-[22pt] text-center">{headerText}</div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[9pt] leading-[20pt]">
          <thead>
            <tr>
              <th className="border border-slate-300 px-2 py-1 text-center">&nbsp;</th>
              {options.column.map((column, index) => {
                if (column.children && column.children.length > 0) {
                  return (
                    <th
                      key={`head-${index}`}
                      colSpan={column.children.length}
                      className="border border-slate-300 px-2 py-1 text-center"
                    >
                      {column.label}
                    </th>
                  )
                }
                return (
                  <th key={`head-${index}`} rowSpan={2} className="border border-slate-300 px-2 py-1 text-center">
                    {column.label}
                  </th>
                )
              })}
            </tr>
            <tr>
              {options.column.map((column, index) => {
                if (!column.children || column.children.length === 0) {
                  return null
                }
                return column.children.map((child, childIndex) => (
                  <th
                    key={`sub-${index}-${childIndex}`}
                    className="border border-slate-300 px-2 py-1 text-center"
                    style={child.width ? { width: `${child.width}px` } : undefined}
                  >
                    {child.label}
                  </th>
                ))
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                <td className="border border-slate-300 px-2 py-1 align-top whitespace-pre-wrap">
                  {replaceSupportMark(row.data[0] ?? "")}
                </td>
                {leafColumns.map((_, colIndex) => (
                  <td key={`row-${rowIndex}-${colIndex}`} className="border border-slate-300 px-2 py-1 align-top whitespace-pre-wrap">
                    {replaceSupportMark(row.data[colIndex + 1] ?? "")}
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
