"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import Image from "next/image"
import {
  ArrowUp,
  Compass,
  Cloud,
  Image as ImageIcon,
  Menu,
  Mic,
  MoreVertical,
  PencilLine,
  Plus,
  Square,
  Share2,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"
import { InfiniteKnowledgeCanvas } from "./infinite-knowledge-canvas"
import "./gemini-demo.css"

type DemoView = "welcome" | "chat" | "split"

interface GeminiDemoDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName?: string
}

const WELCOME_HEADLINE_TEXT = "需要我为您做些什么？"
const DEMO_FONT_PRESET_CLASS = "gemini-font-preset-a"

export function GeminiDemoDrawer({ open, onOpenChange, userName = "Charlie" }: GeminiDemoDrawerProps) {
  const [view, setView] = useState<DemoView>("welcome")
  const [splitPrompt, setSplitPrompt] = useState("")
  const [isSplitFontReady, setIsSplitFontReady] = useState(true)
  const [isSplitPulseActive, setIsSplitPulseActive] = useState(false)
  const [isSplitGenerating, setIsSplitGenerating] = useState(false)
  const [typedWelcomeHeadline, setTypedWelcomeHeadline] = useState(WELCOME_HEADLINE_TEXT)
  const [isWelcomeHeadlineTyping, setIsWelcomeHeadlineTyping] = useState(false)
  const splitPromptRef = useRef<HTMLTextAreaElement | null>(null)
  const splitPulseRafRef = useRef<number | null>(null)
  const splitPulseTimerRef = useRef<number | null>(null)
  const splitGeneratingTimerRef = useRef<number | null>(null)

  const handlePromptInput = (event: FormEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget
    textarea.style.height = "auto"
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  const clearSplitPulseTimer = () => {
    if (splitPulseTimerRef.current !== null) {
      window.clearTimeout(splitPulseTimerRef.current)
      splitPulseTimerRef.current = null
    }
  }

  const clearSplitGeneratingTimer = () => {
    if (splitGeneratingTimerRef.current !== null) {
      window.clearTimeout(splitGeneratingTimerRef.current)
      splitGeneratingTimerRef.current = null
    }
  }

  const triggerSplitPulse = () => {
    setIsSplitPulseActive(false)

    if (splitPulseRafRef.current !== null) {
      window.cancelAnimationFrame(splitPulseRafRef.current)
    }

    splitPulseRafRef.current = window.requestAnimationFrame(() => {
      setIsSplitPulseActive(true)
      splitPulseRafRef.current = null
    })

    clearSplitPulseTimer()
    splitPulseTimerRef.current = window.setTimeout(() => {
      setIsSplitPulseActive(false)
      splitPulseTimerRef.current = null
    }, 1350)
  }

  const handleSplitSubmit = () => {
    if (!splitPrompt.trim() || isSplitGenerating) {
      return
    }

    triggerSplitPulse()
    setSplitPrompt("")
    setIsSplitGenerating(true)

    clearSplitGeneratingTimer()
    splitGeneratingTimerRef.current = window.setTimeout(() => {
      setIsSplitGenerating(false)
      splitGeneratingTimerRef.current = null
    }, 1600)

    if (splitPromptRef.current) {
      splitPromptRef.current.style.height = "auto"
    }
  }

  const handleSplitStop = () => {
    clearSplitGeneratingTimer()
    setIsSplitGenerating(false)
  }

  const handleSplitPromptInput = (event: FormEvent<HTMLTextAreaElement>) => {
    setSplitPrompt(event.currentTarget.value)
    handlePromptInput(event)
  }

  const handleSplitPromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      if (isSplitGenerating) {
        return
      }
      event.preventDefault()
      handleSplitSubmit()
    }
  }

  useEffect(() => {
    return () => {
      if (splitPulseRafRef.current !== null) {
        window.cancelAnimationFrame(splitPulseRafRef.current)
      }
      clearSplitPulseTimer()
      clearSplitGeneratingTimer()
    }
  }, [])

  useEffect(() => {
    if (!open || view !== "split") {
      setIsSplitFontReady(true)
      return
    }

    setIsSplitFontReady(false)
    let isCancelled = false
    const fallbackTimer = window.setTimeout(() => {
      if (!isCancelled) {
        setIsSplitFontReady(true)
      }
    }, 460)

    void document.fonts.ready
      .then(() => {
        if (!isCancelled) {
          window.clearTimeout(fallbackTimer)
          setIsSplitFontReady(true)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          window.clearTimeout(fallbackTimer)
          setIsSplitFontReady(true)
        }
      })

    return () => {
      isCancelled = true
      window.clearTimeout(fallbackTimer)
    }
  }, [open, view])

  useEffect(() => {
    if (!open || view !== "welcome") {
      setTypedWelcomeHeadline(WELCOME_HEADLINE_TEXT)
      setIsWelcomeHeadlineTyping(false)
      return
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTypedWelcomeHeadline(WELCOME_HEADLINE_TEXT)
      setIsWelcomeHeadlineTyping(false)
      return
    }

    setTypedWelcomeHeadline("")
    setIsWelcomeHeadlineTyping(true)

    let charIndex = 0
    const typingTimer = window.setInterval(() => {
      charIndex += 1
      setTypedWelcomeHeadline(WELCOME_HEADLINE_TEXT.slice(0, charIndex))

      if (charIndex >= WELCOME_HEADLINE_TEXT.length) {
        window.clearInterval(typingTimer)
        setIsWelcomeHeadlineTyping(false)
      }
    }, 78)

    return () => {
      window.clearInterval(typingTimer)
    }
  }, [open, view])

  const hasSplitPromptText = splitPrompt.trim().length > 0

  const daytimeGreeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 11) return "早上好"
    if (hour < 18) return "中午好"
    return "晚上好"
  }, [])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" showClose={false} className="gemini-demo-sheet !w-screen !max-w-none h-screen p-0 border-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Gemini 助手 Demo 抽屉</SheetTitle>
        </SheetHeader>
        <div className={`gemini-demo-shell ${DEMO_FONT_PRESET_CLASS}`}>
          <aside className="gemini-demo-sidebar">
            <button type="button" className="gemini-demo-side-btn" aria-label="展开菜单">
              <Menu className="h-5 w-5" />
            </button>
            <button type="button" className="gemini-demo-side-btn" aria-label="新建会话">
              <PencilLine className="h-5 w-5" />
            </button>
          </aside>

          <main className="gemini-demo-main">
            <header className="gemini-demo-topbar">
              <div className="gemini-demo-brand">
                {view === "split" ? (
                  <>
                    借鉴 <span className="gemini-demo-latin-brand">Gemini</span> 网页样式设计
                  </>
                ) : (
                  <span className="gemini-demo-latin-brand">Gemini</span>
                )}
              </div>
              <div className="gemini-demo-actions">
                <div className="gemini-demo-avatar">{userName.slice(0, 1).toUpperCase()}</div>
              </div>
            </header>

            {view === "split" ? (
              <div className={`gemini-demo-split-wrap ${isSplitFontReady ? "is-font-ready" : "is-font-loading"}`}>
                {/* 左侧聊天区域容器 */}
                <section className="gemini-demo-chat-pane">
                  <div className="gemini-demo-chat-pane-body">
                    {/* 用户消息 */}
                    <div className="gemini-demo-chat-bubble-user">帮我设计一门《UI设计基础》课程，我希望它能以思维导图或知识图谱的形式呈现给我。</div>
                    {/* 系统回复文字 */}
                    <div className="gemini-demo-assistant-row">
                      <Image
                        src="/assets/ai/gemini-sparkle.svg"
                        alt="Gemini"
                        width={20}
                        height={20}
                        className="gemini-demo-assistant-sparkle"
                      />
                      <p>我会为您生成一份课程大纲，并输出结构化知识图谱草案。</p>
                    </div>
                    {/* 系统回复卡片 */}
                    <div className="gemini-demo-attachment-card">
                      <Cloud className="h-4 w-4" />
                      <div>
                        <div>UI设计基础课程大纲</div>
                        <small>2月11日 21:44</small>
                      </div>
                    </div>
                    {/* 系统回复选项 */}
                    <button type="button" className="gemini-demo-link-btn">不使用 Canvas，再试一次</button>
                  </div>

                  {/* 聊天输入区域 */}
                  <div className="gemini-demo-chat-pane-composer">
                    <div className={`gemini-demo-prompt-shell gemini-demo-split-prompt-shell ${isSplitPulseActive ? "is-submit-pulse" : ""}`}>
                      {/* 聊天输入框 */}
                      <textarea
                        ref={splitPromptRef}
                        className="gemini-demo-prompt-input gemini-demo-split-prompt-input"
                        value={splitPrompt}
                        placeholder="继续完善这份知识图谱"
                        aria-label="知识图谱输入框"
                        onInput={handleSplitPromptInput}
                        onKeyDown={handleSplitPromptKeyDown}
                      />
                      {/* 输入操作按钮 */}
                      <div className="gemini-demo-prompt-actions gemini-demo-split-actions">
                        <button type="button" className="gemini-demo-prompt-icon" aria-label="添加内容">
                          <Plus className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          className={`gemini-demo-prompt-icon gemini-demo-prompt-send gemini-demo-split-main-btn ${isSplitGenerating ? "is-generating" : ""}`}
                          aria-label={isSplitGenerating ? "停止输出" : hasSplitPromptText ? "发送消息" : "语音输入"}
                          onClick={isSplitGenerating ? handleSplitStop : hasSplitPromptText ? handleSplitSubmit : undefined}
                        >
                          {isSplitGenerating ? (
                            <Square className="h-3.5 w-3.5 fill-current" />
                          ) : hasSplitPromptText ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <Mic className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="gemini-demo-editor-pane">
                  <div className="gemini-demo-editor-toolbar">
                    <span>无限画布</span>
                    <span>知识节点</span>
                    <span>关系连线</span>
                    <span className="gemini-demo-toolbar-spacer" />
                    <span>实时编辑</span>
                  </div>
                  <div className="gemini-demo-editor-canvas-wrap">
                    <InfiniteKnowledgeCanvas />
                  </div>
                </section>
              </div>
            ) : view === "welcome" ? (
              <div className="gemini-demo-welcome-stage">
                <div className="gemini-demo-welcome-center">
                  <div className="gemini-demo-welcome-stack">
                    <div className="gemini-demo-greeting-row">
                      <Image src="/assets/ai/gemini-sparkle.svg" alt="Gemini" width={18} height={18} />
                      <span className="gemini-demo-user-name-base">{userName}</span>
                      <span className="gemini-demo-greeting-mini">{daytimeGreeting}</span>
                    </div>
                    <div
                      className={`gemini-demo-greeting-headline is-typing${isWelcomeHeadlineTyping ? "" : " is-finished"}`}
                      aria-label={WELCOME_HEADLINE_TEXT}
                    >
                      {typedWelcomeHeadline}
                    </div>
                  </div>

                  <div className="gemini-demo-prompt-shell">
                    <textarea
                      className="gemini-demo-prompt-input"
                      placeholder="提问"
                      aria-label="提问输入框"
                      onInput={handlePromptInput}
                    />
                    <div className="gemini-demo-prompt-actions">
                      <button type="button" className="gemini-demo-prompt-icon" aria-label="添加内容">
                        <Plus className="h-5 w-5" />
                      </button>
                      <button type="button" className="gemini-demo-prompt-icon" aria-label="语音输入">
                        <Mic className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="gemini-demo-tool-shortcuts" aria-label="快捷工具">
                    <button type="button" className="gemini-demo-tool-pill">
                      <Compass className="h-4 w-4" />
                      <span>深度研究</span>
                    </button>
                    <button type="button" className="gemini-demo-tool-pill">
                      <Sparkles className="h-4 w-4" />
                      <span>创建内容</span>
                    </button>
                    <button type="button" className="gemini-demo-tool-pill">
                      <ImageIcon className="h-4 w-4" />
                      <span>生成图片</span>
                    </button>
                    <button type="button" className="gemini-demo-tool-pill">
                      <SlidersHorizontal className="h-4 w-4" />
                      <span>更多工具</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="gemini-demo-content-wrap">
                <ScrollArea className="gemini-demo-chat-scroll">
                  <div className="gemini-demo-chat-body">
                    <div className="gemini-demo-chat-bubble-user">我想借鉴你的网页样式，麻烦你配合一下。</div>
                    <div className="gemini-demo-assistant-row gemini-demo-assistant-row-large">
                      <Image
                        src="/assets/ai/gemini-sparkle.svg"
                        alt="Gemini"
                        width={20}
                        height={20}
                        className="gemini-demo-assistant-sparkle"
                      />
                      <div>
                        <p>没问题，我已经整理出一份可直接落地的视觉方案。</p>
                        <ul>
                          <li>背景使用 #131314 深灰，降低视觉疲劳。</li>
                          <li>输入区采用大圆角与轻微发光边框，强化焦点。</li>
                          <li>通过留白与分区提升长文本可读性。</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="gemini-demo-composer">
                  <div className="gemini-demo-prompt-shell gemini-demo-chat-prompt-shell">
                    <textarea
                      className="gemini-demo-prompt-input"
                      placeholder="提问"
                      aria-label="提问输入框"
                      onInput={handlePromptInput}
                    />
                    <div className="gemini-demo-prompt-actions">
                      <button type="button" className="gemini-demo-prompt-icon" aria-label="添加内容">
                        <Plus className="h-5 w-5" />
                      </button>
                      <button type="button" className="gemini-demo-prompt-icon" aria-label="语音输入">
                        <Mic className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="gemini-demo-scene-switch">
              <Button type="button" variant={view === "welcome" ? "secondary" : "ghost"} size="sm" onClick={() => setView("welcome")}>界面 1</Button>
              <Button type="button" variant={view === "chat" ? "secondary" : "ghost"} size="sm" onClick={() => setView("chat")}>界面 2</Button>
              <Button type="button" variant={view === "split" ? "secondary" : "ghost"} size="sm" onClick={() => setView("split")}>界面 3</Button>
              <button type="button" className="gemini-demo-icon-btn" aria-label="更多">
                <Share2 className="h-4 w-4" />
              </button>
              <button type="button" className="gemini-demo-icon-btn" aria-label="更多操作">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </main>
        </div>
      </SheetContent>
    </Sheet>
  )
}
