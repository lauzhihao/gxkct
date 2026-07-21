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
  CourseInfoData,
  ObjectiveCardData,
  ChapterCardData,
  ProjectMatrixData,
} from "@/components/canvas-elements"
import type { ConnectionMenuOption } from "@/components/canvas-drawers/canvas-connection-menu"
import { toast } from "sonner"

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
  /** 等待 React 画布状态和 ref 同步完成 */
  waitForCanvasStateFlush: () => Promise<void>
}

interface ProjectMatrixSeed {
  chapter: ChapterCardData
  coursePoints: Array<{ id: string; name: string; description?: string }>
}

function readNonNegativeHours(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

interface CourseHourPair {
  theory: number
  practice: number
}

function readCourseHourPair(theoryValue: unknown, practiceValue: unknown): CourseHourPair | null {
  const theory = readNonNegativeHours(theoryValue)
  const practice = readNonNegativeHours(practiceValue)
  return theory === null || practice === null ? null : { theory, practice }
}

function hasPositiveTotal(hours: CourseHourPair | null): hours is CourseHourPair {
  return hours !== null && hours.theory + hours.practice > 0
}

/** 章节生成依赖课程总学时，避免把快速建课阶段的 0/0 快照发给 AI。 */
export function getChapterGenerationReadiness(
  canvasElements: CanvasElementData[]
): { ready: boolean; message?: string } {
  const courseInfoElement = canvasElements.find(
    (element) => element.type === CanvasComponentType.COURSE_INFO
  )
  if (!courseInfoElement) {
    return { ready: false, message: "请先创建并完善课程信息，再生成章节项目。" }
  }

  const courseInfo = courseInfoElement.data as CourseInfoData
  const snakeCaseHours = readCourseHourPair(
    courseInfo.total_theory_hours,
    courseInfo.total_practice_hours
  )
  const metadataHours = readCourseHourPair(
    courseInfo.metadata?.theoryPeriod,
    courseInfo.metadata?.practicePeriod
  )

  // 0/0 常来自快速建课的旧快照；只要 metadata 已有有效学时，就不应被旧值抢占。
  if (
    hasPositiveTotal(snakeCaseHours)
    && hasPositiveTotal(metadataHours)
    && (
      snakeCaseHours.theory !== metadataHours.theory
      || snakeCaseHours.practice !== metadataHours.practice
    )
  ) {
    return {
      ready: false,
      message: "课程学时数据不一致，请先重新保存课程信息后再生成章节项目。",
    }
  }

  const resolvedHours = hasPositiveTotal(metadataHours)
    ? metadataHours
    : hasPositiveTotal(snakeCaseHours)
      ? snakeCaseHours
      : null

  if (!resolvedHours) {
    return {
      ready: false,
      message: "课程总学时仍为 0 或未填写，请先设置有效的理论学时和实践学时。",
    }
  }

  return { ready: true }
}

function collectProjectMatrixSeeds(
  canvasElements: CanvasElementData[],
  targetChapterId?: string,
): {
  seeds: ProjectMatrixSeed[]
  missingChapterNames: string[]
} {
  const chapterCards = canvasElements
    .filter((element) => element.type === CanvasComponentType.CHAPTER_CARD)
    .map((element) => element.data as ChapterCardData)
    .filter((chapter) => !targetChapterId || String(chapter.id) === String(targetChapterId))
    .sort((a, b) => a.index - b.index)
  const courseMatrixElement = canvasElements.find(
    (element) => element.type === CanvasComponentType.COURSE_MATRIX
  )
  const courseMatrix = courseMatrixElement?.data as CourseMatrixData | undefined
  const seeds: ProjectMatrixSeed[] = []
  const missingChapterNames: string[] = []

  for (const chapter of chapterCards) {
    const chapterRow = courseMatrix?.rows?.find(
      (row) => String(row.chapter_id) === String(chapter.id)
    )
    const coursePointMap = new Map<
      string,
      { id: string; name: string; description?: string }
    >()

    const supports = Array.isArray(chapterRow?.supports) ? chapterRow.supports : []
    for (const support of supports) {
      const coursePoints = Array.isArray(support.course_points) ? support.course_points : []
      for (const coursePoint of coursePoints) {
        const id = String(coursePoint.id || "").trim()
        const name = String(coursePoint.name || "").trim()
        if (id && name && !coursePointMap.has(id)) {
          coursePointMap.set(id, {
            id,
            name,
            description: coursePoint.description,
          })
        }
      }
    }

    if (coursePointMap.size === 0) {
      missingChapterNames.push(chapter.name || `第${chapter.index}章`)
      continue
    }

    seeds.push({ chapter, coursePoints: Array.from(coursePointMap.values()) })
  }

  return { seeds, missingChapterNames }
}

/** 项目矩阵批量生成要求每个章节都已在课程矩阵中关联至少一个课程要点。 */
export function getProjectMatrixGenerationReadiness(
  canvasElements: CanvasElementData[],
  targetChapterId?: string,
): { ready: boolean; seeds: ProjectMatrixSeed[]; message?: string } {
  const courseInfoElement = canvasElements.find(
    (element) => element.type === CanvasComponentType.COURSE_INFO
  )
  const courseInfo = courseInfoElement?.data as CourseInfoData | undefined
  const courseName = String(courseInfo?.name || courseInfo?.course_name || "").trim()
  if (!courseName) {
    return { ready: false, seeds: [], message: "请先完善课程名称，再生成项目矩阵。" }
  }

  if (!canvasElements.some((element) => element.type === CanvasComponentType.KSA_ITEM)) {
    return { ready: false, seeds: [], message: "请先生成并完善 KSA 内容，再生成项目矩阵。" }
  }

  if (!canvasElements.some((element) => element.type === CanvasComponentType.COURSE_MATRIX)) {
    return { ready: false, seeds: [], message: "请先生成课程矩阵，再生成项目矩阵。" }
  }

  const chapterCount = canvasElements.filter((element) => {
    if (element.type !== CanvasComponentType.CHAPTER_CARD) return false
    const chapter = element.data as ChapterCardData
    return !targetChapterId || String(chapter.id) === String(targetChapterId)
  }).length
  if (chapterCount === 0) {
    return {
      ready: false,
      seeds: [],
      message: targetChapterId
        ? "未找到当前项目矩阵对应的章节，请先检查章节数据。"
        : "请先生成章节项目，再生成项目矩阵。",
    }
  }

  const { seeds, missingChapterNames } = collectProjectMatrixSeeds(
    canvasElements,
    targetChapterId,
  )
  if (missingChapterNames.length > 0) {
    const visibleNames = missingChapterNames.slice(0, 3).join("、")
    const remaining = missingChapterNames.length - 3
    return {
      ready: false,
      seeds,
      message: `请先在课程矩阵中为${visibleNames}${remaining > 0 ? `等${missingChapterNames.length}个章节` : ""}配置课程要点。`,
    }
  }

  return { ready: seeds.length > 0, seeds, message: seeds.length > 0 ? undefined : "课程矩阵中没有可用于项目矩阵的课程要点。" }
}

async function runFillAfterCanvasReady(
  ctx: ConnectionMenuContext,
  fill: () => Promise<void>
): Promise<void> {
  await ctx.waitForCanvasStateFlush()
  await fill()
}

/**
 * 菜单选项到面板类型的映射
 */
const OPTION_TO_PANEL_TYPE: Record<string, CanvasComponentType> = {
  objective: CanvasComponentType.OBJECTIVE_PANEL,
  coursePoint: CanvasComponentType.COURSE_POINT_PANEL,
  chapter: CanvasComponentType.CHAPTER_PANEL,
  ksa: CanvasComponentType.KSA_PANEL,
  graduationSupport: CanvasComponentType.GRADUATION_SUPPORT,
}

/**
 * 面板选项到标题的映射
 */
const OPTION_TO_TITLE: Record<string, string> = {
  objective: "教学目标",
  coursePoint: "课点信息",
  chapter: "章节项目",
  ksa: "KSA",
  graduationSupport: "专业矩阵",
}

/**
 * 处理课程矩阵创建
 */
async function handleCourseMatrixOption(ctx: ConnectionMenuContext): Promise<void> {
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

  // 画布状态提交后再填充，避免上传创建前的旧快照
  await runFillAfterCanvasReady(ctx, ctx.handleFillCourseMatrix)
}

/**
 * 处理项目矩阵创建
 */
async function handleProjectMatrixOption(ctx: ConnectionMenuContext): Promise<void> {
  const readiness = getProjectMatrixGenerationReadiness(ctx.canvasElements)
  if (!readiness.ready) {
    toast.error(readiness.message)
    return
  }

  // 为每个章节创建一个项目矩阵
  readiness.seeds.forEach(({ chapter, coursePoints }) => {
    const projectMatrixData: ProjectMatrixData = {
      chapter_id: chapter.id,
      chapter_index: chapter.index,
      chapter_name: chapter.name,
      task_objectives: [],
      rows: coursePoints.map((cp) => ({
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

  await runFillAfterCanvasReady(ctx, ctx.handleFillProjectMatrix)
}

/**
 * 处理课程信息创建
 */
async function handleCourseInfoOption(ctx: ConnectionMenuContext): Promise<void> {
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

  await runFillAfterCanvasReady(ctx, () => ctx.handleFillCourseInfo(courseInfoId))
}

/**
 * 处理开课说明创建
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
      name: "开课说明",
      status: "draft",
      createdAt: new Date().toLocaleDateString("zh-CN"),
    },
    position,
  })
}

/**
 * 处理面板创建（教学目标、课点、章节、KSA）
 */
async function handlePanelOption(
  ctx: ConnectionMenuContext,
  option: string,
  panelType: CanvasComponentType
): Promise<void> {
  // 防御性兜底：单例面板（如课点信息）如果已存在则忽略重复创建
  const panelExists = ctx.canvasElements.some((el) => el.type === panelType)
  if (panelExists) {
    return
  }

  if (option === "chapter") {
    const readiness = getChapterGenerationReadiness(ctx.canvasElements)
    if (!readiness.ready) {
      toast.error(readiness.message)
      return
    }
  }

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
  const fillHandlers: Record<string, () => Promise<void>> = {
    objective: () => ctx.handleFillObjectivePanel(panelId),
    chapter: () => ctx.handleFillChapterPanel(panelId),
    coursePoint: () => ctx.handleFillCoursePoints(),
    ksa: () => ctx.handleFillKsa(),
  }

  const fillHandler = fillHandlers[option]
  if (fillHandler) {
    await runFillAfterCanvasReady(ctx, fillHandler)
  }
}

/**
 * 创建连接菜单处理器
 */
export function createConnectionMenuHandler(ctx: ConnectionMenuContext) {
  return async (
    option: ConnectionMenuOption,
    _sourceNodeId: string | null,
    position?: { x: number; y: number }
  ): Promise<void> => {
    // 处理课程矩阵
    if (option === "courseMatrix") {
      await handleCourseMatrixOption(ctx)
      return
    }

    // 处理项目矩阵
    if (option === "projectMatrix") {
      await handleProjectMatrixOption(ctx)
      return
    }

    // 处理课程信息
    if (option === "courseInfo") {
      await handleCourseInfoOption(ctx)
      return
    }

    // 处理开课说明
    if (option === "courseReport") {
      handleCourseReportOption(ctx, position)
      return
    }

    // 处理面板类型
    const panelType = OPTION_TO_PANEL_TYPE[option]
    if (panelType) {
      await handlePanelOption(ctx, option, panelType)
    }
  }
}
