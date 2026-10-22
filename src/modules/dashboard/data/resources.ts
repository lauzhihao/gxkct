import type { ResourceFolderDto } from "@/modules/dashboard/data/dashboard-api"
import type { ResourceCategory } from "@/modules/dashboard/types"

/**
 * 课程资源按一级目录归类。目录接口只返回显示名称，这里按系统预置目录模板
 * （course_resource_folder_template）的默认名称匹配；被改名或自建的目录归入"其他"。
 */

export const SYLLABUS_FOLDER = "课程教学大纲"
export const LESSON_PLAN_FOLDER = "教案"
export const COURSEWARE_FOLDER = "课件"

const FOLDER_CATEGORY = new Map<string, ResourceCategory>([
  ["人才培养方案", "document"],
  [SYLLABUS_FOLDER, "document"],
  ["开课说明", "document"],
  ["学情分析报告", "document"],
  [COURSEWARE_FOLDER, "document"],
  [LESSON_PLAN_FOLDER, "document"],
  ["案例", "document"],
  ["作业", "document"],
  ["预习手册", "document"],
  ["视频", "video"],
  ["习题库", "questionBank"],
  ["工具箱", "other"],
  ["其他", "other"],
])

/** 上传时间为 ISO 带时区格式（同一服务器时区），取日期部分展示 */
const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/

export interface CourseResourceSummary {
  hasSyllabus: boolean
  hasLessonPlan: boolean
  hasCourseware: boolean
  /** 各一级目录下的对象数之和（含子目录）；一级目录外的散放文件各计 1 */
  resourceCount: number
  byCategory: Record<ResourceCategory, number>
  /** 最近一次上传日期（YYYY-MM-DD）；从未上传为 null */
  latestUploadDate: string | null
}

function entryCount(entry: ResourceFolderDto): number {
  if (entry.type !== "folder") return 1
  if (entry.filesCount === null) {
    throw new Error(`Resource folder ${entry.name} has no filesCount`)
  }
  return entry.filesCount
}

function entryCategory(entry: ResourceFolderDto): ResourceCategory {
  if (entry.type !== "folder") return "other"
  const category = FOLDER_CATEGORY.get(entry.name)
  return category === undefined ? "other" : category
}

function toDate(timestamp: string): string {
  const match = ISO_DATE_PREFIX.exec(timestamp)
  if (match === null) {
    throw new Error(`Unexpected upload time format: ${timestamp}`)
  }
  return match[0]
}

export type FolderCountSummary = Omit<CourseResourceSummary, "latestUploadDate">

/**
 * 按汇总接口给出的"有文件的一级目录 -> 对象数"归类，口径与 summarizeCourseResources 相同
 * （汇总接口与资源目录分区取的是同一批一级目录，空目录不在其中）。
 */
export function summarizeFolderFileCounts(counts: ReadonlyMap<string, number>): FolderCountSummary {
  const byCategory: Record<ResourceCategory, number> = { document: 0, video: 0, questionBank: 0, other: 0 }
  counts.forEach((count, name) => {
    const category = FOLDER_CATEGORY.get(name)
    byCategory[category === undefined ? "other" : category] += count
  })

  const hasFiles = (folderName: string) => {
    const count = counts.get(folderName)
    return count !== undefined && count > 0
  }

  return {
    hasSyllabus: hasFiles(SYLLABUS_FOLDER),
    hasLessonPlan: hasFiles(LESSON_PLAN_FOLDER),
    hasCourseware: hasFiles(COURSEWARE_FOLDER),
    resourceCount: byCategory.document + byCategory.video + byCategory.questionBank + byCategory.other,
    byCategory,
  }
}

export function summarizeCourseResources(entries: ResourceFolderDto[]): CourseResourceSummary {
  const byCategory: Record<ResourceCategory, number> = { document: 0, video: 0, questionBank: 0, other: 0 }
  const folderCounts = new Map<string, number>()
  let latestTimestamp: string | null = null

  for (const entry of entries) {
    const count = entryCount(entry)
    byCategory[entryCategory(entry)] += count
    if (entry.type === "folder") folderCounts.set(entry.name, count)
    if (entry.latestUploadedAt !== null && (latestTimestamp === null || entry.latestUploadedAt > latestTimestamp)) {
      latestTimestamp = entry.latestUploadedAt
    }
  }

  const hasFiles = (folderName: string) => {
    const count = folderCounts.get(folderName)
    return count !== undefined && count > 0
  }

  return {
    hasSyllabus: hasFiles(SYLLABUS_FOLDER),
    hasLessonPlan: hasFiles(LESSON_PLAN_FOLDER),
    hasCourseware: hasFiles(COURSEWARE_FOLDER),
    resourceCount: byCategory.document + byCategory.video + byCategory.questionBank + byCategory.other,
    byCategory,
    latestUploadDate: latestTimestamp === null ? null : toDate(latestTimestamp),
  }
}
