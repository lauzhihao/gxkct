import { HttpAdapter } from "./http-adapter"
import { buildApiUrl, getApiConfig } from "./config"
import { getStoredAuthToken } from "./auth-config"
import type { ApiResponse } from "./types"

export interface CourseCanvasSyncResponse {
  courseId: number
  majorId: number
  courseName: string
  objectiveCount: number
  chapterCount: number
  coursePointCount: number
  ksaCount: number
  courseMatrixRowCount: number
  projectMatrixCount: number
}

export interface CourseCanvasSyncEvent {
  type: "progress" | "completed" | "error"
  step: string
  status: string
  message: string
  result?: CourseCanvasSyncResponse
}

class CourseCanvasSyncApi {
  private http = new HttpAdapter()

  async syncCourseFromCanvas(
    courseId: string,
    canvasOssKey: string
  ): Promise<ApiResponse<CourseCanvasSyncResponse | null>> {
    return this.http.post<CourseCanvasSyncResponse>(
      `/api/v5/courses/${courseId}/canvas-sync`,
      { canvasOssKey }
    )
  }

  async syncCourseFromCanvasStream(
    courseId: string,
    canvasOssKey: string,
    onEvent: (event: CourseCanvasSyncEvent) => void
  ): Promise<CourseCanvasSyncResponse> {
    const url = buildApiUrl(`/api/v5/courses/${courseId}/canvas-sync/stream`)
    const config = getApiConfig()
    const authToken = getStoredAuthToken()

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(authToken ? { authToken } : {}),
      },
      body: JSON.stringify({ canvasOssKey }),
      signal: AbortSignal.timeout(config.timeout * 6),
    })

    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder("utf-8")
    let buffer = ""
    let completedResult: CourseCanvasSyncResponse | null = null

    const processBlock = (block: string) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

      if (lines.length === 0) {
        return
      }

      const eventNameLine = lines.find((line) => line.startsWith("event:"))
      const dataLines = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())

      if (dataLines.length === 0) {
        return
      }

      const payload = JSON.parse(dataLines.join("\n")) as CourseCanvasSyncEvent
      if (!payload.type && eventNameLine) {
        payload.type = eventNameLine.slice(6).trim() as CourseCanvasSyncEvent["type"]
      }

      onEvent(payload)

      if (payload.type === "error") {
        throw new Error(payload.message || "课程画布同步失败")
      }

      if (payload.type === "completed" && payload.result) {
        completedResult = payload.result
      }
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split("\n\n")
      buffer = blocks.pop() || ""
      for (const block of blocks) {
        processBlock(block)
      }
    }

    if (buffer.trim().length > 0) {
      processBlock(buffer)
    }

    if (!completedResult) {
      throw new Error("课程画布同步未返回完成结果")
    }

    return completedResult
  }
}

export const courseCanvasSyncApi = new CourseCanvasSyncApi()
