"use client"

import type { ReactNode } from "react"
import { usePermission } from "@/shared/hooks/use-permission"
import type { PermissionAction, PermissionContext } from "@/shared/permissions/types"

interface PermissionGateProps {
  action: PermissionAction
  context?: PermissionContext
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGate({ action, context, children, fallback = null }: PermissionGateProps) {
  const { can } = usePermission()

  if (!can(action, context)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
