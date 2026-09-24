"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { getStoredAuthToken } from "@/lib/api"
import { useHasMounted } from "@/shared/hooks/use-has-mounted"
import { DashboardView } from "@/modules/dashboard/components/dashboard-view"

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardPageContent />
    </Suspense>
  )
}

function DashboardPageContent() {
  const router = useRouter()
  // 看板的默认层级与学期取自 localStorage，挂载后再渲染，避免水合不一致与层级闪变
  const hasMounted = useHasMounted()

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      router.replace("/login")
    }
  }, [router])

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      <div className="w-full flex flex-col flex-1 min-h-0">
        <Header currentPath="/dashboard" />
        {hasMounted ? <DashboardView /> : <div className="flex-1" />}
      </div>
    </div>
  )
}
