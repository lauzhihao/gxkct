export type SemesterTermType = string | number
export type CreateSemesterTermType = "SPRING" | "AUTUMN"
export type BootstrapSemesterStage = string

export interface SemesterBrief {
  id: number
  collegeId: number
  schoolYear: string | number
  termType: SemesterTermType
  name: string
  status: string
  isCurrent: boolean
}

export type SemesterCopyTaskStatus =
  | "CREATED"
  | "PENDING"
  | "QUEUED"
  | "RUNNING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"

export interface SemesterCopyTask {
  id: number | null
  semesterId: number
  sourceSemesterId: number | null
  status: SemesterCopyTaskStatus
  errorMessage: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface StoredSemesterContext {
  currentSemesterId: number | null
  selectedSemesterId: number | null
  semesterList: SemesterBrief[]
}

export interface CreateSemesterPayload {
  schoolYear: string
  termType: CreateSemesterTermType
  name: string
  sourceSemesterId?: number | null
}

export interface BootstrapSemesterPayload {
  schoolYear: string
}

export interface SemesterBootstrapTask {
  id: number
  collegeId: number
  targetSemesterId: number
  sourceSemesterId: number | null
  status: string
  currentStage: string
  progress: number
  errorMessage: string | null
}

export interface BootstrapSemesterResponse {
  schoolYear: string
  stage: BootstrapSemesterStage
  completed: boolean
  springSemester: SemesterBrief | null
  autumnSemester: SemesterBrief | null
  currentSemester: SemesterBrief | null
  runningTask: SemesterBootstrapTask | null
}
