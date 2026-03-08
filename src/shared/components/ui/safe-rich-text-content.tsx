"use client"

import { cn } from "@/shared/utils/utils"
import { looksLikeHtml, sanitizeRichTextHtml } from "@/shared/utils/rich-text"

interface SafeRichTextContentProps {
  content?: string | null
  className?: string
  plainTextClassName?: string
}

export function SafeRichTextContent({ content, className, plainTextClassName }: SafeRichTextContentProps) {
  if (!content) {
    return null
  }

  if (!looksLikeHtml(content)) {
    return <div className={cn("whitespace-pre-wrap", plainTextClassName, className)}>{content}</div>
  }

  const sanitizedHtml = sanitizeRichTextHtml(content)

  return (
    <div
      className={cn(
        "[&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:leading-relaxed [&_p]:min-h-5 [&_p+*]:mt-2 [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_table]:rounded-none [&_table]:text-sm [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border [&_th]:bg-secondary/40 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-6",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}
