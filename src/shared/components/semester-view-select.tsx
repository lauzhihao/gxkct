"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { useSemesterStore } from "@/shared/stores/semester-store"

interface SemesterViewSelectProps {
  className?: string
  disabled?: boolean
}

export function SemesterViewSelect({ className, disabled = false }: SemesterViewSelectProps) {
  const semesterList = useSemesterStore((state) => state.semesterList)
  const selectedSemesterId = useSemesterStore((state) => state.selectedSemesterId)
  const setSelectedSemesterId = useSemesterStore((state) => state.setSelectedSemesterId)

  if (semesterList.length === 0 || selectedSemesterId === null) {
    return (
      <div className={className}>
        <Select disabled value="no-semester">
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="暂无学期" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no-semester">暂无学期</SelectItem>
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className={className}>
      <Select
        disabled={disabled}
        value={String(selectedSemesterId)}
        onValueChange={(value) => {
          const parsedValue = Number.parseInt(value, 10)
          if (!Number.isFinite(parsedValue)) {
            return
          }

          setSelectedSemesterId(parsedValue)
        }}
      >
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {semesterList.map((semester) => (
            <SelectItem key={semester.id} value={String(semester.id)}>
              {semester.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
