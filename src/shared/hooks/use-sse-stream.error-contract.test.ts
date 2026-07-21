import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function readSource(): Promise<string> {
  return readFile(new URL("./use-sse-stream.ts", import.meta.url), "utf8")
}

async function readEventTypes(): Promise<string> {
  return readFile(new URL("../../components/canvas-elements/types.ts", import.meta.url), "utf8")
}

async function readDrawer(): Promise<string> {
  return readFile(new URL("../../components/ai-assistant-drawer.tsx", import.meta.url), "utf8")
}

test("fatal SSE error events reject the stream and never reach the success callback", async () => {
  const source = await readSource()

  assert.match(source, /export class SSEStreamError extends Error/)
  assert.match(source, /streamError \?\?= processed\.errorEvent \|\| null/)
  assert.match(
    source,
    /if \(streamError && !isCompatiblePartialError\) \{\s*throw new SSEStreamError\(streamError, generationSummary\)\s*\}/,
  )

  const rejectionIndex = source.indexOf("throw new SSEStreamError(streamError, generationSummary)")
  const completionIndex = source.indexOf("opts.onComplete?.(")
  assert.ok(rejectionIndex >= 0)
  assert.ok(completionIndex > rejectionIndex)
})

test("generation summary is authoritative: failed rejects while partial resolves without success callback", async () => {
  const source = await readSource()
  const eventTypes = await readEventTypes()

  assert.match(eventTypes, /export interface GenerationSummaryEventMessage/)
  assert.match(eventTypes, /status: GenerationSummaryStatus/)
  assert.match(eventTypes, /export function isGenerationSummaryEvent/)
  assert.match(source, /opts\.onGenerationSummary\?\.\(summary\)/)
  assert.match(source, /generationSummary\?\.status === "failed"/)
  assert.match(source, /const summaryError = createSummaryError\(generationSummary\)/)
  assert.match(source, /opts\.requireGenerationSummary && !generationSummary/)
  assert.match(source, /streamError\?\.error_type === "partial_generation"/)
  assert.match(source, /generationSummary\?\.status === "partial"/)
  assert.match(source, /generationSummary\?\.status !== "partial"/)
  assert.doesNotMatch(source, /generationSummary\.status !== "success"/)
})

test("drawer commits resolved partial generation without treating it as completed", async () => {
  const drawer = await readDrawer()

  assert.match(drawer, /const partialSummary = finalSummary\?\.status === "partial" \? finalSummary : null/)
  assert.match(drawer, /isPartial \? "partial" : "completed"/)
  assert.match(drawer, /onWarningEvent: \(warning\) =>/)
  assert.match(drawer, /if \(!isPartial\) \{\s*config\.onComplete\?\.\(\)/)
  assert.match(drawer, /generatedProjectMatrixCanvasCount > 0/)
  assert.match(drawer, /sawProjectMatrixFailureWarning/)
})

test("DONE terminates the reader and a clean EOF without DONE is not success", async () => {
  const source = await readSource()

  assert.match(source, /if \(data === '\[DONE\]'\) \{\s*sawDone = true\s*break streamLoop/)
  assert.match(source, /if \(sawDone\) \{[\s\S]*await reader\.cancel\(\)/)
  assert.match(source, /if \(!sawDone\) \{\s*throw new SSEProtocolError\("流式响应未收到 \[DONE\] 结束标记"\)/)
})

test("abort and callback failures cannot fall through to onComplete", async () => {
  const source = await readSource()
  const drawer = await readDrawer()

  assert.match(source, /if \(controller\?\.signal\.aborted\) \{\s*throw createAbortError\(\)/)
  assert.doesNotMatch(source, /if \(controller\?\.signal\.aborted\) break/)
  assert.match(source, /JSON 解析异常与事件回调异常必须分开/)
  assert.match(source, /catch \(parseError\) \{[\s\S]*throw new SSEProtocolError\("服务返回了无法解析的流式数据"\)\s*\}/)

  const parseCatchEnd = source.indexOf("// JSON 解析异常与事件回调异常必须分开")
  const canvasCallback = source.indexOf("opts.onCanvasEvent?.(")
  assert.ok(parseCatchEnd >= 0)
  assert.ok(canvasCallback > parseCatchEnd)
  assert.match(drawer, /commitAssistantContent\(config\.cancelMessage, undefined, "cancelled"\)/)
  assert.match(drawer, /commitAssistantContent\("已取消本次 AI 响应。", undefined, "cancelled"\)/)
})
