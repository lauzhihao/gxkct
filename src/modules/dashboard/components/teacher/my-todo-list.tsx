import { Clock, FilePlus2, Undo2 } from "lucide-react"
import { TEACHER_TODO_LABELS } from "@/modules/dashboard/labels"
import type { TeacherTodo, TeacherTodoKind } from "@/modules/dashboard/types"
import { cn } from "@/shared/utils/utils"

const TODO_ICON = {
  missingMaterial: FilePlus2,
  dueSoon: Clock,
  returned: Undo2,
} as const

const TODO_TONE: Record<TeacherTodoKind, string> = {
  missingMaterial: "text-primary",
  dueSoon: "text-warning",
  returned: "text-destructive",
}

interface MyTodoListProps {
  todos: TeacherTodo[]
}

/** 我的待办：待补材料、临期任务、被退回修改，逐条列出 */
export function MyTodoList({ todos }: MyTodoListProps) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {todos.map((todo) => {
        const Icon = TODO_ICON[todo.kind]
        return (
          <li key={todo.id} className="flex items-start gap-3 py-2.5">
            <Icon className={cn("mt-0.5 size-4 shrink-0", TODO_TONE[todo.kind])} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                <span className="mr-2 text-xs text-muted-foreground">{TEACHER_TODO_LABELS[todo.kind]}</span>
                《{todo.courseName}》{todo.detail}
              </p>
            </div>
            {todo.deadline !== null ? (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">截止 {todo.deadline}</span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
