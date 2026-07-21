// 节点组件
export {
  BaseFlowNode,
  CourseInfoNode,
  ObjectiveNode,
  CoursePointNode,
  ChapterNode,
  KsaNode,
  CourseMatrixNode,
  ProjectMatrixNode,
  CourseReportNode,
} from "./nodes"
export type { BaseFlowNodeProps } from "./nodes"

// 边组件
export { SupportEdge } from "./edges"

// 工具函数
export {
  applyDagreLayout,
  calculateFitView,
  generateEdgeId,
  generateHierarchyEdges,
  type LayoutOptions,
  type LayoutDirection,
} from "./utils/layout"

// 类型定义
export {
  FlowNodeType,
  FlowEdgeType,
  NODE_DEFAULT_SIZES,
  NODE_COLORS,
  NODE_HANDLE_CONFIG,
  type FlowNodeData,
  type FlowNode,
  type FlowEdge,
  type FlowEdgeData,
  type HandleConfig,
} from "./utils/types"
