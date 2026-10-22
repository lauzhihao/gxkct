import { Meter } from "@/modules/dashboard/components/shared/meter"
import { formatCount } from "@/modules/dashboard/format"
import { RESOURCE_LABELS } from "@/modules/dashboard/labels"
import type { ResourceCategoryCount } from "@/modules/dashboard/types"

interface ResourceStatsProps {
  resources: ResourceCategoryCount[]
  zeroResourceCount: number
  courseTotal: number
}

/** 资源建设统计：各类资源的数量（按课程资源的一级目录归类），条长相对最多的一类 */
export function ResourceStats({ resources, zeroResourceCount, courseTotal }: ResourceStatsProps) {
  const total = resources.reduce((sum, resource) => sum + resource.count, 0)
  const max = resources.reduce((largest, resource) => Math.max(largest, resource.count), 0)

  return (
    <div className="flex flex-1 flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        全校课程资源共 <span className="font-semibold text-foreground">{formatCount(total)}</span> 个；
        {formatCount(zeroResourceCount)} / {formatCount(courseTotal)} 门课程还没有资源
      </p>
      <ul className="flex flex-col gap-2.5">
        {resources.map((resource) => (
          <li key={resource.category} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-foreground">{RESOURCE_LABELS[resource.category]}</span>
              <span className="font-semibold tabular-nums text-foreground">{formatCount(resource.count)}</span>
            </div>
            <Meter value={max > 0 ? resource.count / max : 0} ariaLabel={`${RESOURCE_LABELS[resource.category]}数量`} />
          </li>
        ))}
      </ul>
      <p className="mt-auto text-xs leading-5 text-muted-foreground">
        按课程资源的一级目录归类：人才培养方案、大纲、开课说明、学情分析、课件、教案、案例、作业、预习手册为教学文档，改名或自建的目录归入其他。
      </p>
    </div>
  )
}
