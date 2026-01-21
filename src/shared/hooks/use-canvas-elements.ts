"use client"

import { useState, useCallback } from "react"
import type { Node, Edge } from "@xyflow/react"
import {
  CanvasElementData,
  CanvasComponentType,
  CanvasAction,
  CanvasEventMessage,
  CanvasComponentData,
  CanvasEdgeData,
  ConnectEventData,
  LayoutEventData,
  SourceDocumentsData,
  SourceDocumentCardData,
} from "@/components/canvas-elements/types"
import { ElementPosition } from "@/components/canvas-elements/types"
import { FlowNodeType } from "@/components/flow/utils/types"
import { applyDagreLayout, generateEdgeId } from "@/components/flow/utils/layout"

// 默认元素尺寸配置
// 注意：Card 高度需要匹配实际渲染高度（头部约37px + 内容区padding+文字 + 边框）
// Panel 默认高度需与 calculatePanelSize(0, columns, cardSize) 计算结果一致
// 计算公式：PANEL_PADDING.top(75) + cardHeight + PANEL_PADDING.bottom(10)，最小 200px
const DEFAULT_ELEMENT_SIZES: Record<CanvasComponentType, { width: number; height: number }> = {
  // 源文档面板和卡片
  [CanvasComponentType.SOURCE_DOCUMENT_PANEL]: { width: 320, height: 200 },
  [CanvasComponentType.SOURCE_DOCUMENT_CARD]: { width: 280, height: 100 },
  // 课程相关
  [CanvasComponentType.COURSE_INFO]: { width: 480, height: 300 },
  [CanvasComponentType.OBJECTIVE_PANEL]: { width: 320, height: 200 },    // 50 + 130 + 20 = 200
  [CanvasComponentType.OBJECTIVE_CARD]: { width: 280, height: 130 },
  [CanvasComponentType.COURSE_POINT_PANEL]: { width: 320, height: 210 }, // 50 + 140 + 20 = 210
  [CanvasComponentType.COURSE_POINT_CARD]: { width: 280, height: 140 },
  [CanvasComponentType.CHAPTER_PANEL]: { width: 320, height: 200 },      // 50 + 130 + 20 = 200
  [CanvasComponentType.CHAPTER_CARD]: { width: 280, height: 130 },
  [CanvasComponentType.KSA_PANEL]: { width: 320, height: 200 },          // 75 + 110 + 10 = 195 → min 200
  [CanvasComponentType.KSA_ITEM]: { width: 260, height: 110 },           // 头部37 + 内容区p-3(24) + 文字2行(40) + 边距 ≈ 110
  [CanvasComponentType.COURSE_MATRIX]: { width: 1100, height: 680 },
  [CanvasComponentType.PROJECT_MATRIX_PANEL]: { width: 900, height: 200 },  // 最小高度，实际会动态计算
  [CanvasComponentType.PROJECT_MATRIX]: { width: 900, height: 200 },        // 最小高度，实际会动态计算
  [CanvasComponentType.COURSE_REPORT]: { width: 480, height: 180 },         // 开课报告
}

// 项目矩阵高度计算配置
const PROJECT_MATRIX_HEIGHT_CONFIG = {
  BASE_HEIGHT: 110,      // 基础高度：头部(37) + 内容区padding(24) + 表格头部(49)
  ROW_HEIGHT: 49,        // 每行高度：py-3(24) + 文字行高 + 边框
  MIN_HEIGHT: 160,       // 最小高度（无数据时）
  MAX_HEIGHT: 1200,      // 最大高度（与 max-h-[1200px] 对应）
}

/**
 * 根据项目矩阵数据计算实际高度
 * @param data 项目矩阵数据
 * @returns 计算后的高度
 */
function calculateProjectMatrixHeight(data: unknown): number {
  const matrixData = data as { rows?: Array<unknown> }
  const rowCount = matrixData?.rows?.length || 0

  if (rowCount === 0) {
    return PROJECT_MATRIX_HEIGHT_CONFIG.MIN_HEIGHT
  }

  const calculatedHeight =
    PROJECT_MATRIX_HEIGHT_CONFIG.BASE_HEIGHT +
    rowCount * PROJECT_MATRIX_HEIGHT_CONFIG.ROW_HEIGHT

  // 限制在最小和最大高度之间
  return Math.min(
    Math.max(calculatedHeight, PROJECT_MATRIX_HEIGHT_CONFIG.MIN_HEIGHT),
    PROJECT_MATRIX_HEIGHT_CONFIG.MAX_HEIGHT
  )
}

/**
 * 转换后端SSE返回的 course_info 数据为前端期望的格式
 * 后端格式: { course_name, course_type, course_nature, description, total_theory_hours, total_practice_hours, ... }
 * 前端格式: { name, metadata: { courseType, courseNatureName, introduction, theoryPeriod, practicePeriod, ... } }
 */
function transformCourseInfoData(data: Record<string, unknown>): Record<string, unknown> {
  // 如果已经是前端格式（有 name 字段），直接返回
  if (data.name !== undefined) {
    return data
  }

  // 转换后端格式为前端格式
  const transformed: Record<string, unknown> = {
    name: data.course_name || '',
    type: data.course_type || '',
    metadata: {
      courseType: data.course_type,
      courseNatureName: data.course_nature,
      introduction: data.description,
      theoryPeriod: data.total_theory_hours,
      practicePeriod: data.total_practice_hours,
      // 保留其他可能的字段
      targetAudience: data.target_audience,
      courseLevel: data.course_level,
    },
  }

  // 保留原始数据中的其他字段（如 id）
  if (data.id) {
    transformed.id = data.id
  }

  return transformed
}

/**
 * 深度合并两个对象
 * 用于SSE UPDATE事件的部分数据更新，将新数据合并到现有数据中
 * @param target 目标对象（现有数据）
 * @param source 源对象（新数据）
 * @returns 合并后的新对象
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  // 如果source为空，直接返回target的副本
  if (!source || Object.keys(source).length === 0) {
    return { ...target }
  }

  const result = { ...target } as T

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key]
    const targetValue = target[key]

    // source显式为null时，覆盖target
    if (sourceValue === null) {
      result[key] = null as T[keyof T]
    }
    // source为undefined时，保留target值
    else if (sourceValue === undefined) {
      // 保持target原值，不做处理
    }
    // 两者都是普通对象时，递归合并
    else if (
      typeof sourceValue === 'object' &&
      typeof targetValue === 'object' &&
      !Array.isArray(sourceValue) &&
      !Array.isArray(targetValue) &&
      targetValue !== null
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T]
    }
    // 数组或基本类型：直接用source覆盖
    else {
      result[key] = sourceValue as T[keyof T]
    }
  }

  return result
}

// CanvasComponentType 到 FlowNodeType 的映射
const COMPONENT_TO_NODE_TYPE: Partial<Record<CanvasComponentType, FlowNodeType>> = {
  // 源文档节点映射
  [CanvasComponentType.SOURCE_DOCUMENT_PANEL]: FlowNodeType.SOURCE_DOCUMENT_PANEL,
  [CanvasComponentType.SOURCE_DOCUMENT_CARD]: FlowNodeType.SOURCE_DOCUMENT,
  // 课程相关节点映射
  [CanvasComponentType.COURSE_INFO]: FlowNodeType.COURSE_INFO,
  [CanvasComponentType.OBJECTIVE_CARD]: FlowNodeType.OBJECTIVE,
  [CanvasComponentType.COURSE_POINT_CARD]: FlowNodeType.COURSE_POINT,
  [CanvasComponentType.CHAPTER_CARD]: FlowNodeType.CHAPTER,
  [CanvasComponentType.KSA_ITEM]: FlowNodeType.KSA,
  [CanvasComponentType.COURSE_MATRIX]: FlowNodeType.COURSE_MATRIX,
  [CanvasComponentType.PROJECT_MATRIX]: FlowNodeType.PROJECT_MATRIX,
  [CanvasComponentType.COURSE_REPORT]: FlowNodeType.COURSE_REPORT,
  // Panel 节点映射
  [CanvasComponentType.OBJECTIVE_PANEL]: FlowNodeType.OBJECTIVE_PANEL,
  [CanvasComponentType.COURSE_POINT_PANEL]: FlowNodeType.COURSE_POINT_PANEL,
  [CanvasComponentType.CHAPTER_PANEL]: FlowNodeType.CHAPTER_PANEL,
  [CanvasComponentType.KSA_PANEL]: FlowNodeType.KSA_PANEL,
}

// Panel 类型列表
const PANEL_TYPES: CanvasComponentType[] = [
  CanvasComponentType.SOURCE_DOCUMENT_PANEL,
  CanvasComponentType.OBJECTIVE_PANEL,
  CanvasComponentType.COURSE_POINT_PANEL,
  CanvasComponentType.CHAPTER_PANEL,
  CanvasComponentType.KSA_PANEL,
]

// Card 到 Panel 的映射
const CARD_TO_PANEL_MAP: Partial<Record<CanvasComponentType, CanvasComponentType>> = {
  [CanvasComponentType.SOURCE_DOCUMENT_CARD]: CanvasComponentType.SOURCE_DOCUMENT_PANEL,
  [CanvasComponentType.OBJECTIVE_CARD]: CanvasComponentType.OBJECTIVE_PANEL,
  [CanvasComponentType.COURSE_POINT_CARD]: CanvasComponentType.COURSE_POINT_PANEL,
  [CanvasComponentType.CHAPTER_CARD]: CanvasComponentType.CHAPTER_PANEL,
  [CanvasComponentType.KSA_ITEM]: CanvasComponentType.KSA_PANEL,
}

// Panel 到 Card 的反向映射（用于获取 Card 尺寸计算 Panel 初始大小）
const PANEL_TO_CARD_MAP: Partial<Record<CanvasComponentType, CanvasComponentType>> = {
  [CanvasComponentType.SOURCE_DOCUMENT_PANEL]: CanvasComponentType.SOURCE_DOCUMENT_CARD,
  [CanvasComponentType.OBJECTIVE_PANEL]: CanvasComponentType.OBJECTIVE_CARD,
  [CanvasComponentType.COURSE_POINT_PANEL]: CanvasComponentType.COURSE_POINT_CARD,
  [CanvasComponentType.CHAPTER_PANEL]: CanvasComponentType.CHAPTER_CARD,
  [CanvasComponentType.KSA_PANEL]: CanvasComponentType.KSA_ITEM,
}

// ============ 水平思维导图式布局配置 ============

// 课程信息 → 四个基础面板（一对多，水平展开）
const COURSE_INFO_TO_PANELS: CanvasComponentType[] = [
  CanvasComponentType.OBJECTIVE_PANEL,    // A - 教学目标
  CanvasComponentType.CHAPTER_PANEL,      // B - 章节项目
  CanvasComponentType.COURSE_POINT_PANEL, // C - 课点信息
  CanvasComponentType.KSA_PANEL,          // D - KSA三要素
]

// 第1列面板的纵向排列顺序（从上到下：A/B/C/D）
const BASIC_PANELS_ORDER: CanvasComponentType[] = [
  CanvasComponentType.OBJECTIVE_PANEL,    // A - 教学目标
  CanvasComponentType.CHAPTER_PANEL,      // B - 章节项目
  CanvasComponentType.COURSE_POINT_PANEL, // C - 课点信息
  CanvasComponentType.KSA_PANEL,          // D - KSA三要素
]

// 汇聚到课程矩阵的面板（A/B/C，不包含 D）
const PANELS_TO_MATRIX: CanvasComponentType[] = [
  CanvasComponentType.OBJECTIVE_PANEL,
  CanvasComponentType.CHAPTER_PANEL,
  CanvasComponentType.COURSE_POINT_PANEL,
]

// 单例组件类型（画布内唯一，重复创建时忽略）
const SINGLETON_COMPONENT_TYPES: CanvasComponentType[] = [
  CanvasComponentType.SOURCE_DOCUMENT_PANEL, // 源文档面板
  CanvasComponentType.COURSE_INFO,        // 课程信息卡片
  CanvasComponentType.OBJECTIVE_PANEL,    // 教学目标面板
  CanvasComponentType.COURSE_POINT_PANEL, // 课点面板
  CanvasComponentType.CHAPTER_PANEL,      // 章节面板
  CanvasComponentType.KSA_PANEL,          // KSA面板
  CanvasComponentType.COURSE_MATRIX,      // 课程矩阵
  CanvasComponentType.COURSE_REPORT,      // 开课报告
]

// 水平布局层级列定义
const LAYOUT_COLUMNS = {
  COURSE_INFO: 0,      // 第0列：课程信息（源文档面板在其上方）
  BASIC_PANELS: 1,     // 第1列：四个基础面板（A/B/C/D）
  COURSE_MATRIX: 2,    // 第2列：课程矩阵
  PROJECT_MATRIX: 3,   // 第3列：项目矩阵
} as const

// 各列起始 X 坐标（基于 docs/canvas.json 最佳布局）
// 第0列：课程信息卡片（源文档面板在其上方）
// 第1列：四个基础面板（教学目标、章节、课点、KSA）
// 第2列：课程矩阵（与第1列面板保持约1327px间距）
// 第3列：项目矩阵
const COLUMN_X_POSITIONS = [-633, 640, 1967, 3350]

// 列间距配置（课程卡片-面板间距160，面板-矩阵间距200）
const COLUMN_GAP = 100

// 组件类型到布局列的映射
const COMPONENT_TO_COLUMN: Partial<Record<CanvasComponentType, number>> = {
  [CanvasComponentType.SOURCE_DOCUMENT_PANEL]: LAYOUT_COLUMNS.COURSE_INFO, // 源文档面板与课程信息同列（在其上方）
  [CanvasComponentType.COURSE_INFO]: LAYOUT_COLUMNS.COURSE_INFO,
  [CanvasComponentType.OBJECTIVE_PANEL]: LAYOUT_COLUMNS.BASIC_PANELS,
  [CanvasComponentType.CHAPTER_PANEL]: LAYOUT_COLUMNS.BASIC_PANELS,
  [CanvasComponentType.COURSE_POINT_PANEL]: LAYOUT_COLUMNS.BASIC_PANELS,
  [CanvasComponentType.KSA_PANEL]: LAYOUT_COLUMNS.BASIC_PANELS,
  [CanvasComponentType.COURSE_MATRIX]: LAYOUT_COLUMNS.COURSE_MATRIX,
  [CanvasComponentType.PROJECT_MATRIX]: LAYOUT_COLUMNS.PROJECT_MATRIX,
  [CanvasComponentType.PROJECT_MATRIX_PANEL]: LAYOUT_COLUMNS.PROJECT_MATRIX,
}

// 元素间距
const ELEMENT_GAP = 40
// 同列内行间距（用于第1列的四个面板和第3列的项目矩阵）
const ROW_GAP = 40
// 起始 Y 坐标
const START_Y = 60
// Panel 内子节点布局配置
const PANEL_PADDING = { top: 75, left: 20, right: 20, bottom: 10 }
const CARD_GAP_X = 15 // 水平间距
const CARD_GAP_Y = 10 // 垂直间距

// Panel 网格布局配置（每种 Panel 的列数）
const PANEL_GRID_COLUMNS: Partial<Record<CanvasComponentType, number>> = {
  [CanvasComponentType.OBJECTIVE_PANEL]: 3,
  [CanvasComponentType.COURSE_POINT_PANEL]: 3,
  [CanvasComponentType.CHAPTER_PANEL]: 3,
  [CanvasComponentType.KSA_PANEL]: 3,
}

/**
 * 计算网格布局中的位置
 * @param index 子节点索引（从0开始）
 * @param columns 列数
 * @param cardSize 卡片尺寸
 * @returns 相对于 Panel 的位置
 */
function calculateGridPosition(
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
  // 至少显示一行
  const rows = Math.max(1, Math.ceil(childCount / columns))
  // 实际使用的列数（可能不满一行）
  const actualColumns = Math.min(childCount || 1, columns)

  const width = PANEL_PADDING.left + actualColumns * cardSize.width + (actualColumns - 1) * CARD_GAP_X + PANEL_PADDING.right
  const height = PANEL_PADDING.top + rows * cardSize.height + (rows - 1) * CARD_GAP_Y + PANEL_PADDING.bottom

  // 确保最小尺寸（高度最小 200px，与 BasePanelNode 的 minHeight 保持一致）
  return {
    width: Math.max(width, 320),
    height: Math.max(height, 200),
  }
}

/**
 * 计算已存在基础面板的布局范围（用于垂直居中计算）
 * 只计算实际存在的面板，按到达顺序（elements 数组顺序）
 * @param elements 当前元素列表
 * @returns { startY, totalHeight, centerY } 起始Y、总高度、中心Y
 */
function calculateBasicPanelsRange(elements: CanvasElementData[]): {
  startY: number
  totalHeight: number
  centerY: number
} {
  // 筛选出已存在的基础面板（按到达顺序）
  const existingPanels = elements.filter(el => BASIC_PANELS_ORDER.includes(el.type))

  // 只计算已存在面板的总高度
  let totalHeight = 0
  for (let i = 0; i < existingPanels.length; i++) {
    const panel = existingPanels[i]
    const panelHeight = panel.size?.height || DEFAULT_ELEMENT_SIZES[panel.type]?.height || 200
    totalHeight += panelHeight
    if (i < existingPanels.length - 1) {
      totalHeight += ROW_GAP
    }
  }

  // 如果没有面板，使用默认高度（单个面板）
  if (totalHeight === 0) {
    totalHeight = 200
  }

  const startY = START_Y
  const centerY = startY + totalHeight / 2

  return { startY, totalHeight, centerY }
}

/**
 * 计算水平布局中组件的位置
 * @param componentType 组件类型
 * @param elements 当前已存在的元素（用于计算同列内的 Y 偏移）
 * @returns 元素位置
 */
function calculateHorizontalPosition(
  componentType: CanvasComponentType,
  elements: CanvasElementData[]
): ElementPosition {
  const column = COMPONENT_TO_COLUMN[componentType]
  if (column === undefined) {
    // 未定义列的组件，使用默认位置
    return { x: COLUMN_X_POSITIONS[0], y: START_Y }
  }

  const x = COLUMN_X_POSITIONS[column]

  // 第0列（课程信息）：垂直居中于四个面板，并向下偏移200
  if (column === LAYOUT_COLUMNS.COURSE_INFO) {
    const { centerY } = calculateBasicPanelsRange(elements)
    const selfHeight = DEFAULT_ELEMENT_SIZES[componentType]?.height || 200
    return { x, y: centerY - selfHeight / 2 + 500 }
  }

  // 第1列（基础面板）：按到达顺序纵向排列
  if (column === LAYOUT_COLUMNS.BASIC_PANELS) {
    // 找出所有已存在的基础面板（按到达顺序）
    const existingPanels = elements.filter(el => BASIC_PANELS_ORDER.includes(el.type))

    // 新面板放在已存在面板的最后
    if (existingPanels.length === 0) {
      return { x, y: START_Y }
    }

    // 计算最后一个面板的底部位置
    const lastPanel = existingPanels[existingPanels.length - 1]
    const lastPanelHeight = lastPanel.size?.height || DEFAULT_ELEMENT_SIZES[lastPanel.type]?.height || 200
    const nextY = lastPanel.position.y + lastPanelHeight + ROW_GAP

    return { x, y: nextY }
  }

  // 第2列（课程矩阵）：垂直居中于四个面板
  if (column === LAYOUT_COLUMNS.COURSE_MATRIX) {
    const { centerY } = calculateBasicPanelsRange(elements)
    const selfHeight = DEFAULT_ELEMENT_SIZES[componentType]?.height || 680
    return { x, y: centerY - selfHeight / 2 }
  }

  // 第3列（项目矩阵）：纵向排列多个项目矩阵，起始位置与第一个基础面板对齐
  if (column === LAYOUT_COLUMNS.PROJECT_MATRIX) {
    const existingProjectMatrices = elements.filter(
      el => el.type === CanvasComponentType.PROJECT_MATRIX || el.type === CanvasComponentType.PROJECT_MATRIX_PANEL
    )
    if (existingProjectMatrices.length === 0) {
      // 第一个项目矩阵的 y 轴与第一个基础面板对齐（按到达顺序）
      const firstBasicPanel = elements.find(el => BASIC_PANELS_ORDER.includes(el.type))
      const startY = firstBasicPanel?.position.y ?? START_Y
      return { x, y: startY }
    }
    // 后续项目矩阵在最后一个下方，使用实际高度
    const lastMatrix = existingProjectMatrices[existingProjectMatrices.length - 1]
    // 使用元素的实际高度，若无则使用最小高度
    const lastMatrixHeight = lastMatrix.size?.height || PROJECT_MATRIX_HEIGHT_CONFIG.MIN_HEIGHT
    return {
      x,
      y: lastMatrix.position.y + lastMatrixHeight + ROW_GAP,
    }
  }

  // 默认位置
  return { x, y: START_Y }
}

/**
 * 计算水平布局中组件的位置（支持传入自定义高度）
 * 用于在创建新元素时，基于即将创建的元素高度计算位置
 * @param componentType 组件类型
 * @param elements 当前已存在的元素
 * @param selfHeight 当前元素的高度（可选）
 * @returns 元素位置
 */
function calculateHorizontalPositionWithSize(
  componentType: CanvasComponentType,
  elements: CanvasElementData[],
  selfHeight?: number
): ElementPosition {
  // 对于非项目矩阵类型，直接使用原函数
  if (componentType !== CanvasComponentType.PROJECT_MATRIX &&
      componentType !== CanvasComponentType.PROJECT_MATRIX_PANEL) {
    return calculateHorizontalPosition(componentType, elements)
  }

  const column = LAYOUT_COLUMNS.PROJECT_MATRIX
  const x = COLUMN_X_POSITIONS[column]

  // 第3列（项目矩阵）：纵向排列多个项目矩阵
  const existingProjectMatrices = elements.filter(
    el => el.type === CanvasComponentType.PROJECT_MATRIX || el.type === CanvasComponentType.PROJECT_MATRIX_PANEL
  )

  if (existingProjectMatrices.length === 0) {
    // 第一个项目矩阵的 y 轴与第一个基础面板对齐（按到达顺序）
    const firstBasicPanel = elements.find(el => BASIC_PANELS_ORDER.includes(el.type))
    const startY = firstBasicPanel?.position.y ?? START_Y
    return { x, y: startY }
  }

  // 后续项目矩阵在最后一个下方，使用实际高度
  const lastMatrix = existingProjectMatrices[existingProjectMatrices.length - 1]
  const lastMatrixHeight = lastMatrix.size?.height || PROJECT_MATRIX_HEIGHT_CONFIG.MIN_HEIGHT
  return {
    x,
    y: lastMatrix.position.y + lastMatrixHeight + ROW_GAP,
  }
}

/**
 * 计算指定 Panel 之后所有同列 Panel 的新位置（水平布局版本）
 * 按到达顺序（elements 数组顺序）计算，而不是依赖固定的 ABCD 顺序
 * @param elements 当前所有元素
 * @param changedPanelType 尺寸发生变化的 Panel 类型
 * @returns 需要更新位置的元素 Map { id -> newPosition }
 */
function recalculatePanelPositions(
  elements: CanvasElementData[],
  changedPanelType: CanvasComponentType
): Map<string, ElementPosition> {
  const updates = new Map<string, ElementPosition>()

  // 只处理第1列的基础面板
  if (!BASIC_PANELS_ORDER.includes(changedPanelType)) {
    return updates
  }

  // 按到达顺序（elements 数组顺序）找出所有基础面板
  const basicPanels: { el: CanvasElementData; index: number }[] = []
  for (let i = 0; i < elements.length; i++) {
    if (BASIC_PANELS_ORDER.includes(elements[i].type)) {
      basicPanels.push({ el: elements[i], index: i })
    }
  }

  // 找到变化面板在到达顺序中的位置
  const changedPanelIndex = basicPanels.findIndex(({ el }) => el.type === changedPanelType)
  if (changedPanelIndex === -1) return updates

  // 从变化面板的位置开始，计算后续面板的 Y 坐标
  const columnX = COLUMN_X_POSITIONS[LAYOUT_COLUMNS.BASIC_PANELS]
  const changedPanel = basicPanels[changedPanelIndex].el
  const changedPanelHeight = changedPanel.size?.height || DEFAULT_ELEMENT_SIZES[changedPanel.type]?.height || 200
  let currentY = changedPanel.position.y + changedPanelHeight + ROW_GAP

  // 更新变化面板之后的所有面板位置
  for (let i = changedPanelIndex + 1; i < basicPanels.length; i++) {
    const { el } = basicPanels[i]
    // 只有当位置确实需要变化时才添加到更新列表
    if (el.position.y !== currentY) {
      updates.set(el.id, { x: columnX, y: currentY })
    }
    const panelHeight = el.size?.height || DEFAULT_ELEMENT_SIZES[el.type]?.height || 200
    currentY = currentY + panelHeight + ROW_GAP
  }

  return updates
}

/**
 * 重新计算所有元素的位置（水平布局版本）
 * 按到达顺序排列面板，而不是依赖固定的 ABCD 顺序
 * @param elements 当前所有元素
 * @returns 更新后的元素数组
 */
function recalculateAllPanelPositions(elements: CanvasElementData[]): CanvasElementData[] {
  // 如果没有元素，直接返回
  if (elements.length === 0) return elements

  // 复制元素数组
  const updatedElements = [...elements]

  // 第1列：基础面板按到达顺序（elements 数组顺序）纵向排列
  // 找出所有基础面板及其在数组中的索引
  const basicPanelIndices: number[] = []
  for (let i = 0; i < updatedElements.length; i++) {
    if (BASIC_PANELS_ORDER.includes(updatedElements[i].type)) {
      basicPanelIndices.push(i)
    }
  }

  // 按到达顺序设置位置
  let basicPanelY = START_Y
  for (const index of basicPanelIndices) {
    const el = updatedElements[index]
    const panelHeight = el.size?.height || DEFAULT_ELEMENT_SIZES[el.type]?.height || 200
    updatedElements[index] = {
      ...el,
      position: { x: COLUMN_X_POSITIONS[LAYOUT_COLUMNS.BASIC_PANELS], y: basicPanelY },
    }
    basicPanelY = basicPanelY + panelHeight + ROW_GAP
  }

  // 计算面板布局范围（用于居中计算，需要在面板位置更新后重新计算）
  const { centerY } = calculateBasicPanelsRange(updatedElements)

  // 第0列：课程信息（垂直居中于四个面板，并向下偏移200）
  const courseInfoIndex = updatedElements.findIndex(el => el.type === CanvasComponentType.COURSE_INFO)
  if (courseInfoIndex >= 0) {
    const courseInfo = updatedElements[courseInfoIndex]
    const selfHeight = courseInfo.size?.height || DEFAULT_ELEMENT_SIZES[CanvasComponentType.COURSE_INFO]?.height || 200
    updatedElements[courseInfoIndex] = {
      ...courseInfo,
      position: { x: COLUMN_X_POSITIONS[LAYOUT_COLUMNS.COURSE_INFO], y: centerY - selfHeight / 2 + 200 },
    }
  }

  // 第2列：课程矩阵（垂直居中于四个面板）
  const courseMatrixIndex = updatedElements.findIndex(el => el.type === CanvasComponentType.COURSE_MATRIX)
  if (courseMatrixIndex >= 0) {
    const courseMatrix = updatedElements[courseMatrixIndex]
    const selfHeight = courseMatrix.size?.height || DEFAULT_ELEMENT_SIZES[CanvasComponentType.COURSE_MATRIX]?.height || 680
    updatedElements[courseMatrixIndex] = {
      ...courseMatrix,
      position: { x: COLUMN_X_POSITIONS[LAYOUT_COLUMNS.COURSE_MATRIX], y: centerY - selfHeight / 2 },
    }
  }

  // 第3列：项目矩阵纵向排列（第一个与教学目标面板对齐，后续依次向下）
  const projectMatrices = updatedElements
    .map((el, i) => ({ el, i }))
    .filter(({ el }) => el.type === CanvasComponentType.PROJECT_MATRIX || el.type === CanvasComponentType.PROJECT_MATRIX_PANEL)

  if (projectMatrices.length > 0) {
    // 第一个项目矩阵与第一个基础面板 y 轴对齐（按到达顺序）
    const firstBasicPanel = updatedElements.find(el => BASIC_PANELS_ORDER.includes(el.type))
    let projectMatrixY = firstBasicPanel?.position.y ?? START_Y

    for (const { el, i } of projectMatrices) {
      // 动态计算高度：优先使用已有 size，否则根据数据计算
      const matrixHeight = el.size?.height || calculateProjectMatrixHeight(el.data)
      updatedElements[i] = {
        ...el,
        position: { x: COLUMN_X_POSITIONS[LAYOUT_COLUMNS.PROJECT_MATRIX], y: projectMatrixY },
        // 确保 size 被正确设置
        size: { width: el.size?.width || 900, height: matrixHeight },
      }
      projectMatrixY = projectMatrixY + matrixHeight + ROW_GAP
    }
  }

  return updatedElements
}

/**
 * 画布元素状态管理Hook
 * 支持节点和边的管理，以及 React Flow 集成
 */
export function useCanvasElements() {
  const [elements, setElements] = useState<CanvasElementData[]>([])
  const [edges, setEdges] = useState<CanvasEdgeData[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // 特殊组件数据存储（如矩阵等使用set操作的组件）
  const [specialComponents, setSpecialComponents] = useState<
    Record<string, { type: CanvasComponentType; data: CanvasComponentData }>
  >({})

  // 生成唯一ID
  const generateId = useCallback(() => {
    return `element_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }, [])

  // 计算新元素位置（水平布局）
  const calculateNextPosition = useCallback((componentType: CanvasComponentType): ElementPosition => {
    // 使用水平布局位置计算函数
    return calculateHorizontalPosition(componentType, elements)
  }, [elements])

  // 添加元素
  const addElement = useCallback((
    componentType: CanvasComponentType,
    data: CanvasComponentData,
    position?: ElementPosition,
    customId?: string
  ) => {
    // 如果data中有id，使用data中的id
    const elementId = customId || (data as { id?: string }).id || generateId()

    const newElement: CanvasElementData = {
      id: elementId,
      type: componentType,
      position: position || calculateNextPosition(componentType),
      size: DEFAULT_ELEMENT_SIZES[componentType],
      selected: false,
      data,
    }

    setElements(prev => [...prev, newElement])
    return elementId
  }, [generateId, calculateNextPosition])

  // 删除元素
  const removeElement = useCallback((id: string) => {
    setElements(prev => prev.filter(el => el.id !== id))
    // 同时删除与该元素相关的边
    setEdges(prev => prev.filter(edge => edge.source !== id && edge.target !== id))
    if (selectedId === id) {
      setSelectedId(null)
    }
  }, [selectedId])

  // 删除元素及其右侧（下游）相连的节点
  // 只沿着 source → target 方向删除，不删除左侧（上游）节点
  const removeElementWithConnected = useCallback((id: string) => {
    // 先计算要删除的节点ID（使用当前 edges 状态）
    const connectedIds = new Set<string>([id])
    const queue = [id]

    // BFS 遍历找出所有下游节点
    while (queue.length > 0) {
      const currentId = queue.shift()!
      for (const edge of edges) {
        if (edge.source === currentId && !connectedIds.has(edge.target)) {
          connectedIds.add(edge.target)
          queue.push(edge.target)
        }
      }
    }

    // 找出所有要删除的子节点
    const idsToRemove = new Set(connectedIds)
    for (const el of elements) {
      if (el.parentId && connectedIds.has(el.parentId)) {
        idsToRemove.add(el.id)
      }
    }

    // 批量更新状态
    setElements(prev => prev.filter(el => !idsToRemove.has(el.id)))
    setEdges(prev => prev.filter(edge =>
      !idsToRemove.has(edge.source) && !idsToRemove.has(edge.target)
    ))

    if (idsToRemove.has(selectedId || "")) {
      setSelectedId(null)
    }
  }, [edges, elements, selectedId])

  // 更新元素
  const updateElement = useCallback((id: string, updates: Partial<CanvasElementData>) => {
    setElements(prev => prev.map(el =>
      el.id === id ? { ...el, ...updates } : el
    ))
  }, [])

  // 更新面板的子节点（原子性批量操作）
  const updatePanelChildren = useCallback((
    panelId: string,
    panelType: CanvasComponentType,
    childType: CanvasComponentType,
    childrenData: Array<{ id: string; data: CanvasComponentData }>
  ) => {
    setElements(prev => {
      // 1. 找到父面板
      const parentPanel = prev.find(el => el.id === panelId)
      if (!parentPanel) {
        console.warn(`[Canvas] 面板不存在: ${panelId}`)
        return prev
      }

      // 2. 统计旧的子节点数量，用于判断是否需要级联更新位置
      const oldChildCount = prev.filter(el => el.parentId === panelId).length

      // 3. 过滤掉旧的子节点
      const filteredElements = prev.filter(el => el.parentId !== panelId)

      // 4. 获取面板配置（使用已有的常量）
      const columns = PANEL_GRID_COLUMNS[panelType] || 2
      const cardSize = DEFAULT_ELEMENT_SIZES[childType] || { width: 200, height: 100 }

      // 5. 计算新的面板尺寸
      const newChildCount = childrenData.length
      const newPanelSize = calculatePanelSize(newChildCount, columns, cardSize)

      // 6. 判断子节点数量是否变化（数量变化会导致面板高度变化，需要级联更新后续面板位置）
      const childCountChanged = newChildCount !== oldChildCount

      // 7. 更新父面板尺寸
      const parentPanelIndex = filteredElements.findIndex(el => el.id === panelId)
      if (parentPanelIndex !== -1) {
        filteredElements[parentPanelIndex] = {
          ...filteredElements[parentPanelIndex],
          size: newPanelSize,
        }
      }

      // 8. 创建新的子节点（使用 calculateGridPosition 保持一致性）
      const newChildren: CanvasElementData[] = childrenData.map((child, index) => {
        const position = calculateGridPosition(index, columns, cardSize)

        return {
          id: child.id,
          type: childType,
          position,
          size: cardSize,
          selected: false,
          data: child.data,
          parentId: panelId,
          extent: "parent" as const,
        }
      })

      // 9. 合并元素数组
      const newElements = [...filteredElements, ...newChildren]

      // 10. 如果子节点数量变化，级联更新后续面板位置（填补空缺）
      if (childCountChanged) {
        const positionUpdates = recalculatePanelPositions(newElements, panelType)
        // 应用位置更新
        for (let i = 0; i < newElements.length; i++) {
          const newPos = positionUpdates.get(newElements[i].id)
          if (newPos) {
            newElements[i] = { ...newElements[i], position: newPos }
          }
        }
      }

      return newElements
    })
  }, [])

  // 更新元素位置
  const updateElementPosition = useCallback((id: string, position: ElementPosition) => {
    setElements(prev => prev.map(el =>
      el.id === id ? { ...el, position } : el
    ))
  }, [])

  // 更新元素数据
  const updateElementData = useCallback((id: string, data: Partial<CanvasComponentData>) => {
    setElements(prev => prev.map(el =>
      el.id === id ? { ...el, data: { ...el.data, ...data } } : el
    ))
  }, [])

  // 选中元素
  const selectElement = useCallback((id: string | null) => {
    setSelectedId(id)
    setElements(prev => prev.map(el => ({
      ...el,
      selected: el.id === id,
    })))
  }, [])

  // 批量更新选中状态（支持多选）
  const updateSelection = useCallback((selectedIds: string[]) => {
    const selectedSet = new Set(selectedIds)
    setSelectedId(selectedIds.length === 1 ? selectedIds[0] : null)
    setElements(prev => prev.map(el => ({
      ...el,
      selected: selectedSet.has(el.id),
    })))
  }, [])

  // 清空画布
  const clearCanvas = useCallback(() => {
    setElements([])
    setEdges([])
    setSelectedId(null)
    setSpecialComponents({})
  }, [])

  // 加载画布数据（用于从本地存储恢复）
  const loadCanvasData = useCallback((
    loadedElements: CanvasElementData[],
    loadedEdges: CanvasEdgeData[],
    loadedSpecialComponents?: Record<string, { type: CanvasComponentType; data: CanvasComponentData }>,
    loadedSelectedIds?: string[]
  ) => {
    // 重新计算所有 Panel 的垂直位置，确保间距正确
    const recalculatedElements = recalculateAllPanelPositions(loadedElements || [])

    // 恢复选中状态
    const selectedIdSet = new Set(loadedSelectedIds || [])
    const elementsWithSelection = recalculatedElements.map(el => ({
      ...el,
      selected: selectedIdSet.has(el.id),
    }))

    setElements(elementsWithSelection)
    setEdges(loadedEdges || [])
    setSpecialComponents(loadedSpecialComponents || {})

    // 恢复 selectedId（取第一个选中的元素）
    const firstSelectedId = loadedSelectedIds && loadedSelectedIds.length > 0 ? loadedSelectedIds[0] : null
    setSelectedId(firstSelectedId)

    console.log("[画布] 已加载数据, 元素数:", loadedElements?.length || 0, "边数:", loadedEdges?.length || 0, "选中:", loadedSelectedIds || [])
  }, [])

  // 按组件类型清空
  const clearByComponentType = useCallback((componentType: CanvasComponentType) => {
    // 获取要删除的元素ID
    const idsToRemove = new Set(
      elements.filter(el => el.type === componentType).map(el => el.id)
    )

    setElements(prev => prev.filter(el => el.type !== componentType))
    // 删除相关的边
    setEdges(prev => prev.filter(edge =>
      !idsToRemove.has(edge.source) && !idsToRemove.has(edge.target)
    ))
    // 同时清理特殊组件
    setSpecialComponents(prev => {
      const newState = { ...prev }
      Object.keys(newState).forEach(key => {
        if (newState[key].type === componentType) {
          delete newState[key]
        }
      })
      return newState
    })
  }, [elements])

  // 设置特殊组件数据（用于矩阵等复杂组件）
  const setComponentData = useCallback((
    componentType: CanvasComponentType,
    data: CanvasComponentData
  ) => {
    const componentKey = componentType
    setSpecialComponents(prev => ({
      ...prev,
      [componentKey]: { type: componentType, data },
    }))
  }, [])

  // 获取特殊组件数据
  const getComponentData = useCallback((componentType: CanvasComponentType) => {
    return specialComponents[componentType]?.data
  }, [specialComponents])

  // ============ 边操作 ============

  // 添加边
  const addEdge = useCallback((edgeData: Omit<CanvasEdgeData, "id"> & { id?: string }) => {
    const edgeId = edgeData.id || generateEdgeId(edgeData.source, edgeData.target)
    const newEdge: CanvasEdgeData = {
      id: edgeId,
      source: edgeData.source,
      target: edgeData.target,
      sourceHandle: edgeData.sourceHandle,
      targetHandle: edgeData.targetHandle,
      type: edgeData.type || "support",
      animated: edgeData.animated,
      label: edgeData.label,
      data: edgeData.data,
    }

    // 避免重复添加
    setEdges(prev => {
      const exists = prev.some(e => e.id === edgeId || (e.source === edgeData.source && e.target === edgeData.target))
      if (exists) return prev
      return [...prev, newEdge]
    })

    return edgeId
  }, [])

  // 删除边
  const removeEdge = useCallback((id: string) => {
    setEdges(prev => prev.filter(edge => edge.id !== id))
  }, [])

  // 更新边
  const updateEdge = useCallback((id: string, updates: Partial<CanvasEdgeData>) => {
    setEdges(prev => prev.map(edge =>
      edge.id === id ? { ...edge, ...updates } : edge
    ))
  }, [])

  // 批量添加边
  const addEdges = useCallback((edgesData: Array<Omit<CanvasEdgeData, "id"> & { id?: string }>) => {
    const newEdges = edgesData.map(edgeData => ({
      id: edgeData.id || generateEdgeId(edgeData.source, edgeData.target),
      source: edgeData.source,
      target: edgeData.target,
      sourceHandle: edgeData.sourceHandle,
      targetHandle: edgeData.targetHandle,
      type: edgeData.type || "support",
      animated: edgeData.animated,
      label: edgeData.label,
      data: edgeData.data,
    }))

    setEdges(prev => {
      const existingIds = new Set(prev.map(e => e.id))
      const uniqueNewEdges = newEdges.filter(e => !existingIds.has(e.id))
      return [...prev, ...uniqueNewEdges]
    })
  }, [])

  // ============ 布局操作 ============

  // 应用自动布局
  const applyLayout = useCallback((options?: LayoutEventData) => {
    // 将 elements 转换为 React Flow nodes
    const nodes: Node[] = elements.map(el => ({
      id: el.id,
      type: COMPONENT_TO_NODE_TYPE[el.type] || FlowNodeType.COURSE_INFO,
      position: el.position,
      data: el.data,
    }))

    // 将 edges 转换为 React Flow edges
    const flowEdges: Edge[] = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }))

    // 应用 dagre 布局
    const layoutedNodes = applyDagreLayout(nodes, flowEdges, {
      direction: options?.direction || "TB",
      nodeSep: options?.nodeSep || 60,
      rankSep: options?.rankSep || 80,
    })

    // 更新元素位置
    setElements(prev => prev.map(el => {
      const layoutedNode = layoutedNodes.find(n => n.id === el.id)
      if (layoutedNode) {
        return { ...el, position: layoutedNode.position }
      }
      return el
    }))
  }, [elements, edges])

  // ============ React Flow 转换 ============

  // 转换为 React Flow 节点格式
  const toFlowNodes = useCallback((): Node[] => {
    // 分离父节点和子节点，确保父节点在前
    const parentNodes = elements.filter(el => !el.parentId)
    const childNodes = elements.filter(el => el.parentId)
    const sortedElements = [...parentNodes, ...childNodes]

    return sortedElements.map(el => {
      const isPanel = PANEL_TYPES.includes(el.type)
      const nodeType = COMPONENT_TO_NODE_TYPE[el.type] || FlowNodeType.COURSE_INFO

      return {
        id: el.id,
        type: nodeType,
        position: el.position,
        data: el.data,
        selected: el.selected,
        // Group Node 属性
        parentId: el.parentId,
        extent: el.extent,
        // Panel 节点需要设置 style 宽高
        ...(isPanel && el.size ? {
          style: { width: el.size.width, height: el.size.height }
        } : {}),
      }
    })
  }, [elements])

  // 转换为 React Flow 边格式
  const toFlowEdges = useCallback((): Edge[] => {
    return edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: e.type || "support",
      animated: e.animated,
      label: e.label,
      data: e.data,
    }))
  }, [edges])

  // ============ SSE 事件处理 ============

  // 处理新格式的画布事件（来自SSE消息）
  const handleCanvasEvent = useCallback((event: CanvasEventMessage) => {
    const { action, component, data, items, edges: edgeItems } = event

    switch (action) {
      case CanvasAction.CREATE:
        if (component && data) {
          // 单例组件去重：如果画布中已存在该类型组件则忽略创建
          if (SINGLETON_COMPONENT_TYPES.includes(component)) {
            const exists = elements.some(el => el.type === component)
            if (exists) {
              console.log(`[Canvas] 忽略重复创建单例组件: ${component}`)
              break
            }
          }

          const elementId = (data as { id?: string }).id || generateId()

          // 判断是否为 Panel 类型（四个基础面板）
          if (PANEL_TYPES.includes(component)) {
            // 计算 Panel 初始尺寸（无子节点时的最小尺寸）
            const cardType = PANEL_TO_CARD_MAP[component]
            const cardSize = cardType ? DEFAULT_ELEMENT_SIZES[cardType] : { width: 280, height: 80 }
            const columns = PANEL_GRID_COLUMNS[component] || 3
            const panelSize = calculatePanelSize(0, columns, cardSize)

            // 使用函数式更新，基于水平布局计算位置
            setElements(prev => {
              // 使用水平布局位置计算
              const panelPosition = calculateHorizontalPosition(component, prev)

              const panelElement: CanvasElementData = {
                id: elementId,
                type: component,
                position: panelPosition,
                size: panelSize,
                selected: false,
                data: data as CanvasComponentData,
              }

              // 添加新 Panel 后重新计算所有面板位置，确保布局正确
              // 这是必要的，因为创建顺序可能不是 A→B→C→D
              const newElements = [...prev, panelElement]
              return recalculateAllPanelPositions(newElements)
            })

            // 水平布局连线：课程信息 → 当前面板（如果是四个基础面板之一）
            if (COURSE_INFO_TO_PANELS.includes(component)) {
              setElements(currentElements => {
                const courseInfoNode = currentElements.find(el => el.type === CanvasComponentType.COURSE_INFO)
                if (courseInfoNode) {
                  addEdge({
                    source: courseInfoNode.id,
                    target: elementId,
                    sourceHandle: "right",
                    targetHandle: "left",
                  })
                }
                return currentElements
              })
            }
          }
          // 判断是否为 Card 类型（需要归属到 Panel）
          else if (CARD_TO_PANEL_MAP[component]) {
            const panelType = CARD_TO_PANEL_MAP[component]!
            // 使用函数式更新，确保能获取到最新的 elements 状态（包含刚创建的 Panel）
            setElements(prev => {
              const parentPanelIndex = prev.findIndex(el => el.type === panelType)
              const parentPanel = parentPanelIndex >= 0 ? prev[parentPanelIndex] : null

              if (parentPanel) {
                // 计算在 Panel 内的相对位置（基于网格布局）
                const childCount = prev.filter(el => el.parentId === parentPanel.id).length
                const cardSize = DEFAULT_ELEMENT_SIZES[component]
                const columns = PANEL_GRID_COLUMNS[panelType] || 3
                const relativePosition = calculateGridPosition(childCount, columns, cardSize)

                const cardElement: CanvasElementData = {
                  id: elementId,
                  type: component,
                  position: relativePosition,
                  size: cardSize,
                  selected: false,
                  data: data as CanvasComponentData,
                  parentId: parentPanel.id,
                  extent: "parent",
                }

                // 计算新的 Panel 尺寸（添加新 Card 后）
                const newChildCount = childCount + 1
                const newPanelSize = calculatePanelSize(newChildCount, columns, cardSize)
                const oldHeight = parentPanel.size?.height || 0
                const heightChanged = newPanelSize.height !== oldHeight

                // 更新父 Panel 的尺寸
                const updatedPanel: CanvasElementData = {
                  ...parentPanel,
                  size: newPanelSize,
                }

                // 构建更新后的数组：替换 Panel + 添加新 Card
                const newElements = [...prev]
                newElements[parentPanelIndex] = updatedPanel
                newElements.push(cardElement)

                // 性能优化：仅当高度变化时才级联更新后续 Panel 位置
                if (heightChanged) {
                  const positionUpdates = recalculatePanelPositions(newElements, panelType)
                  // 应用位置更新
                  for (let i = 0; i < newElements.length; i++) {
                    const newPos = positionUpdates.get(newElements[i].id)
                    if (newPos) {
                      newElements[i] = { ...newElements[i], position: newPos }
                    }
                  }
                }

                return newElements
              } else {
                // Panel 不存在时作为独立节点，使用水平布局计算位置
                const cardSize = DEFAULT_ELEMENT_SIZES[component]
                const position = calculateHorizontalPosition(component, prev)

                const cardElement: CanvasElementData = {
                  id: elementId,
                  type: component,
                  position,
                  size: cardSize,
                  selected: false,
                  data: data as CanvasComponentData,
                }
                return [...prev, cardElement]
              }
            })
          }
          // 项目矩阵：使用函数式更新确保位置正确计算，动态计算高度
          else if (component === CanvasComponentType.PROJECT_MATRIX || component === CanvasComponentType.PROJECT_MATRIX_PANEL) {
            setElements(prev => {
              // 动态计算项目矩阵高度
              const dynamicHeight = calculateProjectMatrixHeight(data)
              const elementSize = {
                width: DEFAULT_ELEMENT_SIZES[component].width,
                height: dynamicHeight,
              }

              // 基于最新状态计算位置（需要考虑新的动态高度）
              const position = calculateHorizontalPositionWithSize(component, prev, elementSize.height)

              const newElement: CanvasElementData = {
                id: elementId,
                type: component,
                position,
                size: elementSize,
                selected: false,
                data: data as CanvasComponentData,
              }

              // 创建与课程矩阵的连线
              const courseMatrix = prev.find(el => el.type === CanvasComponentType.COURSE_MATRIX)
              if (courseMatrix) {
                setTimeout(() => {
                  addEdge({
                    source: courseMatrix.id,
                    target: elementId,
                    sourceHandle: "right",
                    targetHandle: "left",
                  })
                }, 0)
              }

              return [...prev, newElement]
            })
          }
          // 开课报告：放在项目矩阵右侧，与所有项目矩阵建立连线
          else if (component === CanvasComponentType.COURSE_REPORT) {
            setElements(prev => {
              const elementSize = DEFAULT_ELEMENT_SIZES[component]

              // 找到所有项目矩阵
              const projectMatrices = prev.filter(el => el.type === CanvasComponentType.PROJECT_MATRIX)
              let position: ElementPosition

              // 如果事件包含手动指定的位置，优先使用
              if (event.position) {
                position = { x: event.position.x, y: event.position.y }
              } else if (projectMatrices.length > 0) {
                // 自动计算位置：在最右侧项目矩阵的右边
                // 找到最右侧的项目矩阵
                const rightmostMatrix = projectMatrices.reduce((rightmost, current) => {
                  const rightmostRight = rightmost.position.x + (rightmost.size?.width || 0)
                  const currentRight = current.position.x + (current.size?.width || 0)
                  return currentRight > rightmostRight ? current : rightmost
                })

                // 计算所有项目矩阵的垂直中心位置
                const minY = Math.min(...projectMatrices.map(m => m.position.y))
                const maxY = Math.max(...projectMatrices.map(m => m.position.y + (m.size?.height || 200)))
                const centerY = (minY + maxY) / 2 - elementSize.height / 2

                // 放在最右侧项目矩阵的右边，垂直居中
                position = {
                  x: rightmostMatrix.position.x + (rightmostMatrix.size?.width || 900) + 100,
                  y: centerY,
                }
              } else {
                // 没有项目矩阵时，使用默认位置计算
                position = calculateHorizontalPosition(component, prev)
              }

              // 与所有项目矩阵建立连线（无论手动创建还是自动创建）
              if (projectMatrices.length > 0) {
                setTimeout(() => {
                  projectMatrices.forEach(matrix => {
                    addEdge({
                      source: matrix.id,
                      target: elementId,
                      sourceHandle: "right",
                      targetHandle: "left",
                    })
                  })
                }, 0)
              }

              const newElement: CanvasElementData = {
                id: elementId,
                type: component,
                position,
                size: elementSize,
                selected: false,
                data: data as CanvasComponentData,
              }

              return [...prev, newElement]
            })
          }
          // 其他类型正常添加
          else {
            addElement(component, data as CanvasComponentData, undefined, elementId)
          }
        }
        break

      case CanvasAction.UPDATE:
        // 优先通过 data.id 精确更新（支持同类型多个元素，如重做功能）
        if (data && (data as { id?: string }).id) {
          const id = (data as { id: string }).id
          const targetElement = elements.find(el => el.id === id)

          if (targetElement && PANEL_TYPES.includes(targetElement.type)) {
            // Panel 类型：需要同时更新子节点
            const updateData = data as { items?: Array<{ id: string; [key: string]: unknown }> }
            const childType = PANEL_TO_CARD_MAP[targetElement.type]

            if (updateData.items && childType) {
              // 将 items 转换为 childrenData 格式
              const childrenData = updateData.items.map(item => ({
                id: item.id,
                data: item as CanvasComponentData,
              }))
              updatePanelChildren(id, targetElement.type, childType, childrenData)
            }
            // 同时更新 Panel 自身数据（不包含 items，避免重复）
            const { items: _, ...panelData } = updateData
            if (Object.keys(panelData).length > 0) {
              updateElementData(id, panelData as CanvasComponentData)
            }
          } else if (targetElement) {
            // 非 Panel 类型：深度合并数据（支持部分更新）
            setElements(prev => prev.map(el =>
              el.id === id
                ? { ...el, data: deepMerge(el.data as Record<string, unknown>, data as Record<string, unknown>) as CanvasComponentData }
                : el
            ))
          }
        } else if (component && data) {
          // 兜底：根据 component 类型查找已有元素（适用于单例组件如 course_info）
          const existingElement = elements.find(el => el.type === component)
          if (existingElement) {
            // 元素已存在，深度合并数据（支持部分更新，如仅更新 metadata.teachingLocation）
            setElements(prev => prev.map(el =>
              el.id === existingElement.id
                ? { ...el, data: deepMerge(el.data as Record<string, unknown>, data as Record<string, unknown>) as CanvasComponentData }
                : el
            ))
          } else {
            // 元素不存在，先创建再设置数据
            addElement(component, data as CanvasComponentData)
          }
        }
        break

      case CanvasAction.DELETE:
        if (data && (data as { id?: string }).id) {
          removeElement((data as { id: string }).id)
        }
        break

      case CanvasAction.SET:
        // 用于矩阵等复杂组件的数据设置（同时创建或更新画布元素）
        if (component && data) {
          // 存储到 specialComponents（用于持久化）
          // 注意：项目矩阵有多个实例，使用 chapter_id 作为唯一标识
          const componentKey = (component === CanvasComponentType.PROJECT_MATRIX || component === CanvasComponentType.PROJECT_MATRIX_PANEL)
            ? `${component}_${(data as { chapter_id?: string }).chapter_id || 'default'}`
            : component
          setSpecialComponents(prev => ({
            ...prev,
            [componentKey]: { type: component, data: data as CanvasComponentData },
          }))

          // 同时创建或更新画布元素
          setElements(prev => {
            // 项目矩阵需要根据 chapter_id 精确匹配（支持多个实例）
            let existingIndex: number
            if (component === CanvasComponentType.PROJECT_MATRIX || component === CanvasComponentType.PROJECT_MATRIX_PANEL) {
              const chapterId = (data as { chapter_id?: string }).chapter_id
              existingIndex = prev.findIndex(el =>
                el.type === component &&
                (el.data as { chapter_id?: string }).chapter_id === chapterId
              )
            } else {
              existingIndex = prev.findIndex(el => el.type === component)
            }

            if (existingIndex >= 0) {
              // 元素已存在，更新数据
              const updated = [...prev]
              const existingEl = updated[existingIndex]

              // 项目矩阵需要重新计算高度
              let newSize = existingEl.size
              if (component === CanvasComponentType.PROJECT_MATRIX || component === CanvasComponentType.PROJECT_MATRIX_PANEL) {
                const dynamicHeight = calculateProjectMatrixHeight(data)
                newSize = { width: existingEl.size?.width || 900, height: dynamicHeight }
              }

              updated[existingIndex] = {
                ...existingEl,
                data: data as CanvasComponentData,
                size: newSize,
              }
              return updated
            }

            // 元素不存在，创建新元素
            const elementId = (data as { id?: string }).id || `${component}_${Date.now()}`

            // 项目矩阵使用动态高度计算
            let elementSize = DEFAULT_ELEMENT_SIZES[component] || { width: 400, height: 300 }
            if (component === CanvasComponentType.PROJECT_MATRIX || component === CanvasComponentType.PROJECT_MATRIX_PANEL) {
              const dynamicHeight = calculateProjectMatrixHeight(data)
              elementSize = { width: elementSize.width, height: dynamicHeight }
            }

            // 使用水平布局计算位置
            const position = calculateHorizontalPositionWithSize(component, prev, elementSize.height)

            const newElement: CanvasElementData = {
              id: elementId,
              type: component,
              position,
              size: elementSize,
              selected: false,
              data: data as CanvasComponentData,
            }

            // 水平布局连线
            // 课程矩阵：A/B/C 三个面板 → 课程矩阵
            if (component === CanvasComponentType.COURSE_MATRIX) {
              setTimeout(() => {
                for (const panelType of PANELS_TO_MATRIX) {
                  const panel = prev.find(el => el.type === panelType)
                  if (panel) {
                    addEdge({
                      source: panel.id,
                      target: elementId,
                      sourceHandle: "right",
                      targetHandle: "left",
                    })
                  }
                }
              }, 0)
            }
            // 项目矩阵：课程矩阵 → 项目矩阵
            else if (component === CanvasComponentType.PROJECT_MATRIX || component === CanvasComponentType.PROJECT_MATRIX_PANEL) {
              const courseMatrix = prev.find(el => el.type === CanvasComponentType.COURSE_MATRIX)
              if (courseMatrix) {
                setTimeout(() => {
                  addEdge({
                    source: courseMatrix.id,
                    target: elementId,
                    sourceHandle: "right",
                    targetHandle: "left",
                  })
                }, 0)
              }
            }
            // 课程信息：源文档卡片 → 课程信息（如果源文档卡片已存在）
            else if (component === CanvasComponentType.COURSE_INFO) {
              const sourceDocCards = prev.filter(el => el.type === CanvasComponentType.SOURCE_DOCUMENT_CARD)
              if (sourceDocCards.length > 0) {
                // 调整源文档卡片的位置（使其在课程信息卡片上方水平排列居中）
                const courseInfoWidth = elementSize.width
                const cardSize = DEFAULT_ELEMENT_SIZES[CanvasComponentType.SOURCE_DOCUMENT_CARD]
                const cardGap = 20
                const totalCardsWidth = sourceDocCards.length * cardSize.width + (sourceDocCards.length - 1) * cardGap
                const startX = position.x + (courseInfoWidth - totalCardsWidth) / 2
                const cardY = position.y - cardSize.height - 60

                // 创建连线
                setTimeout(() => {
                  for (const card of sourceDocCards) {
                    addEdge({
                      source: card.id,
                      target: elementId,
                      sourceHandle: "bottom",
                      targetHandle: "top",
                    })
                  }
                }, 0)

                // 返回更新后的数组（更新源文档卡片位置 + 添加新课程信息元素）
                let cardIndex = 0
                return prev.map(el => {
                  if (el.type === CanvasComponentType.SOURCE_DOCUMENT_CARD) {
                    const updatedPosition = {
                      x: startX + cardIndex * (cardSize.width + cardGap),
                      y: cardY,
                    }
                    cardIndex++
                    return { ...el, position: updatedPosition }
                  }
                  return el
                }).concat(newElement)
              }
            }

            return [...prev, newElement]
          })
        }
        break

      case CanvasAction.CLEAR:
        if (component) {
          clearByComponentType(component)
        } else {
          clearCanvas()
        }
        break

      case CanvasAction.BATCH_CREATE:
        if (items && items.length > 0) {
          // 检查是否全部为同类型 Card（需要归属到 Panel）
          const firstItem = items[0]
          const panelType = CARD_TO_PANEL_MAP[firstItem.component]
          const allSameCardType = panelType && items.every(item => item.component === firstItem.component)

          if (allSameCardType && panelType) {
            // 批量创建 Card：使用 updatePanelChildren 添加到面板
            setElements(prev => {
              const parentPanel = prev.find(el => el.type === panelType)
              if (!parentPanel) {
                console.warn(`[Canvas] BATCH_CREATE: 未找到面板 ${panelType}，将卡片作为独立节点添加`)
                // 降级处理：作为独立节点添加
                const newElements = [...prev]
                items.forEach(item => {
                  const cardSize = DEFAULT_ELEMENT_SIZES[item.component] || { width: 280, height: 130 }
                  const position = calculateHorizontalPosition(item.component, newElements)
                  newElements.push({
                    id: (item.data as { id?: string }).id || `${item.component}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                    type: item.component,
                    position,
                    size: cardSize,
                    selected: false,
                    data: item.data,
                  })
                })
                return newElements
              }

              // 获取面板配置
              const childType = firstItem.component
              const columns = PANEL_GRID_COLUMNS[panelType] || 3
              const cardSize = DEFAULT_ELEMENT_SIZES[childType] || { width: 280, height: 130 }

              // 过滤掉旧的子节点
              const filteredElements = prev.filter(el => el.parentId !== parentPanel.id)

              // 计算新的面板尺寸
              const newChildCount = items.length
              const newPanelSize = calculatePanelSize(newChildCount, columns, cardSize)

              // 更新父面板尺寸
              const parentPanelIndex = filteredElements.findIndex(el => el.id === parentPanel.id)
              if (parentPanelIndex !== -1) {
                filteredElements[parentPanelIndex] = {
                  ...filteredElements[parentPanelIndex],
                  size: newPanelSize,
                }
              }

              // 创建新的子节点
              const newChildren: CanvasElementData[] = items.map((item, index) => {
                const position = calculateGridPosition(index, columns, cardSize)
                return {
                  id: (item.data as { id?: string }).id || `${item.component}_${Date.now()}_${index}`,
                  type: item.component,
                  position,
                  size: cardSize,
                  selected: false,
                  data: item.data,
                  parentId: parentPanel.id,
                  extent: "parent" as const,
                }
              })

              // 合并元素数组
              const newElements = [...filteredElements, ...newChildren]

              // 级联更新后续面板位置
              const positionUpdates = recalculatePanelPositions(newElements, panelType)
              for (let i = 0; i < newElements.length; i++) {
                const newPos = positionUpdates.get(newElements[i].id)
                if (newPos) {
                  newElements[i] = { ...newElements[i], position: newPos }
                }
              }

              console.log(`[Canvas] BATCH_CREATE: 已将 ${items.length} 个卡片添加到面板 ${parentPanel.id}`)
              return newElements
            })
          } else {
            // 非 Card 类型或混合类型：直接作为独立节点添加
            items.forEach(item => {
              addElement(item.component, item.data)
            })
          }
        }
        break

      // 连线操作
      case CanvasAction.CONNECT:
        if (data) {
          const connectData = data as ConnectEventData
          addEdge({
            source: connectData.source,
            target: connectData.target,
            sourceHandle: connectData.sourceHandle,
            targetHandle: connectData.targetHandle,
            type: connectData.type as CanvasEdgeData["type"],
            data: connectData.strength ? { strength: connectData.strength } : undefined,
          })
        }
        break

      case CanvasAction.DISCONNECT:
        if (data && (data as { id?: string }).id) {
          removeEdge((data as { id: string }).id)
        } else if (data) {
          // 根据 source 和 target 删除
          const connectData = data as ConnectEventData
          const edgeId = generateEdgeId(connectData.source, connectData.target)
          removeEdge(edgeId)
        }
        break

      case CanvasAction.BATCH_CONNECT:
        if (edgeItems && edgeItems.length > 0) {
          addEdges(edgeItems.map(item => ({
            source: item.source,
            target: item.target,
            sourceHandle: item.sourceHandle,
            targetHandle: item.targetHandle,
            data: item.strength ? { strength: item.strength } : undefined,
          })))
        }
        break

      case CanvasAction.LAYOUT:
        applyLayout(data as LayoutEventData)
        break

      case CanvasAction.SET_SOURCE_DOCUMENTS:
        // 处理源文档数据：直接创建文件卡片节点，建立与课程信息的连线
        if (data) {
          const sourceDocsData = data as SourceDocumentsData
          const documents = sourceDocsData.documents || []

          // 存储原始数据到 specialComponents（用于保存和传递）
          setSpecialComponents(prev => ({
            ...prev,
            source_documents: { type: CanvasComponentType.SOURCE_DOCUMENT_CARD, data: data as CanvasComponentData },
          }))

          // 如果有文档，直接创建文件卡片
          if (documents.length > 0) {
            setElements(prev => {
              // 移除已存在的源文档卡片
              const filteredElements = prev.filter(el => el.type !== CanvasComponentType.SOURCE_DOCUMENT_CARD)

              // 获取卡片尺寸
              const cardSize = DEFAULT_ELEMENT_SIZES[CanvasComponentType.SOURCE_DOCUMENT_CARD]
              const cardGap = 20 // 卡片间距

              // 计算所有卡片的总宽度
              const totalCardsWidth = documents.length * cardSize.width + (documents.length - 1) * cardGap

              // 查找课程信息卡片的位置
              const courseInfo = filteredElements.find(el => el.type === CanvasComponentType.COURSE_INFO)
              const courseInfoX = courseInfo?.position?.x ?? COLUMN_X_POSITIONS[LAYOUT_COLUMNS.COURSE_INFO]
              // 当课程卡片不存在时，使用预期的课程卡片位置（基于面板范围计算）
              let courseInfoY: number
              if (courseInfo) {
                courseInfoY = courseInfo.position.y
              } else {
                // 计算预期的课程卡片位置（与 calculateHorizontalPosition 保持一致）
                const { centerY } = calculateBasicPanelsRange(filteredElements)
                const courseInfoHeight = DEFAULT_ELEMENT_SIZES[CanvasComponentType.COURSE_INFO]?.height || 300
                courseInfoY = centerY - courseInfoHeight / 2 + 500
              }
              const courseInfoWidth = DEFAULT_ELEMENT_SIZES[CanvasComponentType.COURSE_INFO].width

              // 计算起始X位置（使所有卡片整体居中对齐课程信息卡片）
              const startX = courseInfoX + (courseInfoWidth - totalCardsWidth) / 2
              // Y位置在课程信息卡片上方，间距30px
              const cardY = courseInfoY - cardSize.height - 30

              // 创建卡片元素
              const cardElements: CanvasElementData[] = documents.map((doc, index) => {
                const cardData: SourceDocumentCardData = {
                  id: doc.id,
                  index: index + 1,
                  filename: doc.filename,
                  ossKey: doc.ossKey,
                  originalFileOssKey: doc.originalFileOssKey,
                  fileType: doc.fileType,
                  createdAt: doc.createdAt,
                  createdBy: doc.createdBy,
                  cdnHost: sourceDocsData.cdnHost,
                }
                return {
                  id: doc.id,
                  type: CanvasComponentType.SOURCE_DOCUMENT_CARD,
                  position: {
                    x: startX + index * (cardSize.width + cardGap),
                    y: cardY,
                  },
                  size: cardSize,
                  selected: false,
                  data: cardData,
                }
              })

              // 建立每个卡片与课程信息的连线
              if (courseInfo) {
                setTimeout(() => {
                  for (const doc of documents) {
                    addEdge({
                      source: doc.id,
                      target: courseInfo.id,
                      sourceHandle: "bottom",
                      targetHandle: "top",
                    })
                  }
                }, 0)
              }

              return [...filteredElements, ...cardElements]
            })
          }
        }
        break

      default:
        console.warn("未知的画布动作:", action)
    }
  }, [
    elements,
    addElement,
    updateElementData,
    removeElement,
    setComponentData,
    clearByComponentType,
    clearCanvas,
    addEdge,
    removeEdge,
    addEdges,
    applyLayout,
  ])

  return {
    // 元素状态
    elements,
    edges,
    selectedId,
    specialComponents,
    // 基础操作
    addElement,
    removeElement,
    removeElementWithConnected,
    updateElement,
    updateElementData,
    updateElementPosition,
    updatePanelChildren,
    selectElement,
    updateSelection,
    clearCanvas,
    loadCanvasData,
    clearByComponentType,
    // 特殊组件操作
    setComponentData,
    getComponentData,
    // 边操作
    addEdge,
    removeEdge,
    updateEdge,
    addEdges,
    // 布局操作
    applyLayout,
    // React Flow 转换
    toFlowNodes,
    toFlowEdges,
    // 事件处理
    handleCanvasEvent,
  }
}
