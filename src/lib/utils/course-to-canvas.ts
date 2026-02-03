/**
 * 课程数据转换为画布数据的工具模块
 * 将 CombinedCourseDetail 数据转换为画布可用的 { elements, edges } 格式
 */

import type { CombinedCourseDetail } from "@/lib/api/course-detail-api"
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
} from "@/components/canvas-elements/types"
import { generateEdgeId } from "@/components/flow/utils/layout"

// ============ 布局常量 ============

// 各列起始 X 坐标
const COLUMN_X_POSITIONS = [-633, 640, 1967, 3350]

// 起始 Y 坐标
const START_Y = 60

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

  // 2. 生成 objective_panel 元素
  // 注意：courseGoals 是指标点数组，children 才是真正的教学目标
  let currentY = START_Y
  if (courseGoals && courseGoals.length > 0) {
    // 从指标点中提取所有教学目标（children）
    const teachingObjectives = courseGoals.flatMap((goal) => goal.children || [])

    if (teachingObjectives.length > 0) {
      const objectivePanel = createObjectivePanelElement(teachingObjectives, currentY)
      elements.push(objectivePanel)

      // 添加连线：course_info → objective_panel
      edges.push({
        id: generateEdgeId(courseInfoElement.id, objectivePanel.id),
        source: courseInfoElement.id,
        target: objectivePanel.id,
        type: "support",
      })

      currentY = objectivePanel.position.y + (objectivePanel.size?.height || 200) + ROW_GAP
    }
  }

  // 3. 生成 chapter_panel 和 chapter_card 元素
  const chapters = course.courseMatrixVOS || []
  if (chapters.length > 0) {
    const chapterPanel = createChapterPanelElement(chapters, currentY)
    elements.push(chapterPanel)

    // 添加连线：course_info → chapter_panel
    edges.push({
      id: generateEdgeId(courseInfoElement.id, chapterPanel.id),
      source: courseInfoElement.id,
      target: chapterPanel.id,
      type: "support",
    })

    currentY = chapterPanel.position.y + (chapterPanel.size?.height || 200) + ROW_GAP
  }

  // 4. 生成 course_point_panel 和 course_point_card 元素
  const coursePoints = pointksa.points || []
  if (coursePoints.length > 0) {
    const coursePointPanel = createCoursePointPanelElement(coursePoints, currentY)
    elements.push(coursePointPanel)

    // 添加连线：course_info → course_point_panel
    edges.push({
      id: generateEdgeId(courseInfoElement.id, coursePointPanel.id),
      source: courseInfoElement.id,
      target: coursePointPanel.id,
      type: "support",
    })

    currentY = coursePointPanel.position.y + (coursePointPanel.size?.height || 210) + ROW_GAP
  }

  // 5. 生成 ksa_panel 和 ksa_item 元素
  const ksas = pointksa.ksas || []
  if (ksas.length > 0) {
    const ksaPanel = createKsaPanelElement(ksas, currentY)
    elements.push(ksaPanel)

    // 添加连线：course_info → ksa_panel
    edges.push({
      id: generateEdgeId(courseInfoElement.id, ksaPanel.id),
      source: courseInfoElement.id,
      target: ksaPanel.id,
      type: "support",
    })
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
  const panelColumns = PANEL_GRID_COLUMNS[CanvasComponentType.OBJECTIVE_PANEL] || 3
  const cardSize = ELEMENT_SIZES[CanvasComponentType.OBJECTIVE_CARD]

  // 计算 Panel 尺寸
  const panelSize = calculatePanelSize(goals.length, panelColumns, cardSize)

  // 创建 Panel 元素
  const panelElement: CanvasElementData = {
    id: panelId,
    type: CanvasComponentType.OBJECTIVE_PANEL,
    position: {
      x: COLUMN_X_POSITIONS[1],
      y: startY,
    },
    size: panelSize,
    selected: false,
    data: { id: panelId },
  }

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
  const panelColumns = PANEL_GRID_COLUMNS[CanvasComponentType.CHAPTER_PANEL] || 3
  const cardSize = ELEMENT_SIZES[CanvasComponentType.CHAPTER_CARD]

  // 计算 Panel 尺寸
  const panelSize = calculatePanelSize(chapters.length, panelColumns, cardSize)

  const panelElement: CanvasElementData = {
    id: panelId,
    type: CanvasComponentType.CHAPTER_PANEL,
    position: {
      x: COLUMN_X_POSITIONS[1],
      y: startY,
    },
    size: panelSize,
    selected: false,
    data: { id: panelId },
  }

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
  const panelColumns = PANEL_GRID_COLUMNS[CanvasComponentType.COURSE_POINT_PANEL] || 3
  const cardSize = ELEMENT_SIZES[CanvasComponentType.COURSE_POINT_CARD]

  // 计算 Panel 尺寸
  const panelSize = calculatePanelSize(points.length, panelColumns, cardSize)

  const panelElement: CanvasElementData = {
    id: panelId,
    type: CanvasComponentType.COURSE_POINT_PANEL,
    position: {
      x: COLUMN_X_POSITIONS[1],
      y: startY,
    },
    size: panelSize,
    selected: false,
    data: { id: panelId },
  }

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
  const panelColumns = PANEL_GRID_COLUMNS[CanvasComponentType.KSA_PANEL] || 3
  const cardSize = ELEMENT_SIZES[CanvasComponentType.KSA_ITEM]

  // 计算 Panel 尺寸
  const panelSize = calculatePanelSize(ksas.length, panelColumns, cardSize)

  const panelElement: CanvasElementData = {
    id: panelId,
    type: CanvasComponentType.KSA_PANEL,
    position: {
      x: COLUMN_X_POSITIONS[1],
      y: startY,
    },
    size: panelSize,
    selected: false,
    data: { id: panelId },
  }

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
  const panelColumns = PANEL_GRID_COLUMNS[CanvasComponentType.OBJECTIVE_PANEL] || 3
  const cardSize = ELEMENT_SIZES[CanvasComponentType.OBJECTIVE_CARD]
  const cardId = `objective_${index + 1}`

  const cardData: ObjectiveCardData = {
    id: cardId,
    index: index + 1,
    content: goal.description || goal.content || "",
  }

  return {
    id: cardId,
    type: CanvasComponentType.OBJECTIVE_CARD,
    position: calculateCardPosition(index, panelColumns, cardSize),
    size: cardSize,
    selected: false,
    data: cardData,
    parentId: panelId,
    extent: "parent",
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
  },
  index: number,
  panelId: string
): CanvasElementData {
  const panelColumns = PANEL_GRID_COLUMNS[CanvasComponentType.CHAPTER_PANEL] || 3
  const cardSize = ELEMENT_SIZES[CanvasComponentType.CHAPTER_CARD]
  const cardId = `chapter_${index + 1}`

  const cardData: ChapterCardData = {
    id: cardId,
    index: index + 1,
    name: chapter.name || chapter.chapterName || "",
    theory_hours: chapter.theoryHours,
    practice_hours: chapter.practiceHours,
  }

  return {
    id: cardId,
    type: CanvasComponentType.CHAPTER_CARD,
    position: calculateCardPosition(index, panelColumns, cardSize),
    size: cardSize,
    selected: false,
    data: cardData,
    parentId: panelId,
    extent: "parent",
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
  const panelColumns = PANEL_GRID_COLUMNS[CanvasComponentType.COURSE_POINT_PANEL] || 3
  const cardSize = ELEMENT_SIZES[CanvasComponentType.COURSE_POINT_CARD]
  const cardId = `course_point_${index + 1}`

  const cardData: CoursePointCardData = {
    id: cardId,
    index: index + 1,
    name: point.name || point.title || "",
    description: point.description,
  }

  return {
    id: cardId,
    type: CanvasComponentType.COURSE_POINT_CARD,
    position: calculateCardPosition(index, panelColumns, cardSize),
    size: cardSize,
    selected: false,
    data: cardData,
    parentId: panelId,
    extent: "parent",
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
  const panelColumns = PANEL_GRID_COLUMNS[CanvasComponentType.KSA_PANEL] || 3
  const cardSize = ELEMENT_SIZES[CanvasComponentType.KSA_ITEM]

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
    id: cardId,
    type: CanvasComponentType.KSA_ITEM,
    position: calculateCardPosition(index, panelColumns, cardSize),
    size: cardSize,
    selected: false,
    data: cardData,
    parentId: panelId,
    extent: "parent",
  }
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
  courseGoals?: CourseGoalWithChildren[]
): CanvasData {
  const elements: CanvasElementData[] = []
  const edges: CanvasEdgeData[] = []

  const course = courseDetail.courseDetailData.course
  const pointksa = courseDetail.courseDetailData.pointksa

  // 1. 创建 course_info 元素
  const courseInfoElement = createCourseInfoElement(courseDetail)
  elements.push(courseInfoElement)

  // 2. 创建 objective_panel 和 objective_card 元素
  // 注意：courseGoals 是指标点数组，children 才是真正的教学目标
  let currentY = START_Y
  if (courseGoals && courseGoals.length > 0) {
    // 从指标点中提取所有教学目标（children）
    const teachingObjectives = courseGoals.flatMap((goal) => goal.children || [])

    if (teachingObjectives.length > 0) {
      const panelColumns = PANEL_GRID_COLUMNS[CanvasComponentType.OBJECTIVE_PANEL] || 3
      const cardSize = ELEMENT_SIZES[CanvasComponentType.OBJECTIVE_CARD]
      const objectivePanelSize = calculatePanelSize(teachingObjectives.length, panelColumns, cardSize)

      // 更新 Panel 数据，添加 items
      const objectiveItems = teachingObjectives.map((obj, idx) => ({
        id: `objective_${idx + 1}`,
        description: obj.description || obj.content || "",
      }))

      const objectivePanelElement: CanvasElementData = {
        id: "objective_panel_loaded",
        type: CanvasComponentType.OBJECTIVE_PANEL,
        position: {
          x: COLUMN_X_POSITIONS[1],
          y: currentY,
        },
        size: objectivePanelSize,
        selected: false,
        data: { id: "objective_panel_loaded", items: objectiveItems },
      }
      elements.push(objectivePanelElement)

      // 创建子卡片（使用真正的教学目标）
      teachingObjectives.forEach((obj, idx) => {
        const cardData: ObjectiveCardData = {
          id: `objective_${idx + 1}`,
          index: idx + 1,
          content: obj.description || obj.content || "",
        }

        elements.push({
          id: `objective_${idx + 1}`,
          type: CanvasComponentType.OBJECTIVE_CARD,
          position: calculateCardPosition(idx, panelColumns, cardSize),
          size: cardSize,
          selected: false,
          data: cardData,
          parentId: "objective_panel_loaded",
          extent: "parent",
        })
      })

      // 添加连线
      edges.push({
        id: generateEdgeId(courseInfoElement.id, objectivePanelElement.id),
        source: courseInfoElement.id,
        target: objectivePanelElement.id,
        type: "support",
      })

      currentY = objectivePanelElement.position.y + objectivePanelSize.height + ROW_GAP
    }
  }

  // 3. 创建 chapter_panel 和 chapter_card 元素
  const chapters = course.courseMatrixVOS || []
  if (chapters.length > 0) {
    const panelColumns = PANEL_GRID_COLUMNS[CanvasComponentType.CHAPTER_PANEL] || 3
    const cardSize = ELEMENT_SIZES[CanvasComponentType.CHAPTER_CARD]
    const panelSize = calculatePanelSize(chapters.length, panelColumns, cardSize)

    const chapterItems = chapters.map((chapter, idx) => ({
      id: `chapter_${idx + 1}`,
      name: chapter.name || chapter.chapterName || "",
      theoryHours: chapter.theoryHours,
      practiceHours: chapter.practiceHours,
    }))

    const chapterPanelElement: CanvasElementData = {
      id: "chapter_panel_loaded",
      type: CanvasComponentType.CHAPTER_PANEL,
      position: {
        x: COLUMN_X_POSITIONS[1],
        y: currentY,
      },
      size: panelSize,
      selected: false,
      data: { id: "chapter_panel_loaded", items: chapterItems },
    }
    elements.push(chapterPanelElement)

    // 创建子卡片
    chapters.forEach((chapter, idx) => {
      const cardData: ChapterCardData = {
        id: `chapter_${idx + 1}`,
        index: idx + 1,
        name: chapter.name || chapter.chapterName || "",
        theory_hours: chapter.theoryHours,
        practice_hours: chapter.practiceHours,
      }

      elements.push({
        id: `chapter_${idx + 1}`,
        type: CanvasComponentType.CHAPTER_CARD,
        position: calculateCardPosition(idx, panelColumns, cardSize),
        size: cardSize,
        selected: false,
        data: cardData,
        parentId: "chapter_panel_loaded",
        extent: "parent",
      })
    })

    // 添加连线
    edges.push({
      id: generateEdgeId(courseInfoElement.id, chapterPanelElement.id),
      source: courseInfoElement.id,
      target: chapterPanelElement.id,
      type: "support",
    })

    currentY = chapterPanelElement.position.y + panelSize.height + ROW_GAP
  }

  // 4. 创建 course_point_panel 和 course_point_card 元素
  const coursePoints = pointksa.points || []
  if (coursePoints.length > 0) {
    const panelColumns = PANEL_GRID_COLUMNS[CanvasComponentType.COURSE_POINT_PANEL] || 3
    const cardSize = ELEMENT_SIZES[CanvasComponentType.COURSE_POINT_CARD]
    const panelSize = calculatePanelSize(coursePoints.length, panelColumns, cardSize)

    const coursePointItems = coursePoints.map((point, idx) => ({
      id: `course_point_${idx + 1}`,
      name: point.name || point.title || "",
      description: point.description,
    }))

    const coursePointPanelElement: CanvasElementData = {
      id: "course_point_panel_loaded",
      type: CanvasComponentType.COURSE_POINT_PANEL,
      position: {
        x: COLUMN_X_POSITIONS[1],
        y: currentY,
      },
      size: panelSize,
      selected: false,
      data: { id: "course_point_panel_loaded", items: coursePointItems },
    }
    elements.push(coursePointPanelElement)

    // 创建子卡片
    coursePoints.forEach((point, idx) => {
      const cardData: CoursePointCardData = {
        id: `course_point_${idx + 1}`,
        index: idx + 1,
        name: point.name || point.title || "",
        description: point.description,
      }

      elements.push({
        id: `course_point_${idx + 1}`,
        type: CanvasComponentType.COURSE_POINT_CARD,
        position: calculateCardPosition(idx, panelColumns, cardSize),
        size: cardSize,
        selected: false,
        data: cardData,
        parentId: "course_point_panel_loaded",
        extent: "parent",
      })
    })

    // 添加连线
    edges.push({
      id: generateEdgeId(courseInfoElement.id, coursePointPanelElement.id),
      source: courseInfoElement.id,
      target: coursePointPanelElement.id,
      type: "support",
    })

    currentY = coursePointPanelElement.position.y + panelSize.height + ROW_GAP
  }

  // 5. 创建 ksa_panel 和 ksa_item 元素
  const ksas = pointksa.ksas || []
  if (ksas.length > 0) {
    const panelColumns = PANEL_GRID_COLUMNS[CanvasComponentType.KSA_PANEL] || 3
    const cardSize = ELEMENT_SIZES[CanvasComponentType.KSA_ITEM]
    const panelSize = calculatePanelSize(ksas.length, panelColumns, cardSize)

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

    const ksaPanelElement: CanvasElementData = {
      id: "ksa_panel_loaded",
      type: CanvasComponentType.KSA_PANEL,
      position: {
        x: COLUMN_X_POSITIONS[1],
        y: currentY,
      },
      size: panelSize,
      selected: false,
      data: { id: "ksa_panel_loaded", items: ksaItems },
    }
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
      }

      // 使用排序后的索引计算位置，这样同类别的卡片会聚合在一起
      elements.push({
        id: cardId,
        type: CanvasComponentType.KSA_ITEM,
        position: calculateCardPosition(sortedIndex, panelColumns, cardSize),
        size: cardSize,
        selected: false,
        data: cardData,
        parentId: "ksa_panel_loaded",
        extent: "parent",
      })
    })

    // 添加连线
    edges.push({
      id: generateEdgeId(courseInfoElement.id, ksaPanelElement.id),
      source: courseInfoElement.id,
      target: ksaPanelElement.id,
      type: "support",
    })
  }

  return {
    elements,
    edges,
  }
}
