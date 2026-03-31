import { useMemo } from "react"
import { useSemesterStore } from "@/shared/stores/semester-store"

export function useSemesterReadonly(): boolean {
  const currentSemesterId = useSemesterStore((state) => state.currentSemesterId)
  const selectedSemesterId = useSemesterStore((state) => state.selectedSemesterId)

  return useMemo(() => {
    if (selectedSemesterId === null) {
      return false
    }

    if (currentSemesterId === null) {
      return false
    }

    // [MOD] 使用 Number 强制转换进行对比，解决 String/Number 不匹配导致的只读判定错误
    return Number(selectedSemesterId) !== Number(currentSemesterId)
  }, [currentSemesterId, selectedSemesterId])
}
