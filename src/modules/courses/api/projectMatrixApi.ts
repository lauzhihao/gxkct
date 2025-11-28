import { api } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"
import type { ProjectMatrixDataResponse, KsaListResponse } from "@/lib/api/matrix-api"

export interface AddKsaPayload {
  majorId: number
  courseUnitId: number
  title: string
  description: string
  level: number
}

export interface UpdateKsaPayload {
  title?: string
  description?: string
  level?: number
}

export const projectMatrixApi = {
  getProjectMatrixData(courseId: string): Promise<ApiResponse<ProjectMatrixDataResponse>> {
    return api.matrices.getProjectMatrixData(courseId)
  },
  getKsaList(majorId: string, courseId: string): Promise<ApiResponse<KsaListResponse>> {
    return api.matrices.getKsaList(majorId, courseId)
  },
  addKsa(data: AddKsaPayload) {
    return api.matrices.addKsa(data)
  },
  updateKsa(ksaId: number, data: UpdateKsaPayload) {
    return api.matrices.updateKsa(ksaId, data)
  },
  deleteKsa(ksaId: number) {
    return api.matrices.deleteKsa(ksaId)
  },
}
