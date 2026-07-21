/**
 * 课程缓存工具
 * 用于在 sessionStorage 中维护课程基本信息缓存
 * 每次进入专业详情页时用最新接口数据更新缓存
 * 退出登录时会清空缓存
 */

// 课程缓存项的数据结构
export interface CourseCacheItem {
  courseId: string
  courseName: string
  majorName: string
  instructors: string[]
}

// sessionStorage 缓存键
const COURSE_CACHE_KEY = "education-course-cache"

/**
 * 获取所有课程缓存
 */
export function getAllCourseCache(): Record<string, CourseCacheItem> {
  if (typeof window === "undefined") return {}
  try {
    const cached = sessionStorage.getItem(COURSE_CACHE_KEY)
    return cached ? JSON.parse(cached) : {}
  } catch {
    return {}
  }
}

/**
 * 根据课程ID获取缓存的课程信息
 */
export function getCourseCache(courseId: string): CourseCacheItem | null {
  const cache = getAllCourseCache()
  return cache[courseId] || null
}

/**
 * 设置单个课程缓存
 */
export function setCourseCache(item: CourseCacheItem): void {
  if (typeof window === "undefined") return
  try {
    const cache = getAllCourseCache()
    cache[item.courseId] = item
    sessionStorage.setItem(COURSE_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error("[CourseCache] 写入缓存失败:", error)
  }
}

/**
 * 批量设置课程缓存
 */
export function setCourseCacheBatch(items: CourseCacheItem[]): void {
  if (typeof window === "undefined") return
  try {
    const cache = getAllCourseCache()
    items.forEach((item) => {
      cache[item.courseId] = item
    })
    sessionStorage.setItem(COURSE_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error("[CourseCache] 批量写入缓存失败:", error)
  }
}

/**
 * 删除单个课程缓存
 */
export function removeCourseCache(courseId: string): void {
  if (typeof window === "undefined") return
  try {
    const cache = getAllCourseCache()
    delete cache[courseId]
    sessionStorage.setItem(COURSE_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error("[CourseCache] 删除缓存失败:", error)
  }
}

/**
 * 清空所有课程缓存
 */
export function clearCourseCache(): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(COURSE_CACHE_KEY)
  } catch (error) {
    console.error("[CourseCache] 清空缓存失败:", error)
  }
}
