import type { CoursePoint as ApiCoursePoint } from "@/lib/api/course-points-api"

export const buildMatrixDisplayKey = (projectId: string | number, graduateRequireId: string | number) =>
  `${projectId}-${graduateRequireId}`

export const buildSelectionDialogKey = (projectId: string | number, graduateRequireId: string | number) =>
  buildMatrixDisplayKey(projectId, graduateRequireId)

export const createCoursePointMap = (coursePoints: ApiCoursePoint[]) => {
  const map = new Map<string, { title: string; description: string }>()

  coursePoints.forEach((cp) => {
    const id = String(cp.id)
    map.set(id, {
      title: cp.title,
      description: cp.description || "",
    })
  })

  return map
}

export const sortCoursePointsByTitle = (coursePoints: ApiCoursePoint[]) => {
  const sorted = [...coursePoints]

  sorted.sort((a, b) => {
    const aLength = a.title?.length ?? 0
    const bLength = b.title?.length ?? 0

    if (aLength !== bLength) {
      return aLength - bLength
    }

    return (a.title || "").localeCompare(b.title || "")
  })

  return sorted
}

export const matchesCoursePointKeyword = (coursePoint: ApiCoursePoint, keyword: string) => {
  const normalized = keyword.toLowerCase()
  if (!normalized) {
    return true
  }

  const title = coursePoint.title?.toLowerCase() || ""
  const description = coursePoint.description?.toLowerCase() || ""

  return title.includes(normalized) || description.includes(normalized)
}
