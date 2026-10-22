import type { CourseMatrixData, ObjectiveCardData } from "@/components/canvas-elements/types"

export interface CourseMatrixObjectiveReferenceIssue {
  objectiveId: string
  chapterId?: string
  chapterIndex?: number
  chapterName?: string
  coursePointCount: number
  source: "column" | "support"
}

/** Report stale stable-ID references without changing the matrix or its supports. */
export function getCourseMatrixObjectiveReferenceIssues(
  objectives: ReadonlyArray<Pick<ObjectiveCardData, "id">>,
  matrix: CourseMatrixData | undefined,
): CourseMatrixObjectiveReferenceIssue[] {
  if (matrix === undefined) {
    return []
  }

  const objectiveIds = new Set(objectives.map((objective) => objective.id))
  const issues: CourseMatrixObjectiveReferenceIssue[] = []

  for (const objective of matrix.objectives) {
    if (!objectiveIds.has(objective.id)) {
      issues.push({ objectiveId: objective.id, coursePointCount: 0, source: "column" })
    }
  }

  for (const row of matrix.rows) {
    for (const support of row.supports) {
      if (!objectiveIds.has(support.objective_id)) {
        issues.push({
          objectiveId: support.objective_id,
          chapterId: row.chapter_id,
          chapterIndex: row.chapter_index,
          chapterName: row.chapter_name,
          coursePointCount: support.course_points.length,
          source: "support",
        })
      }
    }
  }

  return issues
}
