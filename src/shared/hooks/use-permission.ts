"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getCurrentPermissionId } from "@/lib/api/auth-config"
import { getPermissionRole, hasPermission } from "@/shared/permissions/policy"
import type { PermissionAction, PermissionContext } from "@/shared/permissions/types"
import { useSemesterReadonly } from "@/shared/hooks/use-semester-readonly"

const AUTH_USER_KEY = "education-api-auth-user"
const WRITE_KEYWORDS = [
  "create",
  "edit",
  "delete",
  "update",
  "save",
  "toggle",
  "resetPassword",
  "manage",
  "add",
  "remove",
  "del",
  "set",
]

export function usePermission() {
  const [permissionId, setPermissionId] = useState<number | null>(() => getCurrentPermissionId())
  const isSemesterReadonly = useSemesterReadonly()

  const can = useCallback(
    (action: PermissionAction, context?: PermissionContext) => {
      // 1. 如果处于只读学期模式，且尝试执行写入操作，强制返回 false
      if (isSemesterReadonly) {
        const actionStr = String(action).toLowerCase()
        const isWriteAction = WRITE_KEYWORDS.some(keyword => actionStr.includes(keyword.toLowerCase()))
        if (isWriteAction) {
          return false
        }
      }

      // 2. 调用原始权限策略
      return hasPermission(permissionId, action, context)
    },
    [permissionId, isSemesterReadonly],
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
      isSemesterReadonly,
      refreshPermission,
    }),
    [permissionId, role, can, isSemesterReadonly, refreshPermission],
  )
}
