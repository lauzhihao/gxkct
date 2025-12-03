import { HttpAdapter } from "./http-adapter"
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

export interface ResourceObjectDetail extends ResourceObjectSummary {
  etag?: string
  checksum?: string | null
  storageClass?: string | null
  metadata?: Record<string, string>
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

  getFolders(
    courseId: string,
    params?: { parentId?: string | null; includeEmpty?: boolean },
  ): Promise<ApiResponse<ResourceFolder[]>> {
    const endpoint = `${this.getBasePath(courseId)}/resource-folders${this.buildQuery({
      parentId: params?.parentId ?? undefined,
      includeEmpty:
        typeof params?.includeEmpty === "boolean" ? Number(params.includeEmpty) : undefined,
    })}`
    return this.http.get<ResourceFolder[]>(endpoint)
  }

  initializeCourseFolders(courseId: string): Promise<ApiResponse<InitializeFoldersResponse>> {
    const endpoint = `${this.getBasePath(courseId)}/resource-folders/init`
    return this.http.post<InitializeFoldersResponse>(endpoint)
  }

  createFolder(courseId: string, parentId: string, payload: CreateFolderPayload): Promise<ApiResponse<ResourceFolder>> {
    const endpoint = `${this.getBasePath(courseId)}/resource-folders/${parentId}`
    return this.http.post<ResourceFolder>(endpoint, payload)
  }

  createUploadSignature(
    courseId: string,
    parentId: string,
    payload: UploadSignatureRequest,
  ): Promise<ApiResponse<UploadSignatureResponse>> {
    const endpoint = `${this.getBasePath(courseId)}/resource-folders/${parentId}/objects/presign`
    return this.http.post<UploadSignatureResponse>(endpoint, payload)
  }

  confirmUpload(
    courseId: string,
    parentId: string,
    payload: ConfirmUploadRequest,
  ): Promise<ApiResponse<ResourceObjectSummary>> {
    const endpoint = `${this.getBasePath(courseId)}/resource-folders/${parentId}/objects/confirm`
    return this.http.post<ResourceObjectSummary>(endpoint, payload)
  }

  getObjects(
    courseId: string,
    params: ListResourceObjectsParams,
  ): Promise<ApiResponse<ResourceObjectsResponse>> {
    const endpoint = `${this.getBasePath(courseId)}/resource-objects${this.buildQuery({
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

  getObjectDetail(courseId: string, objectId: string): Promise<ApiResponse<ResourceObjectDetail>> {
    const endpoint = `${this.getBasePath(courseId)}/resource-objects/${objectId}`
    return this.http.get<ResourceObjectDetail>(endpoint)
  }

  deleteObject(courseId: string, objectId: string): Promise<ApiResponse<null>> {
    const endpoint = `${this.getBasePath(courseId)}/resource-objects/${objectId}`
    return this.http.delete<null>(endpoint)
  }

  batchDelete(courseId: string, objectIds: string[]): Promise<ApiResponse<{ deleted: number }>> {
    const endpoint = `${this.getBasePath(courseId)}/resource-objects/batch-delete`
    return this.http.post<{ deleted: number }>(endpoint, { objectIds })
  }

  batchAction(
    courseId: string,
    payload: ResourceBatchActionRequest,
  ): Promise<ApiResponse<ResourceBatchActionResult>> {
    const endpoint = `${this.getBasePath(courseId)}/resource-objects/batch-action`
    return this.http.post<ResourceBatchActionResult>(endpoint, payload)
  }

  createBatchDownload(
    courseId: string,
    objectIds: string[],
  ): Promise<ApiResponse<{ taskId: string; status: string; downloadUrl: string | null }>> {
    const endpoint = `${this.getBasePath(courseId)}/resource-objects/batch-download`
    return this.http.post(endpoint, { objectIds })
  }
}
