import { StorageAdapter } from "./storage-adapter"
import type { ApiResponse } from "./types"

export interface OccupationBookData {
  level: number
  code: string
  title: string
  desc: string
  subtitle: string
  task: string | null
  list: any | null
  professions: any | null
}

export class OccupationApi {
  private storage = new StorageAdapter()

  /**
   * 根据职业代码获取职业信息
   * 调用 /api/v3/material/occupationbook 接口
   * @param code 职业代码，例如 "1-01-00-01"
   * @returns 职业信息，包含 desc（工作职责描述）
   */
  async getOccupationBook(code: string): Promise<ApiResponse<OccupationBookData>> {
    try {
      const response = await this.storage.getFromApi<OccupationBookData>(
        `/api/v3/material/occupationbook?code=${code}&lang=80101`
      )

      if (response.error || !response.data) {
        console.error(`[OccupationApi] 获取职业信息失败: ${response.error}`)
        return response
      }

      console.log(`[OccupationApi] 获取职业信息成功: ${code}`)
      return response
    } catch (error) {
      console.error(`[OccupationApi] 获取职业信息异常:`, error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '获取职业信息失败',
        status: 500,
      }
    }
  }
}

