"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { safeLocalStorageGet, safeLocalStorageSet } from "@/shared/utils/storage"

interface ActivePageState {
  value: string
  label: string
}

const ACTIVE_PAGE_STORAGE_KEY = "currentActivePage"
const ACTIVE_PAGE_EVENT = "active-page-change"

const readInitialActivePage = (): ActivePageState | null => {
  return safeLocalStorageGet<ActivePageState | null>(ACTIVE_PAGE_STORAGE_KEY, null)
}

export function useActivePageTracker() {
  const [activePage, setActivePageState] = useState<ActivePageState | null>(() => readInitialActivePage())

  const dispatchChangeEvent = useCallback((payload: ActivePageState) => {
    if (typeof window === "undefined") return
    window.dispatchEvent(new CustomEvent<ActivePageState>(ACTIVE_PAGE_EVENT, { detail: payload }))
  }, [])

  const setActivePage = useCallback(
    (value: string, label: string) => {
      const payload = { value, label }
      setActivePageState(payload)
      safeLocalStorageSet(ACTIVE_PAGE_STORAGE_KEY, payload)
      dispatchChangeEvent(payload)
    },
    [dispatchChangeEvent],
  )

  useEffect(() => {
    const handleActivePageChange = (event: Event) => {
      const customEvent = event as CustomEvent<ActivePageState>
      if (!customEvent.detail) return
      setActivePageState(customEvent.detail)
    }

    window.addEventListener(ACTIVE_PAGE_EVENT, handleActivePageChange)
    return () => window.removeEventListener(ACTIVE_PAGE_EVENT, handleActivePageChange)
  }, [])

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== ACTIVE_PAGE_STORAGE_KEY || !event.newValue) return
      try {
        const parsed = JSON.parse(event.newValue) as ActivePageState
        setActivePageState(parsed)
      } catch (error) {
        console.error("解析活动标签页缓存失败", error)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  return useMemo(
    () => ({
      activeTab: activePage?.value ?? null,
      activeTabLabel: activePage?.label ?? null,
      setActivePage,
    }),
    [activePage, setActivePage],
  )
}
