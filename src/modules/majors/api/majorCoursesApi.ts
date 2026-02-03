import { api } from "@/lib/api"
import type { TreeNode } from "@/types"
import type { ApiResponse } from "@/lib/api/types"

export const majorCoursesApi = {
  getMajorCourses(majorId: string): Promise<ApiResponse<TreeNode[] | null>> {
    return api.tree.getMajorCourses(majorId)
  },
}
