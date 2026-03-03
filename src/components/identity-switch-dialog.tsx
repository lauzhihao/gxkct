"use client"

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { cn } from "@/shared/utils/utils"
import {
  api,
  getStoredAuthUser,
  setStoredAuthUser,
  type AllAvailableCollegeData,
  type AvailableIdentityItem,
  type CurrentIdentityInfo,
  type UpdateCurrentDepartmentPayload,
} from "@/lib/api"
import { showError, showSuccess, showWarning } from "@/shared/utils/toast-utils"

const EMPTY_IDENTITIES: AvailableIdentityItem[] = []

interface IdentitySwitchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: number | null
}

function getIdentityKey(permissionId: number, relativeId: number, collegeId?: number | null): string {
  return `${collegeId ?? "na"}-${permissionId}-${relativeId}`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function renderHighlightedText(text: string, keyword: string): ReactNode {
  if (!keyword) {
    return text
  }

  const pattern = new RegExp(`(${escapeRegExp(keyword)})`, "ig")
  const segments = text.split(pattern)

  return segments.map((segment, index) => {
    if (segment.toLowerCase() === keyword.toLowerCase()) {
      return (
        <mark key={`${segment}-${index}`} className="rounded bg-primary/15 px-0.5 text-primary">
          {segment}
        </mark>
      )
    }

    return <span key={`${segment}-${index}`}>{segment}</span>
  })
}

function renderDepartmentText(identity: AvailableIdentityItem, keyword: string): ReactNode {
  if (!Array.isArray(identity.departments) || identity.departments.length === 0) {
    return "暂无院系信息"
  }

  return identity.departments.map((department, index) => (
    <span key={`${department.id}-${index}`}>
      {index > 0 && <span>{" / "}</span>}
      {renderHighlightedText(department.name, keyword)}
    </span>
  ))
}

export function IdentitySwitchDialog({ open, onOpenChange, userId }: IdentitySwitchDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [identityData, setIdentityData] = useState<AllAvailableCollegeData | null>(null)
  const [selectedIdentityKey, setSelectedIdentityKey] = useState<string | null>(null)
  const [searchKeyword, setSearchKeyword] = useState("")
  const [debouncedKeyword, setDebouncedKeyword] = useState("")

  const currentIdentityKey = useMemo(() => {
    if (!identityData?.current) {
      return null
    }

    return getIdentityKey(identityData.current.permissionId, identityData.current.relativeId, identityData.current.college?.id)
  }, [identityData])

  const selectedIdentity = useMemo(() => {
    if (!selectedIdentityKey) {
      return null
    }

    return (identityData?.colleges ?? []).find(
      (identity) =>
        getIdentityKey(identity.permissionId, identity.relativeId, identity.college?.id) === selectedIdentityKey,
    ) ?? null
  }, [identityData?.colleges, selectedIdentityKey])

  const canSubmit =
    !isLoading &&
    !isSubmitting &&
    !errorMessage &&
    !!selectedIdentity &&
    selectedIdentityKey !== currentIdentityKey

  const applyCurrentIdentityToState = useCallback((nextCurrent: CurrentIdentityInfo) => {
    setIdentityData((prev) => {
      if (!prev) {
        return prev
      }

      return {
        ...prev,
        current: nextCurrent,
      }
    })
  }, [])

  const loadIdentityData = useCallback(async () => {
    if (!userId) {
      setIdentityData(null)
      setSelectedIdentityKey(null)
      setErrorMessage("未获取到当前用户信息")
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await api.users.getAllAvailableColleges(userId)
      if (response.error || !response.data) {
        const nextErrorMessage = response.error || "加载可切换身份失败"
        setIdentityData(null)
        setSelectedIdentityKey(null)
        setErrorMessage(nextErrorMessage)
        showError(nextErrorMessage)
        return
      }

      const nextCurrentIdentityKey = response.data.current
        ? getIdentityKey(
            response.data.current.permissionId,
            response.data.current.relativeId,
            response.data.current.college?.id,
          )
        : null

      setIdentityData(response.data)
      setSelectedIdentityKey(nextCurrentIdentityKey)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!open) {
      return
    }

    void loadIdentityData()
  }, [loadIdentityData, open])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(searchKeyword.trim().toLowerCase())
    }, 300)

    return () => {
      window.clearTimeout(timer)
    }
  }, [searchKeyword])

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isSubmitting) {
        return
      }
      onOpenChange(nextOpen)
    },
    [isSubmitting, onOpenChange],
  )

  const switchToIdentity = useCallback(
    async (targetIdentity: AvailableIdentityItem) => {
      if (!userId) {
        showWarning("未获取到当前用户信息")
        return
      }

      if (!identityData?.current) {
        showWarning("未获取到当前身份信息")
        return
      }

      const targetIdentityKey = getIdentityKey(
        targetIdentity.permissionId,
        targetIdentity.relativeId,
        targetIdentity.college?.id,
      )
      if (targetIdentityKey === currentIdentityKey) {
        showWarning("当前已是该身份")
        return
      }

      const selectedDepartment =
        targetIdentity.departments.find((department) => department.id === targetIdentity.relativeId) ??
        targetIdentity.departments[0] ??
        null

      const payload: UpdateCurrentDepartmentPayload = {
        id: identityData.current.id,
        userId,
        permissionId: targetIdentity.permissionId,
        relativeId: targetIdentity.relativeId,
        department: selectedDepartment,
        college: targetIdentity.college,
        multiple: identityData.current.multiple,
      }

      setIsSubmitting(true)
      try {
        const response = await api.users.updateCurrentDepartment(payload)
        if (response.error) {
          showError(response.error || "身份切换失败")
          return
        }

        const authUser = getStoredAuthUser()
        if (authUser) {
          setStoredAuthUser({
            ...authUser,
            permissionId: payload.permissionId,
            relativeId: payload.relativeId,
            collegeId: payload.college?.id ?? authUser.collegeId,
          })
        }

        applyCurrentIdentityToState({
          ...identityData.current,
          userId,
          permissionId: payload.permissionId,
          relativeId: payload.relativeId,
          department: payload.department,
          college: payload.college,
        })
        setSelectedIdentityKey(getIdentityKey(payload.permissionId, payload.relativeId, payload.college?.id))

        showSuccess("身份切换成功")
        onOpenChange(false)
        window.location.href = "/"
      } finally {
        setIsSubmitting(false)
      }
    },
    [applyCurrentIdentityToState, currentIdentityKey, identityData, onOpenChange, userId],
  )

  const handleConfirmSwitch = useCallback(async () => {
    if (!userId) {
      showWarning("未获取到当前用户信息")
      return
    }

    if (!identityData?.current) {
      showWarning("未获取到当前身份信息")
      return
    }

    if (!selectedIdentity) {
      showWarning("请选择要切换的身份")
      return
    }

    if (selectedIdentityKey === currentIdentityKey) {
      showWarning("当前已是该身份")
      return
    }
    await switchToIdentity(selectedIdentity)
  }, [
    currentIdentityKey,
    identityData,
    selectedIdentity,
    selectedIdentityKey,
    switchToIdentity,
    userId,
  ])

  const identities = identityData?.colleges ?? EMPTY_IDENTITIES
  const filteredIdentities = useMemo(() => {
    if (!debouncedKeyword) {
      return identities
    }

    return identities.filter((identity) => {
      const collegeName = identity.college?.name?.toLowerCase() ?? ""
      const departmentMatched = identity.departments.some((department) =>
        department.name.toLowerCase().includes(debouncedKeyword),
      )
      return collegeName.includes(debouncedKeyword) || departmentMatched
    })
  }, [debouncedKeyword, identities])

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-2xl" showCloseButton={!isLoading && !isSubmitting}>
        <DialogHeader>
          <DialogTitle>切换身份</DialogTitle>
          <DialogDescription>请选择要切换的学校与院系身份。</DialogDescription>
        </DialogHeader>

        <Input
          value={searchKeyword}
          onChange={(event) => setSearchKeyword(event.target.value)}
          placeholder="输入学校或院系名称筛选"
          disabled={isLoading || isSubmitting}
        />

        <div className="max-h-[420px] overflow-y-auto pr-1">
          {isLoading && <div className="py-16 text-center text-sm text-muted-foreground">身份数据加载中...</div>}

          {!isLoading && errorMessage && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          {!isLoading && !errorMessage && identities.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">暂无可切换身份</div>
          )}

          {!isLoading && !errorMessage && identities.length > 0 && filteredIdentities.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">无匹配身份</div>
          )}

          {!isLoading && !errorMessage && filteredIdentities.length > 0 && (
            <div className="space-y-2">
              {filteredIdentities.map((identity, index) => {
                const identityKey = getIdentityKey(identity.permissionId, identity.relativeId, identity.college?.id)
                const renderKey = `${identityKey}-${index}`
                const isCurrent = identityKey === currentIdentityKey
                const isSelected = identityKey === selectedIdentityKey

                return (
                  <div
                    key={renderKey}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "group w-full rounded-lg border px-4 py-3 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/30",
                    )}
                    onClick={() => setSelectedIdentityKey(identityKey)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        setSelectedIdentityKey(identityKey)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-foreground">
                          {renderHighlightedText(identity.college?.name || "未命名学校", debouncedKeyword)}
                        </span>
                        <div className="mt-1 text-sm text-muted-foreground">{renderDepartmentText(identity, debouncedKeyword)}</div>
                      </div>

                      {isCurrent && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">当前身份</span>
                      )}
                      {!isCurrent && (
                        <Button
                          size="sm"
                          className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
                          disabled={isSubmitting || isLoading}
                          onClick={(event) => {
                            event.stopPropagation()
                            void switchToIdentity(identity)
                          }}
                        >
                          {isSubmitting ? "切换中..." : "设为当前"}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          {errorMessage && (
            <Button variant="outline" onClick={() => void loadIdentityData()} disabled={isLoading || isSubmitting}>
              重试
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading || isSubmitting}>
            关闭
          </Button>
          <Button onClick={() => void handleConfirmSwitch()} disabled={!canSubmit}>
            {isSubmitting ? "切换中..." : "确认切换"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
