"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { initializeMockData, isDataInitialized } from "@/lib/api/data-initializer"

export function DataInitializer({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const STORAGE_PREFIX = "education-api-"
    const treeDataKey = `${STORAGE_PREFIX}tree-data`
    const treeDataRaw = localStorage.getItem(treeDataKey)

    let shouldInitialize = !isDataInitialized() || !treeDataRaw

    if (treeDataRaw && !shouldInitialize) {
      try {
        const treeData = JSON.parse(treeDataRaw)
        // 检查是否是数组格式（旧格式）而不是根节点对象格式
        if (Array.isArray(treeData)) {
          console.log("[v0] 检测到旧的数组格式数据，需要重新初始化")
          shouldInitialize = true
        } else if (!treeData.id || treeData.id !== "root") {
          console.log("[v0] 检测到数据格式不正确，需要重新初始化")
          shouldInitialize = true
        }
      } catch (error) {
        console.error("[v0] 解析树形数据失败:", error)
        shouldInitialize = true
      }
    }

    if (shouldInitialize) {
      console.log("[v0] 检测到数据缺失、格式错误或未初始化，开始初始化...")
      // 清除旧的初始化标记和数据
      localStorage.removeItem(`${STORAGE_PREFIX}data-initialized`)
      localStorage.removeItem(treeDataKey)
      initializeMockData()
    } else {
      console.log("[v0] 数据已初始化且格式正确，跳过初始化步骤")
    }

    // 标记初始化完成
    setIsInitializing(false)
  }, [])

  // 初始化期间显示加载界面
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[oklch(0.97_0.005_240)] via-[oklch(0.96_0.005_240)] to-[oklch(0.95_0.008_240)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">正在初始化数据...</div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
