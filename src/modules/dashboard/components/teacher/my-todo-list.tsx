import { Clock, FilePlus2, Undo2 } from "lucide-react"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { NA_REASONS, TEACHER_TODO_LABELS } from "@/modules/dashboard/labels"
import type { TeacherTodo, TeacherTodoKind } from "@/modules/dashboard/types"
import { cn } from "@/shared/utils/utils"

const TODO_ICON = {
  missingMaterial: FilePlus2,
  dueSoon: Clock,
} as const

const TODO_TONE: Record<TeacherTodoKind, string> = {
  missingMaterial: "text-primary",
  dueSoon: "text-warning",
}

interface MyTodoListProps {
  todos: TeacherTodo[]
}

/** 我的待办：待补材料、临期任务逐条列出；被退回修改在系统里没有记录，固定一行标 N/A */
export function MyTodoList({ todos }: MyTodoListProps) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {todos.length === 0 ? (
        <p className="py-2.5 text-sm text-muted-foreground">暂无待补材料与临期任务</p>
      ) : (
        <ul className="max-h-[400px] divide-y divide-border overflow-auto">
          {todos.map((todo) => {
            const Icon = TODO_ICON[todo.kind]
            return (
              <li key={todo.id} className="flex items-start gap-3 py-2.5">
                <Icon className={cn("mt-0.5 size-4 shrink-0", TODO_TONE[todo.kind])} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="mr-2 text-xs text-muted-foreground">{TEACHER_TODO_LABELS[todo.kind]}</span>
                    <span className="mr-1 font-medium">{todo.courseName}</span>
                    {todo.detail}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{todo.majorName}</p>
                </div>
                {todo.deadline !== null ? (
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">截止 {todo.deadline}</span>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex items-start gap-3 py-2.5">
        <Undo2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          <span className="mr-2 text-xs">被退回修改</span>
          <NaValue reason={NA_REASONS.returned} showReason />
        </p>
      </div>
    </div>
  )
}
