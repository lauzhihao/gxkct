import { buildApiUrl } from "@/lib/api/config"
import { getStoredAuthToken } from "@/lib/api/auth-config"
import type { ApiResponse, BackendResponse } from "@/lib/api/types"
import type {
  CreateWorkshopDownload,
  CreateWorkshopPayload,
  ImportWorkshopUsersData,
  WorkshopListItem,
  UploadWorkshopBannerData,
} from "@/types/workshop"

function isSuccessCode(code: string | number | undefined): boolean {
  return code === "0" || code === 0
}

function buildAuthHeaders(): Headers {
  const headers = new Headers()
  const authToken = getStoredAuthToken()
  if (authToken && authToken.trim() !== "") {
    headers.set("authToken", authToken)
  }
  return headers
}

function parseContentDispositionFilename(contentDisposition: string | null): string {
  if (!contentDisposition) {
    return "workshop-users.xlsx"
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match && utf8Match[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const normalMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  if (normalMatch && normalMatch[1]) {
    return normalMatch[1]
  }

  return "workshop-users.xlsx"
}

async function parseBackendJson<T>(response: Response): Promise<BackendResponse<T>> {
  return response.json() as Promise<BackendResponse<T>>
}

function parseNumericField(value: unknown, fieldName: string, index: number): number | string | null {
  if (typeof value === "number" || typeof value === "string" || value === null) {
    return value
  }
  throw new Error(`工作坊列表第 ${index + 1} 项字段 ${fieldName} 类型非法`)
}

function parseWorkshopItem(rawItem: unknown, index: number): WorkshopListItem {
  if (!rawItem || typeof rawItem !== "object") {
    throw new Error(`工作坊列表第 ${index + 1} 项不是对象`)
  }

  const item = rawItem as Record<string, unknown>

  const idValue = item.id
  if (typeof idValue !== "number") {
    throw new Error(`工作坊列表第 ${index + 1} 项缺少有效 id`)
  }

  const nameValue = item.name
  if (typeof nameValue !== "string" || nameValue.trim() === "") {
    throw new Error(`工作坊列表第 ${index + 1} 项缺少有效 name`)
  }

  return {
    id: idValue,
    name: nameValue,
    major: parseNumericField(item.major, "major", index),
    course: parseNumericField(item.course, "course", index),
    fresh: parseNumericField(item.fresh, "fresh", index),
    old: parseNumericField(item.old, "old", index),
  }
}

export class WorkshopApi {
  async getWorkshops(): Promise<ApiResponse<WorkshopListItem[] | null>> {
    try {
      const response = await fetch(buildApiUrl("/api/v3/manage/getColleges?type=0"), {
        method: "GET",
        headers: buildAuthHeaders(),
      })

      if (!response.ok) {
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const backend = await parseBackendJson<unknown>(response)
      if (!isSuccessCode(backend.code)) {
        return {
          data: null,
          error: backend.message,
          status: response.status,
        }
      }

      if (!Array.isArray(backend.data)) {
        return {
          data: null,
          error: "工作坊列表数据格式错误",
          status: response.status,
        }
      }

      const parsedItems = backend.data.map((item, index) => parseWorkshopItem(item, index))

      return {
        data: parsedItems,
        error: null,
        status: response.status,
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "加载工作坊列表失败",
        status: 500,
      }
    }
  }

  async importUsers(file: File): Promise<ApiResponse<ImportWorkshopUsersData | null>> {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(buildApiUrl("/api/manage/user/importxls"), {
        method: "POST",
        headers: buildAuthHeaders(),
        body: formData,
      })

      if (!response.ok) {
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const backend = await parseBackendJson<ImportWorkshopUsersData>(response)
      if (!isSuccessCode(backend.code)) {
        return {
          data: null,
          error: backend.message,
          status: response.status,
        }
      }

      return {
        data: backend.data,
        error: null,
        status: response.status,
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "导入用户失败",
        status: 500,
      }
    }
  }

  async uploadBanner(file: File): Promise<ApiResponse<UploadWorkshopBannerData | null>> {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(buildApiUrl("/api/manage/user/createworkshop/banner"), {
        method: "POST",
        headers: buildAuthHeaders(),
        body: formData,
      })

      if (!response.ok) {
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const backend = await parseBackendJson<UploadWorkshopBannerData>(response)
      if (!isSuccessCode(backend.code)) {
        return {
          data: null,
          error: backend.message,
          status: response.status,
        }
      }

      return {
        data: backend.data,
        error: null,
        status: response.status,
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "上传 Banner 失败",
        status: 500,
      }
    }
  }

  async deleteWorkshop(id: number): Promise<ApiResponse<null>> {
    try {
      const headers = buildAuthHeaders()
      headers.set("Content-Type", "application/json")

      const response = await fetch(buildApiUrl("/api/v3/manage/updateCollege"), {
        method: "POST",
        headers,
        body: JSON.stringify({ id, del: 1 }),
      })

      if (!response.ok) {
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const backend = await parseBackendJson<null>(response)
      if (!isSuccessCode(backend.code)) {
        return {
          data: null,
          error: backend.message,
          status: response.status,
        }
      }

      return { data: null, error: null, status: response.status }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "删除工作坊失败",
        status: 500,
      }
    }
  }

  async createWorkshop(payload: CreateWorkshopPayload): Promise<ApiResponse<CreateWorkshopDownload | null>> {
    try {
      const headers = buildAuthHeaders()
      headers.set("Content-Type", "application/json")

      const response = await fetch(buildApiUrl("/api/manage/user/createworkshop"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const backend = await parseBackendJson<null>(response)
        return {
          data: null,
          error: backend.message,
          status: response.status,
        }
      }

      const blob = await response.blob()
      const filename = parseContentDispositionFilename(response.headers.get("content-disposition"))
      const mimeType = contentType && contentType.trim() !== ""
        ? contentType
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

      return {
        data: {
          blob,
          filename,
          mimeType,
        },
        error: null,
        status: response.status,
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "创建工作坊失败",
        status: 500,
      }
    }
  }
}

export const workshopApi = new WorkshopApi()
