"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getCurrentPermissionId } from "@/lib/api/auth-config"

const AUTH_USER_KEY = "education-api-auth-user"

export function usePermission() {
  const [permissionId, setPermissionId] = useState<number | null>(() => getCurrentPermissionId())

  const refreshPermission = useCallback(() => {
    setPermissionId(getCurrentPermissionId())
  }, [])

  useEffect(() => {
    refreshPermission()
  }, [refreshPermission])

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== AUTH_USER_KEY) return
      refreshPermission()
    }

    const handleWindowFocus = () => {
      refreshPermission()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("focus", handleWindowFocus)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("focus", handleWindowFocus)
    }
  }, [refreshPermission])

  const canManage = permissionId === 1

  return useMemo(
    () => ({
      permissionId,
      canManage,
      refreshPermission,
    }),
    [permissionId, canManage, refreshPermission],
  )
}
