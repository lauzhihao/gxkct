"use client"

import { useSearchParams } from "next/navigation"

export function useDebugMode(paramName = "debug") {
  const searchParams = useSearchParams()
  return searchParams.has(paramName)
}
