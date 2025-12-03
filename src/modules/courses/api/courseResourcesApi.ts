import {
  api,
  type ResourceFolder,
  type InitializeFoldersResponse,
  type ResourceObjectsResponse,
  type ResourceObjectSummary,
  type ResourceObjectDetail,
  type ResourceBatchActionRequest,
  type ResourceBatchActionResult,
  type ListResourceObjectsParams,
  type CreateFolderPayload,
  type UploadSignatureRequest,
  type UploadSignatureResponse,
  type ConfirmUploadRequest,
} from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const courseResourcesApi = {
  getFolders(
    courseId: string,
    parentId?: string | null,
    options?: { includeEmpty?: boolean },
  ): Promise<ApiResponse<ResourceFolder[]>> {
    return api.resources.getFolders(courseId, {
      parentId: parentId ?? undefined,
      includeEmpty: options?.includeEmpty,
    })
  },

  initializeFolders(courseId: string): Promise<ApiResponse<InitializeFoldersResponse>> {
    return api.resources.initializeCourseFolders(courseId)
  },

  getObjects(courseId: string, params: ListResourceObjectsParams): Promise<ApiResponse<ResourceObjectsResponse>> {
    return api.resources.getObjects(courseId, params)
  },

  getObjectDetail(courseId: string, objectId: string): Promise<ApiResponse<ResourceObjectDetail>> {
    return api.resources.getObjectDetail(courseId, objectId)
  },

  deleteObject(courseId: string, objectId: string): Promise<ApiResponse<null>> {
    return api.resources.deleteObject(courseId, objectId)
  },

  batchDelete(courseId: string, objectIds: string[]): Promise<ApiResponse<{ deleted: number }>> {
    return api.resources.batchDelete(courseId, objectIds)
  },

  batchAction(courseId: string, payload: ResourceBatchActionRequest): Promise<ApiResponse<ResourceBatchActionResult>> {
    return api.resources.batchAction(courseId, payload)
  },

  createBatchDownload(
    courseId: string,
    objectIds: string[],
  ): Promise<ApiResponse<{ taskId: string; status: string; downloadUrl: string | null }>> {
    return api.resources.createBatchDownload(courseId, objectIds)
  },

  createFolder(courseId: string, parentId: string, payload: CreateFolderPayload): Promise<ApiResponse<ResourceFolder>> {
    return api.resources.createFolder(courseId, parentId, payload)
  },

  getUploadSignature(
    courseId: string,
    parentId: string,
    payload: UploadSignatureRequest,
  ): Promise<ApiResponse<UploadSignatureResponse>> {
    return api.resources.createUploadSignature(courseId, parentId, payload)
  },

  confirmUpload(
    courseId: string,
    parentId: string,
    payload: ConfirmUploadRequest,
  ): Promise<ApiResponse<ResourceObjectSummary>> {
    return api.resources.confirmUpload(courseId, parentId, payload)
  },
}
