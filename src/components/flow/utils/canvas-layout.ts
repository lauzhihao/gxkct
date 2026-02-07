import { CanvasComponentType } from "@/components/canvas-elements/types"

export type CanvasLayoutMode = "horizontal" | "vertical"

export const LAYOUT_COLUMNS = {
  COURSE_INFO: 0,
  BASIC_PANELS: 1,
  OBJECTIVE_PANEL: 2,
  COURSE_MATRIX: 3,
  PROJECT_MATRIX: 4,
} as const

export const COMPONENT_TO_LAYOUT_COLUMN: Partial<Record<CanvasComponentType, number>> = {
  [CanvasComponentType.SOURCE_DOCUMENT_PANEL]: LAYOUT_COLUMNS.COURSE_INFO,
  [CanvasComponentType.COURSE_INFO]: LAYOUT_COLUMNS.COURSE_INFO,
  [CanvasComponentType.GRADUATION_SUPPORT]: LAYOUT_COLUMNS.BASIC_PANELS,
  [CanvasComponentType.OBJECTIVE_PANEL]: LAYOUT_COLUMNS.OBJECTIVE_PANEL,
  [CanvasComponentType.CHAPTER_PANEL]: LAYOUT_COLUMNS.BASIC_PANELS,
  [CanvasComponentType.COURSE_POINT_PANEL]: LAYOUT_COLUMNS.BASIC_PANELS,
  [CanvasComponentType.KSA_PANEL]: LAYOUT_COLUMNS.BASIC_PANELS,
  [CanvasComponentType.COURSE_MATRIX]: LAYOUT_COLUMNS.COURSE_MATRIX,
  [CanvasComponentType.PROJECT_MATRIX]: LAYOUT_COLUMNS.PROJECT_MATRIX,
  [CanvasComponentType.PROJECT_MATRIX_PANEL]: LAYOUT_COLUMNS.PROJECT_MATRIX,
  [CanvasComponentType.COURSE_REPORT]: LAYOUT_COLUMNS.PROJECT_MATRIX,
}

export const CANVAS_LAYOUT_POSITION_CONFIG = {
  horizontal: {
    startX: 60,
    startY: 60,
    columnAxis: [-633, 640, 1200, 2705, 4088],
  },
  vertical: {
    startX: 60,
    startY: 60,
    rowAxis: [60, 640, 1200, 2705, 4088],
  },
} as const

export const VERTICAL_LAYOUT_GRID_SIZE = 24
export const VERTICAL_LAYOUT_GAP_GRIDS = 10
export const VERTICAL_LAYOUT_GAP_PX = VERTICAL_LAYOUT_GRID_SIZE * VERTICAL_LAYOUT_GAP_GRIDS

export const HORIZONTAL_LAYOUT_GRID_SIZE = 24
export const HORIZONTAL_LAYOUT_GROUP_GAP_GRIDS = 10
export const HORIZONTAL_LAYOUT_ITEM_GAP_GRIDS = 4
export const HORIZONTAL_LAYOUT_GROUP_GAP_PX = HORIZONTAL_LAYOUT_GRID_SIZE * HORIZONTAL_LAYOUT_GROUP_GAP_GRIDS
export const HORIZONTAL_LAYOUT_ITEM_GAP_PX = HORIZONTAL_LAYOUT_GRID_SIZE * HORIZONTAL_LAYOUT_ITEM_GAP_GRIDS
export const HORIZONTAL_COURSE_MATRIX_OFFSET_GRIDS = 3
export const HORIZONTAL_COURSE_MATRIX_OFFSET_PX = HORIZONTAL_LAYOUT_GRID_SIZE * HORIZONTAL_COURSE_MATRIX_OFFSET_GRIDS

export const HORIZONTAL_LAYOUT_GROUPS: CanvasComponentType[][] = [
  [CanvasComponentType.COURSE_INFO],
  [
    CanvasComponentType.GRADUATION_SUPPORT,
    CanvasComponentType.OBJECTIVE_PANEL,
    CanvasComponentType.CHAPTER_PANEL,
    CanvasComponentType.COURSE_POINT_PANEL,
    CanvasComponentType.KSA_PANEL,
  ],
  [CanvasComponentType.COURSE_MATRIX],
  [CanvasComponentType.PROJECT_MATRIX, CanvasComponentType.PROJECT_MATRIX_PANEL],
  [CanvasComponentType.COURSE_REPORT],
]

export const VERTICAL_LAYOUT_GROUPS: CanvasComponentType[][] = [
  [CanvasComponentType.COURSE_INFO],
  [CanvasComponentType.GRADUATION_SUPPORT],
  [CanvasComponentType.OBJECTIVE_PANEL],
  [CanvasComponentType.CHAPTER_PANEL],
  [CanvasComponentType.COURSE_POINT_PANEL],
  [CanvasComponentType.KSA_PANEL],
  [CanvasComponentType.COURSE_MATRIX],
  [CanvasComponentType.PROJECT_MATRIX, CanvasComponentType.PROJECT_MATRIX_PANEL],
  [CanvasComponentType.COURSE_REPORT],
]

export const CANVAS_LAYOUT_HANDLE_CONFIG = {
  horizontal: {
    default: { sourceHandle: "right", targetHandle: "left" },
    sourceDocument: { sourceHandle: "bottom", targetHandle: "top" },
  },
  vertical: {
    default: { sourceHandle: "bottom", targetHandle: "top" },
    sourceDocument: { sourceHandle: "bottom", targetHandle: "top" },
  },
} as const

export function getDefaultHandles(layoutMode: CanvasLayoutMode) {
  return CANVAS_LAYOUT_HANDLE_CONFIG[layoutMode].default
}

export function getSourceDocumentHandles(layoutMode: CanvasLayoutMode) {
  return CANVAS_LAYOUT_HANDLE_CONFIG[layoutMode].sourceDocument
}
