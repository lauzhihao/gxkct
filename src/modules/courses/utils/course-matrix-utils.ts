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

export const extractCoursePointSequence = (title: string | undefined): number | null => {
  if (typeof title !== "string") {
    return null
  }

  const matchedDigits = title.match(/(\d+)/)
  if (!matchedDigits || matchedDigits[1] === undefined) {
    return null
  }

  const parsedValue = Number.parseInt(matchedDigits[1], 10)
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null
  }

  return parsedValue
}

export const buildCoursePointTitle = (sequence: number) => `课点${sequence}`

export const getNextCoursePointSequence = (coursePoints: ApiCoursePoint[]) => {
  const maxSequence = coursePoints.reduce((currentMax, coursePoint) => {
    const sequence = extractCoursePointSequence(coursePoint.title)
    if (sequence === null) {
      return currentMax
    }

    return Math.max(currentMax, sequence)
  }, 0)

  return maxSequence + 1
}

export const sortCoursePointsByTitle = (coursePoints: ApiCoursePoint[]) => {
  const sorted = [...coursePoints]

  sorted.sort((a, b) => {
    const aSequence = extractCoursePointSequence(a.title)
    const bSequence = extractCoursePointSequence(b.title)

    if (aSequence !== null && bSequence !== null && aSequence !== bSequence) {
      return aSequence - bSequence
    }

    if (aSequence !== null && bSequence === null) {
      return -1
    }

    if (aSequence === null && bSequence !== null) {
      return 1
    }

    return (a.title || "").localeCompare(b.title || "", "zh-CN-u-kn-true")
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
