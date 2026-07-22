import { HttpAdapter, type BinaryDownload } from "./http-adapter"
import type { ApiResponse } from "./types"

export interface ResourceFolder {
  id: string
  name: string
  parentId?: string | null
  hasChildren?: boolean
  filesCount?: number
  latestUploadedAt?: string | null
}

export interface ResourceObjectSummary {
  id: string
  folderId: string
  objectKey: string
  displayName: string
  size: number
  mimeType: string
  uploader?: {
    id: string
    name: string
  }
  version?: string | null
  uploadedAt: string
  downloadUrl: string
}

export type ResourcePreviewStatus = "NONE" | "PENDING" | "PROCESSING" | "READY" | "FAILED"

export interface ResourceObjectDetail extends ResourceObjectSummary {
  etag?: string
  checksum?: string | null
  storageClass?: string | null
  metadata?: Record<string, string>
  previewStatus: ResourcePreviewStatus
  previewUrl?: string | null
}

export interface ResourcePagination {
  offset: number
  limit: number
  total: number
  nextOffset?: number | null
  continuationToken?: string | null
  nextContinuationToken?: string | null
}

export interface ResourceObjectsResponse {
  items: ResourceObjectSummary[]
  pagination: ResourcePagination
}

export interface ResourceBatchActionRequest {
  action: "copy" | "move" | "delete"
  sourceFolderId: string
  targetFolderId?: string
  objectIds: string[]
}

export interface ResourceBatchActionResult {
  succeeded: string[]
  failed: Array<{ objectId: string; errorCode: string; message: string }>
}

export interface InitializeFoldersResponse {
  initialized: boolean
}

export interface CreateFolderPayload {
  name: string
}

export interface RenameObjectPayload {
  name: string
}

export interface UploadSignatureRequest {
  fileName: string
  mimeType?: string
  size?: number
}

export interface UploadSignatureResponse {
  uploadPath: string
  uploadUrl: string
  uploadHeaders?: Record<string, string>
  uploadMethod?: "PUT" | "POST"
  expiresIn?: number
}

export interface ConfirmUploadRequest {
  fileName: string
  uploadPath: string
  size: number
  mimeType?: string
  checksum?: string
}

export interface ListResourceObjectsParams {
  folderId: string
  keyword?: string
  offset?: number
  limit?: number
  continuationToken?: string
  sortField?: string
  sortOrder?: "asc" | "desc"
  viewMode?: "grid" | "list"
}

export class ResourceApi {
  private http = new HttpAdapter()

  private getBasePath(courseId: string): string {
    return `/api/v5/courses/${courseId}`
  }

  private buildQuery(params?: Record<string, string | number | undefined | null>): string {
    if (!params) return ""
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      query.set(key, String(value))
    })
    const queryString = query.toString()
    return queryString ? `?${queryString}` : ""
  }

  // 归属层级查询值：course 层级返回 undefined（保持既有 URL 不变），其余层级透传
  private ownerParam(ownerType?: string): string | undefined {
    return ownerType && ownerType !== "course" ? ownerType : undefined
  }

  // 为无 query 的 endpoint 追加 ownerType
  private withOwner(endpoint: string, ownerType?: string): string {
    const owner = this.ownerParam(ownerType)
    if (!owner) return endpoint
    return `${endpoint}${endpoint.includes("?") ? "&" : "?"}ownerType=${owner}`
  }

  getFolders(
    courseId: string,
    params?: { parentId?: string | null; includeEmpty?: boolean },
    ownerType?: string,
  ): Promise<ApiResponse<ResourceFolder[] | null>> {
    const endpoint = `${this.getBasePath(courseId)}/resource-folders${this.buildQuery({
      ownerType: this.ownerParam(ownerType),
      parentId: params?.parentId ?? undefined,
      includeEmpty:
        typeof params?.includeEmpty === "boolean" ? Number(params.includeEmpty) : undefined,
    })}`
    return this.http.get<ResourceFolder[]>(endpoint)
  }

  initializeCourseFolders(courseId: string, ownerType?: string): Promise<ApiResponse<InitializeFoldersResponse | null>> {
    const endpoint = this.withOwner(`${this.getBasePath(courseId)}/resource-folders/init`, ownerType)
    return this.http.post<InitializeFoldersResponse>(endpoint)
  }

  createFolder(courseId: string, parentId: string, payload: CreateFolderPayload, ownerType?: string): Promise<ApiResponse<ResourceFolder | null>> {
    const endpoint = this.withOwner(`${this.getBasePath(courseId)}/resource-folders/${parentId}`, ownerType)
    return this.http.post<ResourceFolder>(endpoint, payload)
  }

  createUploadSignature(
    courseId: string,
    parentId: string,
    payload: UploadSignatureRequest,
    ownerType?: string,
  ): Promise<ApiResponse<UploadSignatureResponse | null>> {
    const endpoint = this.withOwner(`${this.getBasePath(courseId)}/resource-folders/${parentId}/objects/presign`, ownerType)
    return this.http.post<UploadSignatureResponse>(endpoint, payload)
  }

  confirmUpload(
    courseId: string,
    parentId: string,
    payload: ConfirmUploadRequest,
    ownerType?: string,
  ): Promise<ApiResponse<ResourceObjectSummary | null>> {
    const endpoint = this.withOwner(`${this.getBasePath(courseId)}/resource-folders/${parentId}/objects/confirm`, ownerType)
    return this.http.post<ResourceObjectSummary>(endpoint, payload)
  }

  getObjects(
    courseId: string,
    params: ListResourceObjectsParams,
    ownerType?: string,
  ): Promise<ApiResponse<ResourceObjectsResponse | null>> {
    const endpoint = `${this.getBasePath(courseId)}/resource-objects${this.buildQuery({
      ownerType: this.ownerParam(ownerType),
      folderId: params.folderId,
      keyword: params.keyword,
      offset: typeof params.offset === "number" ? params.offset : undefined,
      limit: typeof params.limit === "number" ? params.limit : undefined,
      continuationToken: params.continuationToken,
      sortField: params.sortField,
      sortOrder: params.sortOrder,
      viewMode: params.viewMode,
    })}`
    return this.http.get<ResourceObjectsResponse>(endpoint)
  }

  getObjectDetail(courseId: string, objectId: string, ownerType?: string): Promise<ApiResponse<ResourceObjectDetail | null>> {
    const endpoint = this.withOwner(`${this.getBasePath(courseId)}/resource-objects/${objectId}`, ownerType)
    return this.http.get<ResourceObjectDetail>(endpoint)
  }

  renameObject(
    courseId: string,
    objectId: string,
    payload: RenameObjectPayload,
    ownerType?: string,
  ): Promise<ApiResponse<ResourceFolder | ResourceObjectSummary | null>> {
    const endpoint = this.withOwner(`${this.getBasePath(courseId)}/resource-objects/${objectId}/name`, ownerType)
    return this.http.patch<ResourceFolder | ResourceObjectSummary>(endpoint, payload)
  }

  deleteObject(courseId: string, objectId: string, ownerType?: string): Promise<ApiResponse<null>> {
    const endpoint = this.withOwner(`${this.getBasePath(courseId)}/resource-objects/${objectId}`, ownerType)
    return this.http.delete<null>(endpoint)
  }

  batchDelete(courseId: string, objectIds: string[], ownerType?: string): Promise<ApiResponse<{ deleted: number } | null>> {
    const endpoint = this.withOwner(`${this.getBasePath(courseId)}/resource-objects/batch-delete`, ownerType)
    return this.http.post<{ deleted: number }>(endpoint, { objectIds })
  }

  batchAction(
    courseId: string,
    payload: ResourceBatchActionRequest,
    ownerType?: string,
  ): Promise<ApiResponse<ResourceBatchActionResult | null>> {
    const endpoint = this.withOwner(`${this.getBasePath(courseId)}/resource-objects/batch-action`, ownerType)
    return this.http.post<ResourceBatchActionResult>(endpoint, payload)
  }

  createBatchDownload(
    courseId: string,
    objectIds: string[],
    ownerType?: string,
  ): Promise<ApiResponse<BinaryDownload | null>> {
    const endpoint = this.withOwner(`${this.getBasePath(courseId)}/resource-objects/batch-download`, ownerType)
    return this.http.postBinary(endpoint, { objectIds })
  }
}
