/**
 * AI 助手相关类型定义
 */

import type { TreeNode } from "./index"

/**
 * 消息附件类型
 */
export interface MessageAttachment {
  name: string
  url: string
  ossKey: string
  type: string
  size: number
}

/**
 * 聊天消息类型
 */
export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  /** 是否正在流式传输 */
  isStreaming?: boolean
  /** AI 思考过程 */
  thinking?: string
  /** 用户消息附件 */
  attachment?: MessageAttachment
}

/**
 * 附件文件类型（上传前）
 */
export interface AttachedFile {
  id: string
  name: string
  type: string
  size: number
  file: File
}

/**
 * AI 助手抽屉组件 Props
 */
export interface AiAssistantDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedNodeName?: string | null
  activeTabLabel?: string | null
  userName?: string
  /** 树形结构数据（用于保存向导选择专业） */
  treeData?: TreeNode | null
}

/**
 * 工具状态信息
 */
export interface ToolStatus {
  node: string
  event: string
  tool?: string
  args?: Record<string, unknown>
}

/**
 * 进度状态信息
 */
export interface ProgressState {
  current: number
  total: number
  message: string
  stage: string
}

/**
 * 填充进度类型
 */
export type FillProgressType = 'matrix' | 'projectMatrix' | 'coursePoints' | 'ksa'

/**
 * 填充进度状态（合并多个填充操作的进度）
 */
export type FillProgress = Partial<Record<FillProgressType, string | null>>
