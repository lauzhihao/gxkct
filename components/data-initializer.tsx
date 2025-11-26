"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { initializeMockData, isDataInitialized } from "@/lib/api/data-initializer"
import { api } from "@/lib/api"
import { isAuthenticated } from "@/lib/api/auth-config"

export function DataInitializer({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true)
  const [initStatus, setInitStatus] = useState("正在初始化数据...")

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 第1步：检查认证状态，如果未认证则登录
        if (!isAuthenticated()) {
          console.log("[DataInitializer] 未认证，开始登录...")
          setInitStatus("正在登陆...")
          const loginResponse = await api.users.login("pan@gxkct.com", "111111")
          if (loginResponse.error) {
            console.error("[DataInitializer] 登录失败:", loginResponse.error)
            setInitStatus("登陆失败，继续使用本地数据...")
            // 登录失败但继续使用mock数据
          } else {
            console.log("[DataInitializer] 登录成功")
            setInitStatus("登陆成功，正在初始化数据...")
          }
        } else {
          console.log("[DataInitializer] 已认证，跳过登录")
          setInitStatus("正在初始化数据...")
        }

        // 第2步：初始化mock数据（树形数据现在从API获取）
        const STORAGE_PREFIX = "education-api-"
        const teachingTasksKey = `${STORAGE_PREFIX}teaching-tasks-`

        let shouldInitialize = !isDataInitialized()

        // 检查教学任务和课程资源数据是否存在
        if (!shouldInitialize) {
          let hasTeachingTasks = false
          let hasCourseResources = false
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith(teachingTasksKey)) {
              hasTeachingTasks = true
            }
            if (key && key.startsWith(`${STORAGE_PREFIX}courseResources-`)) {
              hasCourseResources = true
            }
          }
          if (!hasTeachingTasks) {
            console.log("[v0] 检测到教学任务数据缺失，需要重新初始化")
            shouldInitialize = true
          }
          if (!hasCourseResources) {
            console.log("[v0] 检测到课程资源数据缺失，需要重新初始化")
            shouldInitialize = true
          }
        }

        if (shouldInitialize) {
          console.log("[v0] 检测到数据缺失或未初始化，开始初始化...")
          // 清除旧的初始化标记
          localStorage.removeItem(`${STORAGE_PREFIX}data-initialized`)
          initializeMockData()
        } else {
          console.log("[v0] 数据已初始化，跳过初始化步骤")
        }

        // 标记初始化完成
        setIsInitializing(false)
      } catch (error) {
        console.error("[DataInitializer] 初始化过程中出错:", error)
        setIsInitializing(false)
      }
    }

    initializeApp()
  }, [])

  // 初始化期间显示加载界面
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[oklch(0.97_0.005_240)] via-[oklch(0.96_0.005_240)] to-[oklch(0.95_0.008_240)] flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          </div>
          <div className="text-lg text-muted-foreground">{initStatus}</div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
