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
} from "@/components/canvas-elements/types"
import { generateEdgeId } from "@/components/flow/utils/layout"
import { CANVAS_LAYOUT_POSITION_CONFIG } from "@/components/flow/utils/canvas-layout"

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
  [CanvasComponentType.OBJECTIVE_CARD]: { width: 280, height: 130 },
  [CanvasComponentType.COURSE_POINT_PANEL]: { width: 320, height: 210 },
  [CanvasComponentType.COURSE_POINT_CARD]: { width: 280, height: 140 },
  [CanvasComponentType.CHAPTER_PANEL]: { width: 320, height: 200 },
  [CanvasComponentType.CHAPTER_CARD]: { width: 280, height: 130 },
  [CanvasComponentType.KSA_PANEL]: { width: 320, height: 200 },
  [CanvasComponentType.KSA_ITEM]: { width: 260, height: 110 },
  [CanvasComponentType.COURSE_MATRIX]: { width: 1100, height: 680 },
  [CanvasComponentType.PROJECT_MATRIX_PANEL]: { width: 900, height: 200 },
  [CanvasComponentType.PROJECT_MATRIX]: { width: 900, height: 200 },
  [CanvasComponentType.COURSE_REPORT]: { width: 480, height: 180 },
}

// Panel 网格布局列数配置
const PANEL_GRID_COLUMNS: Partial<Record<CanvasComponentType, number>> = {
  [CanvasComponentType.OBJECTIVE_PANEL]: 5,
  [CanvasComponentType.COURSE_POINT_PANEL]: 5,
  [CanvasComponentType.CHAPTER_PANEL]: 5,
  [CanvasComponentType.KSA_PANEL]: 5,
}

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
  cardSize: { width: number; height: number }
): { width: number; height: number } {
  const rows = Math.max(1, Math.ceil(childCount / columns))
  const actualColumns = Math.min(childCount || 1, columns)

  const width =
    PANEL_PADDING.left +
    actualColumns * cardSize.width +
    (actualColumns - 1) * CARD_GAP_X +
    PANEL_PADDING.right
  const height =
    PANEL_PADDING.top +
    rows * cardSize.height +
    (rows - 1) * CARD_GAP_Y +
    PANEL_PADDING.bottom

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
    type: "support",
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
  const panelSize = calculatePanelSize(childCount, panelColumns, cardSize)

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
  const courseInfoElement = createCourseInfoElement(courseDetail)
  elements.push(courseInfoElement)

  // 2. 生成 graduation_support 面板和 objective_panel 元素
  let currentY = START_Y

  // 创建毕业要求支撑面板（位于第1列首位）
  const graduationSupportElement: CanvasElementData = {
    id: "graduation_support_loaded",
    type: CanvasComponentType.GRADUATION_SUPPORT,
    position: { x: COLUMN_X_POSITIONS[1], y: currentY },
    size: ELEMENT_SIZES[CanvasComponentType.GRADUATION_SUPPORT],
    selected: false,
    data: { id: "graduation_support_loaded" },
  }
  elements.push(graduationSupportElement)

  // 添加连线：course_info → graduation_support
  edges.push(createSupportEdge(courseInfoElement.id, graduationSupportElement.id))

  currentY = graduationSupportElement.position.y + (graduationSupportElement.size?.height || 200) + ROW_GAP

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
function createCourseInfoElement(courseDetail: CombinedCourseDetail): CanvasElementData {
  const course = courseDetail.courseDetailData.course
  const courseNameData = courseDetail.courseNameData

  const courseInfoData: CourseInfoData = {
    name: courseNameData.name,
    metadata: {
      introduction: course.introduction || undefined,
      theoryPeriod: course.theoryPeriod,
      practicePeriod: course.practicePeriod,
      courseId: course.id,
      majorId: course.majorId,
      // 课程性质和开课日期
      courseNatureId: course.typeId,
      openingDate: course.createTime,
      // 扩展字段
      teachingClass: course.teachingClass,
      teachingLocation: course.teachingLocation,
      teachingTime: course.teachingTime,
      studentCount: course.studentCount,
      credits: course.credits,
      mainTextbook: course.mainTextbook,
      referenceResources: course.referenceResources,
    },
  }

  return {
    id: "course_info_loaded",
    type: CanvasComponentType.COURSE_INFO,
    position: {
      x: COLUMN_X_POSITIONS[0],
      y: 560,
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
  const panelId = "objective_panel_loaded"
  const panelColumns = getPanelColumns(CanvasComponentType.OBJECTIVE_PANEL)
  const cardSize = ELEMENT_SIZES[CanvasComponentType.OBJECTIVE_CARD]

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

  // 创建子卡片元素
  for (let i = 0; i < goals.length; i++) {
    const goal = goals[i]
    const cardId = `objective_${i + 1}`

    const cardData: ObjectiveCardData = {
      id: cardId,
      index: i + 1,
      content: goal.description || goal.content || "",
    }

    const cardPosition = calculateCardPosition(i, panelColumns, cardSize)

    panelElement.data = panelElement.data || {}
    ;(panelElement.data as { items?: unknown[] }).items = (panelElement.data as { items?: unknown[] }).items || []

    // 由于 CanvasElementData 的 data 类型限制，这里需要通过外部方式添加子节点
    // 实际使用时，父节点和子节点会分开处理
  }

  // 返回 Panel 元素（子卡片需要单独添加）
  return {
    ...panelElement,
    // 在外部循环中创建子卡片并添加到 elements 数组
  }
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
  const panelId = "chapter_panel_loaded"
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
  const panelId = "course_point_panel_loaded"
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
  const panelId = "ksa_panel_loaded"
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

  const cardData: KsaItemData = {
    id: cardId,
    category: validCategory,
    index: index + 1,
    content: ksa.content || ksa.description || "",
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
      projectId: string | number
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
        course_points: objectiveGroups.get(obj.id) || [],
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

/**
 * 将项目矩阵 API 数据转换为画布 ProjectMatrixData[] 格式
 * 每个章节/项目生成一个 ProjectMatrixData
 */
function convertProjectMatrixToCanvasData(
  apiData: ProjectMatrixApiData,
  chapters: Array<{ id?: number; name?: string; chapterName?: string }>,
): ProjectMatrixData[] {
  if (!apiData?.projects || apiData.projects.length === 0) return []

  const results: ProjectMatrixData[] = []
  const dataItems = apiData.data || []

  // 构建 KSA 查找表
  const ksaMap = new Map<number, { title: string; description: string; level: number }>()
  if (apiData.ksas) {
    apiData.ksas.forEach((ksa) => {
      ksaMap.set(ksa.id, { title: ksa.title, description: ksa.description, level: ksa.level })
    })
  }

  // 构建章节名称映射（API project.id → 章节名称）
  const chapterNameMap = new Map<number, string>()
  chapters.forEach((ch) => {
    if (ch.id) {
      chapterNameMap.set(ch.id, ch.name || ch.chapterName || "")
    }
  })

  // 预分组：projectId -> 该项目的全部数据行，避免每个项目重复 filter 全量数据
  const projectDataMap = new Map<string, typeof dataItems>()
  dataItems.forEach((item) => {
    const projectId = item.courseMatrix?.projectId
    if (projectId === undefined || projectId === null) return
    const key = String(projectId)
    const list = projectDataMap.get(key) || []
    list.push(item)
    projectDataMap.set(key, list)
  })

  apiData.projects.forEach((projectItem, projectIdx) => {
    const project = projectItem.project
    const goals = projectItem.goals || []

    // task_objectives 来自 project 的 goals
    const taskObjectives: ProjectMatrixTaskObjective[] = goals.map((goal, goalIdx) => ({
      id: String(goal.id),
      index: goalIdx + 1,
      description: goal.description || "",
    }))

    const projectDataItems = projectDataMap.get(String(project.id)) || []

    // 按课点 ID 分组
    const coursePointMap = new Map<string, {
      point: { id: string; title: string; description?: string }
      courseMatrix?: typeof projectDataItems[number]["courseMatrix"]
      matricesByGoal: Map<string, Array<NonNullable<typeof projectDataItems[number]["projectMatrices"]>[number]>>
    }>()

    projectDataItems.forEach((item) => {
      const pointId = String(item.courseMatrix?.point?.id || item.courseMatrix?.id || "")
      if (!pointId) return

      if (!coursePointMap.has(pointId)) {
        coursePointMap.set(pointId, {
          point: {
            id: pointId,
            title: item.courseMatrix?.point?.title || "",
            description: item.courseMatrix?.point?.description,
          },
          courseMatrix: item.courseMatrix,
          matricesByGoal: new Map(),
        })
      }

      const groupedPoint = coursePointMap.get(pointId)
      if (!groupedPoint) return

      if (item.projectMatrices && item.projectMatrices.length > 0) {
        item.projectMatrices.forEach((pm) => {
          const goalKey = String(pm.taskGoalId)
          const groupedMatrices = groupedPoint.matricesByGoal.get(goalKey) || []
          groupedMatrices.push(pm)
          groupedPoint.matricesByGoal.set(goalKey, groupedMatrices)
        })
      }
    })

    // 构建 rows
    const rows: ProjectMatrixRow[] = Array.from(coursePointMap.values()).map((data) => {
      const objectiveSupports: ProjectMatrixObjectiveSupport[] = taskObjectives.map((obj) => {
        const matchingMatrices = data.matricesByGoal.get(obj.id) || []
        const ksaItems: ProjectMatrixKsaItem[] = matchingMatrices
          .filter((pm) => pm.ksa)
          .map((pm) => {
            const ksaInfo = ksaMap.get(Number(pm.ksa!.id))
            const rawCategory = (ksaInfo?.title || pm.ksa!.title || "K").toUpperCase()
            const category = (["K", "S", "A"].includes(rawCategory) ? rawCategory : "K") as "K" | "S" | "A"
            return {
              id: String(pm.ksa!.id),
              name: pm.ksa!.title || "",
              level: (pm.relate?.relate === 0 ? "strong" : "weak") as "strong" | "weak",
              description: pm.ksa!.description || ksaInfo?.description || "",
              category,
              index: pm.ksa!.level || ksaInfo?.level || 1,
            }
          })

        return {
          task_objective_id: obj.id,
          ksa_items: ksaItems,
        }
      })

      return {
        course_point_id: String(data.point.id),
        course_point_name: data.point.title || "",
        course_point_description: data.point.description,
        objective_supports: objectiveSupports,
        learning_method: data.courseMatrix?.study || undefined,
        teaching_method: data.courseMatrix?.teach || undefined,
        learning_output: data.courseMatrix?.product || undefined,
        week: data.courseMatrix?.week ? Number(data.courseMatrix.week) : undefined,
        theory_hours: data.courseMatrix?.theoryPeriod ? Number(data.courseMatrix.theoryPeriod) : undefined,
        practice_hours: data.courseMatrix?.practicePeriod ? Number(data.courseMatrix.practicePeriod) : undefined,
      }
    })

    // 章节名优先从 courseMatrixVOS 中匹配，否则使用 project.name
    const chapterName = chapterNameMap.get(project.id) || project.name || ""

    results.push({
      chapter_id: `chapter_${projectIdx + 1}`,
      chapter_index: project.indexNo || projectIdx + 1,
      chapter_name: chapterName,
      task_objectives: taskObjectives,
      rows,
    })
  })

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
  const convertStart = typeof performance !== "undefined" ? performance.now() : Date.now()
  const elements: CanvasElementData[] = []
  const edges: CanvasEdgeData[] = []

  const course = courseDetail.courseDetailData.course
  const pointksa = courseDetail.courseDetailData.pointksa

  // 1. 创建 course_info 元素
  const courseInfoElement = createCourseInfoElement(courseDetail)
  elements.push(courseInfoElement)

  // 2. 创建 graduation_support 面板（第1列首位）
  let currentY = START_Y

  const graduationSupportElement: CanvasElementData = {
    id: "graduation_support_loaded",
    type: CanvasComponentType.GRADUATION_SUPPORT,
    position: { x: COLUMN_X_POSITIONS[1], y: currentY },
    size: ELEMENT_SIZES[CanvasComponentType.GRADUATION_SUPPORT],
    selected: false,
    data: { id: "graduation_support_loaded" },
  }
  elements.push(graduationSupportElement)

  // 连线：course_info → graduation_support
  edges.push(createSupportEdge(courseInfoElement.id, graduationSupportElement.id))

  currentY = graduationSupportElement.position.y + (graduationSupportElement.size?.height || 200) + ROW_GAP

  // 3. 创建 objective_panel 和 objective_card 元素（第2列，独立列）
  // 注意：courseGoals 是指标点数组，children 才是真正的教学目标
  if (courseGoals && courseGoals.length > 0) {
    // 从指标点中提取所有教学目标（children）
    const teachingObjectives = courseGoals.flatMap((goal) => goal.children || [])

    if (teachingObjectives.length > 0) {
      // 更新 Panel 数据，添加 items
      const objectiveItems = teachingObjectives.map((obj, idx) => ({
        id: `objective_${idx + 1}`,
        description: obj.description || obj.content || "",
      }))

      const objectivePanelElement = createAutoSizedPanelElement(
        "objective_panel_loaded",
        CanvasComponentType.OBJECTIVE_PANEL,
        CanvasComponentType.OBJECTIVE_CARD,
        teachingObjectives.length,
        {
          x: COLUMN_X_POSITIONS[2],
          y: START_Y,
        },
        { id: "objective_panel_loaded", items: objectiveItems }
      )
      elements.push(objectivePanelElement)

      // 创建子卡片（使用真正的教学目标）
      teachingObjectives.forEach((obj, idx) => {
        const cardData: ObjectiveCardData = {
          id: `objective_${idx + 1}`,
          index: idx + 1,
          content: obj.description || obj.content || "",
          originalId: obj.id ?? undefined,
        }

        elements.push(
          createPanelChildElement(
            `objective_${idx + 1}`,
            CanvasComponentType.OBJECTIVE_CARD,
            CanvasComponentType.OBJECTIVE_PANEL,
            idx,
            "objective_panel_loaded",
            cardData
          )
        )
      })

      // 连线：graduation_support → objective_panel
      edges.push(createSupportEdge(graduationSupportElement.id, objectivePanelElement.id))
    }
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
      "chapter_panel_loaded",
      CanvasComponentType.CHAPTER_PANEL,
      CanvasComponentType.CHAPTER_CARD,
      chapters.length,
      {
        x: COLUMN_X_POSITIONS[1],
        y: currentY,
      },
      { id: "chapter_panel_loaded", items: chapterItems }
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
          "chapter_panel_loaded",
          cardData
        )
      )
    })

    // 添加连线：objective_panel → chapter_panel
    const objectivePanelElement = elements.find(el => el.type === CanvasComponentType.OBJECTIVE_PANEL)
    if (objectivePanelElement) {
      edges.push(createSupportEdge(objectivePanelElement.id, chapterPanelElement.id))
    }

    currentY = chapterPanelElement.position.y + (chapterPanelElement.size?.height || 200) + ROW_GAP
  }

  // 5. 创建 course_point_panel 和 course_point_card 元素
  const coursePoints = pointksa.points || []
  if (coursePoints.length > 0) {
    // 辅助函数：从标题中提取数字用于排序
    const extractNumber = (text: string): number => {
      const match = text.match(/\d+/)
      return match ? parseInt(match[0], 10) : Infinity
    }

    // 辅助函数：解析课点标题，提取索引、名称和描述
    // 原始数据结构：title（如 "课点9"）和 description（课点描述）是两个独立字段
    const parseCoursePointTitle = (point: { name?: string; title?: string; content?: string; description?: string }) => {
      const rawTitle = point.title || point.name || ""
      // description 字段存储实际的课点描述内容
      const rawDescription = point.description || point.content || ""
      const match = rawTitle.match(/^课点(\d+)[：:.]?\s*(.*)$/)
      if (match) {
        return {
          index: parseInt(match[1], 10),
          name: rawTitle,                    // 保留原始标题用于显示
          content: rawDescription || match[2] || "", // 优先使用 description 字段
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
      "course_point_panel_loaded",
      CanvasComponentType.COURSE_POINT_PANEL,
      CanvasComponentType.COURSE_POINT_CARD,
      coursePoints.length,
      {
        x: COLUMN_X_POSITIONS[1],
        y: currentY,
      },
      { id: "course_point_panel_loaded", items: coursePointItems }
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
          "course_point_panel_loaded",
          cardData
        )
      )
    })

    // 添加连线：chapter_panel → course_point_panel
    const chapterPanelElement = elements.find(el => el.type === CanvasComponentType.CHAPTER_PANEL)
    if (chapterPanelElement) {
      edges.push(createSupportEdge(chapterPanelElement.id, coursePointPanelElement.id))
    }

    currentY = coursePointPanelElement.position.y + (coursePointPanelElement.size?.height || 210) + ROW_GAP
  }

  // 6. 创建 ksa_panel 和 ksa_item 元素
  const ksas = pointksa.ksas || []
  if (ksas.length > 0) {
    // 类别排序优先级
    const categoryOrder: Record<string, number> = { K: 0, S: 1, A: 2 }

    // 预处理：为每个 KSA 添加规范化的类别
    const ksasWithCategory = ksas.map((ksa) => {
      const rawCategory = ksa.title || ksa.type || ksa.category || "K"
      const category = rawCategory.toUpperCase()
      const validCategory = (["K", "S", "A"].includes(category) ? category : "K") as "K" | "S" | "A"
      return { ...ksa, validCategory }
    })

    // 按类别排序（K -> S -> A），保持同类别内的原始顺序
    const sortedKsas = [...ksasWithCategory].sort((a, b) => {
      return categoryOrder[a.validCategory] - categoryOrder[b.validCategory]
    })

    // 按类别分组计算索引（用于 panel data items）
    const categoryIndices: Record<string, number> = { K: 0, S: 0, A: 0 }
    const ksaItems = sortedKsas.map((ksa) => {
      const idx = ++categoryIndices[ksa.validCategory]
      return {
        id: `ksa_${ksa.validCategory}_${idx}`,
        category: ksa.validCategory,
        index: idx,
        content: ksa.content || ksa.description || "",
      }
    })

    const ksaPanelElement = createAutoSizedPanelElement(
      "ksa_panel_loaded",
      CanvasComponentType.KSA_PANEL,
      CanvasComponentType.KSA_ITEM,
      ksas.length,
      {
        x: COLUMN_X_POSITIONS[4],
        y: START_Y,
      },
      { id: "ksa_panel_loaded", items: ksaItems }
    )
    elements.push(ksaPanelElement)

    // 创建子卡片（使用排序后的索引计算网格位置）
    const cardCategoryIndices: Record<string, number> = { K: 0, S: 0, A: 0 }

    sortedKsas.forEach((ksa, sortedIndex) => {
      const categoryIdx = ++cardCategoryIndices[ksa.validCategory]
      const cardId = `ksa_${ksa.validCategory}_${categoryIdx}`

      const cardData: KsaItemData = {
        id: cardId,
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
          "ksa_panel_loaded",
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
      id: "course_matrix_loaded",
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
    const coursePointPanelEl = elements.find((el) => el.id === "course_point_panel_loaded")
    if (coursePointPanelEl) {
      edges.push(createSupportEdge(coursePointPanelEl.id, courseMatrixElement.id))
    }

    // 课程矩阵 → KSA 面板 连线
    const ksaPanelEl = elements.find((el) => el.id === "ksa_panel_loaded")
    if (ksaPanelEl) {
      edges.push(createSupportEdge(courseMatrixElement.id, ksaPanelEl.id))
    }

    // 8. 创建项目矩阵元素（从 API 数据转换）
    if (matrixData.projectMatrixApiData) {
      const projectMatrixDataList = convertProjectMatrixToCanvasData(
        matrixData.projectMatrixApiData,
        chapters,
      )

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

        // KSA 面板 → 项目矩阵 连线
        if (ksaPanelEl) {
          edges.push(createSupportEdge(ksaPanelEl.id, pmId))
        }

        projectMatrixY += (ELEMENT_SIZES[CanvasComponentType.PROJECT_MATRIX].height || 200) + ROW_GAP
      })
    }
  }

  const convertDurationMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - convertStart
  console.log("[CanvasTransform] convertCourseToCanvasComplete 完成:", {
    durationMs: Number(convertDurationMs.toFixed(1)),
    elementsCount: elements.length,
    edgesCount: edges.length,
    objectiveCount: courseGoals?.reduce((sum, goal) => sum + (goal.children?.length || 0), 0) || 0,
    chapterCount: course?.courseMatrixVOS?.length || 0,
    coursePointCount: pointksa?.points?.length || 0,
    ksaCount: pointksa?.ksas?.length || 0,
    matrixCourseCount: matrixData?.courseMatrixItems?.length || 0,
    matrixProjectCount: matrixData?.projectMatrixApiData?.projects?.length || 0,
  })

  return {
    elements,
    edges,
  }
}
