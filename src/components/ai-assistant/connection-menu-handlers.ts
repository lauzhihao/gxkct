/**
 * 连接菜单处理逻辑
 *
 * 处理画布连接菜单的各种选项，创建对应的组件
 */

import {
  CanvasAction,
  CanvasComponentType,
  CanvasEventMessage,
  CanvasElementData,
  CourseMatrixData,
  ObjectiveCardData,
  ChapterCardData,
  ProjectMatrixData,
} from "@/components/canvas-elements"
import type { ConnectionMenuOption } from "@/components/canvas-drawers/canvas-connection-menu"

/**
 * 连接菜单处理器上下文
 */
export interface ConnectionMenuContext {
  /** 画布元素列表 */
  canvasElements: CanvasElementData[]
  /** 处理画布事件 */
  handleCanvasEvent: (event: CanvasEventMessage) => void
  /** 填充课程矩阵 */
  handleFillCourseMatrix: () => Promise<void>
  /** 填充项目矩阵 */
  handleFillProjectMatrix: () => Promise<void>
  /** 填充章节面板 */
  handleFillChapterPanel: (panelId?: string) => Promise<void>
  /** 填充教学目标面板 */
  handleFillObjectivePanel: (panelId?: string) => Promise<void>
  /** 填充课程信息 */
  handleFillCourseInfo: (courseInfoId: string) => Promise<void>
  /** 填充课点信息 */
  handleFillCoursePoints: () => Promise<void>
  /** 填充 KSA */
  handleFillKsa: () => Promise<void>
}

/**
 * 菜单选项到面板类型的映射
 */
const OPTION_TO_PANEL_TYPE: Record<string, CanvasComponentType> = {
  objective: CanvasComponentType.OBJECTIVE_PANEL,
  coursePoint: CanvasComponentType.COURSE_POINT_PANEL,
  chapter: CanvasComponentType.CHAPTER_PANEL,
  ksa: CanvasComponentType.KSA_PANEL,
}

/**
 * 面板选项到标题的映射
 */
const OPTION_TO_TITLE: Record<string, string> = {
  objective: "教学目标",
  coursePoint: "课点信息",
  chapter: "章节项目",
  ksa: "KSA",
}

/**
 * 处理课程矩阵创建
 */
function handleCourseMatrixOption(ctx: ConnectionMenuContext): void {
  // 从画布元素中获取教学目标和章节数据
  const objectiveCards = ctx.canvasElements
    .filter((el) => el.type === CanvasComponentType.OBJECTIVE_CARD)
    .map((el) => el.data as ObjectiveCardData)
    .sort((a, b) => a.index - b.index)

  const chapterCards = ctx.canvasElements
    .filter((el) => el.type === CanvasComponentType.CHAPTER_CARD)
    .map((el) => el.data as ChapterCardData)
    .sort((a, b) => a.index - b.index)

  // 构建课程矩阵数据
  const courseMatrixData: CourseMatrixData = {
    course_name: "",
    objectives: objectiveCards.map((obj) => ({
      id: obj.id,
      index: obj.index,
      content: obj.content,
    })),
    rows: chapterCards.map((chapter) => ({
      chapter_id: chapter.id,
      chapter_index: chapter.index,
      chapter_name: chapter.name,
      supports: objectiveCards.map((obj) => ({
        objective_id: obj.id,
        objective_index: obj.index,
        course_points: [],
      })),
    })),
  }

  // 创建课程矩阵
  ctx.handleCanvasEvent({
    type: "canvas",
    action: CanvasAction.SET,
    component: CanvasComponentType.COURSE_MATRIX,
    data: courseMatrixData,
  })

  // 自动填充课程矩阵支撑关系
  setTimeout(() => {
    ctx.handleFillCourseMatrix()
  }, 500)
}

/**
 * 处理项目矩阵创建
 */
function handleProjectMatrixOption(ctx: ConnectionMenuContext): void {
  // 从画布元素中获取章节数据
  const chapterCards = ctx.canvasElements
    .filter((el) => el.type === CanvasComponentType.CHAPTER_CARD)
    .map((el) => el.data as ChapterCardData)
    .sort((a, b) => a.index - b.index)

  // 获取课程矩阵数据
  const courseMatrixElement = ctx.canvasElements.find(
    (el) => el.type === CanvasComponentType.COURSE_MATRIX
  )
  const courseMatrixData = courseMatrixElement?.data as CourseMatrixData | undefined

  // 为每个章节创建一个项目矩阵
  chapterCards.forEach((chapter) => {
    const chapterRow = courseMatrixData?.rows?.find(
      (row) => row.chapter_id === chapter.id
    )

    // 收集该章节所有教学目标单元格中已设置的课点（去重）
    const coursePointMap = new Map<
      string,
      { id: string; name: string; description?: string }
    >()
    if (chapterRow?.supports) {
      for (const support of chapterRow.supports) {
        if (support.course_points) {
          for (const cp of support.course_points) {
            if (!coursePointMap.has(cp.id)) {
              coursePointMap.set(cp.id, {
                id: cp.id,
                name: cp.name,
                description: undefined,
              })
            }
          }
        }
      }
    }

    // 如果该章节没有设置任何课点支撑，则跳过
    if (coursePointMap.size === 0) {
      return
    }

    const projectMatrixData: ProjectMatrixData = {
      chapter_id: chapter.id,
      chapter_index: chapter.index,
      chapter_name: chapter.name,
      task_objectives: [],
      rows: Array.from(coursePointMap.values()).map((cp) => ({
        course_point_id: cp.id,
        course_point_name: cp.name,
        course_point_description: cp.description,
        objective_supports: [],
      })),
    }

    // 创建项目矩阵
    ctx.handleCanvasEvent({
      type: "canvas",
      action: CanvasAction.CREATE,
      component: CanvasComponentType.PROJECT_MATRIX,
      data: projectMatrixData,
    })
  })

  // 自动填充项目矩阵
  setTimeout(() => {
    ctx.handleFillProjectMatrix()
  }, 500)
}

/**
 * 处理课程信息创建
 */
function handleCourseInfoOption(ctx: ConnectionMenuContext): void {
  const courseInfoId = `course_info_${Date.now()}`

  ctx.handleCanvasEvent({
    type: "canvas",
    action: CanvasAction.SET,
    component: CanvasComponentType.COURSE_INFO,
    data: {
      id: courseInfoId,
      name: "",
      metadata: {},
    },
  })

  setTimeout(() => {
    ctx.handleFillCourseInfo(courseInfoId)
  }, 500)
}

/**
 * 处理开课报告创建
 */
function handleCourseReportOption(
  ctx: ConnectionMenuContext,
  position?: { x: number; y: number }
): void {
  ctx.handleCanvasEvent({
    type: "canvas",
    action: CanvasAction.CREATE,
    component: CanvasComponentType.COURSE_REPORT,
    data: {
      id: `course-report-${Date.now()}`,
      name: "开课报告",
      status: "draft",
      createdAt: new Date().toLocaleDateString("zh-CN"),
    },
    position,
  })
}

/**
 * 处理面板创建（教学目标、课点、章节、KSA）
 */
function handlePanelOption(
  ctx: ConnectionMenuContext,
  option: string,
  panelType: CanvasComponentType
): void {
  const panelId = `${panelType}_${Date.now()}`

  ctx.handleCanvasEvent({
    type: "canvas",
    action: CanvasAction.CREATE,
    component: panelType,
    data: {
      id: panelId,
      title: OPTION_TO_TITLE[option] || option,
    },
  })

  // 根据不同类型触发对应的填充操作
  const fillHandlers: Record<string, () => void> = {
    objective: () => setTimeout(() => ctx.handleFillObjectivePanel(panelId), 500),
    chapter: () => setTimeout(() => ctx.handleFillChapterPanel(panelId), 500),
    coursePoint: () => setTimeout(() => ctx.handleFillCoursePoints(), 200),
    ksa: () => setTimeout(() => ctx.handleFillKsa(), 200),
  }

  fillHandlers[option]?.()
}

/**
 * 创建连接菜单处理器
 */
export function createConnectionMenuHandler(ctx: ConnectionMenuContext) {
  return (
    option: ConnectionMenuOption,
    _sourceNodeId: string | null,
    position?: { x: number; y: number }
  ): void => {
    // 处理课程矩阵
    if (option === "courseMatrix") {
      handleCourseMatrixOption(ctx)
      return
    }

    // 处理项目矩阵
    if (option === "projectMatrix") {
      handleProjectMatrixOption(ctx)
      return
    }

    // 处理课程信息
    if (option === "courseInfo") {
      handleCourseInfoOption(ctx)
      return
    }

    // 处理开课报告
    if (option === "courseReport") {
      handleCourseReportOption(ctx, position)
      return
    }

    // 处理面板类型
    const panelType = OPTION_TO_PANEL_TYPE[option]
    if (panelType) {
      handlePanelOption(ctx, option, panelType)
    }
  }
}
