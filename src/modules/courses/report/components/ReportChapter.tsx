interface ReportChapterProps {
  data: string
  noDecoration?: boolean
}

export function ReportChapter({ data, noDecoration = false }: ReportChapterProps) {
  return (
    <div>
      <span
        className={noDecoration
          ? "font-semibold text-xl"
          : "font-semibold text-xl underline bg-yellow-200"
        }
      >
        {data}
      </span>
    </div>
  )
}
