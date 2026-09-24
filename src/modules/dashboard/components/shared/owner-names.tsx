interface OwnerNamesProps {
  names: string[]
}

/** 负责人：多人用顿号连接；一个都没有时标红"未设置" */
export function OwnerNames({ names }: OwnerNamesProps) {
  if (names.length === 0) {
    return <span className="text-destructive">未设置</span>
  }
  return <span>{names.join("、")}</span>
}
