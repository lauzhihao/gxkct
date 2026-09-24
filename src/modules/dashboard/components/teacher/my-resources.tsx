import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { formatCount } from "@/modules/dashboard/format"
import { NA_REASONS, RESOURCE_LABELS } from "@/modules/dashboard/labels"
import type { ResourceCategoryCount } from "@/modules/dashboard/types"

interface MyResourcesProps {
  resources: ResourceCategoryCount[]
}

/** 我的资源：本人课程已上传的资源数；专业要求未设定，缺口显示 N/A */
export function MyResources({ resources }: MyResourcesProps) {
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y divide-border">
        {resources.map((resource) => (
          <li key={resource.category} className="flex items-baseline justify-between gap-3 py-2 text-sm">
            <span className="text-foreground">{RESOURCE_LABELS[resource.category]}</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              已上传 <span className="text-sm font-semibold text-foreground">{formatCount(resource.count)}</span> / 要求{" "}
              <NaValue reason={NA_REASONS.resourceRequirement} />
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{NA_REASONS.resourceRequirement}，暂不计算缺口。</p>
    </div>
  )
}
