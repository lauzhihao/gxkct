import { AlertOctagon, Clock, Loader } from "lucide-react"
import { DEPARTMENT_TASK_STATUS_LABELS } from "@/modules/dashboard/labels"
import type { DepartmentTaskStatus } from "@/modules/dashboard/types"
import { cn } from "@/shared/utils/utils"

const STATUS_ICON = {
  pending: Loader,
  dueSoon: Clock,
  overdue: AlertOctagon,
} as const

const STATUS_TONE: Record<DepartmentTaskStatus, string> = {
  pending: "text-muted-foreground",
  dueSoon: "text-warning",
  overdue: "text-destructive",
}

interface TaskStatusTagProps {
  status: DepartmentTaskStatus
}

export function TaskStatusTag({ status }: TaskStatusTagProps) {
  const Icon = STATUS_ICON[status]
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-foreground">
      <Icon className={cn("size-3.5", STATUS_TONE[status])} aria-hidden />
      {DEPARTMENT_TASK_STATUS_LABELS[status]}
    </span>
  )
}
