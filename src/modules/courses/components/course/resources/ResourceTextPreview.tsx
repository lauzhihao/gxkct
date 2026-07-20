"use client"

import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { AlertCircle } from "lucide-react"
import { Spinner } from "@/shared/components/ui/spinner"

const MAX_TEXT_PREVIEW_BYTES = 1_000_000

type TextPreviewState =
  | { phase: "loading" }
  | { phase: "ready"; content: string }
  | { phase: "error"; message: string }

interface ResourceTextPreviewProps {
  url: string
  format: "markdown" | "text"
}

export function ResourceTextPreview({
  url,
  format,
}: ResourceTextPreviewProps) {
  const [state, setState] = useState<TextPreviewState>({ phase: "loading" })

  useEffect(() => {
    const controller = new AbortController()
    setState({ phase: "loading" })

    const loadContent = async () => {
      try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`文件内容加载失败（HTTP ${response.status}）`)
        }
        const buffer = await response.arrayBuffer()
        if (buffer.byteLength > MAX_TEXT_PREVIEW_BYTES) {
          throw new Error("文件超过 1 MB，请下载原件查看")
        }
        const content = new TextDecoder("utf-8", { fatal: true }).decode(buffer)
        setState({ phase: "ready", content })
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }
        const message = error instanceof Error ? error.message : "文件内容加载失败"
        setState({ phase: "error", message })
      }
    }

    void loadContent()
    return () => controller.abort()
  }, [url])

  if (state.phase === "loading") {
    return (
      <div className="flex min-h-[320px] items-center justify-center gap-3 text-sm text-muted-foreground">
        <Spinner className="size-5 text-primary" />
        正在读取文件内容
      </div>
    )
  }

  if (state.phase === "error") {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-8 text-center">
        <AlertCircle className="size-9 text-destructive" />
        <p className="text-sm font-medium text-foreground">无法显示文本预览</p>
        <p className="max-w-md text-sm text-muted-foreground">{state.message}</p>
      </div>
    )
  }

  if (format === "markdown") {
    return (
      <article className="max-w-none px-7 py-6 text-sm leading-7 text-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:mb-4 [&_h1]:mt-7 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-border [&_img]:rounded-lg [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_pre]:my-4 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
          {state.content}
        </ReactMarkdown>
      </article>
    )
  }

  return (
    <pre className="min-h-full whitespace-pre-wrap break-words px-7 py-6 font-mono text-sm leading-6 text-foreground">
      {state.content}
    </pre>
  )
}
