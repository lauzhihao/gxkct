/**
 * 课程开发助手主组件
 *
 * 功能：
 * 1. 通过多轮对话引导用户完成课程信息录入
 * 2. 使用 Mock 数据模拟向量检索和推荐
 * 3. 最终输出结构化 JSON 数据
 *
 * 热插拔设计：
 * - 服务接口定义在 types.ts
 * - Mock 实现在 utils/mock-data-provider.ts
 * - 后续替换为真实 API 只需修改 getCourseDataService()
 */

"use client"

import { useState, useEffect, useRef } from "react"
import { Sparkles, Send, RotateCcw, ArrowLeft, Copy, Download } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import {
  ThinkingProcess,
  QuickOptions,
  SimpleProgress,
  ChatMessage,
} from "./components"
import { useCourseDevFlow } from "./hooks/use-course-dev-flow"
import { STAGES } from "./constants"
import type { CourseDevAssistantProps } from "./types"

export function CourseDevAssistant({
  open,
  onOpenChange,
  onComplete,
  userName = "用户",
}: CourseDevAssistantProps) {
  const [inputMessage, setInputMessage] = useState("")
  const [isInputExpanded, setIsInputExpanded] = useState(false)
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)

  const {
    stage,
    messages,
    courseData,
    isProcessing,
    thinkingSteps,
    quickOptions,
    sendMessage,
    selectOption,
    goBack,
    reset,
    getExportData,
    downloadJson,
    copyToClipboard,
  } = useCourseDevFlow()

  // 自动滚动到底部
  useEffect(() => {
    const viewport = scrollViewportRef.current
    if (!viewport) return
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' })
  }, [messages, thinkingSteps])

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return
    const content = inputMessage.trim()
    setInputMessage("")
    await sendMessage(content)
  }

  // 完成时回调
  useEffect(() => {
    if (stage === 'complete' && onComplete) {
      onComplete(getExportData())
    }
  }, [stage, onComplete, getExportData])

  // 快捷操作
  const handleCopy = async () => {
    const success = await copyToClipboard()
    if (success) {
      // 可以添加 toast 提示
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="!w-[460px] sm:!w-[520px] lg:!w-[580px] xl:!w-[620px] 2xl:!w-[680px] sm:!max-w-none lg:!max-w-none 2xl:!max-w-none max-w-[90vw] p-0 bg-background/95 backdrop-blur-xl border-border/40"
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* 头部 */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-left text-xl font-semibold flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-primary" />
                课程开发助手
              </SheetTitle>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2">
                {stage !== 'welcome' && stage !== 'complete' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={goBack}
                    title="返回上一步"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={reset}
                  title="重新开始"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-left">
              通过对话引导，快速完成课程信息的录入与规划
            </p>

            {/* 进度条 */}
            <div className="mt-3">
              <SimpleProgress currentStage={stage} />
            </div>
          </SheetHeader>

          {/* 消息列表 */}
          <ScrollArea ref={scrollViewportRef} className="flex-1 min-h-0 px-6 py-4">
            <div className="space-y-5 pr-2">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  userName={userName}
                />
              ))}

              {/* 思考过程 */}
              <ThinkingProcess
                steps={thinkingSteps}
                isActive={thinkingSteps.length > 0}
              />

              {/* 快捷选项 */}
              {!isProcessing && quickOptions.length > 0 && (
                <div className="pt-2">
                  <QuickOptions
                    options={quickOptions}
                    onSelect={selectOption}
                    disabled={isProcessing}
                  />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* 底部输入区域 */}
          <div className="border-t border-border/60 bg-background/80 p-4 flex-shrink-0">
            {/* 完成阶段显示导出按钮 */}
            {stage === 'complete' && (
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCopy}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  复制 JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={downloadJson}
                >
                  <Download className="h-4 w-4 mr-2" />
                  下载文件
                </Button>
              </div>
            )}

            {/* 输入框 */}
            <div className="relative">
              <ExpandableTextarea
                value={inputMessage}
                onChange={(value) => !isProcessing && setInputMessage(value)}
                onExpandedChange={setIsInputExpanded}
                placeholder={
                  isProcessing
                    ? "AI 正在处理中..."
                    : stage === 'complete'
                    ? "输入内容继续对话，或点击上方按钮导出数据"
                    : "输入你的回答，或选择上方的快捷选项..."
                }
                className={`bg-background/80 px-3 py-2 text-sm pr-12 rounded-xl border border-border/60 focus:border-primary/50 transition-colors ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                rows={3}
                hideCounter
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !isProcessing) {
                    event.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <Button
                size="icon"
                className="absolute right-2 h-8 w-8 rounded-full transition-all duration-200"
                style={
                  isInputExpanded
                    ? { bottom: "8px", top: "auto" }
                    : { top: "50%", transform: "translateY(-50%)" }
                }
                disabled={!inputMessage.trim() || isProcessing}
                onClick={handleSendMessage}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              {stage === 'complete'
                ? "课程数据已生成，可以复制或下载 JSON 文件"
                : "你可以点击选项或直接输入文字描述"}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// 导出类型和工具
export type { CourseDevAssistantProps, CourseExportData } from './types'
export { useCourseDevFlow } from './hooks/use-course-dev-flow'
