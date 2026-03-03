"use client"

import { Suspense, useEffect } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Search } from "lucide-react"
import { Header } from "@/components/header"
import { WorkshopManagementForm } from "@/components/workshop-management-form"
import { WorkshopListView } from "@/components/workshop-list-view"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { getStoredAuthToken } from "@/lib/api"

type WorkshopManagementMode = "list" | "create"

export default function WorkshopManagementPage() {
  return (
    <Suspense>
      <WorkshopManagementContent />
    </Suspense>
  )
}

function WorkshopManagementContent() {
  const router = useRouter()
  const [mode, setMode] = useState<WorkshopManagementMode>("list")
  const [refreshToken, setRefreshToken] = useState(0)
  const [searchKeyword, setSearchKeyword] = useState("")

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      router.replace("/login")
    }
  }, [router])

  return (
    <div className="h-screen bg-gradient-to-br from-[oklch(0.97_0.005_240)] via-[oklch(0.96_0.005_240)] to-[oklch(0.95_0.008_240)] px-6 py-6 md:py-8 overflow-hidden flex flex-col">
      <div className="w-full flex flex-col flex-1 min-h-0">
        <Header currentPath="/workshop-management" />

        <div className="rounded-xl border border-border bg-card/50 backdrop-blur-md shadow-lg p-6 flex-1 min-h-0 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between gap-3 flex-nowrap">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-foreground truncate">工作坊管理</h2>
            </div>

            {mode === "list" && (
              <div className="flex items-center gap-2 flex-nowrap">
                <div className="relative w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                    placeholder="按工作坊名称筛选"
                    className="pl-9"
                  />
                </div>
                <Button
                  type="button"
                  className="gap-2"
                  onClick={() => {
                    setMode("create")
                  }}
                >
                  <Plus className="h-4 w-4" />
                  创建
                </Button>
                <Button type="button" variant="outline" className="gap-2" onClick={() => router.push("/")}>
                  <ArrowLeft className="h-4 w-4" />
                  返回
                </Button>
              </div>
            )}

            {mode === "create" && (
              <div className="flex items-center gap-2 flex-nowrap">
                <Button type="button" variant="outline" className="gap-2" onClick={() => setMode("list")}>
                  <ArrowLeft className="h-4 w-4" />
                  返回
                </Button>
              </div>
            )}
          </div>

          {mode === "list" && (
            <WorkshopListView
              searchKeyword={searchKeyword}
              refreshToken={refreshToken}
            />
          )}

          {mode === "create" && (
            <div className="space-y-4">
              <WorkshopManagementForm
                showCancelButton={false}
                onWorkshopCreated={async () => {
                  setRefreshToken((prev) => prev + 1)
                  setMode("list")
                  return true
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
