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

// 课点序号是标题里的第一个正整数。课点10 排在课点2 后面，没有数字的标题排在后面。
export const compareCoursePointTitles = (left: string | undefined, right: string | undefined): number => {
  const leftSequence = extractCoursePointSequence(left)
  const rightSequence = extractCoursePointSequence(right)

  if (leftSequence !== null && rightSequence !== null && leftSequence !== rightSequence) {
    return leftSequence - rightSequence
  }

  if (leftSequence !== null && rightSequence === null) {
    return -1
  }

  if (leftSequence === null && rightSequence !== null) {
    return 1
  }

  return (left || "").localeCompare(right || "", "zh-CN-u-kn-true")
}

export const sortByCoursePointTitle = <T>(items: readonly T[], titleOf: (item: T) => string | undefined): T[] => {
  const sorted = [...items]
  sorted.sort((left, right) => compareCoursePointTitles(titleOf(left), titleOf(right)))
  return sorted
}

export const sortCoursePointsByTitle = (coursePoints: ApiCoursePoint[]) => {
  return sortByCoursePointTitle(coursePoints, (coursePoint) => coursePoint.title)
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
