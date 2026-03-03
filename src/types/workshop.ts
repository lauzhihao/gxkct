export interface WorkshopDepartmentInput {
  id: number
  name: string
}

export interface WorkshopCollegeInput {
  id: number
  name: string
  image: string
}

export interface CreateWorkshopPayload {
  college: WorkshopCollegeInput
  departments: WorkshopDepartmentInput[]
}

export interface ImportedWorkshopUser {
  account: string
  code: string
  name: string
  password: string
}

export type ImportedWorkshopUserGroups = ImportedWorkshopUser[][]

export interface ImportWorkshopUsersData {
  users: ImportedWorkshopUserGroups
}

export interface UploadWorkshopBannerData {
  url: string
}

export interface CreateWorkshopDownload {
  blob: Blob
  filename: string
  mimeType: string
}

export interface WorkshopListItem {
  id: number
  name: string
  major: number | string | null
  course: number | string | null
  fresh: number | string | null
  old: number | string | null
}
