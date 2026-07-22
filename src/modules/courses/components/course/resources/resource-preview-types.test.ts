import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function loadPreviewTypes() {
  return import(new URL("./resource-preview-types.ts", import.meta.url).href)
}

function createDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: "resource-1",
    displayName: "notes.txt",
    mimeType: "text/plain",
    downloadUrl: "/api/resources/resource-1/download",
    previewStatus: "NONE",
    previewUrl: null,
    ...overrides,
  }
}

test("rejects Office extensions including OpenDocument and RTF", async () => {
  const { resolveDirectResourcePreviewKind } = await loadPreviewTypes()
  const extensions = [
    "docx",
    "xlsm",
    "ppt",
    "rtf",
    "odt",
    "ott",
    "odm",
    "oth",
    "odg",
    "otg",
    "odp",
    "otp",
    "ods",
    "ots",
    "odc",
    "odf",
    "odb",
    "odi",
  ]

  for (const extension of extensions) {
    assert.equal(
      resolveDirectResourcePreviewKind(
        `document.${extension}`,
        "application/octet-stream",
      ),
      null,
    )
  }
})

test("rejects Office MIME types including legacy PowerPoint", async () => {
  const { resolveDirectResourcePreviewKind } = await loadPreviewTypes()
  const mimeTypes = [
    "application/msword",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
    "application/mspowerpoint",
    "application/powerpoint",
    "application/x-mspowerpoint",
    "application/vnd.oasis.opendocument.presentation",
    "application/rtf",
    "text/rtf",
  ]

  for (const mimeType of mimeTypes) {
    assert.equal(resolveDirectResourcePreviewKind("download", mimeType), null)
  }
})

test("renders SVG resources as inert text", async () => {
  const { resolveDirectResourcePreviewKind } = await loadPreviewTypes()

  assert.equal(
    resolveDirectResourcePreviewKind("vector.svg", "application/octet-stream"),
    "text",
  )
  assert.equal(
    resolveDirectResourcePreviewKind("vector", "image/svg+xml"),
    "text",
  )
})

test("renders Markdown with the Markdown path", async () => {
  const { resolveDirectResourcePreviewKind } = await loadPreviewTypes()

  assert.equal(
    resolveDirectResourcePreviewKind("guide.md", "application/octet-stream"),
    "markdown",
  )
  assert.equal(
    resolveDirectResourcePreviewKind("guide", "text/markdown"),
    "markdown",
  )
})

test("preserves PDF image and video classification", async () => {
  const { resolveDirectResourcePreviewKind } = await loadPreviewTypes()

  assert.equal(
    resolveDirectResourcePreviewKind("paper.pdf", "application/octet-stream"),
    "pdf",
  )
  assert.equal(
    resolveDirectResourcePreviewKind("photo.png", "application/octet-stream"),
    "image",
  )
  assert.equal(
    resolveDirectResourcePreviewKind("clip.mp4", "application/octet-stream"),
    "video",
  )
})

test("tries unknown non-Office resources as text regardless of extension", async () => {
  const { resolveDirectResourcePreviewKind } = await loadPreviewTypes()

  assert.equal(
    resolveDirectResourcePreviewKind("notes.txt", "application/x-custom"),
    "text",
  )
  assert.equal(
    resolveDirectResourcePreviewKind("archive.bin", "application/x-custom"),
    "text",
  )
})

test("Office details preserve safe converted previewUrl", async () => {
  const { parseResourcePreviewDetail } = await loadPreviewTypes()
  const detail = parseResourcePreviewDetail(createDetail({
    displayName: "slides.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    previewStatus: "READY",
    previewUrl: "/api/resources/resource-1/preview",
  }))

  assert.equal(detail.previewUrl, "/api/resources/resource-1/preview")
})

test("Office details reject unsafe converted previewUrl", async () => {
  const { parseResourcePreviewDetail } = await loadPreviewTypes()

  assert.throws(
    () => parseResourcePreviewDetail(createDetail({
      displayName: "slides.pptx",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      previewStatus: "READY",
      previewUrl: "javascript:alert(1)",
    })),
    /资源详情字段 previewUrl不是有效链接/,
  )
})

test("Office details allow an empty converted previewUrl while converting", async () => {
  const { parseResourcePreviewDetail } = await loadPreviewTypes()

  for (const previewStatus of ["NONE", "PENDING", "PROCESSING", "READY"]) {
    const detail = parseResourcePreviewDetail(createDetail({
      displayName: "slides.pptx",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      previewStatus,
      previewUrl: null,
    }))

    assert.equal(detail.previewUrl, null)
  }
})

test("direct text details do not require a READY previewUrl", async () => {
  const { parseResourcePreviewDetail } = await loadPreviewTypes()
  const detail = parseResourcePreviewDetail(createDetail({
    displayName: "archive.bin",
    mimeType: "application/x-custom",
    previewStatus: "READY",
    previewUrl: undefined,
  }))

  assert.equal(detail.previewUrl, null)
})

test("READY media details require a safe previewUrl", async () => {
  const { parseResourcePreviewDetail } = await loadPreviewTypes()

  assert.throws(
    () => parseResourcePreviewDetail(createDetail({
      displayName: "paper.pdf",
      mimeType: "application/pdf",
      previewStatus: "READY",
      previewUrl: null,
    })),
    /previewUrl 缺失/,
  )
  assert.throws(
    () => parseResourcePreviewDetail(createDetail({
      displayName: "photo.png",
      mimeType: "image/png",
      previewStatus: "READY",
      previewUrl: "javascript:alert(1)",
    })),
    /资源详情字段 previewUrl不是有效链接/,
  )
})

test("direct preview failure switches presentation to unsupported", async () => {
  const { resolveResourcePreviewPresentation } = await loadPreviewTypes()

  assert.deepEqual(
    resolveResourcePreviewPresentation("archive.bin", "application/x-custom", false),
    { mode: "direct-text", kind: "text" },
  )
  assert.deepEqual(
    resolveResourcePreviewPresentation("archive.bin", "application/x-custom", true),
    { mode: "unsupported" },
  )
})

test("Office presentation uses the converted preview status flow", async () => {
  const { resolveResourcePreviewPresentation } = await loadPreviewTypes()

  assert.deepEqual(
    resolveResourcePreviewPresentation(
      "slides.pptx",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      false,
    ),
    { mode: "status", directKind: null },
  )
})

test("Office preview state follows previewUrl and gives FAILED priority", async () => {
  const { parseResourcePreviewDetail, resolveOfficeResourcePreviewState } =
    await loadPreviewTypes()
  const officeIdentity = {
    displayName: "slides.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  }

  for (const previewStatus of ["NONE", "PENDING", "PROCESSING", "READY"]) {
    const convertingDetail = parseResourcePreviewDetail(createDetail({
      ...officeIdentity,
      previewStatus,
      previewUrl: null,
    }))
    assert.deepEqual(
      resolveOfficeResourcePreviewState(convertingDetail),
      { phase: "converting" },
    )

    const readyDetail = parseResourcePreviewDetail(createDetail({
      ...officeIdentity,
      previewStatus,
      previewUrl: "/api/resources/resource-1/preview",
    }))
    assert.deepEqual(
      resolveOfficeResourcePreviewState(readyDetail),
      { phase: "ready", url: "/api/resources/resource-1/preview" },
    )
  }

  for (const previewUrl of [null, "/api/resources/resource-1/preview"]) {
    const failedDetail = parseResourcePreviewDetail(createDetail({
      ...officeIdentity,
      previewStatus: "FAILED",
      previewUrl,
    }))
    assert.deepEqual(
      resolveOfficeResourcePreviewState(failedDetail),
      { phase: "failed" },
    )
  }
})

test("Office preview state does not change non-Office resources", async () => {
  const { parseResourcePreviewDetail, resolveOfficeResourcePreviewState } =
    await loadPreviewTypes()
  const textDetail = parseResourcePreviewDetail(createDetail())

  assert.equal(resolveOfficeResourcePreviewState(textDetail), null)
})

test("required details and downloadUrl remain strictly validated", async () => {
  const { parseResourcePreviewDetail } = await loadPreviewTypes()

  assert.throws(
    () => parseResourcePreviewDetail(createDetail({ mimeType: "" })),
    /mimeType 缺失或无效/,
  )
  assert.throws(
    () => parseResourcePreviewDetail(createDetail({
      downloadUrl: "javascript:alert(1)",
    })),
    /downloadUrl不是有效链接/,
  )
})

test("preview drawer keeps one contextual download action in its header", async () => {
  const source = await readFile(
    new URL("./ResourcePreviewDrawer.tsx", import.meta.url),
    "utf8",
  )

  assert.doesNotMatch(source, /<Badge|getStatusLabel|ResourcePreviewStatus|isDirectText/)
  assert.doesNotMatch(source, /ExternalLink|原始文件<\/span>|链接加载中/)
  assert.match(
    source,
    /<DrawerTitle[\s\S]*loadedDetail !== null && !isUnsupported[\s\S]*下载原件[\s\S]*<DrawerClose/,
  )
  assert.match(source, /className="ml-auto flex shrink-0 items-center gap-2"/)
  assert.match(source, /<DrawerDescription className="sr-only">/)
  assert.equal(Array.from(source.matchAll(/<Download\s*\/>\s*下载原件/g)).length, 2)
  assert.match(source, /请下载原件查看/)
  assert.match(source, /presentation\.mode === "unsupported"[\s\S]*return renderUnsupported\(detail\)/)
  assert.match(source, /resolveOfficeResourcePreviewState/)
  assert.match(source, /isPreviewConverting\(detail, presentation\)/)
  assert.match(source, /转换中，请稍候/)
  assert.match(source, /data-\[vaul-drawer-direction=right\]:sm:w-\[47vw\]/)
  assert.match(source, /onAnimationEnd=\{handleAnimationEnd\}/)
})
