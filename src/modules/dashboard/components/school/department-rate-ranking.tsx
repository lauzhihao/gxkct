import { DepartmentRateRow } from "@/modules/dashboard/components/school/department-rate-row"
import { DEFINITIONS } from "@/modules/dashboard/labels"
import type { DepartmentRate } from "@/modules/dashboard/types"

interface DepartmentRateRankingProps {
  departments: DepartmentRate[]
}

/** 院系达标率排行：从高到低；院系多于一个时，末位红标并固定在列表下方，不用滚动也能看到 */
export function DepartmentRateRanking({ departments }: DepartmentRateRankingProps) {
  if (departments.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">本学期没有课程</p>
  }

  const pinLast = departments.length > 1
  const scrollRows = pinLast ? departments.slice(0, -1) : departments
  return (
    <div className="flex flex-1 flex-col gap-2">
      <ol className="flex max-h-[220px] flex-col gap-2.5 overflow-auto pr-1">
        {scrollRows.map((department, index) => (
          <DepartmentRateRow key={department.departmentName} department={department} rank={index + 1} isLast={false} />
        ))}
      </ol>
      {pinLast ? (
        <ol start={departments.length} className="border-t border-dashed border-border pr-1 pt-2">
          <DepartmentRateRow department={departments[departments.length - 1]} rank={departments.length} isLast />
        </ol>
      ) : null}
      <p className="mt-auto text-xs text-muted-foreground">{DEFINITIONS.qualified}；院系同名合并统计。</p>
    </div>
  )
}
