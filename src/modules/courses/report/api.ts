import { buildApiUrl } from "@/lib/api"
import { getStoredAuthToken } from "@/lib/api/auth-config"
import type {
  AdditionalInfoResponse,
  GraduateRequireNode,
  MajorMatrixItem,
  PointMatrixItem,
  ProjectListItem,
  ProjectMatrixItem,
  TaskGoalGroup,
} from "./types"

function createHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  }
  const authToken = getStoredAuthToken()
  if (authToken) {
    headers.authToken = authToken
  }
  return headers
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const payload = await response.json() as unknown

  if (payload && typeof payload === "object" && "code" in payload) {
    const wrappedPayload = payload as { code?: string | number; data?: unknown; message?: string }
    if (String(wrappedPayload.code) !== "0") {
      throw new Error(wrappedPayload.message || "API request failed")
    }
    return wrappedPayload.data as T
  }

  return payload as T
}

function withQuery(endpoint: string, params: Record<string, string | number | boolean>): string {
  const url = new URL(buildApiUrl(endpoint), typeof window !== "undefined" ? window.location.origin : "http://localhost")
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value))
  })
  const cleanPath = url.pathname + (url.search ? url.search : "")
  if (url.origin === "http://localhost") {
    return cleanPath
  }
  return url.toString()
}

export async function getCourseIntro(courseId: number): Promise<string> {
  const url = withQuery("/api/beginreport/getcourseintro", { courseid: courseId })
  return requestJson<string>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export async function getAdditionalInfo(courseId: number): Promise<AdditionalInfoResponse> {
  const url = withQuery("/api/beginreport/getadditionalinfo", { courseid: courseId })
  return requestJson<AdditionalInfoResponse>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export async function getGraduateRequires(courseId: number): Promise<GraduateRequireNode[]> {
  const url = withQuery("/api/beginreport/getrequires", { courseid: courseId })
  return requestJson<GraduateRequireNode[]>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export async function getMajorMatrix(courseId: number): Promise<MajorMatrixItem[]> {
  const url = withQuery("/api/beginreport/getmajormatrix", { courseid: courseId })
  return requestJson<MajorMatrixItem[]>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export async function getProjectList(courseId: number): Promise<ProjectListItem[]> {
  const url = withQuery("/api/beginreport/projects", { courseid: courseId })
  return requestJson<ProjectListItem[]>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export async function getProjectMatrix(courseId: number): Promise<ProjectMatrixItem[]> {
  const url = buildApiUrl(`/api/v5/matrix/project-matrix/${courseId}`)
  return requestJson<ProjectMatrixItem[]>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export async function getCourseMatrixGoals(courseId: number): Promise<GraduateRequireNode[]> {
  const url = buildApiUrl(`/api/v5/matrix/course-goals/${courseId}`)
  return requestJson<GraduateRequireNode[]>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export async function getCourseMatrixItems(courseId: number): Promise<ProjectMatrixItem[]> {
  const url = buildApiUrl(`/api/v5/matrix/course-matrix/${courseId}`)
  return requestJson<ProjectMatrixItem[]>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export async function getPointMatrix(courseId: number): Promise<PointMatrixItem[]> {
  const url = withQuery("/api/beginreport/getpointmatrix", { courseid: courseId })
  return requestJson<PointMatrixItem[]>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export async function getTaskGoal(courseId: number): Promise<TaskGoalGroup[]> {
  const url = withQuery("/api/beginreport/gettaskgoal", { courseid: courseId })
  return requestJson<TaskGoalGroup[]>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export interface SaveAdditionalInfoPayload {
  id: number
  courseUnitId: number
  score: string
  year: string
  yearPeriod: string
  lecturer: string
  phone: string
  email: string
  department: string
  classname: string
  students: string
  classroom: string
  schedule: unknown
  textbooks: string
  textreferences: string
  attend: string
  assignment: string
  criterion: string
  practice: string
  textgroup: string
  paper: string
  others: string
  examtype: number
  examway: string
  examdetail: string
  exampercent: unknown
}

export async function saveAdditionalInfo(payload: SaveAdditionalInfoPayload): Promise<unknown> {
  return requestJson<unknown>(buildApiUrl("/api/beginreport/saveadditionalinfo"), {
    method: "POST",
    headers: createHeaders(),
    body: JSON.stringify(payload),
  })
}

export async function exportReport(courseId: number): Promise<Response> {
  const url = withQuery(`/api/v5/courses/${courseId}/syllabus/export-docx`, {})
  const response = await fetch(url, {
    method: "GET",
    headers: createHeaders(),
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response
}
