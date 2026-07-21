"use client"

import { useCallback, useEffect, useState } from "react"
import {
  readResourceViewPreference,
  writeResourceViewPreference,
  type ResourceViewMode,
} from "@/modules/courses/components/course/resources/resource-view-preference"
import { showError } from "@/shared/utils/toast-utils"

export function useResourceViewPreference() {
  const [viewMode, setViewModeState] = useState<ResourceViewMode>("list")

  useEffect(() => {
    try {
      const storedViewMode = readResourceViewPreference(window.localStorage)
      setViewModeState(storedViewMode)
    } catch {
      showError("读取资源视图偏好失败，已使用列表视图")
    }
  }, [])

  const setViewMode = useCallback((nextViewMode: ResourceViewMode) => {
    setViewModeState(nextViewMode)
    try {
      writeResourceViewPreference(window.localStorage, nextViewMode)
    } catch {
      showError("视图已切换，但偏好保存失败")
    }
  }, [])

  return { viewMode, setViewMode }
}
