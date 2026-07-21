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
import Image from "next/image"
import { Send, RotateCcw, ArrowLeft, Copy, Download } from "lucide-react"
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
              <SheetTitle className="text-left text-xl font-semibold flex items-center gap-2">
                <Image
                  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAqCAMAAAAqEZ1jAAAAAXNSR0IArs4c6QAAAAlwSFlzAAAhOAAAITgBRZYxYAAAAKJQTFRFAAAAenb/RpP/k2j/XXf7cXX6P5z7i2n8W3j7ZHP7jmn9VID7Qpf8jWn8Xnr6iWr8YHb7i2n8RJb9dWz8WXr8mWj9RpP8W3n8bW/8l2j+QJz9Q5f9ToT8fWv9ZW/8lWj9VID8YnX7Pp79QZr9pWb+RJT8m2f9k2j9SYz8jWn9hmr8UIT8fmv8VX78Xnn7d2z8ZHT7WHr7bm77Xnb7Z3D7YHH7RJOQRAAAACJ0Uk5TABAgICAwQEBAWF5gZXBwgICbn5+fo7+/vsLP39/f3urv73XwOA8AAAKfSURBVHja7dbJcuIwFIXhIzCxMTMNcdwMDoMZY4NxeP9V66srEckYQlPVvcvPBhZ8dVSIAvz03xNV/Luq4Xq9Hgo8nfDqjXq97hS1yXZNhXg2Z3o+f1KnLqx62y17Pp5smp+158EUaW6I52rkxLF3eoNpt1Ne+bR+Fd8U5Oc8Px6P5M0Evgq11ytpy0jgbk6e5cSxd2pb7yKOikpTouWyhbsNMsnpefZpOzsCI7c8brkM74/LqFSC7HkwVTu9lsB14ZJy745LlDdV5+3iQTXC7s9z3pNEggOh9s3woOFqJT2BmzUSLnMQEEeeh2+rkraiOrjZeL+XXEBwyp71Ybg+hWL+iltGt8ftKQI9QMzSlDxz9VofssIMdxitdJEvbo3jxqAGKXtt6N4OkpvgkmiFa50Ch1UU8zab/Ya4Br/IUnnewHCHg+FEh7/ExUIXdq+KG4N7z3hfzXDkaa5FmGpdMENrYWWjaoDrJtJLu4ajFFfbUduryN1ue4brb2KpjSvgvETe53R24U6Ggz+RYJnsCTMujmMJ9qELErkv9y7cyXAGtNCoI2Dqx9ymAl1bcYMLJ2NO5fZ2dmHLxiBGrJlxEAl7M1HkTFUzseeiWHOxYK+CrwLltRX3qTk7/4PbTXDdaBHLxytMdcllaaA56U1RSEyU56M0jotfYBLvynM091ni0GGtPO73nLkR7AaK6yqOKnG1g+wXrnqZz9nrw87bszdjjn/dDGffbgdX9YmT4HykaoLTp/UABGfyypx7a1yFNb0wpl7BddW8geSO5JU5TE63xhmOPb2uok8reN1Nrn4qjQNBlmfdvkB5beaoMgdP4LpFgbNuX3svtSwABoZ7WPOKa0Inxgl7DurMdfFXVV7savjK8WQ1/cz5+Q9e7A/jUZeiPQO0fwAAAABJRU5ErkJggg=="
                  alt="课程开发助手"
                  width={78}
                  height={42}
                  style={{ width: '32px', height: 'auto' }}
                  className="object-contain"
                  unoptimized
                />
                课程开发助手
              </SheetTitle>

              {/* 操作按钮 - 增加右边距避免与关闭按钮冲突 */}
              <div className="flex items-center gap-2 mr-10">
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
                  className="h-8 w-8 hover:text-white"
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
