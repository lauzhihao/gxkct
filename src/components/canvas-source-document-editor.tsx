"use client"

/**
 * 画布源文档编辑器组件
 * 用于编辑解析后的 Markdown 格式文件内容
 */

import { useState, useCallback, useEffect } from "react"
import { Loader2, Eye, Edit3 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { SourceDocumentCardData } from "./canvas-elements/types"
import { canvasApi } from "@/lib/api/canvas-api"
import { toast } from "sonner"
import { getDisplaySourceDocumentFilename } from "@/shared/utils/source-document-filename"

interface CanvasSourceDocumentEditorProps {
  // 文档数据
  document: SourceDocumentCardData
  // 保存回调（返回更新后的文档数据）
  onSave: (document: SourceDocumentCardData) => void
  // 关闭回调
  onClose: () => void
  // 重做回调（重新解析原始文件）
  onRegenerate?: (document: SourceDocumentCardData) => void
  // 是否正在保存
  isSaving?: boolean
  // 是否正在重做
  isRegenerating?: boolean
}

export function CanvasSourceDocumentEditor({
  document,
  onSave,
  onClose,
  onRegenerate,
  isSaving = false,
  isRegenerating = false,
}: CanvasSourceDocumentEditorProps) {
  const displayFilename = getDisplaySourceDocumentFilename(document.filename)

  // 编辑内容
  const [content, setContent] = useState("")
  // 加载状态
  const [isLoading, setIsLoading] = useState(true)
  // 加载错误
  const [loadError, setLoadError] = useState<string | null>(null)
  // 当前 tab
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")

  // 加载文件内容
  useEffect(() => {
    const loadContent = async () => {
      if (!document.ossKey) {
        setLoadError("文件路径不存在")
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setLoadError(null)

        // 从 OSS 获取文件内容
        // 优先使用 cdnHost 拼接地址，否则使用环境变量配置的 OSS 基础地址
        const baseUrl = document.cdnHost || process.env.NEXT_PUBLIC_OSS_BASE_URL || "https://gxkct-oss.oss-cn-hangzhou.aliyuncs.com"
        // 处理 baseUrl 末尾可能带斜杠的情况
        const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
        // 添加时间戳参数避免 CDN 缓存
        const fileUrl = `${normalizedBaseUrl}/${document.ossKey}?v=${Date.now()}`

        const response = await fetch(fileUrl)
        if (!response.ok) {
          throw new Error(`加载文件失败: ${response.status}`)
        }

        const text = await response.text()
        setContent(text)
      } catch (error) {
        console.error("加载文件内容失败:", error)
        setLoadError(error instanceof Error ? error.message : "加载文件失败")
      } finally {
        setIsLoading(false)
      }
    }

    loadContent()
  }, [document.ossKey, document.cdnHost])

  // 保存内容
  const handleSave = useCallback(async () => {
    if (!content.trim()) {
      toast.error("内容不能为空")
      return
    }

    try {
      // 获取上传预签名 URL（传入完整 ossKey 路径，保持原文件位置）
      const contentBlob = new Blob([content], { type: "text/markdown" })
      const presignResponse = await canvasApi.getPresignUrl({
        fileName: document.ossKey,
        mimeType: "text/markdown",
        size: contentBlob.size,
      })

      if (presignResponse.error || !presignResponse.data) {
        throw new Error(presignResponse.error || "获取上传签名失败")
      }

      // 上传到 OSS
      const uploadResponse = await fetch(presignResponse.data.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "text/markdown",
          ...presignResponse.data.uploadHeaders,
        },
        body: content,
      })

      if (!uploadResponse.ok) {
        throw new Error("上传文件失败")
      }

      // 更新文档的 ossKey 为新的上传路径，然后调用保存回调
      const updatedDocument: SourceDocumentCardData = {
        ...document,
        ossKey: presignResponse.data.uploadPath || document.ossKey,
      }
      onSave(updatedDocument)
      toast.success("保存成功")
    } catch (error) {
      console.error("保存文件失败:", error)
      toast.error(error instanceof Error ? error.message : "保存失败")
    }
  }, [content, document, onSave])

  // 重做（重新解析）
  const handleRegenerate = useCallback(() => {
    onRegenerate?.(document)
  }, [document, onRegenerate])

  return (
    <div className="flex flex-col h-full">
      {/* 头部信息 */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">{displayFilename}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              编辑解析后的文档内容（Markdown 格式）
            </p>
          </div>
          {onRegenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating || isSaving}
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  重新解析中...
                </>
              ) : (
                "重新解析"
              )}
            </Button>
          )}
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">加载中...</span>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-destructive">{loadError}</p>
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "edit" | "preview")}
            className="flex flex-col h-full"
          >
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-2 max-w-[240px]">
                <TabsTrigger value="edit" className="gap-2">
                  <Edit3 className="w-4 h-4" />
                  编辑
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="w-4 h-4" />
                  预览
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="edit" className="flex-1 overflow-hidden m-0 px-6 py-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="输入 Markdown 内容..."
                className="h-full min-h-0 resize-none font-mono text-sm"
                disabled={isSaving || isRegenerating}
              />
            </TabsContent>

            <TabsContent value="preview" className="flex-1 overflow-auto m-0 px-6 py-4">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content || "*暂无内容*"}
                </ReactMarkdown>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          取消
        </Button>
        <Button onClick={handleSave} disabled={isSaving || isLoading || !!loadError}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            "保存"
          )}
        </Button>
      </div>
    </div>
  )
}

export default CanvasSourceDocumentEditor
