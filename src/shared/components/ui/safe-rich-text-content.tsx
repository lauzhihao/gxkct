"use client"

import { memo, useCallback, useMemo, useRef, useState } from "react"
import type { MouseEvent, RefObject } from "react"
import { Maximize2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { cn } from "@/shared/utils/utils"
import { looksLikeHtml, sanitizeRichTextHtml } from "@/shared/utils/rich-text"

interface SafeRichTextContentProps {
  content?: string | null
  className?: string
  plainTextClassName?: string
}

interface SanitizedHtmlContentProps {
  sanitizedHtml: string
  className: string
  containerRef: RefObject<HTMLDivElement | null>
  onMouseOver: (event: MouseEvent<HTMLDivElement>) => void
  onMouseOut: (event: MouseEvent<HTMLDivElement>) => void
  onMouseLeave: () => void
  onClick: (event: MouseEvent<HTMLDivElement>) => void
}

const SanitizedHtmlContent = memo(function SanitizedHtmlContent({
  sanitizedHtml,
  className,
  containerRef,
  onMouseOver,
  onMouseOut,
  onMouseLeave,
  onClick,
}: SanitizedHtmlContentProps) {
  return (
    <div
      ref={containerRef}
      className={className}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
})

export function SafeRichTextContent({ content, className, plainTextClassName }: SafeRichTextContentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null)
  const [hoveredImage, setHoveredImage] = useState<{ top: number; left: number } | null>(null)

  if (!content) {
    return null
  }

  if (!looksLikeHtml(content)) {
    return <div className={cn("whitespace-pre-wrap", plainTextClassName, className)}>{content}</div>
  }

  const sanitizedHtml = sanitizeRichTextHtml(content)

  const contentClassName = useMemo(() => cn(
    "[&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_img]:block [&_img]:h-auto [&_img]:max-h-[50vh] [&_img]:max-w-[90%] [&_img]:object-contain [&_img]:rounded-md [&_img]:border [&_img]:border-border [&_img]:shadow-sm [&_img]:my-3 [&_img]:cursor-zoom-in [&_li]:list-item [&_li]:marker:text-foreground [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:list-outside [&_p]:leading-relaxed [&_p]:min-h-5 [&_p+*]:mt-2 [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_table]:rounded-none [&_table]:text-sm [&_tbody]:align-top [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:border [&_th]:border-border [&_th]:bg-secondary/40 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_tr]:align-top [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:list-outside",
    className,
  ), [className])

  const clearHoveredImage = useCallback(() => {
    setHoveredImage(null)
  }, [])

  const setHoveredImageFromElement = useCallback((imageElement: HTMLImageElement) => {
    if (!containerRef.current?.contains(imageElement)) {
      setHoveredImage(null)
      return
    }

    const imageRect = imageElement.getBoundingClientRect()
    setHoveredImage({
      top: imageRect.top + 12,
      left: imageRect.right - 44,
    })
  }, [])

  const handleImagePointerOver = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLImageElement)) {
      return
    }

    setHoveredImageFromElement(target)
  }, [setHoveredImageFromElement])

  const handleImagePointerOut = useCallback((target: EventTarget | null, relatedTarget: EventTarget | null) => {
    if (!(target instanceof HTMLImageElement)) {
      return
    }

    if (relatedTarget instanceof HTMLImageElement && relatedTarget === target) {
      return
    }

    clearHoveredImage()
  }, [clearHoveredImage])

  const openPreviewFromTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLImageElement)) {
      return
    }

    const imageSrc = target.getAttribute("src")
    if (!imageSrc || imageSrc.trim().length === 0) {
      return
    }

    const imageAlt = target.getAttribute("alt") || target.getAttribute("title") || ""
    setPreviewImage({ src: imageSrc, alt: imageAlt })
  }, [])

  const handleMouseOver = useCallback((event: MouseEvent<HTMLDivElement>) => {
    handleImagePointerOver(event.target)
  }, [handleImagePointerOver])

  const handleMouseOut = useCallback((event: MouseEvent<HTMLDivElement>) => {
    handleImagePointerOut(event.target, event.relatedTarget)
  }, [handleImagePointerOut])

  const handleClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    openPreviewFromTarget(event.target)
  }, [openPreviewFromTarget])

  return (
    <>
      <div>
        <SanitizedHtmlContent
          sanitizedHtml={sanitizedHtml}
          className={contentClassName}
          containerRef={containerRef}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
          onMouseLeave={clearHoveredImage}
          onClick={handleClick}
        />
        <div
          className={cn(
            "pointer-events-none fixed z-50 flex h-9 w-9 items-center justify-center rounded-full bg-background/92 text-foreground shadow-lg ring-1 ring-border transition-opacity duration-150 ease-out",
            hoveredImage ? "opacity-100" : "opacity-0",
          )}
          style={hoveredImage ? { top: hoveredImage.top, left: hoveredImage.left } : { top: 0, left: 0 }}
          aria-hidden="true"
        >
          <Maximize2 className="h-4 w-4" />
        </div>
      </div>

      <Dialog open={previewImage !== null} onOpenChange={(open) => {
        if (!open) {
          setPreviewImage(null)
        }
      }}>
        <DialogContent className="w-[min(96vw,1200px)] max-w-[calc(100vw-2rem)] border-none bg-background/95 p-3 shadow-2xl sm:max-w-[min(96vw,1200px)] sm:p-4">
          <DialogHeader className="sr-only">
            <DialogTitle>图片预览</DialogTitle>
          </DialogHeader>
          {previewImage ? (
            <div className="flex max-h-[85vh] flex-col gap-3 overflow-hidden">
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-md bg-muted/30 p-2 sm:p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImage.src}
                  alt={previewImage.alt}
                  className="h-auto max-h-[78vh] w-auto max-w-full object-contain"
                />
              </div>
              {previewImage.alt.trim().length > 0 ? <p className="text-sm text-muted-foreground">{previewImage.alt}</p> : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
