"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { clearDashboardCache } from "@/modules/dashboard/data/request-cache"

export type DashboardQueryState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T }

interface SettledResult<T> {
  requestKey: string
  state: DashboardQueryState<T>
}

/**
 * 按 key 取数：key 变化即重新加载，过期请求的结果直接丢弃。
 * key 为 null 表示取数条件还不齐（如未读到登录信息），保持加载态。
 */
export function useDashboardQuery<T>(key: string | null, load: () => Promise<T>) {
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<SettledResult<T> | null>(null)
  const requestKey = key === null ? null : `${key}#${attempt}`

  useEffect(() => {
    if (requestKey === null) return
    let cancelled = false
    loadRef.current().then(
      (data) => {
        if (!cancelled) setSettled({ requestKey, state: { status: "ready", data } })
      },
      (error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : String(error)
        console.error("[Dashboard] load failed", requestKey, error)
        setSettled({ requestKey, state: { status: "error", message } })
      },
    )
    return () => {
      cancelled = true
    }
  }, [requestKey])

  const retry = useCallback(() => {
    clearDashboardCache()
    setAttempt((current) => current + 1)
  }, [])

  const state: DashboardQueryState<T> =
    settled !== null && settled.requestKey === requestKey ? settled.state : { status: "loading" }
  return { state, retry }
}
