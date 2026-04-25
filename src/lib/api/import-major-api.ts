import { getStoredAuthToken } from "./auth-config"
import { buildApiUrl, getApiConfig } from "./config"

export type ImportMajorNodeType = "major" | "course"
export type ImportMajorItemStatus = "pending" | "running" | "completed" | "failed" | "warning"
export type ImportMajorStreamEventType = "accepted" | "item" | "completed" | "error"

export interface ImportMajorStreamItemPayload {
  nodeType: ImportMajorNodeType
  sourceNodeId: string
  sourceMajorId?: number
  sourceParentId?: string
  nodeName: string
}

export interface ImportMajorStreamRequest {
  items: ImportMajorStreamItemPayload[]
}

export interface ImportMajorTaskResult {
  taskId: string
  targetDepartmentId: number
  totalCount: number
  successCount: number
  failedCount: number
  warningCount: number
}

export interface ImportMajorStreamEvent {
  type: ImportMajorStreamEventType
  taskId?: string
  nodeType?: ImportMajorNodeType
  nodeId?: string
  nodeName?: string
  status?: ImportMajorItemStatus | "error"
  message?: string
  reason?: string
  result?: ImportMajorTaskResult
}

class ImportMajorApi {
  async importMajorStream(
    targetDepartmentId: number,
    payload: ImportMajorStreamRequest,
    onEvent: (event: ImportMajorStreamEvent) => void,
  ): Promise<ImportMajorTaskResult> {
    const url = buildApiUrl(`/api/v5/departments/${targetDepartmentId}/major-import/stream`)
    const config = getApiConfig()
    const authToken = getStoredAuthToken()
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    }

    if (authToken) {
      headers.authToken = authToken
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.timeout * 10),
    })

    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder("utf-8")
    let buffer = ""
    let completedResult: ImportMajorTaskResult | null = null

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

      const event = JSON.parse(dataLines.join("\n")) as ImportMajorStreamEvent
      if (!event.type && eventNameLine) {
        event.type = eventNameLine.slice(6).trim() as ImportMajorStreamEventType
      }

      onEvent(event)

      if (event.type === "error") {
        if (event.message) {
          throw new Error(event.message)
        }
        throw new Error("导入专业失败")
      }

      if (event.type === "completed" && event.result) {
        completedResult = event.result
      }
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split("\n\n")
      const restBlock = blocks.pop()
      if (typeof restBlock !== "string") {
        throw new Error("导入专业流式响应解析失败")
      }
      buffer = restBlock
      for (const block of blocks) {
        processBlock(block)
      }
    }

    if (buffer.trim().length > 0) {
      processBlock(buffer)
    }

    if (!completedResult) {
      throw new Error("导入专业未返回完成结果")
    }

    return completedResult
  }
}

export const importMajorApi = new ImportMajorApi()
