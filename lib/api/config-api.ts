import { StorageAdapter } from "./storage-adapter"
import type { ApiResponse } from "./types"

export interface ThemeConfig {
  colorTheme: string
}

export class ConfigApi {
  private storage = new StorageAdapter()

  async getTheme(): Promise<ApiResponse<ThemeConfig>> {
    return this.storage.get<ThemeConfig>("colorTheme")
  }

  async setTheme(theme: string): Promise<ApiResponse<ThemeConfig>> {
    return this.storage.set<ThemeConfig>("colorTheme", { colorTheme: theme })
  }
}
