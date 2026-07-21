/**
 * 课程数据转换为画布数据的工具模块
 * 将 CombinedCourseDetail 数据转换为画布可用的 { elements, edges } 格式
 */

import type { CombinedCourseDetail } from "@/lib/api/course-detail-api"
import type { CourseMatrixItem } from "@/lib/api/matrix-api"
import {
  CanvasComponentType,
  type CanvasElementData,
  type CanvasEdgeData,
  type CanvasComponentData,
  type CourseInfoData,
  type ObjectiveCardData,
  type ChapterCardData,
  type CoursePointCardData,
  type KsaItemData,
  type ElementPosition,
  type CourseMatrixData,
  type CourseMatrixRow,
  type CourseMatrixCoursePoint,
  type ProjectMatrixData,
  type ProjectMatrixTaskObjective,
  type ProjectMatrixRow,
  type ProjectMatrixObjectiveSupport,
  type ProjectMatrixKsaItem,
  type GraduationSupportData,
  type CourseReportCardData,
  type ObjectiveSupportLabel,
} from "@/components/canvas-elements/types"
import { generateEdgeId } from "@/components/flow/utils/layout"
import { CANVAS_LAYOUT_POSITION_CONFIG } from "@/components/flow/utils/canvas-layout"
import { getCourseType, getCourseNature } from "@/shared/utils/data-transform"
import { getKsaReferenceId } from "@/shared/utils/ksa"

// ============ 布局常量 ============

// 各列起始 X 坐标（与画布布局配置保持一致）
const COLUMN_X_POSITIONS = [...CANVAS_LAYOUT_POSITION_CONFIG.horizontal.columnAxis]

// 起始 Y 坐标
const START_Y = CANVAS_LAYOUT_POSITION_CONFIG.horizontal.startY

// 行间距
const ROW_GAP = 40

// Panel 内边距
const PANEL_PADDING = { top: 75, left: 20, right: 20, bottom: 10 }

// 卡片间距
const CARD_GAP_X = 15
const CARD_GAP_Y = 10

// 元素尺寸配置
const ELEMENT_SIZES: Record<CanvasComponentType, { width: number; height: number }> = {
  [CanvasComponentType.SOURCE_DOCUMENT_PANEL]: { width: 320, height: 200 },
  [CanvasComponentType.SOURCE_DOCUMENT_CARD]: { width: 280, height: 100 },
  [CanvasComponentType.COURSE_INFO]: { width: 480, height: 300 },
  [CanvasComponentType.GRADUATION_SUPPORT]: { width: 320, height: 200 },
  [CanvasComponentType.OBJECTIVE_PANEL]: { width: 320, height: 200 },
  [CanvasComponentType.OBJECTIVE_CARD]: { width: 280, height: 156 },
  [CanvasComponentType.COURSE_POINT_PANEL]: { width: 320, height: 210 },
  [CanvasComponentType.COURSE_POINT_CARD]: { width: 280, height: 140 },
  [CanvasComponentType.CHAPTER_PANEL]: { width: 320, height: 200 },
  [CanvasComponentType.CHAPTER_CARD]: { width: 280, height: 156 },
  [CanvasComponentType.KSA_PANEL]: { width: 320, height: 200 },
  [CanvasComponentType.KSA_ITEM]: { width: 260, height: 110 },
  [CanvasComponentType.COURSE_MATRIX]: { width: 1100, height: 680 },
  [CanvasComponentType.PROJECT_MATRIX_PANEL]: { width: 900, height: 200 },
  [CanvasComponentType.PROJECT_MATRIX]: { width: 900, height: 200 },
  [CanvasComponentType.COURSE_REPORT]: { width: 480, height: 180 },
}

function dedupeCourseMatrixCoursePoints(
  coursePoints: CourseMatrixCoursePoint[]
): CourseMatrixCoursePoint[] {
  const pointMap = new Map<string, CourseMatrixCoursePoint>()

  coursePoints.forEach((coursePoint, index) => {
    const normalizedId = coursePoint.id.trim()
    const fallbackKey = normalizedId || `__index_${index}`
    const existing = pointMap.get(fallbackKey)

    if (!existing) {
      pointMap.set(fallbackKey, coursePoint)
      return
    }

    pointMap.set(fallbackKey, {
      ...existing,
      ...coursePoint,
      id: normalizedId || existing.id,
      level: existing.level === "strong" || coursePoint.level === "strong" ? "strong" : "weak",
      description: existing.description || coursePoint.description,
      originalMatrixId: existing.originalMatrixId || coursePoint.originalMatrixId,
    })
  })

  return Array.from(pointMap.values())
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function resolveCoursePeriodValue(
  course: Record<string, unknown>,
  chapters: unknown[],
  period: "theory" | "practice"
): number {
  const directKeys =
    period === "theory"
      ? ["theoryPeriod", "theory_period"]
      : ["practicePeriod", "practice_period"]
  const chapterKeys =
    period === "theory"
      ? ["theoryPeriod", "theoryHours", "theory_period", "theory_hours"]
      : ["practicePeriod", "practiceHours", "practice_period", "practice_hours"]

  const directValues = directKeys.map((key) => {
    const rawValue = course[key]
    if (rawValue === undefined || rawValue === null) {
      return null
    }

    const value = readFiniteNumber(rawValue)
    if (value === null || value < 0) {
      throw new Error(`课程${period === "theory" ? "理论" : "实践"}学时无效`)
    }
    return value
  }).filter((value): value is number => value !== null)
  const positiveDirectValues = directValues.filter((value) => value > 0)
  if (positiveDirectValues.length > 0) {
    return Math.max(...positiveDirectValues)
  }

  let hasValidChapterPeriod = false
  const chapterTotal = chapters.reduce<number>((total, chapter) => {
    if (chapter === null || typeof chapter !== "object" || Array.isArray(chapter)) {
      throw new Error("课程章节数据无效")
    }
    const chapterRecord = chapter as Record<string, unknown>
    const chapterValues = chapterKeys.map((key) => {
      const rawValue = chapterRecord[key]
      if (rawValue === undefined || rawValue === null) {
        return null
      }

      const value = readFiniteNumber(rawValue)
      if (value === null || value < 0) {
        throw new Error(`课程章节${period === "theory" ? "理论" : "实践"}学时无效`)
      }
      return value
    }).filter((value): value is number => value !== null)

    if (chapterValues.length === 0) {
      throw new Error(`课程章节${period === "theory" ? "理论" : "实践"}学时缺失`)
    }
    hasValidChapterPeriod = true

    const positiveValue = chapterValues.find((value) => value > 0)
    if (positiveValue === undefined) {
      return total
    }
    return total + positiveValue
  }, 0)
  if (chapterTotal > 0) {
    return chapterTotal
  }

  if (directValues.length > 0) {
    return directValues[0]
  }
  if (hasValidChapterPeriod) {
    return 0
  }
  throw new Error(`课程${period === "theory" ? "理论" : "实践"}学时缺失`)
}

// Panel 网格布局列数配置
const PANEL_GRID_COLUMNS: Partial<Record<CanvasComponentType, number>> = {
  [CanvasComponentType.OBJECTIVE_PANEL]: 3,
  [CanvasComponentType.COURSE_POINT_PANEL]: 5,
  [CanvasComponentType.CHAPTER_PANEL]: 3,
  [CanvasComponentType.KSA_PANEL]: 5,
}

const PANEL_BOTTOM_EXTRA: Partial<Record<CanvasComponentType, number>> = {
  [CanvasComponentType.OBJECTIVE_PANEL]: 24,
  [CanvasComponentType.CHAPTER_PANEL]: 24,
}

// ============ 面板ID常量 ============
const PANEL_IDS = {
  COURSE_INFO: "course_info_loaded",
  GRADUATION_SUPPORT: "graduation_support_loaded",
  OBJECTIVE_PANEL: "objective_panel_loaded",
  CHAPTER_PANEL: "chapter_panel_loaded",
  COURSE_POINT_PANEL: "course_point_panel_loaded",
  KSA_PANEL: "ksa_panel_loaded",
  COURSE_MATRIX: "course_matrix_loaded",
} as const

// ============ 元素边类型常量 ============
const EDGE_TYPES = {
  SUPPORT: "support",
} as const

// ============ 坐标常量 ============
const COORDINATE_OFFSETS = {
  COURSE_INFO_Y: 560, // 课程信息元素的 Y 坐标
} as const

// ============ KSA 类别常量 ============
const KSA_CATEGORIES = {
  KNOWLEDGE: "K" as const,
  SKILL: "S" as const,
  ATTITUDE: "A" as const,
} as const

const KSA_CATEGORY_ORDER: Record<string, number> = {
  K: 0,
  S: 1,
  A: 2,
} as const

// ============ 默认尺寸常量 ============
const DEFAULT_SIZES = {
  PANEL_HEIGHT: 200,
  COURSE_POINT_PANEL_HEIGHT: 210,
} as const

// ============ 画布数据结构 ============

/**
 * 转换后的画布数据结构
 */
export interface CanvasData {
  elements: CanvasElementData[]
  edges: CanvasEdgeData[]
  specialComponents?: Record<string, { type: CanvasComponentType; data: CanvasComponentData }>
}

// ============ 辅助函数 ============

/**
 * 计算网格中卡片的相对位置
 * @param index 卡片索引（从0开始）
 * @param columns 列数
 * @param cardSize 卡片尺寸
 * @returns 相对于 Panel 的位置
 */
function calculateCardPosition(
  index: number,
  columns: number,
  cardSize: { width: number; height: number }
): ElementPosition {
  const col = index % columns
  const row = Math.floor(index / columns)
  return {
    x: PANEL_PADDING.left + col * (cardSize.width + CARD_GAP_X),
    y: PANEL_PADDING.top + row * (cardSize.height + CARD_GAP_Y),
  }
}

/**
 * 根据子节点数量计算 Panel 尺寸
 * @param childCount 子节点数量
 * @param columns 列数
 * @param cardSize 卡片尺寸
 * @returns Panel 尺寸
 */
function calculatePanelSize(
  childCount: number,
  columns: number,
  cardSize: { width: number; height: number },
  panelType?: CanvasComponentType
): { width: number; height: number } {
  const rows = Math.max(1, Math.ceil(childCount / columns))
  const actualColumns = Math.min(childCount || 1, columns)

  const width =
    PANEL_PADDING.left +
    actualColumns * cardSize.width +
    (actualColumns - 1) * CARD_GAP_X +
    PANEL_PADDING.right
  const bottomPadding = PANEL_PADDING.bottom + (panelType ? (PANEL_BOTTOM_EXTRA[panelType] || 0) : 0)
  const height =
    PANEL_PADDING.top +
    rows * cardSize.height +
    (rows - 1) * CARD_GAP_Y +
    bottomPadding

  return {
    width: Math.max(width, 320),
    height: Math.max(height, 200),
  }
}

function getPanelColumns(panelType: CanvasComponentType): number {
  return PANEL_GRID_COLUMNS[panelType] || 3
}

function createPanelElement(
  id: string,
  type: CanvasComponentType,
  position: ElementPosition,
  size: { width: number; height: number },
  data?: CanvasComponentData
): CanvasElementData {
  return {
    id,
    type,
    position,
    size,
    selected: false,
    data: data ?? { id },
  }
}

function createSupportEdge(source: string, target: string): CanvasEdgeData {
  return {
    id: generateEdgeId(source, target),
    source,
    target,
    type: EDGE_TYPES.SUPPORT,
  }
}

function createPanelChildElement(
  id: string,
  type: CanvasComponentType,
  panelType: CanvasComponentType,
  index: number,
  panelId: string,
  data: CanvasComponentData
): CanvasElementData {
  const panelColumns = getPanelColumns(panelType)
  const cardSize = ELEMENT_SIZES[type]

  return {
    id,
    type,
    position: calculateCardPosition(index, panelColumns, cardSize),
    size: cardSize,
    selected: false,
    data,
    parentId: panelId,
    extent: "parent",
  }
}

function createAutoSizedPanelElement(
  id: string,
  panelType: CanvasComponentType,
  cardType: CanvasComponentType,
  childCount: number,
  position: ElementPosition,
  data?: CanvasComponentData
): CanvasElementData {
  const panelColumns = getPanelColumns(panelType)
  const cardSize = ELEMENT_SIZES[cardType]
  const panelSize = calculatePanelSize(childCount, panelColumns, cardSize, panelType)

  return createPanelElement(id, panelType, position, panelSize, data)
}

// ============ 课程目标数据类型 ============

/**
 * 课程目标数据结构（指标点 + 教学目标）
 * courseGoals 是指标点数组，其中 children 是真正的教学目标
 */
interface CourseGoalWithChildren {
  id?: number
  description?: string
  content?: string
  children?: Array<{ id?: number; description?: string; content?: string }> | null
}

// ============ 主转换函数 ============

/**
 * 将课程详情数据转换为画布数据（仅Panel，不含子卡片）
 * @param courseDetail 课程详情数据
 * @param courseGoals 课程目标数据（指标点数组，其中 children 是真正的教学目标）
 * @returns 画布数据结构
 */
export function convertCourseToCanvas(
  courseDetail: CombinedCourseDetail,
  courseGoals?: CourseGoalWithChildren[]
): CanvasData {
  const elements: CanvasElementData[] = []
  const edges: CanvasEdgeData[] = []

  const course = courseDetail.courseDetailData.course
  const pointksa = courseDetail.courseDetailData.pointksa

  // 1. 生成 course_info 元素
  const courseInfoElement = createCourseInfoElement(courseDetail, courseGoals)
  elements.push(courseInfoElement)

  // 2. 生成 graduation_support 面板和 objective_panel 元素
  let currentY = START_Y

  // 创建毕业要求支撑面板（位于第1列首位）
  const graduationSupportElement: CanvasElementData = {
    id: PANEL_IDS.GRADUATION_SUPPORT,
    type: CanvasComponentType.GRADUATION_SUPPORT,
    position: { x: COLUMN_X_POSITIONS[1], y: currentY },
    size: ELEMENT_SIZES[CanvasComponentType.GRADUATION_SUPPORT],
    selected: false,
    data: { id: PANEL_IDS.GRADUATION_SUPPORT },
  }
  elements.push(graduationSupportElement)

  // 添加连线：course_info → graduation_support
  edges.push(createSupportEdge(courseInfoElement.id, graduationSupportElement.id))

  currentY = graduationSupportElement.position.y + (graduationSupportElement.size?.height || DEFAULT_SIZES.PANEL_HEIGHT) + ROW_GAP

  // 注意：courseGoals 是指标点数组，children 才是真正的教学目标
  if (courseGoals && courseGoals.length > 0) {
    // 从指标点中提取所有教学目标（children）
    const teachingObjectives = courseGoals.flatMap((goal) => goal.children || [])

    if (teachingObjectives.length > 0) {
      const objectivePanel = createObjectivePanelElement(teachingObjectives, START_Y)
      elements.push(objectivePanel)

      // 添加连线：graduation_support → objective_panel
      edges.push(createSupportEdge(graduationSupportElement.id, objectivePanel.id))
    }
  }

  // 3. 生成 chapter_panel 和 chapter_card 元素
  const chapters = course.courseMatrixVOS || []
  if (chapters.length > 0) {
    const chapterPanel = createChapterPanelElement(chapters, currentY)
    elements.push(chapterPanel)

    // 添加连线：objective_panel → chapter_panel
    const objectivePanel = elements.find(el => el.type === CanvasComponentType.OBJECTIVE_PANEL)
    if (objectivePanel) {
      edges.push(createSupportEdge(objectivePanel.id, chapterPanel.id))
    }

    currentY = chapterPanel.position.y + (chapterPanel.size?.height || 200) + ROW_GAP
  }

  // 4. 生成 course_point_panel 和 course_point_card 元素
  const coursePoints = pointksa.points || []
  if (coursePoints.length > 0) {
    const coursePointPanel = createCoursePointPanelElement(coursePoints, currentY)
    elements.push(coursePointPanel)

    // 添加连线：chapter_panel → course_point_panel
    const chapterPanel = elements.find(el => el.type === CanvasComponentType.CHAPTER_PANEL)
    if (chapterPanel) {
      edges.push(createSupportEdge(chapterPanel.id, coursePointPanel.id))
    }

    currentY = coursePointPanel.position.y + (coursePointPanel.size?.height || 210) + ROW_GAP
  }

  // 5. 生成 ksa_panel 和 ksa_item 元素
  const ksas = pointksa.ksas || []
  if (ksas.length > 0) {
    const ksaPanel = createKsaPanelElement(ksas, START_Y)
    elements.push(ksaPanel)
  }

  return {
    elements,
    edges,
  }
}

// ============ 元素创建函数 ============

/**
 * 创建课程信息元素
 */
function createCourseInfoElement(
  courseDetail: CombinedCourseDetail,
  courseGoals?: CourseGoalWithChildren[]
): CanvasElementData {
  const course = courseDetail.courseDetailData.course
  const courseRecord = course as Record<string, unknown>
  const courseNameData = courseDetail.courseNameData
  const pointksa = courseDetail.courseDetailData.pointksa
  const teachingObjectives = (courseGoals || []).flatMap((goal) => goal.children || [])
  const chapters = Array.isArray(course.courseMatrixVOS) ? course.courseMatrixVOS : []
  const coursePoints = Array.isArray(pointksa?.points) ? pointksa.points : []
  const theoryPeriod = resolveCoursePeriodValue(courseRecord, chapters, "theory")
  const practicePeriod = resolveCoursePeriodValue(courseRecord, chapters, "practice")

  const courseInfoData: CourseInfoData = {
    name: courseNameData.name,
    metadata: {
      introduction: course.introduction || undefined,
      theoryPeriod,
      practicePeriod,
      courseId: course.id,
      majorId: course.majorId,
      // 课程类型（必修/选修）和课程性质
      courseType: getCourseType(course.classId),
      courseNatureId: course.typeId,
      courseNatureName: getCourseNature(course.typeId),
      // [MOD] 改为开课学期字段（由表单自动获取当前学期）
      openingSemesterId: (course as any).openingSemesterId,
      openingSemesterDisplay: (course as any).openingSemesterDisplay,
      // 扩展字段
      teachingClass: course.teachingClass,
      teachingLocation: course.teachingLocation,
      teachingTime: course.teachingTime,
      studentCount: course.studentCount,
      credits: course.credits,
      mainTextbook: course.mainTextbook,
      referenceResources: course.referenceResources,
      attendancePolicy: course.attendancePolicy,
      assignmentPolicy: course.assignmentPolicy,
      conductRequirements: course.conductRequirements,
      practiceRequirements: course.practiceRequirements,
      teamworkRequirements: course.teamworkRequirements,
      bonusRequirements: course.bonusRequirements,
      otherSuggestions: course.otherSuggestions,
      assessmentMethod: course.assessmentMethod,
      assessmentForm: course.assessmentForm,
      scoreType: course.scoreType,
      scoreTable: course.scoreTable,
      assessmentDescription: course.assessmentDescription,
      teachingObjectives: teachingObjectives.map((objective, index) => ({
        id: String(objective.id ?? `objective_${index + 1}`),
        content: objective.description || objective.content || "",
      })),
      coursePoints: coursePoints.map((point, index) => ({
        id: String(point.id ?? `course_point_${index + 1}`),
        content: point.title || point.name || point.description || "",
      })),
      chapters: chapters.map((chapter, index) => ({
        id: String(chapter.id ?? index + 1),
        name: chapter.name || chapter.title || "",
        theoryHours: Number(chapter.theoryPeriod ?? chapter.theoryHours ?? 0),
        practiceHours: Number(chapter.practicePeriod ?? chapter.practiceHours ?? 0),
      })),
    },
  }

  return {
    id: PANEL_IDS.COURSE_INFO,
    type: CanvasComponentType.COURSE_INFO,
    position: {
      x: COLUMN_X_POSITIONS[0],
      y: COORDINATE_OFFSETS.COURSE_INFO_Y,
    },
    size: ELEMENT_SIZES[CanvasComponentType.COURSE_INFO],
    selected: false,
    data: courseInfoData,
  }
}

/**
 * 创建教学目标面板和卡片元素
 */
function createObjectivePanelElement(
  goals: Array<{ id?: number; description?: string; content?: string }>,
  startY: number
): CanvasElementData {
  const panelId = PANEL_IDS.OBJECTIVE_PANEL

  const panelElement = createAutoSizedPanelElement(
    panelId,
    CanvasComponentType.OBJECTIVE_PANEL,
    CanvasComponentType.OBJECTIVE_CARD,
    goals.length,
    {
      x: COLUMN_X_POSITIONS[2],
      y: startY,
    },
    { id: panelId }
  )

  // 返回 Panel 元素（子卡片需要在外部单独添加）
  return panelElement
}

/**
 * 创建章节面板和卡片元素
 */
function createChapterPanelElement(
  chapters: Array<{
    id?: number
    name?: string
    chapterName?: string
    theoryHours?: number
    practiceHours?: number
  }>,
  startY: number
): CanvasElementData {
  const panelId = PANEL_IDS.CHAPTER_PANEL
  const panelElement = createAutoSizedPanelElement(
    panelId,
    CanvasComponentType.CHAPTER_PANEL,
    CanvasComponentType.CHAPTER_CARD,
    chapters.length,
    {
      x: COLUMN_X_POSITIONS[1],
      y: startY,
    },
    { id: panelId }
  )

  return panelElement
}

/**
 * 创建课点面板和卡片元素
 */
function createCoursePointPanelElement(
  points: Array<{ id?: number; name?: string; title?: string; description?: string }>,
  startY: number
): CanvasElementData {
  const panelId = PANEL_IDS.COURSE_POINT_PANEL
  const panelElement = createAutoSizedPanelElement(
    panelId,
    CanvasComponentType.COURSE_POINT_PANEL,
    CanvasComponentType.COURSE_POINT_CARD,
    points.length,
    {
      x: COLUMN_X_POSITIONS[1],
      y: startY,
    },
    { id: panelId }
  )

  return panelElement
}

/**
 * 创建 KSA 面板和条目元素
 */
function createKsaPanelElement(
  ksas: Array<{ id?: number; title?: string; type?: string; category?: string; content?: string; description?: string }>,
  startY: number
): CanvasElementData {
  const panelId = PANEL_IDS.KSA_PANEL
  const panelElement = createAutoSizedPanelElement(
    panelId,
    CanvasComponentType.KSA_PANEL,
    CanvasComponentType.KSA_ITEM,
    ksas.length,
    {
      x: COLUMN_X_POSITIONS[4],
      y: startY,
    },
    { id: panelId }
  )

  return panelElement
}

// ============ 子卡片创建辅助函数 ============

/**
 * 创建教学目标卡片元素
 */
export function createObjectiveCard(
  goal: { id?: number; description?: string; content?: string },
  index: number,
  panelId: string
): CanvasElementData {
  const cardId = `objective_${index + 1}`

  const cardData: ObjectiveCardData = {
    id: cardId,
    index: index + 1,
    content: goal.description || goal.content || "",
  }

  return {
    ...createPanelChildElement(
      cardId,
      CanvasComponentType.OBJECTIVE_CARD,
      CanvasComponentType.OBJECTIVE_PANEL,
      index,
      panelId,
      cardData
    ),
  }
}

/**
 * 创建章节卡片元素
 */
export function createChapterCard(
  chapter: {
    id?: number
    name?: string
    chapterName?: string
    theoryHours?: number
    practiceHours?: number
    theoryPeriod?: string | number
    practicePeriod?: string | number
  },
  index: number,
  panelId: string
): CanvasElementData {
  const cardId = `chapter_${index + 1}`

  const cardData: ChapterCardData = {
    id: cardId,
    index: index + 1,
    name: chapter.name || chapter.chapterName || "",
    theory_hours: chapter.theoryHours ?? (Number(chapter.theoryPeriod) || 0),
    practice_hours: chapter.practiceHours ?? (Number(chapter.practicePeriod) || 0),
  }

  return {
    ...createPanelChildElement(
      cardId,
      CanvasComponentType.CHAPTER_CARD,
      CanvasComponentType.CHAPTER_PANEL,
      index,
      panelId,
      cardData
    ),
  }
}

/**
 * 创建课点卡片元素
 */
export function createCoursePointCard(
  point: { id?: number; name?: string; title?: string; description?: string },
  index: number,
  panelId: string
): CanvasElementData {
  const cardId = `course_point_${index + 1}`

  const cardData: CoursePointCardData = {
    id: cardId,
    index: index + 1,
    name: point.title || point.name || "",
    description: point.description || (point as { content?: string }).content || "",
  }

  return {
    ...createPanelChildElement(
      cardId,
      CanvasComponentType.COURSE_POINT_CARD,
      CanvasComponentType.COURSE_POINT_PANEL,
      index,
      panelId,
      cardData
    ),
  }
}

/**
 * 创建 KSA 条目元素
 */
export function createKsaItem(
  ksa: { id?: number; title?: string; type?: string; category?: string; content?: string; description?: string },
  index: number,
  panelId: string
): CanvasElementData {
  // 确定类别（优先使用 title 字段，兼容 type 和 category），规范化为大写
  const rawCategory = ksa.title || ksa.type || ksa.category || "K"
  const category = rawCategory.toUpperCase() as "K" | "S" | "A"
  // 确保 category 是有效值，否则默认为 K
  const validCategory = ["K", "S", "A"].includes(category) ? category : "K"
  const cardId = `ksa_${validCategory}_${index + 1}`
  const businessId = getKsaReferenceId({
    id: ksa.id ?? cardId,
    originalId: ksa.id ?? undefined,
  }) || cardId

  const cardData: KsaItemData = {
    id: businessId,
    category: validCategory,
    index: index + 1,
    content: ksa.content || ksa.description || "",
    originalId: ksa.id ?? undefined,
  }

  return {
    ...createPanelChildElement(
      cardId,
      CanvasComponentType.KSA_ITEM,
      CanvasComponentType.KSA_PANEL,
      index,
      panelId,
      cardData
    ),
  }
}

// ============ 矩阵数据转换 ============

/**
 * 项目矩阵 API 运行时数据结构
 * 注意：handleBackendResponse 已解包外层 code/message/data，此处为内层数据
 */
export interface ProjectMatrixApiData {
  courseId?: number
  projects?: Array<{
    project: {
      id: number
      uniqueCode?: string
      courseUnitId?: number
      name: string
      product?: string
      theoryPeriod?: string
      practicePeriod?: string
      indexNo?: number
    }
    goals: Array<{
      id: number
      projectId?: number
      description: string
      product?: string
    }>
  }>
  ksas?: Array<{
    id: number
    majorId?: number
    courseUnitId?: number
    title: string
    description: string
    level: number
  }>
  relates?: Array<{
    name: string
    code: string
    relate: number
  }>
  data?: Array<{
    courseMatrix: {
      id: string | number
      courseUnitId?: string | number
      projectId: string | number
      graduateRequireId?: string | number
      point?: {
        id: string | number
        title: string
        description?: string
      }
      study?: string
      teach?: string
      product?: string
      week?: string
      theoryPeriod?: string
      practicePeriod?: string
      relate?: { relate: number }
    }
    projectMatrices?: Array<{
      id: string | number
      taskGoalId: string | number
      ksa?: {
        id: string | number
        title: string
        level: number
        description?: string
      }
      relate?: { relate: number }
    }>
  }>
}

/**
 * 传入 convertCourseToCanvasComplete 的矩阵数据
 */
export interface MatrixDataForCanvas {
  courseMatrixItems?: CourseMatrixItem[]
  projectMatrixApiData?: ProjectMatrixApiData
  graduationSupportData?: GraduationSupportData
}

/**
 * 将课程矩阵 API 数据转换为画布 CourseMatrixData 格式
 */
function convertCourseMatrixToCanvasData(
  courseMatrixItems: CourseMatrixItem[],
  courseGoals: CourseGoalWithChildren[],
  chapters: Array<{ id?: number; name?: string; chapterName?: string }>,
  courseName: string,
): CourseMatrixData {
  // 从 courseGoals 提取教学目标，建立 graduateRequireId → objective 映射
  const teachingObjectives: Array<{ id?: number; description?: string; content?: string }> = []
  const objectiveIdMap = new Map<number, { id: string; index: number; content: string }>()
  let objectiveIndex = 0

  courseGoals.forEach((goal) => {
    const children = goal.children || []
    children.forEach((child) => {
      objectiveIndex++
      const objInfo = {
        id: `objective_${objectiveIndex}`,
        index: objectiveIndex,
        content: child.description || child.content || "",
      }
      teachingObjectives.push(child)
      // 映射 child ID
      if (child.id) {
        objectiveIdMap.set(child.id, objInfo)
      }
    })
    // 映射 parent indicator ID -> 第一个 child（避免与 child ID 冲突）
    if (goal.id && children.length > 0 && !objectiveIdMap.has(goal.id)) {
      const firstChild = children[0]
      if (firstChild?.id && objectiveIdMap.has(firstChild.id)) {
        objectiveIdMap.set(goal.id, objectiveIdMap.get(firstChild.id)!)
      }
    }
  })

  // 构建 objectives 列
  const objectives = teachingObjectives.map((obj, idx) => ({
    id: `objective_${idx + 1}`,
    index: idx + 1,
    content: obj.description || obj.content || "",
    originalId: obj.id ?? undefined,
  }))

  // 建立章节 ID → 序号映射
  const chapterIdMap = new Map<number, { id: string; index: number; name: string }>()
  chapters.forEach((chapter, idx) => {
    if (chapter.id) {
      chapterIdMap.set(chapter.id, {
        id: `chapter_${idx + 1}`,
        index: idx + 1,
        name: chapter.name || chapter.chapterName || "",
      })
    }
  })

  // 按章节 projectId 分组 CourseMatrixItem
  const chapterGroups = new Map<number, CourseMatrixItem[]>()
  courseMatrixItems.forEach((item) => {
    const group = chapterGroups.get(item.projectId) || []
    group.push(item)
    chapterGroups.set(item.projectId, group)
  })

  // 构建 rows（每行对应一个章节）
  const rows: CourseMatrixRow[] = chapters.map((chapter, idx) => {
    const chapterId = chapter.id || 0
    const canvasChapter = chapterIdMap.get(chapterId) || {
      id: `chapter_${idx + 1}`,
      index: idx + 1,
      name: chapter.name || chapter.chapterName || "",
    }

    const items = chapterGroups.get(chapterId) || []

    // 按教学目标分组课点
    const objectiveGroups = new Map<string, CourseMatrixCoursePoint[]>()
    items.forEach((item) => {
      const objInfo = objectiveIdMap.get(item.graduateRequireId)
      if (objInfo) {
        const points = objectiveGroups.get(objInfo.id) || []
        points.push({
          id: String(item.point.id),
          name: item.point.title,
          level: item.relate.relate === 0 ? "strong" : "weak",
          description: item.point.description,
          originalMatrixId: item.id,
        })
        objectiveGroups.set(objInfo.id, points)
      }
    })

    // 建立反向映射：canvasObjectiveId -> 原始 graduateRequireId
    const canvasIdToGradReqId = new Map<string, number>()
    items.forEach((item) => {
      const objInfo = objectiveIdMap.get(item.graduateRequireId)
      if (objInfo && !canvasIdToGradReqId.has(objInfo.id)) {
        canvasIdToGradReqId.set(objInfo.id, item.graduateRequireId)
      }
    })

    return {
      chapter_id: canvasChapter.id,
      chapter_index: canvasChapter.index,
      chapter_name: canvasChapter.name,
      supports: objectives.map((obj) => ({
        objective_id: obj.id,
        objective_index: obj.index,
        course_points: dedupeCourseMatrixCoursePoints(objectiveGroups.get(obj.id) || []),
        originalGraduateRequireId: canvasIdToGradReqId.get(obj.id),
      })),
    }
  })

  return {
    course_name: courseName,
    objectives,
    rows,
  }
}

// ============ 项目矩阵转换 Helper 函数 ============

/**
 * 项目矩阵数据项的类型别名（用于简化复杂的嵌套类型）
 */
type ProjectDataItem = NonNullable<ProjectMatrixApiData["data"]>[number]

/**
 * 规范化 KSA 分类：确保使用有效的分类 (K/S/A)
 * 如果值不是有效分类，则默认为 K
 */
function normalizeKsaCategory(rawValue: string): "K" | "S" | "A" {
  // 转换为大写后检查是否为有效分类
  const normalized = rawValue.toUpperCase()
  return (["K", "S", "A"].includes(normalized) ? normalized : "K") as "K" | "S" | "A"
}

/**
 * 构建 KSA 查找表
 * 将 KSA 数据转换为 Map，便于后续快速查询
 */
function buildKsaLookupMap(
  ksas: ProjectMatrixApiData["ksas"]
): Map<number, { title: string; description: string; level: number }> {
  const ksaMap = new Map<number, { title: string; description: string; level: number }>()
  if (ksas) {
    ksas.forEach((ksa) => {
      // 为每个 KSA 构建查找项：id -> { title, description, level }
      ksaMap.set(ksa.id, { title: ksa.title, description: ksa.description, level: ksa.level })
    })
  }
  return ksaMap
}

/**
 * 构建章节名称映射
 * 将章节列表转换为 Map，API project.id 映射到章节名称
 */
function buildChapterNameLookupMap(
  chapters: Array<{ id?: number; name?: string; chapterName?: string }>
): Map<number, string> {
  const chapterNameMap = new Map<number, string>()
  chapters.forEach((ch) => {
    if (ch.id) {
      // 优先使用 name，否则使用 chapterName，最后使用空字符串
      chapterNameMap.set(ch.id, ch.name || ch.chapterName || "")
    }
  })
  return chapterNameMap
}

/**
 * 预分组：按项目 ID 将数据行分组
 * 避免后续为每个项目重复遍历全量数据，提高性能
 */
function buildProjectDataLookupMap(
  dataItems: ProjectMatrixApiData["data"]
): Map<string, ProjectDataItem[]> {
  const projectDataMap = new Map<string, ProjectDataItem[]>()
  if (!dataItems) return projectDataMap

  dataItems.forEach((item) => {
    // 提取项目 ID，跳过无效项
    const projectId = item.courseMatrix?.projectId
    if (projectId === undefined || projectId === null) return

    // 按项目 ID 分组，使用字符串作为 Map key
    const key = String(projectId)
    const list = projectDataMap.get(key) || []
    list.push(item)
    projectDataMap.set(key, list)
  })

  return projectDataMap
}

/**
 * 将后端项目矩阵数据逐条转换为画布行。
 * 保留原始 project_matrix 行粒度，避免重复课点被合并后丢失行级映射。
 */
function transformProjectDataItemsToRows(
  projectDataItems: ProjectDataItem[],
  taskObjectives: ProjectMatrixTaskObjective[],
  ksaMap: Map<number, { title: string; description: string; level: number }>
): ProjectMatrixRow[] {
  return projectDataItems.map((item, rowIndex) => {
    const courseMatrixId = typeof item.courseMatrix?.id === "number" ? item.courseMatrix.id : 0
    const pointOriginalId = typeof item.courseMatrix?.point?.id === "number" ? item.courseMatrix.point.id : 0
    const rowId = courseMatrixId > 0
      ? `project_matrix_${courseMatrixId}`
      : `project_${item.courseMatrix?.projectId || 0}_row_${rowIndex + 1}`

    // 为每个教学目标构建支撑信息
    const objectiveSupports: ProjectMatrixObjectiveSupport[] = taskObjectives.map((obj) => {
      // 当前行只保留当前 courseMatrix.id 下的任务目标支撑
      const matchingMatrices = (item.projectMatrices || []).filter(
        (pm) => String(pm.taskGoalId) === obj.id
      )

      // 将矩阵项转换为 KSA 项
      const ksaItems: ProjectMatrixKsaItem[] = matchingMatrices
        .filter((pm) => pm.ksa)
        .map((pm) => {
          // 从 KSA 查找表获取完整信息
          const ksaInfo = ksaMap.get(Number(pm.ksa!.id))

          // 规范化分类：优先使用查找表中的 title，否则使用原始数据中的 title
          const ksaTitleOrDefault = ksaInfo?.title || pm.ksa!.title || "K"
          const category = normalizeKsaCategory(ksaTitleOrDefault)

          return {
            id: String(pm.ksa!.id),
            name: pm.ksa!.title || "",
            // 根据 relate 字段判断强弱：0 为强，非 0 为弱
            level: (pm.relate?.relate === 0 ? "strong" : "weak") as "strong" | "weak",
            // 描述优先使用原始数据，次选查找表
            description: pm.ksa!.description || ksaInfo?.description || "",
            originalId: Number(pm.ksa!.id),
            category,
            // 索引优先使用原始数据，次选查找表，最后默认 1
            index: pm.ksa!.level || ksaInfo?.level || 1,
          }
        })

      return {
        task_objective_id: obj.id,
        ksa_items: ksaItems,
      }
    })

    // 组装完整的行数据
    return {
      course_point_id: rowId,
      course_point_name: item.courseMatrix?.point?.title || "",
      course_point_description: item.courseMatrix?.point?.description,
      course_point_original_id: pointOriginalId > 0 ? pointOriginalId : undefined,
      project_matrix_id: courseMatrixId > 0 ? courseMatrixId : undefined,
      project_id: Number(item.courseMatrix?.projectId),
      objective_supports: objectiveSupports,
      learning_method: item.courseMatrix?.study || undefined,
      teaching_method: item.courseMatrix?.teach || undefined,
      learning_output: item.courseMatrix?.product || undefined,
      week: item.courseMatrix?.week ? Number(item.courseMatrix.week) : undefined,
      theory_hours: item.courseMatrix?.theoryPeriod ? Number(item.courseMatrix.theoryPeriod) : undefined,
      practice_hours: item.courseMatrix?.practicePeriod ? Number(item.courseMatrix.practicePeriod) : undefined,
    }
  })
}

/**
 * 将项目 API 数据转换为画布项目矩阵数据
 * 数据管线：构建查找表 -> 按项目分组 -> 逐条 courseMatrix 行映射 -> 结果组装
 */
function convertProjectMatrixToCanvasData(
  apiData: ProjectMatrixApiData,
  chapters: Array<{ id?: number; name?: string; chapterName?: string }>,
): ProjectMatrixData[] {
  if (!apiData?.projects || apiData.projects.length === 0) return []

  // 阶段 1：构建查找表（避免重复遍历）
  const ksaMap = buildKsaLookupMap(apiData.ksas)
  const chapterNameMap = buildChapterNameLookupMap(chapters)
  const projectDataMap = buildProjectDataLookupMap(apiData.data)

  // 阶段 2：处理每个项目，生成画布数据
  const results: ProjectMatrixData[] = apiData.projects.map((projectItem, projectIdx) => {
    const project = projectItem.project
    const goals = projectItem.goals || []

    // 阶段 2a：将项目目标转换为标准格式
    const taskObjectives: ProjectMatrixTaskObjective[] = goals.map((goal, goalIdx) => ({
      id: String(goal.id),
      index: goalIdx + 1,
      description: goal.description || "",
      originalId: goal.id,
      project_id: project.id,
      product: goal.product,
    }))

    // 阶段 2b：获取该项目的全部数据行
    const projectDataItems = projectDataMap.get(String(project.id)) || []

    // 阶段 2c：保留原始 project_matrix 行粒度，避免聚合后无法准确回写
    const rows = transformProjectDataItemsToRows(projectDataItems, taskObjectives, ksaMap)

    // 阶段 2e：组装项目结果
    const chapterName = chapterNameMap.get(project.id) || project.name || ""

    return {
      chapter_id: `chapter_${projectIdx + 1}`,
      chapter_index: project.indexNo || projectIdx + 1,
      chapter_name: chapterName,
      project_id: project.id,
      course_unit_id: project.courseUnitId,
      task_objectives: taskObjectives,
      rows,
    }
  })

  // 按 chapter_index 升序排列，确保不受后端并行返回顺序影响
  results.sort((a, b) => a.chapter_index - b.chapter_index)

  return results
}

// ============ 完整转换函数（包含所有子元素） ============

/**
 * 将课程详情数据完整转换为画布数据（包含所有子元素）
 * @param courseDetail 课程详情数据
 * @param courseGoals 课程目标数据（指标点数组，其中 children 是真正的教学目标）
 * @returns 画布数据结构
 */
export function convertCourseToCanvasComplete(
  courseDetail: CombinedCourseDetail,
  courseGoals?: CourseGoalWithChildren[],
  matrixData?: MatrixDataForCanvas
): CanvasData {
  const elements: CanvasElementData[] = []
  const edges: CanvasEdgeData[] = []

  const course = courseDetail.courseDetailData.course
  const pointksa = courseDetail.courseDetailData.pointksa

  // 1. 创建 course_info 元素
  const courseInfoElement = createCourseInfoElement(courseDetail, courseGoals)
  elements.push(courseInfoElement)

  // 2. 创建 graduation_support 面板（第1列首位）
  let currentY = START_Y

  const graduationSupportElementData: GraduationSupportData = {
    id: PANEL_IDS.GRADUATION_SUPPORT,
    ...(matrixData?.graduationSupportData || {}),
  }

  const graduationSupportElement: CanvasElementData = {
    id: PANEL_IDS.GRADUATION_SUPPORT,
    type: CanvasComponentType.GRADUATION_SUPPORT,
    position: { x: COLUMN_X_POSITIONS[1], y: currentY },
    size: ELEMENT_SIZES[CanvasComponentType.GRADUATION_SUPPORT],
    selected: false,
    data: graduationSupportElementData,
  }
  elements.push(graduationSupportElement)

  // 连线：course_info → graduation_support
  edges.push(createSupportEdge(courseInfoElement.id, graduationSupportElement.id))

  currentY = graduationSupportElement.position.y + (graduationSupportElement.size?.height || DEFAULT_SIZES.PANEL_HEIGHT) + ROW_GAP

  // 教学目标是后续链路的前置条件；缺失时仅展示前置基础信息
  const teachingObjectives = (courseGoals || []).flatMap((goal) => goal.children || [])
  if (teachingObjectives.length === 0) {
    return {
      elements,
      edges,
    }
  }

  // 3. 创建 objective_panel 和 objective_card 元素（第2列，独立列）
  // 注意：courseGoals 是指标点数组，children 才是真正的教学目标
  if (courseGoals && courseGoals.length > 0) {
    const indicatorMetaById = new Map<number, { title: string; supportLevel?: "strong" | "weak"; description?: string }>()
    const requirements = matrixData?.graduationSupportData?.requirements || []
    requirements.forEach((req, reqIdx) => {
      req.indicators.forEach((indicator, indicatorIdx) => {
        indicatorMetaById.set(indicator.id, {
          title: `${reqIdx + 1}.${indicatorIdx + 1}`,
          supportLevel: indicator.supportLevel,
          description: indicator.description,
        })
      })
    })

    const objectiveSupportsMap = new Map<string, ObjectiveSupportLabel[]>()
    const buildObjectiveKey = (objective: { id?: number; description?: string; content?: string }): string => {
      if (objective.id !== undefined && objective.id !== null) {
        return `id:${objective.id}`
      }
      return `content:${(objective.description || objective.content || "").trim()}`
    }

    courseGoals.forEach((goal) => {
      const indicatorId = goal.id
      const indicatorMeta = typeof indicatorId === "number" ? indicatorMetaById.get(indicatorId) : undefined
      const labelTitle = indicatorMeta?.title || (typeof indicatorId === "number" ? String(indicatorId) : "")
      if (!labelTitle) return

      const labelDesc = goal.description || goal.content || indicatorMeta?.description || ""
      const labelType = indicatorMeta?.supportLevel

      const children = goal.children || []
      children.forEach((child) => {
        const objectiveKey = buildObjectiveKey(child)
        const currentSupports = objectiveSupportsMap.get(objectiveKey) || []
        const exists = currentSupports.some((item) => item.indicatorId === indicatorId)
        if (!exists) {
          currentSupports.push({
            indicatorId: typeof indicatorId === "number" ? indicatorId : undefined,
            title: labelTitle,
            desc: labelDesc,
            type: labelType,
          })
          objectiveSupportsMap.set(objectiveKey, currentSupports)
        }
      })
    })

    // 更新 Panel 数据，添加 items
    const objectiveItems = teachingObjectives.map((obj, idx) => ({
      id: `objective_${idx + 1}`,
      description: obj.description || obj.content || "",
    }))

    const objectivePanelElement = createAutoSizedPanelElement(
      PANEL_IDS.OBJECTIVE_PANEL,
      CanvasComponentType.OBJECTIVE_PANEL,
      CanvasComponentType.OBJECTIVE_CARD,
      teachingObjectives.length,
      {
        x: COLUMN_X_POSITIONS[2],
        y: START_Y,
      },
      { id: PANEL_IDS.OBJECTIVE_PANEL, items: objectiveItems }
    )
    elements.push(objectivePanelElement)

    // 创建子卡片（使用真正的教学目标）
    teachingObjectives.forEach((obj, idx) => {
      const objectiveKey = buildObjectiveKey(obj)
      const supports = objectiveSupportsMap.get(objectiveKey)
      const cardData: ObjectiveCardData = {
        id: `objective_${idx + 1}`,
        index: idx + 1,
        content: obj.description || obj.content || "",
        originalId: obj.id ?? undefined,
        supports: supports && supports.length > 0 ? supports : undefined,
      }

      elements.push(
        createPanelChildElement(
          `objective_${idx + 1}`,
          CanvasComponentType.OBJECTIVE_CARD,
          CanvasComponentType.OBJECTIVE_PANEL,
          idx,
          PANEL_IDS.OBJECTIVE_PANEL,
          cardData
        )
      )
    })

    // 连线：graduation_support → objective_panel
    edges.push(createSupportEdge(graduationSupportElement.id, objectivePanelElement.id))
  }

  // 4. 创建 chapter_panel 和 chapter_card 元素
  const chapters = course.courseMatrixVOS || []
  if (chapters.length > 0) {
    const chapterItems = chapters.map((chapter, idx) => ({
      id: `chapter_${idx + 1}`,
      name: chapter.name || chapter.chapterName || "",
      theoryHours: Number(chapter.theoryPeriod) || 0,
      practiceHours: Number(chapter.practicePeriod) || 0,
    }))

    const chapterPanelElement = createAutoSizedPanelElement(
      PANEL_IDS.CHAPTER_PANEL,
      CanvasComponentType.CHAPTER_PANEL,
      CanvasComponentType.CHAPTER_CARD,
      chapters.length,
      {
        x: COLUMN_X_POSITIONS[1],
        y: currentY,
      },
      { id: PANEL_IDS.CHAPTER_PANEL, items: chapterItems }
    )
    elements.push(chapterPanelElement)

    // 创建子卡片
    // 注意：API 返回的 theoryPeriod/practicePeriod 是字符串类型，需要转换为数字
    chapters.forEach((chapter, idx) => {
      const cardData: ChapterCardData = {
        id: `chapter_${idx + 1}`,
        index: idx + 1,
        name: chapter.name || chapter.chapterName || "",
        theory_hours: Number(chapter.theoryPeriod) || 0,
        practice_hours: Number(chapter.practicePeriod) || 0,
        originalId: chapter.id ?? undefined,
      }

      elements.push(
        createPanelChildElement(
          `chapter_${idx + 1}`,
          CanvasComponentType.CHAPTER_CARD,
          CanvasComponentType.CHAPTER_PANEL,
          idx,
          PANEL_IDS.CHAPTER_PANEL,
          cardData
        )
      )
    })

    // 添加连线：objective_panel → chapter_panel
    const objectivePanelElement = elements.find(el => el.type === CanvasComponentType.OBJECTIVE_PANEL)
    if (objectivePanelElement) {
      edges.push(createSupportEdge(objectivePanelElement.id, chapterPanelElement.id))
    }

    currentY = chapterPanelElement.position.y + (chapterPanelElement.size?.height || DEFAULT_SIZES.PANEL_HEIGHT) + ROW_GAP
  }

  // 5. 创建 course_point_panel 和 course_point_card 元素
  const coursePoints = pointksa.points || []
  if (coursePoints.length > 0) {
    // 辅助函数：解析课点标题，提取索引、名称和描述
    // 原始数据结构：title（如 "课点9"）和 description（课点描述）是两个独立字段
    const parseCoursePointTitle = (point: { name?: string; title?: string; content?: string; description?: string }) => {
      const rawTitle = point.title || point.name || ""
      const rawDescription = point.description || point.content || ""
      const match = rawTitle.match(/^课点(\d+)[：:.]?\s*(.*)$/)
      if (match) {
        return {
          index: parseInt(match[1], 10),
          name: rawTitle,
          content: rawDescription || match[2] || "",
        }
      }
      // 不是 "课点X" 格式，尝试提取任何数字作为索引
      const numMatch = rawTitle.match(/(\d+)/)
      if (numMatch) {
        return {
          index: parseInt(numMatch[1], 10),
          name: rawTitle,
          content: rawDescription || rawTitle,
        }
      }
      // 没有数字，使用原始标题
      return {
        index: 0,
        name: rawTitle || "未命名课点",
        content: rawDescription || rawTitle,
      }
    }

    // 预处理：为每个课点解析标题并添加排序用的索引
    const coursePointsWithParsed = coursePoints.map((point) => ({
      ...point,
      parsed: parseCoursePointTitle(point),
    }))

    // 按数字排序（自然排序）
    const sortedCoursePoints = [...coursePointsWithParsed].sort((a, b) => {
      return a.parsed.index - b.parsed.index
    })

    const coursePointItems = sortedCoursePoints.map((point, idx) => ({
      id: `course_point_${idx + 1}`,
      name: point.parsed.name || `课点${point.parsed.index}`,
      content: point.parsed.content,
    }))

    const coursePointPanelElement = createAutoSizedPanelElement(
      PANEL_IDS.COURSE_POINT_PANEL,
      CanvasComponentType.COURSE_POINT_PANEL,
      CanvasComponentType.COURSE_POINT_CARD,
      coursePoints.length,
      {
        x: COLUMN_X_POSITIONS[1],
        y: currentY,
      },
      { id: PANEL_IDS.COURSE_POINT_PANEL, items: coursePointItems }
    )
    elements.push(coursePointPanelElement)

    // 创建子卡片（使用解析后的数据）
    sortedCoursePoints.forEach((point, sortedIdx) => {
      const cardData: CoursePointCardData = {
        id: `course_point_${sortedIdx + 1}`,
        index: point.parsed.index || sortedIdx + 1,
        name: point.parsed.name || `课点${point.parsed.index || sortedIdx + 1}`,
        description: point.parsed.content,
        originalId: point.id ?? undefined,
      }

      elements.push(
        createPanelChildElement(
          `course_point_${sortedIdx + 1}`,
          CanvasComponentType.COURSE_POINT_CARD,
          CanvasComponentType.COURSE_POINT_PANEL,
          sortedIdx,
          PANEL_IDS.COURSE_POINT_PANEL,
          cardData
        )
      )
    })

    // 添加连线：chapter_panel → course_point_panel
    const chapterPanelElement = elements.find(el => el.type === CanvasComponentType.CHAPTER_PANEL)
    if (chapterPanelElement) {
      edges.push(createSupportEdge(chapterPanelElement.id, coursePointPanelElement.id))
    }

    currentY = coursePointPanelElement.position.y + (coursePointPanelElement.size?.height || DEFAULT_SIZES.COURSE_POINT_PANEL_HEIGHT) + ROW_GAP
  }

  // 6. 创建 ksa_panel 和 ksa_item 元素
  const ksas = pointksa.ksas || []
  if (ksas.length > 0) {
    // 预处理：为每个 KSA 添加规范化的类别
    const ksasWithCategory = ksas.map((ksa) => {
      const rawCategory = ksa.title || ksa.type || ksa.category || KSA_CATEGORIES.KNOWLEDGE
      const category = rawCategory.toUpperCase()
      const validCategory = (["K", "S", "A"].includes(category) ? category : KSA_CATEGORIES.KNOWLEDGE) as "K" | "S" | "A"
      return { ...ksa, validCategory }
    })

    // 按类别排序（K -> S -> A），保持同类别内的原始顺序
    const sortedKsas = [...ksasWithCategory].sort((a, b) => {
      return KSA_CATEGORY_ORDER[a.validCategory] - KSA_CATEGORY_ORDER[b.validCategory]
    })

    // 按类别分组计算索引（用于 panel data items）
    const categoryIndices: Record<string, number> = { K: 0, S: 0, A: 0 }
    const ksaItems = sortedKsas.map((ksa) => {
      const idx = ++categoryIndices[ksa.validCategory]
      const businessId = getKsaReferenceId({
        id: ksa.id ?? `ksa_${ksa.validCategory}_${idx}`,
        originalId: ksa.id ?? undefined,
      }) || `ksa_${ksa.validCategory}_${idx}`
      return {
        id: businessId,
        category: ksa.validCategory,
        index: idx,
        content: ksa.content || ksa.description || "",
      }
    })

    const ksaPanelElement = createAutoSizedPanelElement(
      PANEL_IDS.KSA_PANEL,
      CanvasComponentType.KSA_PANEL,
      CanvasComponentType.KSA_ITEM,
      ksas.length,
      {
        x: COLUMN_X_POSITIONS[4],
        y: START_Y,
      },
      { id: PANEL_IDS.KSA_PANEL, items: ksaItems }
    )
    elements.push(ksaPanelElement)

    // 创建子卡片（使用排序后的索引计算网格位置）
    const cardCategoryIndices: Record<string, number> = { K: 0, S: 0, A: 0 }

    sortedKsas.forEach((ksa, sortedIndex) => {
      const categoryIdx = ++cardCategoryIndices[ksa.validCategory]
      const cardId = `ksa_${ksa.validCategory}_${categoryIdx}`
      const businessId = getKsaReferenceId({
        id: ksa.id ?? cardId,
        originalId: ksa.id ?? undefined,
      }) || cardId

      const cardData: KsaItemData = {
        id: businessId,
        category: ksa.validCategory,
        index: categoryIdx,
        content: ksa.content || ksa.description || "",
        originalId: ksa.id ?? undefined,
      }

      // 使用排序后的索引计算位置，这样同类别的卡片会聚合在一起
      elements.push(
        createPanelChildElement(
          cardId,
          CanvasComponentType.KSA_ITEM,
          CanvasComponentType.KSA_PANEL,
          sortedIndex,
          PANEL_IDS.KSA_PANEL,
          cardData
        )
      )
    })

  }

  // 7. 创建课程矩阵元素（从 API 数据转换）
  if (matrixData?.courseMatrixItems && matrixData.courseMatrixItems.length > 0 && courseGoals && courseGoals.length > 0) {
    const courseMatrixCanvasData = convertCourseMatrixToCanvasData(
      matrixData.courseMatrixItems,
      courseGoals,
      chapters,
      courseDetail.courseNameData.name,
    )

    const courseMatrixElement: CanvasElementData = {
      id: PANEL_IDS.COURSE_MATRIX,
      type: CanvasComponentType.COURSE_MATRIX,
      position: {
        x: COLUMN_X_POSITIONS[3],
        y: START_Y,
      },
      size: ELEMENT_SIZES[CanvasComponentType.COURSE_MATRIX],
      selected: false,
      data: courseMatrixCanvasData,
    }
    elements.push(courseMatrixElement)

    // 课点面板 → 课程矩阵 连线
    const coursePointPanelEl = elements.find((el) => el.id === PANEL_IDS.COURSE_POINT_PANEL)
    if (coursePointPanelEl) {
      edges.push(createSupportEdge(coursePointPanelEl.id, courseMatrixElement.id))
    }

    // 课程矩阵 → KSA 面板 连线
    const ksaPanelEl = elements.find((el) => el.id === PANEL_IDS.KSA_PANEL)
    if (ksaPanelEl) {
      edges.push(createSupportEdge(courseMatrixElement.id, ksaPanelEl.id))
    }

    // 8. 创建项目矩阵元素（从 API 数据转换）
    if (matrixData.projectMatrixApiData) {
      const projectMatrixDataList = convertProjectMatrixToCanvasData(
        matrixData.projectMatrixApiData,
        chapters,
      )
      const projectMatrixElements: CanvasElementData[] = []

      let projectMatrixY = START_Y
      projectMatrixDataList.forEach((pmData, idx) => {
        const pmId = `project_matrix_${idx + 1}`
        const pmElement: CanvasElementData = {
          id: pmId,
          type: CanvasComponentType.PROJECT_MATRIX,
          position: {
            x: COLUMN_X_POSITIONS[5],
            y: projectMatrixY,
          },
          size: ELEMENT_SIZES[CanvasComponentType.PROJECT_MATRIX],
          selected: false,
          data: pmData,
        }
        elements.push(pmElement)
        projectMatrixElements.push(pmElement)

        // KSA 面板 → 项目矩阵 连线
        if (ksaPanelEl) {
          edges.push(createSupportEdge(ksaPanelEl.id, pmId))
        }

        projectMatrixY += (ELEMENT_SIZES[CanvasComponentType.PROJECT_MATRIX].height || DEFAULT_SIZES.PANEL_HEIGHT) + ROW_GAP
      })

      if (projectMatrixElements.length > 0) {
        const reportSize = ELEMENT_SIZES[CanvasComponentType.COURSE_REPORT]
        const rightmostProjectMatrix = projectMatrixElements.reduce((rightmost, current) => {
          const rightmostRight = rightmost.position.x + (rightmost.size?.width || 0)
          const currentRight = current.position.x + (current.size?.width || 0)
          return currentRight > rightmostRight ? current : rightmost
        })
        const minY = Math.min(...projectMatrixElements.map((element) => element.position.y))
        const maxY = Math.max(
          ...projectMatrixElements.map(
            (element) => element.position.y + (element.size?.height || DEFAULT_SIZES.PANEL_HEIGHT)
          )
        )
        const courseReportData: CourseReportCardData = {
          id: "course_report_loaded",
          name: "开课说明",
        }
        const courseReportElement: CanvasElementData = {
          id: courseReportData.id,
          type: CanvasComponentType.COURSE_REPORT,
          position: {
            x: rightmostProjectMatrix.position.x + (rightmostProjectMatrix.size?.width || 0) + 100,
            y: (minY + maxY) / 2 - reportSize.height / 2,
          },
          size: reportSize,
          selected: false,
          data: courseReportData,
        }

        elements.push(courseReportElement)
        projectMatrixElements.forEach((projectMatrixElement) => {
          edges.push(createSupportEdge(projectMatrixElement.id, courseReportElement.id))
        })
      }
    }
  }

  // 调试日志已移除，可通过上层注入或环境开关启用
  // 原始统计信息：
  // - 转换耗时：convertDurationMs
  // - 元素数：elements.length
  // - 连线数：edges.length
  // - 教学目标数：courseGoals?.reduce((sum, goal) => sum + (goal.children?.length || 0), 0) || 0
  // - 章节数：course?.courseMatrixVOS?.length || 0
  // - 课点数：pointksa?.points?.length || 0
  // - KSA 数：pointksa?.ksas?.length || 0

  return {
    elements,
    edges,
  }
}
