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

    return selectedSemesterId !== currentSemesterId
  }, [currentSemesterId, selectedSemesterId])
}
