"use client"

/**
 * 聊天输入区域组件
 *
 * 包含文本输入框、发送/停止按钮、文件附件标签
 */

import { forwardRef } from "react"
import { Send, FileText, X, Square } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import { usePermission } from "@/shared/hooks/use-permission"
import type { PermissionAction } from "@/shared/permissions/types"
import type { AttachedFile } from "@/types/ai-assistant"
import type { RegenerateTag } from "@/components/canvas-elements"

const AI_CHAT_MANAGE_ACTION: PermissionAction = "major.course.create"
const AI_CHAT_MANAGE_CONTEXT = { scope: "major" as const }

/**
 * 聊天输入区域 Props
 */
export interface ChatInputAreaProps {
  /** 输入框内容 */
  inputMessage: string
  /** 输入内容变化回调 */
  onInputChange: (value: string) => void
  /** 输入框是否展开 */
  isInputExpanded: boolean
  /** 输入框展开状态变化回调 */
  onExpandedChange: (expanded: boolean) => void
  /** 是否正在生成（流式传输中或重做中） */
  isGenerating: boolean
  /** 是否正在上传文件 */
  isUploadingFile: boolean
  /** 附件文件列表 */
  attachedFiles: AttachedFile[]
  /** 移除文件回调 */
  onRemoveFile: (fileId: string) => void
  /** 发送消息回调 */
  onSend: () => void
  /** 停止生成回调 */
  onStop: () => void
  /** 画布是否展开（影响布局） */
  isCanvasExpanded: boolean
  /** 重做标签状态 */
  regenerateTag?: RegenerateTag | null
  /** 移除重做标签回调 */
  onRemoveRegenerateTag?: () => void
  /** 自定义占位符文本 */
  placeholder?: string
}

/**
 * 聊天输入区域组件
 */
export const ChatInputArea = forwardRef<HTMLTextAreaElement, ChatInputAreaProps>(
  function ChatInputArea(
    {
      inputMessage,
      onInputChange,
      isInputExpanded,
      onExpandedChange,
      isGenerating,
      isUploadingFile,
      attachedFiles,
      onRemoveFile,
      onSend,
      onStop,
      isCanvasExpanded,
      regenerateTag,
      onRemoveRegenerateTag,
      placeholder,
    },
    ref
  ) {
    const { can } = usePermission()
    const canManageChatInput = can(AI_CHAT_MANAGE_ACTION, AI_CHAT_MANAGE_CONTEXT)

    const handleSend = () => {
      if (!canManageChatInput) return
      if (isGenerating) return
      if ((!inputMessage.trim() && !regenerateTag) || isUploadingFile) return
      onSend()
    }

    const handleStop = () => {
      if (!canManageChatInput) return
      if (!isGenerating) return
      onStop()
    }

    const handleRemoveRegenerateTag = () => {
      if (!canManageChatInput) return
      if (!onRemoveRegenerateTag) return
      onRemoveRegenerateTag()
    }

    const handleRemoveFile = (fileId: string) => {
      if (!canManageChatInput) return
      onRemoveFile(fileId)
    }

    // 按钮位置样式
    const buttonPositionStyle = isInputExpanded
      ? { bottom: "12px", top: "auto", transform: "translateY(0)" }
      : { top: "50%", bottom: "auto", transform: "translateY(-50%)" }

    return (
      <div
        className={`border-t border-border/60 bg-background/80 flex-shrink-0 flex flex-col gap-3 ${
          isCanvasExpanded ? "p-5" : "p-6"
        }`}
      >
        {/* 重做标签区域 */}
        {regenerateTag && (
          <div
            className={`flex items-center justify-between w-1/2 min-w-[200px] px-3 py-2 rounded-md ${regenerateTag.color_config.bg} ${regenerateTag.color_config.border} border`}
          >
            <span className={`text-sm truncate ${regenerateTag.color_config.text}`}>
              请帮我重新设计{regenerateTag.node_name}
            </span>
            {canManageChatInput && (
              <button
                type="button"
                onClick={handleRemoveRegenerateTag}
                className={`flex-shrink-0 p-0.5 rounded hover:bg-black/5 ${regenerateTag.color_config.text} hover:text-opacity-80 transition-colors ml-2`}
                title="移除标签"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* 输入框区域 */}
        <div className="relative">
          <div className="ai-assistant-border-wrapper">
            <div className="ai-assistant-border-surface">
              <ExpandableTextarea
                ref={ref}
                value={inputMessage}
                onChange={onInputChange}
                onExpandedChange={onExpandedChange}
                placeholder={placeholder || "询问任何问题"}
                className="ai-assistant-textarea bg-background/80 px-3 py-2 text-sm pr-16"
                rows={4}
                hideCounter
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault()
                    handleSend()
                  }
                }}
              />
            </div>
          </div>

          {/* 发送/停止按钮 */}
          {canManageChatInput &&
            (isGenerating ? (
              <Button
                size="icon"
                variant="destructive"
                className="absolute right-3 h-7 w-7 rounded-full transition-[transform,top,bottom] duration-200 z-10"
                style={buttonPositionStyle}
                onClick={handleStop}
                title="停止生成"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="absolute right-3 h-7 w-7 rounded-full transition-[transform,top,bottom] duration-200 z-10"
                style={buttonPositionStyle}
                disabled={(!inputMessage.trim() && !regenerateTag) || isUploadingFile}
                onClick={handleSend}
                title={isUploadingFile ? "文件处理中" : "发送消息"}
              >
                <Send className={`h-4 w-4 ${isUploadingFile ? "opacity-60" : ""}`} />
              </Button>
            ))}
        </div>

        {/* 底部信息区域 */}
        <div className="flex items-center gap-2 min-h-[20px]">
          {/* 文件标签区域 */}
          {attachedFiles.length > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0 overflow-x-auto max-w-[60%]">
              {attachedFiles.map((file) => (
                <div
                  key={file.id}
                  className="ai-file-tag flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs group"
                >
                  <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span
                    className="truncate max-w-[120px] text-foreground/80"
                    title={file.name}
                  >
                    {file.name}
                  </span>
                  {canManageChatInput && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file.id)}
                      className="flex-shrink-0 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      title="移除文件"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground truncate ml-auto">
            {isUploadingFile
              ? "文件处理中，请稍候..."
              : "AI 可能会生成不准确的内容，请务必核对后再决定是否采纳。"}
          </p>
        </div>
      </div>
    )
  }
)
