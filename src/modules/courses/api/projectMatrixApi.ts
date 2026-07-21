import { api } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"
import type { ProjectMatrixDataResponse, KsaListResponse, ProjectMatrixSaveItem } from "@/lib/api/matrix-api"

export interface SaveKsaPayload {
  majorId: number
  courseId: number
  ksas: Array<{
    id: number
    title: string
    description: string
    level: number
  }>
  upload?: boolean
}

export const projectMatrixApi = {
  getProjectMatrixData(courseId: string): Promise<ApiResponse<ProjectMatrixDataResponse>> {
    return api.matrices.getProjectMatrixData(courseId)
  },
  getKsaList(majorId: string, courseId: string): Promise<ApiResponse<KsaListResponse>> {
    return api.matrices.getKsaList(majorId, courseId)
  },
  saveKsaList(params: SaveKsaPayload) {
    return api.matrices.saveKsaList(params)
  },
  saveProjectMatrixData(data: ProjectMatrixSaveItem[]): Promise<ApiResponse<any>> {
    return api.matrices.updateProjectMatrixData(data)
  },
}
