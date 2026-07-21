// 画布元素类型定义导出
export {
  // 枚举
  CanvasAction,
  CanvasComponentType,
  // 类型判断函数
  isCanvasEvent,
  isStatusEvent,
  isThinkingEvent,
  isUIEvent,
  isProgressEvent,
  isProcessingEvent,
  isModeEvent,
  isErrorEvent,
  isOpenAIChunk,
  // 兼容旧代码（已废弃）
  CanvasActionType,
  CanvasElementType,
  isCanvasAction,
} from "./types"

export type {
  // 基础类型
  ElementPosition,
  ElementSize,
  // 组件数据接口
  CourseInfoData,
  PanelData,
  ObjectiveCardData,
  CoursePointCardData,
  ChapterCardData,
  KsaItemData,
  CourseMatrixSupport,
  CourseMatrixRow,
  CourseMatrixData,
  CourseMatrixCoursePoint,
  ProjectMatrixTaskObjective,
  ProjectMatrixKsaItem,
  ProjectMatrixObjectiveSupport,
  ProjectMatrixRow,
  ProjectMatrixData,
  // 源文档数据
  SourceDocument,
  SourceDocumentCardData,
  SourceDocumentsData,
  CanvasComponentData,
  // 元素状态
  CanvasElementData,
  // 边/连线
  CanvasEdgeData,
  ConnectEventData,
  LayoutEventData,
  // 重做标签
  RegenerateTag,
  // SSE消息结构
  CanvasEventMessage,
  StatusEventMessage,
  ThinkingEventMessage,
  UIEventMessage,
  ProgressEventMessage,
  ProcessingEventMessage,
  ModeEventMessage,
  ErrorEventMessage,
  SSEEventMessage,
  // 兼容旧代码（已废弃）
  ChapterData,
  CourseCardData,
  CanvasActionMessage,
} from "./types"
