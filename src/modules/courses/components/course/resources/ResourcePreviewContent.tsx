"use client"

import type { DirectResourcePreviewKind } from "./resource-preview-types"
import { ResourceTextPreview } from "./ResourceTextPreview"

interface ResourcePreviewContentProps {
  kind: DirectResourcePreviewKind
  url: string
  displayName: string
  onDirectPreviewFailed: () => void
}

export function ResourcePreviewContent({
  kind,
  url,
  displayName,
  onDirectPreviewFailed,
}: ResourcePreviewContentProps) {
  if (kind === "pdf") {
    return (
      <iframe
        src={url}
        title={`${displayName} PDF 预览`}
        className="h-full min-h-[520px] w-full bg-white"
      />
    )
  }

  if (kind === "image") {
    return (
      <div className="flex min-h-[520px] items-center justify-center bg-[radial-gradient(circle_at_center,var(--color-muted)_1px,transparent_1px)] bg-[length:18px_18px] p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={displayName}
          className="max-h-[calc(100vh-190px)] max-w-full rounded-lg border border-border bg-background object-contain shadow-xl"
        />
      </div>
    )
  }

  if (kind === "video") {
    return (
      <div className="flex min-h-[520px] items-center justify-center bg-zinc-950 p-6">
        <video
          src={url}
          controls
          preload="metadata"
          aria-label={`${displayName} 视频预览`}
          className="max-h-[calc(100vh-190px)] max-w-full rounded-lg shadow-2xl"
        />
      </div>
    )
  }

  return (
    <ResourceTextPreview
      url={url}
      format={kind}
      onPreviewFailed={onDirectPreviewFailed}
    />
  )
}
