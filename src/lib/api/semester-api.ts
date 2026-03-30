import { HttpAdapter } from "./http-adapter"
import type { ApiResponse } from "./types"
import type {
  BootstrapSemesterPayload,
  BootstrapSemesterResponse,
  CreateSemesterPayload,
  SemesterBrief,
  SemesterBootstrapTask,
  SemesterCopyTask,
  SemesterCopyTaskStatus,
} from "@/types"

const TERMINAL_TASK_STATUSES = new Set<SemesterCopyTaskStatus>(["COMPLETED", "FAILED"])
const KNOWN_TASK_STATUSES = new Set<SemesterCopyTaskStatus>([
  "CREATED",
  "PENDING",
  "QUEUED",
  "RUNNING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function toApiError<T>(response: ApiResponse<unknown>): ApiResponse<T | null> {
  return {
    data: null,
    error: response.error,
    status: response.status,
  }
}

function normalizeError(error: unknown, fallbackMessage: string): ApiResponse<null> {
  return {
    data: null,
    error: error instanceof Error ? error.message : fallbackMessage,
    status: 500,
  }
}

function parseNumberField(record: Record<string, unknown>, fieldName: string): number {
  const value = record[fieldName]
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`学期字段 ${fieldName} 缺失或不是有效数字`)
  }

  return value
}

function parseNullableNumberField(record: Record<string, unknown>, fieldName: string): number | null {
  const value = record[fieldName]
  if (value === null) {
    return null
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`学期字段 ${fieldName} 缺失或不是有效数字/null`)
  }

  return value
}

function parseStringField(record: Record<string, unknown>, fieldName: string): string {
  const value = record[fieldName]
  if (typeof value !== "string") {
    throw new Error(`学期字段 ${fieldName} 缺失或不是有效字符串`)
  }

  return value
}

function parseNullableStringField(record: Record<string, unknown>, fieldName: string): string | null {
  const value = record[fieldName]
  if (value === null) {
    return null
  }

  if (typeof value !== "string") {
    throw new Error(`学期字段 ${fieldName} 缺失或不是有效字符串/null`)
  }

  return value
}

function parseStringOrNumberField(record: Record<string, unknown>, fieldName: string): string | number {
  const value = record[fieldName]
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`学期字段 ${fieldName} 缺失或不是有效字符串/数字`)
  }

  return value
}

function parseBooleanField(record: Record<string, unknown>, fieldName: string): boolean {
  const value = record[fieldName]
  if (typeof value !== "boolean") {
    throw new Error(`学期字段 ${fieldName} 缺失或不是有效布尔值`)
  }

  return value
}

function parseTaskStatus(record: Record<string, unknown>, fieldName: string): SemesterCopyTaskStatus {
  const value = record[fieldName]
  if (typeof value !== "string") {
    throw new Error(`学期任务字段 ${fieldName} 缺失或不是有效字符串`)
  }

  if (!KNOWN_TASK_STATUSES.has(value as SemesterCopyTaskStatus)) {
    throw new Error(`学期任务状态 ${value} 暂未被前端识别`)
  }

  return value as SemesterCopyTaskStatus
}

export function parseNullableSemesterId(value: unknown, fieldName: string): number | null {
  if (!isRecord(value)) {
    throw new Error(`登录返回缺少 ${fieldName}`)
  }

  return parseNullableNumberField(value, fieldName)
}

export function parseSemesterBrief(value: unknown): SemesterBrief {
  if (!isRecord(value)) {
    throw new Error("学期数据格式错误")
  }

  return {
    id: parseNumberField(value, "id"),
    collegeId: parseNumberField(value, "collegeId"),
    schoolYear: parseStringOrNumberField(value, "schoolYear"),
    termType: parseStringOrNumberField(value, "termType"),
    name: parseStringField(value, "name"),
    status: parseStringField(value, "status"),
    isCurrent: parseBooleanField(value, "isCurrent"),
  }
}

function parseNullableSemesterBrief(value: unknown, fieldName: string): SemesterBrief | null {
  if (!isRecord(value)) {
    throw new Error(`缺少 ${fieldName}`)
  }

  const rawValue = value[fieldName]
  if (rawValue === null) {
    return null
  }

  return parseSemesterBrief(rawValue)
}

export function parseSemesterBriefList(value: unknown, fieldName = "semesterList"): SemesterBrief[] {
  if (!isRecord(value)) {
    throw new Error(`缺少 ${fieldName}`)
  }

  const rawList = value[fieldName]
  if (!Array.isArray(rawList)) {
    throw new Error(`${fieldName} 缺失或不是数组`)
  }

  return rawList.map((item) => parseSemesterBrief(item))
}

export function parseSemesterCopyTask(value: unknown): SemesterCopyTask {
  if (!isRecord(value)) {
    throw new Error("学期复制任务数据格式错误")
  }

  const rawTaskId = value.id
  let taskId: number | null
  if (rawTaskId === null || rawTaskId === undefined) {
    taskId = null
  } else if (typeof rawTaskId === "number" && Number.isFinite(rawTaskId)) {
    taskId = rawTaskId
  } else {
    throw new Error("学期复制任务字段 id 不是有效数字")
  }

  return {
    id: taskId,
    semesterId: parseNumberField(value, "semesterId"),
    sourceSemesterId: parseNullableNumberField(value, "sourceSemesterId"),
    status: parseTaskStatus(value, "status"),
    errorMessage: parseNullableStringField(value, "errorMessage"),
    createdAt: parseNullableStringField(value, "createdAt"),
    updatedAt: parseNullableStringField(value, "updatedAt"),
  }
}

function parseBootstrapTask(value: unknown, fieldName: string): SemesterBootstrapTask | null {
  if (!isRecord(value)) {
    throw new Error(`缺少 ${fieldName}`)
  }

  const rawTask = value[fieldName]
  if (rawTask === null) {
    return null
  }
  if (!isRecord(rawTask)) {
    throw new Error(`${fieldName} 缺失或不是对象/null`)
  }

  return {
    id: parseNumberField(rawTask, "id"),
    collegeId: parseNumberField(rawTask, "collegeId"),
    targetSemesterId: parseNumberField(rawTask, "targetSemesterId"),
    sourceSemesterId: parseNullableNumberField(rawTask, "sourceSemesterId"),
    status: parseStringField(rawTask, "status"),
    currentStage: parseStringField(rawTask, "currentStage"),
    progress: parseNumberField(rawTask, "progress"),
    errorMessage: parseNullableStringField(rawTask, "errorMessage"),
  }
}

export function parseBootstrapSemesterResponse(value: unknown): BootstrapSemesterResponse {
  if (!isRecord(value)) {
    throw new Error("学期初始化响应格式错误")
  }

  return {
    schoolYear: parseStringField(value, "schoolYear"),
    stage: parseStringField(value, "stage"),
    completed: parseBooleanField(value, "completed"),
    springSemester: parseNullableSemesterBrief(value, "springSemester"),
    autumnSemester: parseNullableSemesterBrief(value, "autumnSemester"),
    currentSemester: parseNullableSemesterBrief(value, "currentSemester"),
    runningTask: parseBootstrapTask(value, "runningTask"),
  }
}

function waitForInterval(intervalMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timerId = globalThis.setTimeout(() => {
      if (signal) {
        signal.removeEventListener("abort", handleAbort)
      }
      resolve()
    }, intervalMs)

    const handleAbort = () => {
      globalThis.clearTimeout(timerId)
      reject(new Error("学期任务轮询已取消"))
    }

    if (signal) {
      signal.addEventListener("abort", handleAbort, { once: true })
    }
  })
}

export class SemesterApi {
  private http = new HttpAdapter()

  async getSemesters(collegeId: number): Promise<ApiResponse<SemesterBrief[] | null>> {
    try {
      const response = await this.http.get<unknown[]>(`/api/v5/colleges/${collegeId}/semesters`)
      if (response.error || !response.data) {
        return toApiError<SemesterBrief[]>(response)
      }

      if (!Array.isArray(response.data)) {
        return {
          data: null,
          error: "学期列表响应不是数组",
          status: 500,
        }
      }

      return {
        data: response.data.map((item) => parseSemesterBrief(item)),
        error: null,
        status: response.status,
      }
    } catch (error) {
      return normalizeError(error, "获取学期列表失败")
    }
  }

  async createSemester(
    collegeId: number,
    payload: CreateSemesterPayload,
  ): Promise<ApiResponse<SemesterCopyTask | null>> {
    try {
      const response = await this.http.post<unknown>(`/api/v5/colleges/${collegeId}/semesters`, payload)
      if (response.error || !response.data) {
        return toApiError<SemesterCopyTask>(response)
      }

      return {
        data: parseSemesterCopyTask(response.data),
        error: null,
        status: response.status,
      }
    } catch (error) {
      return normalizeError(error, "创建学期失败")
    }
  }

  async bootstrapSemester(
    collegeId: number,
    payload: BootstrapSemesterPayload,
  ): Promise<ApiResponse<BootstrapSemesterResponse | null>> {
    try {
      const response = await this.http.post<unknown>(`/api/v5/colleges/${collegeId}/semesters/bootstrap`, payload)
      if (response.error || !response.data) {
        return toApiError<BootstrapSemesterResponse>(response)
      }

      return {
        data: parseBootstrapSemesterResponse(response.data),
        error: null,
        status: response.status,
      }
    } catch (error) {
      return normalizeError(error, "初始化学期失败")
    }
  }

  async getRunningCopyTasks(collegeId: number): Promise<ApiResponse<SemesterCopyTask[] | null>> {
    try {
      const response = await this.http.get<unknown[]>(`/api/v5/colleges/${collegeId}/semesters/tasks/running`)
      if (response.error || !response.data) {
        return toApiError<SemesterCopyTask[]>(response)
      }

      if (!Array.isArray(response.data)) {
        return {
          data: null,
          error: "运行中任务响应不是数组",
          status: 500,
        }
      }

      return {
        data: response.data.map((item) => parseSemesterCopyTask(item)),
        error: null,
        status: response.status,
      }
    } catch (error) {
      return normalizeError(error, "获取运行中任务失败")
    }
  }

  async getSemesterCopyTask(semesterId: number): Promise<ApiResponse<SemesterCopyTask | null>> {
    try {
      const response = await this.http.get<unknown>(`/api/v5/semesters/${semesterId}/copy-task`)
      if (response.error) {
        return toApiError<SemesterCopyTask>(response)
      }

      if (response.data === null) {
        return {
          data: null,
          error: null,
          status: response.status,
        }
      }

      return {
        data: parseSemesterCopyTask(response.data),
        error: null,
        status: response.status,
      }
    } catch (error) {
      return normalizeError(error, "获取学期复制任务失败")
    }
  }

  async switchCurrentSemester(collegeId: number, semesterId: number): Promise<ApiResponse<boolean | null>> {
    try {
      const response = await this.http.put<unknown>(`/api/v5/colleges/${collegeId}/semesters/${semesterId}/current`)
      if (response.error) {
        return toApiError<boolean>(response)
      }

      return {
        data: true,
        error: null,
        status: response.status,
      }
    } catch (error) {
      return normalizeError(error, "切换当前学期失败")
    }
  }

  async pollCopyTaskUntilFinished(
    semesterId: number,
    options?: {
      intervalMs?: number
      onProgress?: (task: SemesterCopyTask) => void
      signal?: AbortSignal
    },
  ): Promise<ApiResponse<SemesterCopyTask | null>> {
    const intervalMs = typeof options?.intervalMs === "number" ? options.intervalMs : 2000

    while (true) {
      if (options?.signal?.aborted) {
        return {
          data: null,
          error: "学期任务轮询已取消",
          status: 499,
        }
      }

      const response = await this.getSemesterCopyTask(semesterId)
      if (response.error || !response.data) {
        return response
      }

      options?.onProgress?.(response.data)

      if (TERMINAL_TASK_STATUSES.has(response.data.status)) {
        return response
      }

      try {
        await waitForInterval(intervalMs, options?.signal)
      } catch (error) {
        return {
          data: null,
          error: error instanceof Error ? error.message : "学期任务轮询已取消",
          status: 499,
        }
      }
    }
  }
}
