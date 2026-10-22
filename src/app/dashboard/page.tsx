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
  // 页头（当前学校、学期）与看板（登录信息、层级、学期）都取自 localStorage，挂载后再渲染，避免水合不一致
  const hasMounted = useHasMounted()

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      router.replace("/login")
    }
  }, [router])

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      {hasMounted ? (
        <div className="w-full flex flex-col flex-1 min-h-0">
          <Header currentPath="/dashboard" />
          <DashboardView />
        </div>
      ) : null}
    </div>
  )
}
