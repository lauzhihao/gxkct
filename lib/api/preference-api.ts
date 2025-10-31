import { StorageAdapter } from "./storage-adapter"
import type { ApiResponse } from "./types"

export interface UserPreference {
  [key: string]: any
}

export class PreferenceApi {
  private storage = new StorageAdapter()

  async getPreference(key: string): Promise<ApiResponse<UserPreference>> {
    return this.storage.get<UserPreference>(key)
  }

  async setPreference(key: string, value: any): Promise<ApiResponse<UserPreference>> {
    return this.storage.set<UserPreference>(key, value)
  }
}
