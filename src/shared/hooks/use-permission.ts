"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getCurrentPermissionId } from "@/lib/api/auth-config"
import { getPermissionRole, hasPermission } from "@/shared/permissions/policy"
import type { PermissionAction, PermissionContext } from "@/shared/permissions/types"

const AUTH_USER_KEY = "education-api-auth-user"

export function usePermission() {
  const [permissionId, setPermissionId] = useState<number | null>(() => getCurrentPermissionId())

  const can = useCallback(
    (action: PermissionAction, context?: PermissionContext) => hasPermission(permissionId, action, context),
    [permissionId],
  )
  const role = useMemo(() => getPermissionRole(permissionId), [permissionId])

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

  return useMemo(
    () => ({
      permissionId,
      role,
      can,
      refreshPermission,
    }),
    [permissionId, role, can, refreshPermission],
  )
}
