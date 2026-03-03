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
  return (await response.json()) as T
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
  const url = withQuery("/college/api/beginreport/getcourseintro", { courseid: courseId })
  return requestJson<string>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export async function getAdditionalInfo(courseId: number): Promise<AdditionalInfoResponse> {
  const url = withQuery("/college/api/beginreport/getadditionalinfo", { courseid: courseId })
  return requestJson<AdditionalInfoResponse>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export async function getGraduateRequires(courseId: number): Promise<GraduateRequireNode[]> {
  const url = withQuery("/college/api/beginreport/getrequires", { courseid: courseId })
  return requestJson<GraduateRequireNode[]>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export async function getMajorMatrix(courseId: number): Promise<MajorMatrixItem[]> {
  const url = withQuery("/college/api/beginreport/getmajormatrix", { courseid: courseId })
  return requestJson<MajorMatrixItem[]>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export async function getProjectList(courseId: number): Promise<ProjectListItem[]> {
  const url = withQuery("/college/api/beginreport/projects", { courseid: courseId })
  return requestJson<ProjectListItem[]>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export async function getProjectMatrix(courseId: number): Promise<ProjectMatrixItem[]> {
  const url = withQuery("/college/api/beginreport/getprojectmatrix", { courseid: courseId })
  return requestJson<ProjectMatrixItem[]>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export async function getPointMatrix(courseId: number): Promise<PointMatrixItem[]> {
  const url = withQuery("/college/api/beginreport/getpointmatrix", { courseid: courseId })
  return requestJson<PointMatrixItem[]>(url, {
    method: "GET",
    headers: createHeaders(),
  })
}

export async function getTaskGoal(courseId: number): Promise<TaskGoalGroup[]> {
  const url = withQuery("/college/api/beginreport/gettaskgoal", { courseid: courseId })
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
  return requestJson<unknown>(buildApiUrl("/college/api/beginreport/saveadditionalinfo"), {
    method: "POST",
    headers: createHeaders(),
    body: JSON.stringify(payload),
  })
}

export async function exportReport(courseId: number, editable: 0 | 1): Promise<Response> {
  const url = withQuery("/college/api/beginreport/exportreport", {
    courseid: courseId,
    editable,
  })
  const response = await fetch(url, {
    method: "GET",
    headers: createHeaders(),
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response
}
