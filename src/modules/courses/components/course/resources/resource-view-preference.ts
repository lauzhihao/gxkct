export type ResourceViewMode = "grid" | "list"

export interface ResourceViewPreferenceStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export const RESOURCE_VIEW_MODE_STORAGE_KEY = "education-resource-view-mode"

export function readResourceViewPreference(
  storage: ResourceViewPreferenceStorage,
): ResourceViewMode {
  const storedValue = storage.getItem(RESOURCE_VIEW_MODE_STORAGE_KEY)
  if (storedValue === null) {
    return "list"
  }
  if (storedValue === "grid") {
    return "grid"
  }
  if (storedValue === "list") {
    return "list"
  }

  storage.removeItem(RESOURCE_VIEW_MODE_STORAGE_KEY)
  throw new Error("资源视图偏好值无效，已清除")
}

export function writeResourceViewPreference(
  storage: ResourceViewPreferenceStorage,
  viewMode: ResourceViewMode,
): void {
  storage.setItem(RESOURCE_VIEW_MODE_STORAGE_KEY, viewMode)
}
