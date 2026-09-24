import { Meter } from "@/modules/dashboard/components/shared/meter"
import { formatCount, formatPercent, ratio } from "@/modules/dashboard/format"
import { DEFINITIONS } from "@/modules/dashboard/labels"
import type { MajorStatus } from "@/modules/dashboard/types"

interface MajorProgressRankingProps {
  majors: MajorStatus[]
  onSelectMajor: (majorId: string) => void
}

/** 专业进度排行：按课程完成率从高到低，条为完成率，右侧附达标率；点击进入专业看板 */
export function MajorProgressRanking({ majors, onSelectMajor }: MajorProgressRankingProps) {
  const ranked = majors
    .filter((major): major is MajorStatus & { completion: number } => major.completion !== null)
    .sort((left, right) => {
      if (right.completion !== left.completion) return right.completion - left.completion
      return left.majorName.localeCompare(right.majorName, "zh-CN")
    })

  if (ranked.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">本学期本系专业下没有课程</p>
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <ol className="flex max-h-[280px] flex-col gap-1 overflow-auto pr-1">
        {ranked.map((major, index) => {
          const completion = major.completion
          const qualifiedRate = ratio(major.qualifiedCount, major.courseCount)
          return (
            <li key={major.majorId}>
              <button
                type="button"
                onClick={() => onSelectMajor(major.majorId)}
                className="group flex w-full flex-col gap-1 rounded-sm px-1 py-1.5 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-baseline gap-2 text-sm">
                  <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground group-hover:text-primary" title={major.majorName}>
                    {major.majorName}
                  </span>
                  <span className="w-14 shrink-0 text-right font-semibold tabular-nums text-foreground">{formatPercent(completion)}</span>
                  <span className="w-40 shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
                    达标 {qualifiedRate === null ? "-" : formatPercent(qualifiedRate)}（{formatCount(major.qualifiedCount)}/{formatCount(major.courseCount)}）
                  </span>
                </span>
                <Meter value={completion} ariaLabel={`${major.majorName}完成率`} className="ml-7 w-auto" />
              </button>
            </li>
          )
        })}
      </ol>
      <p className="mt-auto text-xs leading-5 text-muted-foreground">
        {DEFINITIONS.completion}；{DEFINITIONS.qualified}。没有课程的专业不参与排行。
      </p>
    </div>
  )
}
