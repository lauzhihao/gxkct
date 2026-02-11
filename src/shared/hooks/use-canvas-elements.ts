"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
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
import {
  CANVAS_LAYOUT_POSITION_CONFIG,
  HORIZONTAL_LAYOUT_GRID_SIZE,
  HORIZONTAL_LAYOUT_GROUPS,
  HORIZONTAL_LAYOUT_GROUP_GAP_PX,
  HORIZONTAL_LAYOUT_ITEM_GAP_PX,
  HORIZONTAL_COURSE_MATRIX_OFFSET_PX,
  VERTICAL_LAYOUT_GROUPS,
  VERTICAL_LAYOUT_GAP_PX,
  type CanvasLayoutMode,
} from "@/components/flow/utils/canvas-layout"

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
  [CanvasComponentType.KSA_PANEL]: { width: 480, height: 220 },          // KSA 统计卡固定面板高度
  [CanvasComponentType.KSA_ITEM]: { width: 260, height: 110 },           // 头部37 + 内容区p-3(24) + 文字2行(40) + 边距 ≈ 110
  [CanvasComponentType.GRADUATION_SUPPORT]: { width: 580, height: 200 }, // 毕业要求支撑面板（5列布局，动态高度）
  [CanvasComponentType.COURSE_MATRIX]: { width: 1100, height: 680 },
  [CanvasComponentType.PROJECT_MATRIX_PANEL]: { width: 900, height: 200 },  // 最小高度，实际会动态计算
  [CanvasComponentType.PROJECT_MATRIX]: { width: 900, height: 200 },        // 最小高度，实际会动态计算
  [CanvasComponentType.COURSE_REPORT]: { width: 480, height: 180 },         // 开课报告
}

const KSA_PANEL_FIXED_SIZE = {
  width: DEFAULT_ELEMENT_SIZES[CanvasComponentType.KSA_PANEL].width,
  height: DEFAULT_ELEMENT_SIZES[CanvasComponentType.KSA_PANEL].height,
}

// 项目矩阵高度计算配置
const PROJECT_MATRIX_HEIGHT_CONFIG = {
  BASE_HEIGHT: 110,      // 基础高度：头部(37) + 内容区padding(24) + 表格头部(49)
  ROW_HEIGHT: 49,        // 每行高度：py-3(24) + 文字行高 + 边框
  MIN_HEIGHT: 160,       // 最小高度（无数据时）
  MAX_HEIGHT: 1200,      // 最大高度（与 max-h-[1200px] 对应）
}

const PROJECT_MATRIX_BATCH_SIZE = 4
const HEAVY_PANEL_CARD_BATCH_SIZE_INITIAL = 32
const HEAVY_PANEL_CARD_BATCH_SIZE_MIN = 8
const HEAVY_PANEL_CARD_BATCH_SIZE_MAX = 96

const NON_INTERACTIVE_CARD_NODE_TYPES = new Set<FlowNodeType>([
  FlowNodeType.OBJECTIVE,
  FlowNodeType.COURSE_POINT,
  FlowNodeType.CHAPTER,
  FlowNodeType.KSA,
])

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

// 专业矩阵动态尺寸计算配置
const GRADUATION_SUPPORT_SIZE_CONFIG = {
  NODE_WIDTH: 580,       // 节点宽度（适配5列布局）
  HEADER_HEIGHT: 45,     // 头部标题栏高度
  SCALE: 1.4,            // 标签区域缩放比例
  LABEL_HEIGHT: 26,      // 单个标签高度（pre-scale）
  GAP: 6,                // 标签间距 gap-1.5 = 6px（pre-scale）
  PADDING: 8,            // 标签区域内边距 p-2 = 8px（pre-scale）
  BOTTOM: 8,             // 底部边距
  COLUMNS: 5,            // 列数
  MIN_HEIGHT: 200,       // 最小高度
}

/**
 * 根据专业矩阵数据计算节点动态尺寸
 * 统计已设置支撑等级的指标点数量，按5列布局计算所需高度
 * @param data 专业矩阵数据
 * @returns { width, height }
 */
function calculateGraduationSupportSize(data: unknown): { width: number; height: number } {
  const cfg = GRADUATION_SUPPORT_SIZE_CONFIG
  const gsData = data as { requirements?: Array<{ indicators: Array<{ supportLevel?: string }> }> }

  if (!gsData?.requirements) {
    return { width: cfg.NODE_WIDTH, height: cfg.MIN_HEIGHT }
  }

  let count = 0
  gsData.requirements.forEach(req => {
    req.indicators.forEach(ind => {
      if (ind.supportLevel) count++
    })
  })

  if (count === 0) {
    return { width: cfg.NODE_WIDTH, height: cfg.MIN_HEIGHT }
  }

  const rows = Math.ceil(count / cfg.COLUMNS)
  const contentPreScale = cfg.PADDING + rows * cfg.LABEL_HEIGHT + (rows - 1) * cfg.GAP + cfg.PADDING
  const contentScaled = contentPreScale * cfg.SCALE
  const totalHeight = cfg.HEADER_HEIGHT + contentScaled + cfg.BOTTOM

  return {
    width: cfg.NODE_WIDTH,
    height: Math.max(cfg.MIN_HEIGHT, Math.ceil(totalHeight)),
  }
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
  [CanvasComponentType.GRADUATION_SUPPORT]: FlowNodeType.GRADUATION_SUPPORT_PANEL,
}

// Panel 类型列表
const PANEL_TYPES: CanvasComponentType[] = [
  CanvasComponentType.SOURCE_DOCUMENT_PANEL,
  CanvasComponentType.OBJECTIVE_PANEL,
  CanvasComponentType.COURSE_POINT_PANEL,
  CanvasComponentType.CHAPTER_PANEL,
  CanvasComponentType.KSA_PANEL,
  CanvasComponentType.GRADUATION_SUPPORT,
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

// 课程信息 → 三个基础面板（一对多，水平展开）
const COURSE_INFO_TO_PANELS: CanvasComponentType[] = [
  CanvasComponentType.GRADUATION_SUPPORT, // A - 毕业要求支撑
]

// 单例组件类型（画布内唯一，重复创建时忽略）
const SINGLETON_COMPONENT_TYPES: CanvasComponentType[] = [
  CanvasComponentType.SOURCE_DOCUMENT_PANEL, // 源文档面板
  CanvasComponentType.COURSE_INFO,        // 课程信息卡片
  CanvasComponentType.GRADUATION_SUPPORT, // 毕业要求支撑面板
  CanvasComponentType.OBJECTIVE_PANEL,    // 教学目标面板
  CanvasComponentType.COURSE_POINT_PANEL, // 课点面板
  CanvasComponentType.CHAPTER_PANEL,      // 章节面板
  CanvasComponentType.KSA_PANEL,          // KSA面板
  CanvasComponentType.COURSE_MATRIX,      // 课程矩阵
  CanvasComponentType.COURSE_REPORT,      // 开课报告
]

// 各列起始 X 坐标（水平布局）
const COLUMN_X_POSITIONS = [...CANVAS_LAYOUT_POSITION_CONFIG.horizontal.columnAxis]
const VERTICAL_STACK_GROUPS = VERTICAL_LAYOUT_GROUPS
const VERTICAL_STACK_GAP = VERTICAL_LAYOUT_GAP_PX

// 起始 Y 坐标
const START_X = CANVAS_LAYOUT_POSITION_CONFIG.vertical.startX
const START_Y = CANVAS_LAYOUT_POSITION_CONFIG.horizontal.startY
const VERTICAL_START_Y = CANVAS_LAYOUT_POSITION_CONFIG.vertical.startY
const HORIZONTAL_STACK_GROUPS = HORIZONTAL_LAYOUT_GROUPS
const HORIZONTAL_GROUP_GAP = HORIZONTAL_LAYOUT_GROUP_GAP_PX
const HORIZONTAL_ITEM_GAP = HORIZONTAL_LAYOUT_ITEM_GAP_PX
const HORIZONTAL_LINK_SPAN_GAP = HORIZONTAL_LAYOUT_GRID_SIZE * 10
const HORIZONTAL_COURSE_MATRIX_OFFSET = HORIZONTAL_COURSE_MATRIX_OFFSET_PX

const HORIZONTAL_LINKED_PAIRS = new Set<string>([
  `${CanvasComponentType.COURSE_INFO}->${CanvasComponentType.GRADUATION_SUPPORT}`,
  `${CanvasComponentType.GRADUATION_SUPPORT}->${CanvasComponentType.OBJECTIVE_PANEL}`,
  `${CanvasComponentType.OBJECTIVE_PANEL}->${CanvasComponentType.CHAPTER_PANEL}`,
  `${CanvasComponentType.CHAPTER_PANEL}->${CanvasComponentType.COURSE_POINT_PANEL}`,
  `${CanvasComponentType.COURSE_POINT_PANEL}->${CanvasComponentType.COURSE_MATRIX}`,
  `${CanvasComponentType.COURSE_MATRIX}->${CanvasComponentType.KSA_PANEL}`,
  `${CanvasComponentType.KSA_PANEL}->${CanvasComponentType.PROJECT_MATRIX}`,
  `${CanvasComponentType.KSA_PANEL}->${CanvasComponentType.PROJECT_MATRIX_PANEL}`,
  `${CanvasComponentType.PROJECT_MATRIX}->${CanvasComponentType.COURSE_REPORT}`,
  `${CanvasComponentType.PROJECT_MATRIX_PANEL}->${CanvasComponentType.COURSE_REPORT}`,
])

function getHorizontalGapBetween(
  leftType: CanvasComponentType,
  rightType: CanvasComponentType,
  fallbackGap: number
): number {
  const pairKey = `${leftType}->${rightType}`
  const reversePairKey = `${rightType}->${leftType}`
  if (HORIZONTAL_LINKED_PAIRS.has(pairKey) || HORIZONTAL_LINKED_PAIRS.has(reversePairKey)) {
    return Math.max(fallbackGap, HORIZONTAL_LINK_SPAN_GAP)
  }
  return fallbackGap
}
// Panel 内子节点布局配置
const PANEL_PADDING = { top: 75, left: 20, right: 20, bottom: 10 }
const CARD_GAP_X = 15 // 水平间距
const CARD_GAP_Y = 10 // 垂直间距

// Panel 网格布局配置（每种 Panel 的列数）
const PANEL_GRID_COLUMNS: Partial<Record<CanvasComponentType, number>> = {
  [CanvasComponentType.OBJECTIVE_PANEL]: 5,
  [CanvasComponentType.COURSE_POINT_PANEL]: 5,
  [CanvasComponentType.CHAPTER_PANEL]: 5,
  [CanvasComponentType.KSA_PANEL]: 5,
}

const PANEL_GRID_GAP: Partial<Record<CanvasComponentType, { x: number; y: number }>> = {
  [CanvasComponentType.COURSE_POINT_PANEL]: { x: 10, y: 10 },
}

function getPanelGridGap(panelType?: CanvasComponentType): { x: number; y: number } {
  if (!panelType) {
    return { x: CARD_GAP_X, y: CARD_GAP_Y }
  }
  return PANEL_GRID_GAP[panelType] || { x: CARD_GAP_X, y: CARD_GAP_Y }
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
  cardSize: { width: number; height: number },
  panelType?: CanvasComponentType
): ElementPosition {
  const gap = getPanelGridGap(panelType)
  const col = index % columns
  const row = Math.floor(index / columns)
  return {
    x: PANEL_PADDING.left + col * (cardSize.width + gap.x),
    y: PANEL_PADDING.top + row * (cardSize.height + gap.y),
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
  if (panelType === CanvasComponentType.KSA_PANEL) {
    return KSA_PANEL_FIXED_SIZE
  }

  const gap = getPanelGridGap(panelType)

  // 至少显示一行
  const rows = Math.max(1, Math.ceil(childCount / columns))
  // 实际使用的列数（可能不满一行）
  const actualColumns = Math.min(childCount || 1, columns)

  const width = PANEL_PADDING.left + actualColumns * cardSize.width + (actualColumns - 1) * gap.x + PANEL_PADDING.right
  const height = PANEL_PADDING.top + rows * cardSize.height + (rows - 1) * gap.y + PANEL_PADDING.bottom

  // 确保最小尺寸（高度最小 200px，与 BasePanelNode 的 minHeight 保持一致）
  return {
    width: Math.max(width, 320),
    height: Math.max(height, 200),
  }
}

function getElementWidthByType(
  componentType: CanvasComponentType,
  data?: CanvasComponentData,
  size?: { width: number; height: number }
): number {
  if (componentType === CanvasComponentType.GRADUATION_SUPPORT) {
    return calculateGraduationSupportSize(data).width
  }

  if (componentType === CanvasComponentType.PROJECT_MATRIX || componentType === CanvasComponentType.PROJECT_MATRIX_PANEL) {
    return size?.width || DEFAULT_ELEMENT_SIZES[CanvasComponentType.PROJECT_MATRIX].width
  }

  return size?.width || DEFAULT_ELEMENT_SIZES[componentType]?.width || 320
}

function getHorizontalAnchor(elements: CanvasElementData[]): ElementPosition {
  const courseInfo = elements.find(el => el.type === CanvasComponentType.COURSE_INFO)
  if (courseInfo) {
    return { x: courseInfo.position.x, y: courseInfo.position.y }
  }
  return { x: COLUMN_X_POSITIONS[0], y: START_Y }
}

function isHorizontalStackType(componentType: CanvasComponentType): boolean {
  if (componentType === CanvasComponentType.SOURCE_DOCUMENT_PANEL) {
    return true
  }

  return HORIZONTAL_STACK_GROUPS.some(group => group.includes(componentType))
}

/**
 * 计算水平布局中组件的位置
 * @param componentType 组件类型
 * @param elements 当前已存在的元素（用于计算同列内的 Y 偏移）
 * @param selfHeight
 * @returns 元素位置
 */
function calculateHorizontalPosition(
  componentType: CanvasComponentType,
  elements: CanvasElementData[],
  selfHeight?: number
): ElementPosition {
  if (!isHorizontalStackType(componentType)) {
    return { x: COLUMN_X_POSITIONS[0], y: START_Y }
  }

  const temporaryId = `__horizontal_position_${componentType}`
  const defaultSize = DEFAULT_ELEMENT_SIZES[componentType] || { width: 320, height: 200 }

  const draftElement: CanvasElementData = {
    id: temporaryId,
    type: componentType,
    position: { x: COLUMN_X_POSITIONS[0], y: START_Y },
    size: {
      width: defaultSize.width,
      height: selfHeight ?? defaultSize.height,
    },
    selected: false,
    data: {} as CanvasComponentData,
  }

  const recalculated = recalculateAllPanelPositions([...elements, draftElement])
  const calculated = recalculated.find(el => el.id === temporaryId)

  if (!calculated) {
    const anchor = getHorizontalAnchor(elements)
    return { x: anchor.x, y: anchor.y }
  }

  return calculated.position
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
  return calculateHorizontalPosition(componentType, elements, selfHeight)
}

function getElementHeightByType(
  componentType: CanvasComponentType,
  data?: CanvasComponentData,
  size?: { width: number; height: number }
): number {
  if (componentType === CanvasComponentType.GRADUATION_SUPPORT) {
    return calculateGraduationSupportSize(data).height
  }

  if (componentType === CanvasComponentType.PROJECT_MATRIX || componentType === CanvasComponentType.PROJECT_MATRIX_PANEL) {
    return size?.height || calculateProjectMatrixHeight(data)
  }

  return size?.height || DEFAULT_ELEMENT_SIZES[componentType]?.height || 200
}

function getVerticalAnchor(elements: CanvasElementData[]): ElementPosition {
  const courseInfo = elements.find(el => el.type === CanvasComponentType.COURSE_INFO)
  if (courseInfo) {
    return { x: courseInfo.position.x, y: courseInfo.position.y }
  }
  return { x: START_X, y: VERTICAL_START_Y }
}

function isVerticalStackType(componentType: CanvasComponentType): boolean {
  return VERTICAL_STACK_GROUPS.some(group => group.includes(componentType))
}

function isProjectMatrixType(componentType: CanvasComponentType): boolean {
  return componentType === CanvasComponentType.PROJECT_MATRIX || componentType === CanvasComponentType.PROJECT_MATRIX_PANEL
}

function recalculateAllPanelPositionsVertical(elements: CanvasElementData[]): CanvasElementData[] {
  if (elements.length === 0) return elements

  const updatedElements = [...elements]
  const anchor = getVerticalAnchor(updatedElements)

  let currentY = anchor.y

  const courseInfoIndex = updatedElements.findIndex(el => el.type === CanvasComponentType.COURSE_INFO)
  if (courseInfoIndex >= 0) {
    const courseInfo = updatedElements[courseInfoIndex]
    const courseInfoHeight = getElementHeightByType(CanvasComponentType.COURSE_INFO, courseInfo.data, courseInfo.size)
    updatedElements[courseInfoIndex] = {
      ...courseInfo,
      position: anchor,
    }
    currentY = anchor.y + courseInfoHeight + VERTICAL_STACK_GAP
  }

  const startGroupIndex = courseInfoIndex >= 0 ? 1 : 0
  for (let groupIndex = startGroupIndex; groupIndex < VERTICAL_STACK_GROUPS.length; groupIndex++) {
    const groupTypes = VERTICAL_STACK_GROUPS[groupIndex]
    const indicesInGroup = updatedElements
      .map((el, index) => ({ el, index }))
      .filter(({ el }) => groupTypes.includes(el.type))
      .map(({ index }) => index)

    const isProjectMatrixGroup =
      groupTypes.includes(CanvasComponentType.PROJECT_MATRIX) ||
      groupTypes.includes(CanvasComponentType.PROJECT_MATRIX_PANEL)

    if (isProjectMatrixGroup && indicesInGroup.length > 0) {
      const rowY = currentY
      let currentX = anchor.x
      let maxHeight = 0

      for (let i = 0; i < indicesInGroup.length; i++) {
        const index = indicesInGroup[i]
        const el = updatedElements[index]

        let correctedSize = el.size
        if (isProjectMatrixType(el.type)) {
          const matrixHeight = getElementHeightByType(el.type, el.data, el.size)
          correctedSize = {
            width: el.size?.width || DEFAULT_ELEMENT_SIZES[CanvasComponentType.PROJECT_MATRIX].width,
            height: matrixHeight,
          }
        }

        const elementWidth = getElementWidthByType(el.type, el.data, correctedSize)
        const elementHeight = getElementHeightByType(el.type, el.data, correctedSize)
        maxHeight = Math.max(maxHeight, elementHeight)

        updatedElements[index] = {
          ...el,
          size: correctedSize,
          position: { x: currentX, y: rowY },
        }

        currentX = currentX + elementWidth
        if (i < indicesInGroup.length - 1) {
          currentX = currentX + HORIZONTAL_ITEM_GAP
        }
      }

      currentY = currentY + maxHeight + VERTICAL_STACK_GAP
      continue
    }

    for (const index of indicesInGroup) {
      const el = updatedElements[index]

      let correctedSize = el.size
      if (el.type === CanvasComponentType.GRADUATION_SUPPORT) {
        correctedSize = calculateGraduationSupportSize(el.data)
      } else if (isProjectMatrixType(el.type)) {
        const matrixHeight = getElementHeightByType(el.type, el.data, el.size)
        correctedSize = {
          width: el.size?.width || DEFAULT_ELEMENT_SIZES[CanvasComponentType.PROJECT_MATRIX].width,
          height: matrixHeight,
        }
      }

      const elementHeight = getElementHeightByType(el.type, el.data, correctedSize)
      updatedElements[index] = {
        ...el,
        size: correctedSize,
        position: { x: anchor.x, y: currentY },
      }

      currentY = currentY + elementHeight + VERTICAL_STACK_GAP
    }
  }

  return updatedElements
}

function calculateVerticalPosition(
  componentType: CanvasComponentType,
  elements: CanvasElementData[],
  selfHeight?: number
): ElementPosition {
  if (!isVerticalStackType(componentType)) {
    return { x: START_X, y: VERTICAL_START_Y }
  }

  const temporaryId = `__vertical_position_${componentType}`
  const defaultSize = DEFAULT_ELEMENT_SIZES[componentType] || { width: 400, height: 200 }

  const draftElement: CanvasElementData = {
    id: temporaryId,
    type: componentType,
    position: { x: START_X, y: VERTICAL_START_Y },
    size: {
      width: defaultSize.width,
      height: selfHeight ?? defaultSize.height,
    },
    selected: false,
    data: {} as CanvasComponentData,
  }

  const recalculated = recalculateAllPanelPositionsVertical([...elements, draftElement])
  const calculated = recalculated.find(el => el.id === temporaryId)

  if (!calculated) {
    const anchor = getVerticalAnchor(elements)
    return { x: anchor.x, y: anchor.y }
  }

  return calculated.position
}

/**
 * 计算指定 Panel 之后所有同列 Panel 的新位置（水平布局版本）
 * 按到达顺序（elements 数组顺序）计算，而不是依赖固定的 ABCD 顺序
 * @param elements 当前所有元素
 * @returns 需要更新位置的元素 Map { id -> newPosition }
 */
function recalculatePanelPositions(
  elements: CanvasElementData[]
): Map<string, ElementPosition> {
  const updates = new Map<string, ElementPosition>()

  const recalculated = recalculateAllPanelPositions(elements)
  const recalculatedMap = new Map(recalculated.map(el => [el.id, el.position]))

  for (const el of elements) {
    const newPos = recalculatedMap.get(el.id)
    if (!newPos) continue
    if (newPos.x !== el.position.x || newPos.y !== el.position.y) {
      updates.set(el.id, newPos)
    }
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
  if (elements.length === 0) return elements

  const updatedElements = [...elements]

  const anchor = getHorizontalAnchor(updatedElements)
  const baselineY = anchor.y
  let currentX = anchor.x

  const courseInfoIndex = updatedElements.findIndex(el => el.type === CanvasComponentType.COURSE_INFO)
  if (courseInfoIndex >= 0) {
    const courseInfo = updatedElements[courseInfoIndex]
    const courseInfoWidth = getElementWidthByType(CanvasComponentType.COURSE_INFO, courseInfo.data, courseInfo.size)
    updatedElements[courseInfoIndex] = {
      ...courseInfo,
      position: anchor,
    }
    currentX = anchor.x + courseInfoWidth + HORIZONTAL_GROUP_GAP
  }

  const sourceDocumentPanelIndex = updatedElements.findIndex(el => el.type === CanvasComponentType.SOURCE_DOCUMENT_PANEL)
  if (sourceDocumentPanelIndex >= 0) {
    const sourcePanel = updatedElements[sourceDocumentPanelIndex]
    const sourcePanelHeight = getElementHeightByType(CanvasComponentType.SOURCE_DOCUMENT_PANEL, sourcePanel.data, sourcePanel.size)
    updatedElements[sourceDocumentPanelIndex] = {
      ...sourcePanel,
      position: {
        x: anchor.x,
        y: baselineY - sourcePanelHeight - HORIZONTAL_ITEM_GAP,
      },
    }
  }

  const startGroupIndex = courseInfoIndex >= 0 ? 1 : 0
  for (let groupIndex = startGroupIndex; groupIndex < HORIZONTAL_STACK_GROUPS.length; groupIndex++) {
    const groupTypes = HORIZONTAL_STACK_GROUPS[groupIndex]
    const indicesInGroup = updatedElements
      .map((el, index) => ({ el, index }))
      .filter(({ el }) => groupTypes.includes(el.type))
      .map(({ index }) => index)

    const isProjectMatrixGroup =
      groupTypes.includes(CanvasComponentType.PROJECT_MATRIX) ||
      groupTypes.includes(CanvasComponentType.PROJECT_MATRIX_PANEL)

    if (indicesInGroup.length === 0) {
      continue
    }

    if (isProjectMatrixGroup) {
      const columnX = currentX
      let currentY = baselineY
      let maxWidth = 0

      for (const index of indicesInGroup) {
        const el = updatedElements[index]

        let correctedSize = el.size
        if (isProjectMatrixType(el.type)) {
          const matrixHeight = getElementHeightByType(el.type, el.data, el.size)
          correctedSize = {
            width: getElementWidthByType(el.type, el.data, el.size),
            height: matrixHeight,
          }
        }

        const elementWidth = getElementWidthByType(el.type, el.data, correctedSize)
        const elementHeight = getElementHeightByType(el.type, el.data, correctedSize)
        maxWidth = Math.max(maxWidth, elementWidth)

        updatedElements[index] = {
          ...el,
          size: correctedSize,
          position: { x: columnX, y: currentY },
        }

        currentY = currentY + elementHeight + HORIZONTAL_ITEM_GAP
      }

      let gapAfterGroup = HORIZONTAL_GROUP_GAP
      const lastType = updatedElements[indicesInGroup[indicesInGroup.length - 1]].type
      for (let nextGroupIndex = groupIndex + 1; nextGroupIndex < HORIZONTAL_STACK_GROUPS.length; nextGroupIndex++) {
        const nextGroupTypes = HORIZONTAL_STACK_GROUPS[nextGroupIndex]
        const nextIndex = updatedElements.findIndex(el => nextGroupTypes.includes(el.type))
        if (nextIndex >= 0) {
          const nextType = updatedElements[nextIndex].type
          gapAfterGroup = getHorizontalGapBetween(lastType, nextType, HORIZONTAL_GROUP_GAP)
          break
        }
      }

      currentX = currentX + maxWidth + gapAfterGroup
      continue
    }

    for (let i = 0; i < indicesInGroup.length; i++) {
      const index = indicesInGroup[i]
      const el = updatedElements[index]

      let correctedSize = el.size
      if (el.type === CanvasComponentType.GRADUATION_SUPPORT) {
        correctedSize = calculateGraduationSupportSize(el.data)
      } else if (isProjectMatrixType(el.type)) {
        const matrixHeight = getElementHeightByType(el.type, el.data, el.size)
        correctedSize = {
          width: getElementWidthByType(el.type, el.data, el.size),
          height: matrixHeight,
        }
      }

      const elementWidth = getElementWidthByType(el.type, el.data, correctedSize)
      updatedElements[index] = {
        ...el,
        size: correctedSize,
        position: {
          x: currentX,
          y: el.type === CanvasComponentType.COURSE_MATRIX
            ? baselineY + HORIZONTAL_COURSE_MATRIX_OFFSET
            : baselineY,
        },
      }

      currentX = currentX + elementWidth
      if (i < indicesInGroup.length - 1) {
        const nextType = updatedElements[indicesInGroup[i + 1]].type
        const gap = getHorizontalGapBetween(el.type, nextType, HORIZONTAL_ITEM_GAP)
        currentX = currentX + gap
      }
    }

    let gapAfterGroup = HORIZONTAL_GROUP_GAP
    const lastType = updatedElements[indicesInGroup[indicesInGroup.length - 1]].type
    for (let nextGroupIndex = groupIndex + 1; nextGroupIndex < HORIZONTAL_STACK_GROUPS.length; nextGroupIndex++) {
      const nextGroupTypes = HORIZONTAL_STACK_GROUPS[nextGroupIndex]
      const nextIndex = updatedElements.findIndex(el => nextGroupTypes.includes(el.type))
      if (nextIndex >= 0) {
        const nextType = updatedElements[nextIndex].type
        gapAfterGroup = getHorizontalGapBetween(lastType, nextType, HORIZONTAL_GROUP_GAP)
        break
      }
    }

    currentX = currentX + gapAfterGroup
  }

  return updatedElements
}

/**
 * 画布元素状态管理Hook
 * 支持节点和边的管理，以及 React Flow 集成
 */
export function useCanvasElements(layoutMode: CanvasLayoutMode = "horizontal") {
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

  const calculatePositionByLayout = useCallback((
    componentType: CanvasComponentType,
    currentElements: CanvasElementData[],
    selfHeight?: number
  ): ElementPosition => {
    if (layoutMode === "vertical") {
      return calculateVerticalPosition(componentType, currentElements, selfHeight)
    }

    if (selfHeight !== undefined) {
      return calculateHorizontalPositionWithSize(componentType, currentElements, selfHeight)
    }

    return calculateHorizontalPosition(componentType, currentElements)
  }, [layoutMode])

  const recalculateAllByLayout = useCallback((currentElements: CanvasElementData[]): CanvasElementData[] => {
    return layoutMode === "vertical"
      ? recalculateAllPanelPositionsVertical(currentElements)
      : recalculateAllPanelPositions(currentElements)
  }, [layoutMode])

  useEffect(() => {
    setElements(prev => recalculateAllByLayout(prev))
  }, [layoutMode, recalculateAllByLayout])

  // 计算新元素位置
  const calculateNextPosition = useCallback((componentType: CanvasComponentType): ElementPosition => {
    return calculatePositionByLayout(componentType, elements)
  }, [calculatePositionByLayout, elements])

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
  // 同时清理 specialComponents 中对应的数据
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

    // 收集要删除的元素信息，用于清理 specialComponents
    // 包括元素类型和项目矩阵的 chapter_id（用于构建 specialComponents 的 key）
    const elementsToRemove = elements.filter(el => idsToRemove.has(el.id))
    const specialComponentKeysToRemove: string[] = []
    for (const el of elementsToRemove) {
      // 项目矩阵使用 "${component}_${chapter_id}" 作为 key
      if (el.type === CanvasComponentType.PROJECT_MATRIX || el.type === CanvasComponentType.PROJECT_MATRIX_PANEL) {
        const chapterId = (el.data as { chapter_id?: string }).chapter_id || 'default'
        specialComponentKeysToRemove.push(`${el.type}_${chapterId}`)
      } else {
        // 其他组件直接使用类型作为 key
        specialComponentKeysToRemove.push(el.type)
      }
      // 源文档卡片还需要清理 source_documents key
      if (el.type === CanvasComponentType.SOURCE_DOCUMENT_CARD) {
        specialComponentKeysToRemove.push('source_documents')
      }
    }

    // 批量更新状态
    setElements(prev => prev.filter(el => !idsToRemove.has(el.id)))
    setEdges(prev => prev.filter(edge =>
      !idsToRemove.has(edge.source) && !idsToRemove.has(edge.target)
    ))

    // 清理 specialComponents 中对应的数据
    if (specialComponentKeysToRemove.length > 0) {
      setSpecialComponents(prev => {
        const newState = { ...prev }
        for (const key of specialComponentKeysToRemove) {
          if (key in newState) {
            delete newState[key]
            console.log(`[Canvas] 已清理 specialComponents 中的数据: ${key}`)
          }
        }
        return newState
      })
    }

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
      const newPanelSize = calculatePanelSize(newChildCount, columns, cardSize, panelType)

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
        const position = calculateGridPosition(index, columns, cardSize, panelType)

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
        if (layoutMode === "vertical") {
          return recalculateAllPanelPositionsVertical(newElements)
        }

        const positionUpdates = recalculatePanelPositions(newElements)
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
  }, [layoutMode])

  // 更新元素位置
  const updateElementPosition = useCallback((id: string, position: ElementPosition) => {
    setElements(prev => prev.map(el =>
      el.id === id ? { ...el, position } : el
    ))
  }, [])

  // 更新元素数据
  // 专业矩阵特殊处理：根据数据动态计算尺寸，并级联更新后续面板位置
  const updateElementData = useCallback((id: string, data: Partial<CanvasComponentData>) => {
    setElements(prev => {
      const updated = prev.map(el => {
        if (el.id !== id) return el
        const newData = { ...el.data, ...data }
        // 专业矩阵：根据支撑指标点数量动态计算尺寸
        if (el.type === CanvasComponentType.GRADUATION_SUPPORT) {
          const newSize = calculateGraduationSupportSize(newData)
          return { ...el, data: newData, size: newSize }
        }
        return { ...el, data: newData }
      })

      // 专业矩阵高度变化时，级联更新后续面板位置
      const targetEl = prev.find(el => el.id === id)
      if (targetEl?.type === CanvasComponentType.GRADUATION_SUPPORT) {
        const oldHeight = targetEl.size?.height || 200
        const newEl = updated.find(el => el.id === id)
        const newHeight = newEl?.size?.height || 200
        if (oldHeight !== newHeight) {
          if (layoutMode === "vertical") {
            return recalculateAllPanelPositionsVertical(updated)
          }

          const positionUpdates = recalculatePanelPositions(updated)
          for (let i = 0; i < updated.length; i++) {
            const newPos = positionUpdates.get(updated[i].id)
            if (newPos) {
              updated[i] = { ...updated[i], position: newPos }
            }
          }
        }
      }

      return updated
    })
  }, [layoutMode])

  // 选中元素（完整版本：同时更新 selectedId 和 elements.selected 状态）
  // 用于 AI/SSE 自动选中场景，需要完整的外部→内部同步 + setCenter 聚焦
  const selectElement = useCallback((id: string | null) => {
    setSelectedId(id)
    setElements(prev => prev.map(el => ({
      ...el,
      selected: el.id === id,
    })))
  }, [])

  // [MOD] 仅更新 selectedId，不触发 elements 变更
  // 用于用户点击画布节点时，React Flow 已经处理了 UI 选中高亮
  // 只需同步 selectedId state 用于持久化，无需触发整个渲染回环
  const setSelectedIdOnly = useCallback((id: string | null) => {
    setSelectedId(id)
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
    loadedSelectedIds?: string[],
    options?: {
      onBaseReady?: () => void
      onComplete?: () => void
      onProgress?: (progress: { loaded: number; total: number; stage: string }) => void
    }
  ) => {
    // [MOD] 按 ID 去重，保留首次出现的元素（修复历史数据中可能存在的重复 ID 问题）
    const seenIds = new Set<string>()
    const dedupedElements = (loadedElements || []).filter(el => {
      if (seenIds.has(el.id)) {
        console.warn("[画布加载] 检测到重复元素ID，已过滤:", el.id)
        return false
      }
      seenIds.add(el.id)
      return true
    })

    const uniqueElements = dedupedElements.map(el => {
      if (el.type === CanvasComponentType.KSA_PANEL) {
        return {
          ...el,
          size: KSA_PANEL_FIXED_SIZE,
        }
      }
      return el
    })

    // 重新计算所有 Panel 的垂直位置，确保间距正确
    const recalculatedElements = recalculateAllByLayout(uniqueElements)

    // 恢复选中状态
    const selectedIdSet = new Set(loadedSelectedIds || [])
    const elementsWithSelection = recalculatedElements.map(el => ({
      ...el,
      selected: selectedIdSet.has(el.id),
    }))

    const projectMatrixTypes = new Set<CanvasComponentType>([
      CanvasComponentType.PROJECT_MATRIX,
      CanvasComponentType.PROJECT_MATRIX_PANEL,
    ])

    const heavyPanelCardTypes = new Set<CanvasComponentType>([
      CanvasComponentType.COURSE_POINT_CARD,
      CanvasComponentType.KSA_ITEM,
    ])

    const projectMatrixElements = elementsWithSelection.filter(el => projectMatrixTypes.has(el.type))
    const heavyPanelCardElements = elementsWithSelection.filter(el => heavyPanelCardTypes.has(el.type))
    const staticElements = elementsWithSelection.filter(
      el => !projectMatrixTypes.has(el.type) && !heavyPanelCardTypes.has(el.type)
    )

    const totalToAppend = heavyPanelCardElements.length + projectMatrixElements.length
    let appendedCount = 0

    const emitProgress = (stage: string) => {
      options?.onProgress?.({
        loaded: appendedCount,
        total: totalToAppend,
        stage,
      })
    }

    setEdges(loadedEdges || [])
    setSpecialComponents(loadedSpecialComponents || {})

    // 恢复 selectedId（取第一个选中的元素）
    const firstSelectedId = loadedSelectedIds && loadedSelectedIds.length > 0 ? loadedSelectedIds[0] : null
    setSelectedId(firstSelectedId)

    // [MOD] 项目矩阵数量较多时分批挂载，避免一次性渲染多张大表导致主线程长任务
    setElements(staticElements)
    emitProgress("base-ready")
    requestAnimationFrame(() => {
      options?.onBaseReady?.()
    })

    const sortedHeavyPanelCards = [...heavyPanelCardElements].sort((a, b) => {
      if (a.parentId !== b.parentId) {
        return String(a.parentId || "").localeCompare(String(b.parentId || ""))
      }
      return a.position.y - b.position.y
    })

    const sortedProjectMatrices = [...projectMatrixElements].sort((a, b) => a.position.y - b.position.y)

    const appendProjectMatrixBatch = (startIndex: number) => {
      const batch = sortedProjectMatrices.slice(startIndex, startIndex + PROJECT_MATRIX_BATCH_SIZE)
      if (batch.length === 0) {
        requestAnimationFrame(() => {
          options?.onComplete?.()
        })
        return
      }

      setElements(prev => [...prev, ...batch])
      appendedCount += batch.length
      emitProgress("project-matrix")

      const nextIndex = startIndex + PROJECT_MATRIX_BATCH_SIZE
      if (nextIndex < sortedProjectMatrices.length) {
        requestAnimationFrame(() => appendProjectMatrixBatch(nextIndex))
      } else {
        console.log("[画布] 项目矩阵分批挂载完成:", {
          projectMatrixCount: sortedProjectMatrices.length,
          batchSize: PROJECT_MATRIX_BATCH_SIZE,
        })
        requestAnimationFrame(() => {
          options?.onComplete?.()
        })
      }
    }

    let heavyPanelCardBatchSize = HEAVY_PANEL_CARD_BATCH_SIZE_INITIAL
    let lastBatchFrameTs = performance.now()

    const appendHeavyPanelCardBatch = (startIndex: number) => {
      const now = performance.now()
      const frameInterval = now - lastBatchFrameTs
      lastBatchFrameTs = now

      // 根据帧间隔动态调节批次大小：卡顿时减小，流畅时增大
      if (frameInterval > 40) {
        heavyPanelCardBatchSize = Math.max(
          HEAVY_PANEL_CARD_BATCH_SIZE_MIN,
          Math.floor(heavyPanelCardBatchSize * 0.7)
        )
      } else if (frameInterval < 18) {
        heavyPanelCardBatchSize = Math.min(
          HEAVY_PANEL_CARD_BATCH_SIZE_MAX,
          Math.ceil(heavyPanelCardBatchSize * 1.2)
        )
      }

      const batch = sortedHeavyPanelCards.slice(startIndex, startIndex + heavyPanelCardBatchSize)
      if (batch.length === 0) {
        if (sortedProjectMatrices.length > 0) {
          requestAnimationFrame(() => appendProjectMatrixBatch(0))
        } else {
          requestAnimationFrame(() => {
            options?.onComplete?.()
          })
        }
        return
      }

      setElements(prev => [...prev, ...batch])
      appendedCount += batch.length
      emitProgress("panel-cards")

      requestAnimationFrame(() => appendHeavyPanelCardBatch(startIndex + batch.length))
    }

    if (totalToAppend === 0) {
      requestAnimationFrame(() => {
        options?.onComplete?.()
      })
    } else if (sortedHeavyPanelCards.length > 0) {
      requestAnimationFrame(() => appendHeavyPanelCardBatch(0))
    } else {
      requestAnimationFrame(() => appendProjectMatrixBatch(0))
    }

    console.log("[画布] 已加载数据, 元素数:", loadedElements?.length || 0, "边数:", loadedEdges?.length || 0, "选中:", loadedSelectedIds || [])
  }, [recalculateAllByLayout])

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
    // 使用 Record<string, unknown> 作为 data 类型以满足 React Flow 泛型约束
    const nodes: Node<Record<string, unknown>, FlowNodeType>[] = elements.map(el =>
      ({
        id: el.id,
        type: COMPONENT_TO_NODE_TYPE[el.type] || FlowNodeType.COURSE_INFO,
        position: el.position,
        data: el.data as unknown as Record<string, unknown>,
      })
    )

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
  // 使用 Record<string, unknown> 作为 data 类型以满足 React Flow 泛型约束
  const toFlowNodes = useCallback((): Node<Record<string, unknown>, FlowNodeType>[] => {
    // 分离父节点和子节点，确保父节点在前
    const parentNodes = elements.filter(el => !el.parentId)
    const childNodes = elements.filter(el => el.parentId)
    const sortedElements = [...parentNodes, ...childNodes]

    return sortedElements.map(el => {
      const isPanel = PANEL_TYPES.includes(el.type)
      const nodeType = COMPONENT_TO_NODE_TYPE[el.type] || FlowNodeType.COURSE_INFO
      const isNonInteractiveCard = NON_INTERACTIVE_CARD_NODE_TYPES.has(nodeType)
      const panelSize = el.type === CanvasComponentType.KSA_PANEL
        ? KSA_PANEL_FIXED_SIZE
        : el.size

      return {
        id: el.id,
        type: nodeType,
        position: el.position,
        data: el.data as unknown as Record<string, unknown>,
        selected: el.selected,
        draggable: isNonInteractiveCard ? false : undefined,
        selectable: isNonInteractiveCard ? false : undefined,
        connectable: isNonInteractiveCard ? false : undefined,
        focusable: isNonInteractiveCard ? false : undefined,
        // Group Node 属性
        parentId: el.parentId,
        extent: el.extent,
        // Panel 节点需要设置 style 宽高
        ...(isPanel && panelSize ? {
          style: { width: panelSize.width, height: panelSize.height }
        } : {}),
      }
    })
  }, [elements])

  // [MOD] 将 toFlowNodes 结果缓存为 flowNodes，避免 JSX 内联调用每次渲染都产生新数组
  // 依赖 [elements]，只有 elements 变化时才重新计算
  const flowNodes = useMemo(() => toFlowNodes(), [toFlowNodes])

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
        // 转发到 SET 逻辑，实现统一处理
        // SET 逻辑会自动判断：元素不存在则创建，存在则更新
        if (component && data) {
          handleCanvasEvent({
            ...event,
            action: CanvasAction.SET,
          })
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
            const panelData = { ...updateData }
            delete panelData.items
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
        // 统一的元素创建/更新逻辑
        // SET 事件实现"存在则更新，不存在则创建"的语义
        if (component && data) {
          // 需要存储到 specialComponents 的组件类型（矩阵类）
          const needsSpecialStorage = [
            CanvasComponentType.COURSE_MATRIX,
            CanvasComponentType.PROJECT_MATRIX,
            CanvasComponentType.PROJECT_MATRIX_PANEL,
          ].includes(component)

          if (needsSpecialStorage) {
            // 存储到 specialComponents（用于持久化）
            // 注意：项目矩阵有多个实例，使用 chapter_id 作为唯一标识
            const componentKey = (component === CanvasComponentType.PROJECT_MATRIX || component === CanvasComponentType.PROJECT_MATRIX_PANEL)
              ? `${component}_${(data as { chapter_id?: string }).chapter_id || 'default'}`
              : component
            setSpecialComponents(prev => ({
              ...prev,
              [componentKey]: { type: component, data: data as CanvasComponentData },
            }))
          }

          // 创建或更新画布元素
          setElements(prev => {
            // 查找已存在的元素
            let existingIndex: number
            const dataId = (data as { id?: string }).id

            // 优先通过 data.id 精确匹配
            if (dataId) {
              existingIndex = prev.findIndex(el => el.id === dataId)
            }
            // 项目矩阵需要根据 chapter_id 精确匹配（支持多个实例）
            else if (component === CanvasComponentType.PROJECT_MATRIX || component === CanvasComponentType.PROJECT_MATRIX_PANEL) {
              const chapterId = (data as { chapter_id?: string }).chapter_id
              existingIndex = prev.findIndex(el =>
                el.type === component &&
                (el.data as { chapter_id?: string }).chapter_id === chapterId
              )
            }
            // 其他组件根据类型匹配
            else {
              existingIndex = prev.findIndex(el => el.type === component)
            }

            // ========== 元素已存在：更新数据 ==========
            if (existingIndex >= 0) {
              const updated = [...prev]
              const existingEl = updated[existingIndex]

              // 项目矩阵/专业矩阵需要重新计算尺寸
              let newSize = existingEl.size
              if (component === CanvasComponentType.PROJECT_MATRIX || component === CanvasComponentType.PROJECT_MATRIX_PANEL) {
                const dynamicHeight = calculateProjectMatrixHeight(data)
                newSize = { width: existingEl.size?.width || 900, height: dynamicHeight }
              } else if (component === CanvasComponentType.GRADUATION_SUPPORT) {
                newSize = calculateGraduationSupportSize(data)
              } else if (component === CanvasComponentType.KSA_PANEL) {
                newSize = KSA_PANEL_FIXED_SIZE
              }

              updated[existingIndex] = {
                ...existingEl,
                data: data as CanvasComponentData,
                size: newSize,
              }
              return updated
            }

            // ========== 元素不存在：创建新元素 ==========

            // 单例组件去重检查
            if (SINGLETON_COMPONENT_TYPES.includes(component)) {
              const exists = prev.some(el => el.type === component)
              if (exists) {
                console.log(`[Canvas] SET: 忽略重复创建单例组件: ${component}`)
                return prev
              }
            }

            // [MOD] 添加随机字符串，解决同一毫秒内创建多个元素时 ID 重复的问题
            const randomSuffix = Math.random().toString(36).slice(2, 6)
            const elementId = dataId || `${component}_${Date.now()}${randomSuffix}`

            // ---------- Panel 类型处理 ----------
            if (PANEL_TYPES.includes(component)) {
              // 计算 Panel 初始尺寸
              let panelSize: { width: number; height: number }
              if (component === CanvasComponentType.GRADUATION_SUPPORT) {
                // 专业矩阵：根据数据动态计算尺寸（初始创建时可能已有支撑数据）
                panelSize = calculateGraduationSupportSize(data)
              } else {
                // 其他 Panel：根据子节点数量计算（无子节点时的最小尺寸）
                const cardType = PANEL_TO_CARD_MAP[component]
                const cardSize = cardType ? DEFAULT_ELEMENT_SIZES[cardType] : { width: 280, height: 80 }
                const columns = PANEL_GRID_COLUMNS[component] || 3
                panelSize = calculatePanelSize(0, columns, cardSize, component)
              }

              const panelPosition = calculatePositionByLayout(component, prev)

              const panelElement: CanvasElementData = {
                id: elementId,
                type: component,
                position: panelPosition,
                size: panelSize,
                selected: false,
                data: data as CanvasComponentData,
              }

              // 添加新 Panel 后重新计算所有面板位置
              const newElements = recalculateAllByLayout([...prev, panelElement])

              // 水平布局连线：课程信息 → 当前面板（如果是基础面板之一）
              if (COURSE_INFO_TO_PANELS.includes(component)) {
                const courseInfoNode = newElements.find(el => el.type === CanvasComponentType.COURSE_INFO)
                if (courseInfoNode) {
                  setTimeout(() => {
                    addEdge({
                      source: courseInfoNode.id,
                      target: elementId,
                      sourceHandle: "right",
                      targetHandle: "left",
                    })
                  }, 0)
                }
              }

              // 教学目标面板连线：毕业要求支撑 → 教学目标（OBJECTIVE_PANEL 在独立列）
              if (component === CanvasComponentType.OBJECTIVE_PANEL) {
                const graduationSupportNode = newElements.find(el => el.type === CanvasComponentType.GRADUATION_SUPPORT)
                if (graduationSupportNode) {
                  setTimeout(() => {
                    addEdge({
                      source: graduationSupportNode.id,
                      target: elementId,
                      sourceHandle: "right",
                      targetHandle: "left",
                    })
                  }, 0)
                }
              }

              // 章节面板连线：教学目标 → 章节项目
              if (component === CanvasComponentType.CHAPTER_PANEL) {
                const objectivePanelNode = newElements.find(el => el.type === CanvasComponentType.OBJECTIVE_PANEL)
                if (objectivePanelNode) {
                  setTimeout(() => {
                    addEdge({
                      source: objectivePanelNode.id,
                      target: elementId,
                      sourceHandle: "right",
                      targetHandle: "left",
                    })
                  }, 0)
                }
              }

              // 课点面板连线：章节项目 → 课点信息
              if (component === CanvasComponentType.COURSE_POINT_PANEL) {
                const chapterPanelNode = newElements.find(el => el.type === CanvasComponentType.CHAPTER_PANEL)
                if (chapterPanelNode) {
                  setTimeout(() => {
                    addEdge({
                      source: chapterPanelNode.id,
                      target: elementId,
                      sourceHandle: "right",
                      targetHandle: "left",
                    })
                  }, 0)
                }
              }

              // KSA 面板连线：课程矩阵 → KSA
              if (component === CanvasComponentType.KSA_PANEL) {
                const courseMatrixNode = newElements.find(el => el.type === CanvasComponentType.COURSE_MATRIX)
                if (courseMatrixNode) {
                  setTimeout(() => {
                    addEdge({
                      source: courseMatrixNode.id,
                      target: elementId,
                      sourceHandle: "right",
                      targetHandle: "left",
                    })
                  }, 0)
                }
              }

              return newElements
            }

            // ---------- Card 类型处理（需要归属到 Panel）----------
            if (CARD_TO_PANEL_MAP[component]) {
              const panelType = CARD_TO_PANEL_MAP[component]!
              const parentPanelIndex = prev.findIndex(el => el.type === panelType)
              const parentPanel = parentPanelIndex >= 0 ? prev[parentPanelIndex] : null

              if (parentPanel) {
                // 计算在 Panel 内的相对位置（基于网格布局）
                const childCount = prev.filter(el => el.parentId === parentPanel.id).length
                const cardSize = DEFAULT_ELEMENT_SIZES[component]
                const columns = PANEL_GRID_COLUMNS[panelType] || 3
                const relativePosition = calculateGridPosition(childCount, columns, cardSize, panelType)

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
                const newPanelSize = calculatePanelSize(newChildCount, columns, cardSize, panelType)
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
                  if (layoutMode === "vertical") {
                    return recalculateAllPanelPositionsVertical(newElements)
                  }

                  const positionUpdates = recalculatePanelPositions(newElements)
                  for (let i = 0; i < newElements.length; i++) {
                    const newPos = positionUpdates.get(newElements[i].id)
                    if (newPos) {
                      newElements[i] = { ...newElements[i], position: newPos }
                    }
                  }
                }

                return newElements
              } else {
                // Panel 不存在时作为独立节点，使用当前布局计算位置
                const cardSize = DEFAULT_ELEMENT_SIZES[component]
                const position = calculatePositionByLayout(component, prev)

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
            }

            // ---------- 项目矩阵处理 ----------
            if (component === CanvasComponentType.PROJECT_MATRIX || component === CanvasComponentType.PROJECT_MATRIX_PANEL) {
              // 动态计算项目矩阵高度
              const dynamicHeight = calculateProjectMatrixHeight(data)
              const elementSize = {
                width: DEFAULT_ELEMENT_SIZES[component].width,
                height: dynamicHeight,
              }

              // 基于最新状态计算位置（需要考虑新的动态高度）
              const position = calculatePositionByLayout(component, prev, elementSize.height)

              const newElement: CanvasElementData = {
                id: elementId,
                type: component,
                position,
                size: elementSize,
                selected: false,
                data: data as CanvasComponentData,
              }

              // 创建与 KSA 面板的连线
              const ksaPanel = prev.find(el => el.type === CanvasComponentType.KSA_PANEL)
              if (ksaPanel) {
                setTimeout(() => {
                  addEdge({
                    source: ksaPanel.id,
                    target: elementId,
                    sourceHandle: "right",
                    targetHandle: "left",
                  })
                }, 0)
              }

              return [...prev, newElement]
            }

            // ---------- 开课报告处理 ----------
            if (component === CanvasComponentType.COURSE_REPORT) {
              const elementSize = DEFAULT_ELEMENT_SIZES[component]

              // 找到所有项目矩阵
              const projectMatrices = prev.filter(el => el.type === CanvasComponentType.PROJECT_MATRIX)
              let position: ElementPosition

              // 如果事件包含手动指定的位置，优先使用
              if (event.position) {
                position = { x: event.position.x, y: event.position.y }
              } else if (projectMatrices.length > 0) {
                // 自动计算位置：在最右侧项目矩阵的右边
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
                position = calculatePositionByLayout(component, prev)
              }

              // 与所有项目矩阵建立连线
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
            }

            // ---------- 课程矩阵处理 ----------
            if (component === CanvasComponentType.COURSE_MATRIX) {
              const elementSize = DEFAULT_ELEMENT_SIZES[component] || { width: 1100, height: 680 }
              const position = calculatePositionByLayout(component, prev)

              const newElement: CanvasElementData = {
                id: elementId,
                type: component,
                position,
                size: elementSize,
                selected: false,
                data: data as CanvasComponentData,
              }

              // 课程矩阵与课点信息面板、KSA 面板建立连线
              setTimeout(() => {
                const coursePointPanel = prev.find(el => el.type === CanvasComponentType.COURSE_POINT_PANEL)
                if (coursePointPanel) {
                  addEdge({
                    source: coursePointPanel.id,
                    target: elementId,
                    sourceHandle: "right",
                    targetHandle: "left",
                  })
                }

                const ksaPanel = prev.find(el => el.type === CanvasComponentType.KSA_PANEL)
                if (ksaPanel) {
                  addEdge({
                    source: elementId,
                    target: ksaPanel.id,
                    sourceHandle: "right",
                    targetHandle: "left",
                  })
                }
              }, 0)

              return [...prev, newElement]
            }

            // ---------- 课程信息处理 ----------
            if (component === CanvasComponentType.COURSE_INFO) {
              const elementSize = DEFAULT_ELEMENT_SIZES[component] || { width: 480, height: 300 }
              const position = calculatePositionByLayout(component, prev)

              const newElement: CanvasElementData = {
                id: elementId,
                type: component,
                position,
                size: elementSize,
                selected: false,
                data: data as CanvasComponentData,
              }

              // 查找已存在的源文档卡片，建立连线
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

              return [...prev, newElement]
            }

            // ---------- 其他类型：默认处理 ----------
            const elementSize = DEFAULT_ELEMENT_SIZES[component] || { width: 400, height: 300 }
            const position = calculatePositionByLayout(component, prev)

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
                  const position = calculatePositionByLayout(item.component, newElements)
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
              const newPanelSize = calculatePanelSize(newChildCount, columns, cardSize, panelType)

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
                const position = calculateGridPosition(index, columns, cardSize, panelType)
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
              if (layoutMode === "vertical") {
                return recalculateAllPanelPositionsVertical(newElements)
              }

              const positionUpdates = recalculatePanelPositions(newElements)
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
              const expectedCourseInfoPosition = calculatePositionByLayout(CanvasComponentType.COURSE_INFO, filteredElements)
              const courseInfoX = courseInfo?.position?.x ?? expectedCourseInfoPosition.x
              // 当课程卡片不存在时，使用预期的课程卡片位置（基于面板范围计算）
              let courseInfoY: number
              if (courseInfo) {
                courseInfoY = courseInfo.position.y
              } else {
                courseInfoY = expectedCourseInfoPosition.y
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
    updatePanelChildren,
    removeElement,
    clearByComponentType,
    clearCanvas,
    addEdge,
    removeEdge,
    addEdges,
    applyLayout,
    calculatePositionByLayout,
    recalculateAllByLayout,
    layoutMode,
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
    setSelectedIdOnly,
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
    flowNodes,
    toFlowNodes,
    toFlowEdges,
    // 事件处理
    handleCanvasEvent,
  }
}
