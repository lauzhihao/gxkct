/**
 * AI 助手 API 配置
 *
 * 集中管理 API 相关的常量和请求构建函数
 */

import type { RegenerateTarget } from "@/components/canvas-elements"

/**
 * AI API 配置常量
 */
export const AI_API_CONFIG = {
  /** 聊天完成接口路径 */
  CHAT_PATH: '/lang-chain/v1/chat/completions',
  /** 取消请求接口路径 */
  CANCEL_PATH: '/lang-chain/v1/chat/cancel',
  /** 模型名称 */
  MODEL: 'course-assistant',
} as const

/**
 * 会话存储键
 */
export const STORAGE_KEYS = {
  /** 会话 ID */
  SESSION_ID: 'ai-assistant-session-id',
  /** 消息历史 */
  MESSAGES: 'ai-assistant-messages',
} as const

/**
 * 文件配置
 */
export const FILE_CONFIG = {
  /** 最大文件大小 (10MB) */
  MAX_SIZE: 10 * 1024 * 1024,
  /** 支持的 MIME 类型 */
  SUPPORTED_TYPES: [
    'text/plain',           // .txt
    'text/markdown',        // .md
    'text/csv',             // .csv
    'application/json',     // .json
    'application/pdf',      // .pdf
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
  ] as const,
  /** 支持的文件扩展名 */
  SUPPORTED_EXTENSIONS: ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.csv', '.json'] as const,
} as const

/**
 * 工具名称中文映射表
 */
export const TOOL_NAME_MAP: Record<string, string> = {
  web_search: "网络搜索",
  generate_course_basic_info: "生成课程基本信息",
  generate_course_matrix: "生成课程矩阵",
  generate_project_matrix: "生成项目矩阵",
  show_stage_options: "显示阶段选项",
  analyze_document: "分析文档",
  extract_course_info: "提取课程信息",
}

/**
 * 获取 AI 请求 URL
 */
export function getAIRequestUrl(): string {
  const debugMode = process.env.NEXT_PUBLIC_AI_DEBUG === 'true'
  return `${AI_API_CONFIG.CHAT_PATH}${debugMode ? '?debug=true' : ''}`
}

/**
 * AI 请求消息
 */
export interface AIRequestMessage {
  role: string
  content: string
  type?: string
}

/**
 * AI 请求负载配置
 */
export interface AIRequestPayload {
  sessionId: string
  canvasOssKey?: string
  messages: AIRequestMessage[]
  // 可选的填充/重做标记
  regenerate?: RegenerateTarget
  fill_course_matrix?: boolean
  fill_project_matrix?: boolean
  fill_chapter_panel?: boolean
  fill_objective_panel?: boolean
  fill_course_info?: boolean
  fill_course_point_panel?: boolean
  fill_ksa_panel?: boolean
  target_panel_id?: string
  target_course_info_id?: string
}

/**
 * 构建 AI 请求配置
 */
export function buildAIRequest(
  payload: AIRequestPayload,
  signal: AbortSignal
): RequestInit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = {
    model: AI_API_CONFIG.MODEL,
    stream: true,
    session_id: payload.sessionId,
    messages: payload.messages,
  }

  // 添加画布 OSS Key
  if (payload.canvasOssKey) {
    body.canvas_oss_key = payload.canvasOssKey
  }

  // 添加重做目标
  if (payload.regenerate) {
    body.regenerate = payload.regenerate
  }

  // 添加各种填充标记
  if (payload.fill_course_matrix) {
    body.fill_course_matrix = true
  }
  if (payload.fill_project_matrix) {
    body.fill_project_matrix = true
  }
  if (payload.fill_chapter_panel) {
    body.fill_chapter_panel = true
  }
  if (payload.fill_objective_panel) {
    body.fill_objective_panel = true
  }
  if (payload.fill_course_info) {
    body.fill_course_info = true
  }
  if (payload.fill_course_point_panel) {
    body.fill_course_point_panel = true
  }
  if (payload.fill_ksa_panel) {
    body.fill_ksa_panel = true
  }

  // 添加目标面板 ID
  if (payload.target_panel_id) {
    body.target_panel_id = payload.target_panel_id
  }
  if (payload.target_course_info_id) {
    body.target_course_info_id = payload.target_course_info_id
  }

  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  }
}

/**
 * 根据工具状态生成友好的显示文本
 */
export interface ToolStatus {
  node: string
  event: string
  tool?: string
  args?: Record<string, unknown>
}

export function getToolStatusText(toolStatus: ToolStatus): string {
  const { node, event, tool, args } = toolStatus

  // agent 节点
  if (node === "agent") {
    if (event === "start") return "正在思考..."
    if (event === "end") return "思考完成"
  }

  // tools 节点（工具执行容器）
  if (node === "tools") {
    if (event === "start") return "正在执行工具..."
    if (event === "end") return "工具执行完成"
  }

  // tool 节点（具体工具）
  if (node === "tool" && tool) {
    const toolName = TOOL_NAME_MAP[tool] || tool

    if (event === "call") {
      // 根据不同工具提取关键参数
      if (tool === "web_search" && args?.query) {
        const query = String(args.query)
        const shortQuery = query.length > 30 ? query.slice(0, 30) + "..." : query
        return `正在搜索：${shortQuery}`
      }
      if ((tool === "generate_course_basic_info" || tool === "generate_course_matrix") && args?.course_name) {
        return `正在${toolName}：${args.course_name}`
      }
      return `正在调用 ${toolName}...`
    }

    if (event === "result") {
      return `${toolName} 执行完成`
    }
  }

  return "处理中..."
}
