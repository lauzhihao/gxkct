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

// 资源归属层级；缺省按课程处理（保持与既有课程资源完全一致）
export type ResourceOwnerType = "course" | "department" | "major" | "university"

export const courseResourcesApi = {
  getFolders(
    courseId: string,
    parentId?: string | null,
    options?: { includeEmpty?: boolean },
    ownerType?: ResourceOwnerType,
  ): Promise<ApiResponse<ResourceFolder[] | null>> {
    return api.resources.getFolders(courseId, {
      parentId: parentId ?? undefined,
      includeEmpty: options?.includeEmpty,
    }, ownerType)
  },

  initializeFolders(courseId: string, ownerType?: ResourceOwnerType): Promise<ApiResponse<InitializeFoldersResponse | null>> {
    return api.resources.initializeCourseFolders(courseId, ownerType)
  },

  getObjects(courseId: string, params: ListResourceObjectsParams, ownerType?: ResourceOwnerType): Promise<ApiResponse<ResourceObjectsResponse | null>> {
    return api.resources.getObjects(courseId, params, ownerType)
  },

  getObjectDetail(courseId: string, objectId: string, ownerType?: ResourceOwnerType): Promise<ApiResponse<ResourceObjectDetail | null>> {
    return api.resources.getObjectDetail(courseId, objectId, ownerType)
  },

  deleteObject(courseId: string, objectId: string, ownerType?: ResourceOwnerType): Promise<ApiResponse<null>> {
    return api.resources.deleteObject(courseId, objectId, ownerType)
  },

  batchDelete(courseId: string, objectIds: string[], ownerType?: ResourceOwnerType): Promise<ApiResponse<{ deleted: number } | null>> {
    return api.resources.batchDelete(courseId, objectIds, ownerType)
  },

  batchAction(courseId: string, payload: ResourceBatchActionRequest, ownerType?: ResourceOwnerType): Promise<ApiResponse<ResourceBatchActionResult | null>> {
    return api.resources.batchAction(courseId, payload, ownerType)
  },

  createBatchDownload(
    courseId: string,
    objectIds: string[],
    ownerType?: ResourceOwnerType,
  ): Promise<ApiResponse<{ taskId: string; status: string; downloadUrl: string | null } | null>> {
    return api.resources.createBatchDownload(courseId, objectIds, ownerType)
  },

  createFolder(courseId: string, parentId: string, payload: CreateFolderPayload, ownerType?: ResourceOwnerType): Promise<ApiResponse<ResourceFolder | null>> {
    return api.resources.createFolder(courseId, parentId, payload, ownerType)
  },

  getUploadSignature(
    courseId: string,
    parentId: string,
    payload: UploadSignatureRequest,
    ownerType?: ResourceOwnerType,
  ): Promise<ApiResponse<UploadSignatureResponse | null>> {
    return api.resources.createUploadSignature(courseId, parentId, payload, ownerType)
  },

  confirmUpload(
    courseId: string,
    parentId: string,
    payload: ConfirmUploadRequest,
    ownerType?: ResourceOwnerType,
  ): Promise<ApiResponse<ResourceObjectSummary | null>> {
    return api.resources.confirmUpload(courseId, parentId, payload, ownerType)
  },
}
