import type { Node, Edge, Position } from "@xyflow/react"
import type {
  CourseInfoData,
  ObjectiveCardData,
  CoursePointCardData,
  ChapterCardData,
  KsaItemData,
  CourseMatrixData,
  ProjectMatrixData,
  PanelData,
  SourceDocumentCardData,
} from "@/components/canvas-elements/types"

/**
 * Flow 节点类型枚举
 */
export enum FlowNodeType {
  // 源文档节点（用户上传的文件）
  SOURCE_DOCUMENT_PANEL = "sourceDocumentPanel",
  SOURCE_DOCUMENT = "sourceDocument",
  // 课程相关节点
  COURSE_INFO = "courseInfo",
  OBJECTIVE = "objective",
  COURSE_POINT = "coursePoint",
  CHAPTER = "chapter",
  KSA = "ksa",
  COURSE_MATRIX = "courseMatrix",
  PROJECT_MATRIX = "projectMatrix",
  COURSE_REPORT = "courseReport",
  // Panel 节点类型（作为 Group Node 使用）
  OBJECTIVE_PANEL = "objectivePanel",
  COURSE_POINT_PANEL = "coursePointPanel",
  CHAPTER_PANEL = "chapterPanel",
  KSA_PANEL = "ksaPanel",
}

/**
 * Flow 边类型枚举
 */
export enum FlowEdgeType {
  DEFAULT = "default",
  SUPPORT = "support",
  SMOOTHSTEP = "smoothstep",
}

/**
 * 节点数据联合类型
 */
export type FlowNodeData =
  | CourseInfoData
  | ObjectiveCardData
  | CoursePointCardData
  | ChapterCardData
  | KsaItemData
  | CourseMatrixData
  | ProjectMatrixData
  | PanelData
  | SourceDocumentCardData

/**
 * 自定义节点类型定义
 */
export type SourceDocumentNode = Node<SourceDocumentCardData, FlowNodeType.SOURCE_DOCUMENT>
export type CourseInfoNode = Node<CourseInfoData, FlowNodeType.COURSE_INFO>
export type ObjectiveNode = Node<ObjectiveCardData, FlowNodeType.OBJECTIVE>
export type CoursePointNode = Node<CoursePointCardData, FlowNodeType.COURSE_POINT>
export type ChapterNode = Node<ChapterCardData, FlowNodeType.CHAPTER>
// 导出 ChapterNodeData 类型别名（与 ChapterCardData 相同，供向后兼容）
export type ChapterNodeData = ChapterCardData
export type KsaNode = Node<KsaItemData, FlowNodeType.KSA>
export type CourseMatrixNode = Node<CourseMatrixData, FlowNodeType.COURSE_MATRIX>
export type ProjectMatrixNode = Node<ProjectMatrixData, FlowNodeType.PROJECT_MATRIX>

/**
 * 所有节点类型的联合
 */
export type FlowNode =
  | SourceDocumentNode
  | CourseInfoNode
  | ObjectiveNode
  | CoursePointNode
  | ChapterNode
  | KsaNode
  | CourseMatrixNode
  | ProjectMatrixNode

/**
 * 边附加数据
 * 使用索引签名以满足 @xyflow/react 的 Edge 泛型约束
 */
export type FlowEdgeData = {
  // 支撑强度
  strength?: "strong" | "weak"
  // 关系类型
  relationshipType?: "supports" | "depends" | "extends"
  // 标签
  label?: string
} & Record<string, unknown>

/**
 * 自定义边类型
 */
export type FlowEdge = Edge<FlowEdgeData>

/**
 * 节点默认尺寸配置
 */
export const NODE_DEFAULT_SIZES: Record<FlowNodeType, { width: number; height: number }> = {
  // 源文档节点
  [FlowNodeType.SOURCE_DOCUMENT_PANEL]: { width: 320, height: 200 },
  [FlowNodeType.SOURCE_DOCUMENT]: { width: 280, height: 100 },
  // 课程相关节点
  [FlowNodeType.COURSE_INFO]: { width: 320, height: 180 },
  [FlowNodeType.OBJECTIVE]: { width: 280, height: 80 },
  [FlowNodeType.COURSE_POINT]: { width: 280, height: 100 },
  [FlowNodeType.CHAPTER]: { width: 280, height: 100 },
  [FlowNodeType.KSA]: { width: 280, height: 60 },
  [FlowNodeType.COURSE_MATRIX]: { width: 600, height: 300 },
  [FlowNodeType.PROJECT_MATRIX]: { width: 600, height: 250 },
  [FlowNodeType.COURSE_REPORT]: { width: 480, height: 180 },
  // Panel 节点尺寸（作为容器，高度会根据子节点数量动态调整）
  [FlowNodeType.OBJECTIVE_PANEL]: { width: 320, height: 400 },
  [FlowNodeType.COURSE_POINT_PANEL]: { width: 320, height: 400 },
  [FlowNodeType.CHAPTER_PANEL]: { width: 320, height: 400 },
  [FlowNodeType.KSA_PANEL]: { width: 320, height: 400 },
}

/**
 * 节点颜色配置
 */
export const NODE_COLORS: Record<FlowNodeType, { bg: string; border: string; text: string }> = {
  // 源文档节点（使用橙色系）
  [FlowNodeType.SOURCE_DOCUMENT_PANEL]: { bg: "bg-orange-50/50", border: "border-orange-300", text: "text-orange-700" },
  [FlowNodeType.SOURCE_DOCUMENT]: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
  // 课程相关节点
  [FlowNodeType.COURSE_INFO]: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700" },
  [FlowNodeType.OBJECTIVE]: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  [FlowNodeType.COURSE_POINT]: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
  [FlowNodeType.CHAPTER]: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  [FlowNodeType.KSA]: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  [FlowNodeType.COURSE_MATRIX]: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
  [FlowNodeType.PROJECT_MATRIX]: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700" },
  [FlowNodeType.COURSE_REPORT]: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
  // Panel 节点颜色（与对应的 Card 节点颜色一致，但使用虚线边框）
  [FlowNodeType.OBJECTIVE_PANEL]: { bg: "bg-blue-50/50", border: "border-blue-300", text: "text-blue-700" },
  [FlowNodeType.COURSE_POINT_PANEL]: { bg: "bg-green-50/50", border: "border-green-300", text: "text-green-700" },
  [FlowNodeType.CHAPTER_PANEL]: { bg: "bg-purple-50/50", border: "border-purple-300", text: "text-purple-700" },
  [FlowNodeType.KSA_PANEL]: { bg: "bg-amber-50/50", border: "border-amber-300", text: "text-amber-700" },
}

/**
 * 获取组件颜色配置（用于重做标签）- Tailwind 类名格式
 * @param nodeType Flow节点类型
 * @returns 颜色配置对象，包含 bg、border、text 对应的 Tailwind 类名
 */
export function getNodeColorConfig(nodeType: FlowNodeType): { bg: string; border: string; text: string } {
  return NODE_COLORS[nodeType] || NODE_COLORS[FlowNodeType.COURSE_INFO]
}

/**
 * Handle（连接点）位置配置
 */
export interface HandleConfig {
  id: string
  position: Position
  type: "source" | "target"
}

/**
 * 节点默认 Handle 配置
 */
export const NODE_HANDLE_CONFIG: Record<FlowNodeType, HandleConfig[]> = {
  // 源文档节点（右侧输出连接到课程信息）
  [FlowNodeType.SOURCE_DOCUMENT_PANEL]: [
    { id: "right", position: "right" as Position, type: "source" },
  ],
  [FlowNodeType.SOURCE_DOCUMENT]: [
    { id: "right", position: "right" as Position, type: "source" },
  ],
  // 课程信息节点（左侧接收源文档连接）
  [FlowNodeType.COURSE_INFO]: [
    { id: "left", position: "left" as Position, type: "target" },
    { id: "bottom", position: "bottom" as Position, type: "source" },
  ],
  [FlowNodeType.OBJECTIVE]: [
    { id: "top", position: "top" as Position, type: "target" },
    { id: "bottom", position: "bottom" as Position, type: "source" },
  ],
  [FlowNodeType.COURSE_POINT]: [
    { id: "top", position: "top" as Position, type: "target" },
    { id: "bottom", position: "bottom" as Position, type: "source" },
  ],
  [FlowNodeType.CHAPTER]: [
    { id: "top", position: "top" as Position, type: "target" },
    { id: "bottom", position: "bottom" as Position, type: "source" },
  ],
  [FlowNodeType.KSA]: [
    { id: "top", position: "top" as Position, type: "target" },
    { id: "bottom", position: "bottom" as Position, type: "source" },
  ],
  [FlowNodeType.COURSE_MATRIX]: [
    { id: "top", position: "top" as Position, type: "target" },
    { id: "bottom", position: "bottom" as Position, type: "source" },
  ],
  [FlowNodeType.PROJECT_MATRIX]: [
    { id: "top", position: "top" as Position, type: "target" },
    { id: "right", position: "right" as Position, type: "source" },
  ],
  [FlowNodeType.COURSE_REPORT]: [
    { id: "left", position: "left" as Position, type: "target" },
  ],
  // Panel 节点的 Handle 配置（用于 Panel 间连线）
  [FlowNodeType.OBJECTIVE_PANEL]: [
    { id: "top", position: "top" as Position, type: "target" },
    { id: "bottom", position: "bottom" as Position, type: "source" },
  ],
  [FlowNodeType.COURSE_POINT_PANEL]: [
    { id: "top", position: "top" as Position, type: "target" },
    { id: "bottom", position: "bottom" as Position, type: "source" },
  ],
  [FlowNodeType.CHAPTER_PANEL]: [
    { id: "top", position: "top" as Position, type: "target" },
    { id: "bottom", position: "bottom" as Position, type: "source" },
    { id: "matrix", position: "right" as Position, type: "source" },
  ],
  [FlowNodeType.KSA_PANEL]: [
    { id: "top", position: "top" as Position, type: "target" },
    { id: "bottom", position: "bottom" as Position, type: "source" },
  ],
}
