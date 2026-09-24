import { Meter } from "@/modules/dashboard/components/shared/meter"
import type { ResourceRequirement } from "@/modules/dashboard/types"

interface MyResourceGapsProps {
  resources: ResourceRequirement[]
}

/** 我的资源：已上传数量与专业要求的缺口 */
export function MyResourceGaps({ resources }: MyResourceGapsProps) {
  return (
    <ul className="flex flex-col gap-3">
      {resources.map((resource) => {
        const gap = Math.max(0, resource.required - resource.uploaded)
        return (
          <li key={resource.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-foreground">{resource.label}</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {resource.uploaded} / {resource.required}
                {gap > 0 ? <span className="ml-2 text-foreground">还差 {gap}</span> : <span className="ml-2 text-success">已达要求</span>}
              </span>
            </div>
            <Meter value={resource.uploaded / resource.required} ariaLabel={`${resource.label}完成度`} />
          </li>
        )
      })}
    </ul>
  )
}
