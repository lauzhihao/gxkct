import { fetchCourseDetails, type CourseDetailDto, type CourseDetailSection } from "@/modules/dashboard/data/dashboard-api"

/** 多门课程的明细（一次请求），按课程 ID 建索引；没有课程时不发请求 */
export async function loadCourseDetails(
  collegeId: number,
  semesterId: number | null,
  courseIds: readonly string[],
  sections: readonly CourseDetailSection[],
): Promise<Map<string, CourseDetailDto>> {
  if (courseIds.length === 0) return new Map()
  const details = await fetchCourseDetails(collegeId, semesterId, courseIds, sections)
  return new Map(details.map((detail) => [detail.courseId, detail]))
}

export function requireCourseDetail(detailsByCourseId: ReadonlyMap<string, CourseDetailDto>, courseId: string): CourseDetailDto {
  const detail = detailsByCourseId.get(courseId)
  if (detail === undefined) {
    // 明细接口与组织树走同一次可见范围计算，缺课程说明两边口径不一致
    throw new Error(`Course ${courseId} missing from course details`)
  }
  return detail
}

/** 取请求过的明细部分；为 null 说明请求时没带这个 section */
export function requireSection<T>(value: T | null, section: CourseDetailSection, courseId: string): T {
  if (value === null) {
    throw new Error(`Course ${courseId} detail has no ${section} section`)
  }
  return value
}
