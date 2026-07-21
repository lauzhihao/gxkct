import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function readConnectionHandlers(): Promise<string> {
  return readFile(new URL("./connection-menu-handlers.ts", import.meta.url), "utf8")
}

async function readDrawer(): Promise<string> {
  return readFile(new URL("../ai-assistant-drawer.tsx", import.meta.url), "utf8")
}

test("chapter readiness does not let stale snake-case zero hours mask valid metadata", async () => {
  const source = await readConnectionHandlers()

  assert.match(source, /const snakeCaseHours = readCourseHourPair/)
  assert.match(source, /const metadataHours = readCourseHourPair/)
  assert.match(
    source,
    /const resolvedHours = hasPositiveTotal\(metadataHours\)[\s\S]*hasPositiveTotal\(snakeCaseHours\)/,
  )
  assert.match(source, /课程学时数据不一致/)
  assert.doesNotMatch(
    source,
    /total_theory_hours \?\? courseInfo\.metadata\?\.theoryPeriod/,
  )
})

test("project matrix generation blocks missing prerequisites and awaits canvas readiness", async () => {
  const source = await readConnectionHandlers()

  assert.match(source, /missingChapterNames\.push/)
  assert.match(source, /配置课程要点/)
  assert.match(source, /CanvasComponentType\.KSA_ITEM/)
  assert.match(source, /请先生成并完善 KSA 内容/)
  assert.match(source, /courseInfo\?\.name \|\| courseInfo\?\.course_name/)
  assert.match(source, /await ctx\.waitForCanvasStateFlush\(\)/)
  assert.doesNotMatch(source, /setTimeout\(/)
})

test("chapter and project regeneration do not clear old data before a valid SSE event", async () => {
  const source = await readDrawer()
  const projectStart = source.indexOf("const handleFillProjectMatrix")
  const projectEnd = source.indexOf("const handleFillCourseInfo", projectStart)
  const projectHandler = source.slice(projectStart, projectEnd)
  const chapterStart = source.indexOf("const handleFillChapterPanel")
  const chapterEnd = source.indexOf("const handleFillObjectivePanel", chapterStart)
  const chapterHandler = source.slice(chapterStart, chapterEnd)

  assert.ok(projectStart >= 0 && projectEnd > projectStart)
  assert.ok(chapterStart >= 0 && chapterEnd > chapterStart)
  assert.doesNotMatch(projectHandler, /updateCanvasElementData|removeCanvasDownstream/)
  assert.doesNotMatch(chapterHandler, /updateCanvasPanelChildren|removeCanvasDownstream/)
  assert.match(source, /生成失败，保留原有矩阵内容/)
  assert.match(source, /只在服务端已经返回完整章节时原子替换/)
})

test("drawer preserves SSE errors and uses project-matrix summary as the authoritative status", async () => {
  const source = await readDrawer()

  assert.match(source, /sseErrorMessage \|\| config\.errorMessage/)
  assert.match(source, /summary\?\.stage === "fill_project_matrix"/)
  assert.match(source, /summary\.status === "failed"\) return "failed"/)
  assert.match(source, /summary\.status === "partial"\) return "partial"/)
  assert.match(source, /errorType === "generation_failed"\) return "failed"/)
  assert.match(source, /requireGenerationSummary: config\.fillProgressType === 'projectMatrix'/)
  assert.match(source, /commitAssistantContent\(fallback, undefined, generationStatus\)/)
  assert.match(source, /const partialSummary = finalSummary\?\.status === "partial" \? finalSummary : null/)
  assert.match(source, /isPartial \? "partial" : "completed"/)
  assert.match(source, /if \(!isPartial\) \{\s*config\.onComplete\?\.\(\)/)
  assert.match(source, /generatedProjectMatrixCanvasCount/)
  assert.match(source, /isCompatibleFailed \? "failed"/)
})

test("batched project matrices derive stable unique element ids from chapter ids", async () => {
  const source = await readDrawer()

  assert.match(source, /function buildCanvasEventElementId/)
  assert.match(source, /return `\$\{component\}_\$\{chapterId\}`/)
  assert.match(source, /buildCanvasEventElementId\(event\.component, event\.data\)/)
  assert.doesNotMatch(
    source,
    /existingElement\?\.id \|\| `\$\{event\.component\}_\$\{Date\.now\(\)\}`/,
  )
})
