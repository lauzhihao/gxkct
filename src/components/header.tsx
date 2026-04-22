"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronDown, Palette, Eye, EyeOff } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"
import { Input } from "@/shared/components/ui/input"
import { cn, extractNumericId } from "@/shared/utils/utils"
import { api, getStoredAuthUser, clearAllAuthData } from "@/lib/api"
import { useActivePageTracker } from "@/shared/hooks/use-active-page-tracker"
import { usePermission } from "@/shared/hooks/use-permission"
import { AiAssistantDrawer } from "./ai-assistant-drawer"
import { useLoadingStore } from "@/shared/stores/loading-store"
import { useAiCanvasStore } from "@/shared/stores/ai-canvas-store"
import { showError, showSuccess, showWarning } from "@/shared/utils/toast-utils"
import type { InitialCanvasData } from "@/types/ai-assistant"
import { IdentitySwitchDialog } from "./identity-switch-dialog"
import { SemesterManagement } from "@/modules/universities/components/shared/semester-management"
import { useLocalStorage } from "@/shared/hooks/use-local-storage"

const EMPTY_INITIAL_CANVAS_DATA: InitialCanvasData = {
  elements: [],
  edges: [],
}

const WORKSHOP_MANAGEMENT_ACTION = "root.college.create" as const
const WORKSHOP_MANAGEMENT_CONTEXT = { scope: "root" } as const

const COLOR_THEMES = {
  green: {
    name: "NaiveUI 绿色",
    primary: "#18a058",
    primaryDark: "#0c7a43",
    primaryLight: "#36ad6a",
    primaryHover: "rgba(24, 160, 88, 0.12)",
    primaryPressed: "rgba(24, 160, 88, 0.18)",
    primaryActive: "rgba(24, 160, 88, 0.1)",
    oklchPrimary: "oklch(0.58 0.15 155)",
    oklchAccent: "oklch(0.62 0.16 155)",
    hue: 155,
  },
  vercelBlue: {
    name: "Vercel 蓝色",
    primary: "#0070f3",
    primaryDark: "#0051cc",
    primaryLight: "#3291ff",
    primaryHover: "rgba(0, 112, 243, 0.12)",
    primaryPressed: "rgba(0, 112, 243, 0.18)",
    primaryActive: "rgba(0, 112, 243, 0.1)",
    oklchPrimary: "oklch(0.58 0.2 240)",
    oklchAccent: "oklch(0.62 0.21 240)",
    hue: 240,
  },
  antBlue: {
    name: "Ant Design 蓝色",
    primary: "#1890ff",
    primaryDark: "#096dd9",
    primaryLight: "#40a9ff",
    primaryHover: "rgba(24, 144, 255, 0.12)",
    primaryPressed: "rgba(24, 144, 255, 0.18)",
    primaryActive: "rgba(24, 144, 255, 0.1)",
    oklchPrimary: "oklch(0.62 0.22 245)",
    oklchAccent: "oklch(0.66 0.23 245)",
    hue: 245,
  },
  microsoftBlue: {
    name: "微软蓝色",
    primary: "#0078d4",
    primaryDark: "#005a9e",
    primaryLight: "#2b88d8",
    primaryHover: "rgba(0, 120, 212, 0.12)",
    primaryPressed: "rgba(0, 120, 212, 0.18)",
    primaryActive: "rgba(0, 120, 212, 0.1)",
    oklchPrimary: "oklch(0.56 0.18 235)",
    oklchAccent: "oklch(0.6 0.19 235)",
    hue: 235,
  },
  tailwindBlue: {
    name: "Tailwind 蓝色",
    primary: "#2563eb",
    primaryDark: "#1e40af",
    primaryLight: "#3b82f6",
    primaryHover: "rgba(37, 99, 235, 0.12)",
    primaryPressed: "rgba(37, 99, 235, 0.18)",
    primaryActive: "rgba(37, 99, 235, 0.1)",
    oklchPrimary: "oklch(0.55 0.24 250)",
    oklchAccent: "oklch(0.59 0.25 250)",
    hue: 250,
  },
  claudeOrange: {
    name: "Claude 橙色",
    primary: "#E87C3E",
    primaryDark: "#C5621F",
    primaryLight: "#FF9B5E",
    primaryHover: "rgba(232, 124, 62, 0.12)",
    primaryPressed: "rgba(232, 124, 62, 0.18)",
    primaryActive: "rgba(232, 124, 62, 0.1)",
    oklchPrimary: "oklch(0.65 0.16 45)",
    oklchAccent: "oklch(0.69 0.17 45)",
    hue: 45,
  },
  hermesOrange: {
    name: "爱马仕橙色",
    primary: "#F37021",
    primaryDark: "#D85A0D",
    primaryLight: "#FF9B5E",
    primaryHover: "rgba(243, 112, 33, 0.12)",
    primaryPressed: "rgba(243, 112, 33, 0.18)",
    primaryActive: "rgba(243, 112, 33, 0.1)",
    oklchPrimary: "oklch(0.68 0.16 35)",
    oklchAccent: "oklch(0.72 0.17 35)",
    hue: 35,
  },
  appleBlue: {
    name: "Apple 蓝色",
    primary: "#0071e3",
    primaryDark: "#0051B3",
    primaryLight: "#3A8FE8",
    primaryHover: "rgba(0, 113, 227, 0.12)",
    primaryPressed: "rgba(0, 113, 227, 0.18)",
    primaryActive: "rgba(0, 113, 227, 0.1)",
    oklchPrimary: "oklch(0.56 0.19 238)",
    oklchAccent: "oklch(0.6 0.2 238)",
    hue: 238,
  },
  notionPurple: {
    name: "Tsinghua 清华紫",
    primary: "#9B59B6",
    primaryDark: "#7D3C98",
    primaryLight: "#BB8FCE",
    primaryHover: "rgba(155, 89, 182, 0.12)",
    primaryPressed: "rgba(155, 89, 182, 0.18)",
    primaryActive: "rgba(155, 89, 182, 0.1)",
    oklchPrimary: "oklch(0.52 0.15 310)",
    oklchAccent: "oklch(0.56 0.16 310)",
    hue: 310,
  },
  slackAubergine: {
    name: "Slack 茄紫",
    primary: "#611f69",
    primaryDark: "#4A1850",
    primaryLight: "#7E3B85",
    primaryHover: "rgba(97, 31, 105, 0.12)",
    primaryPressed: "rgba(97, 31, 105, 0.18)",
    primaryActive: "rgba(97, 31, 105, 0.1)",
    oklchPrimary: "oklch(0.35 0.12 320)",
    oklchAccent: "oklch(0.39 0.13 320)",
    hue: 320,
  },
  linearPurple: {
    name: "Linear 紫色",
    primary: "#5E6AD2",
    primaryDark: "#4854B8",
    primaryLight: "#7B85E0",
    primaryHover: "rgba(94, 106, 210, 0.12)",
    primaryPressed: "rgba(94, 106, 210, 0.18)",
    primaryActive: "rgba(94, 106, 210, 0.1)",
    oklchPrimary: "oklch(0.54 0.16 270)",
    oklchAccent: "oklch(0.58 0.17 270)",
    hue: 270,
  },
}

interface HeaderProps {
  onResetData?: () => void
  isTreeCollapsed?: boolean
  currentPath?: string
  selectedNodeName?: string | null
  /** 树形结构数据（用于AI助手保存向导选择专业） */
  treeData?: import("@/types").TreeNode | null
}

interface Notification {
  id: string
  title: string
  content: string
  time: string
  read: boolean
}

// Mock消息数据
const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "系统通知",
    content: "您有新的课程评分待审核",
    time: "5分钟前",
    read: false,
  },
  {
    id: "2",
    title: "资源更新",
    content: "《数据结构》课程资源已更新",
    time: "1小时前",
    read: false,
  },
  {
    id: "3",
    title: "评分提醒",
    content: "专业评分已完成，请查看",
    time: "2小时前",
    read: true,
  },
  {
    id: "4",
    title: "系统维护",
    content: "系统将于今晚22:00进行维护",
    time: "昨天",
    read: true,
  },
]

export function Header({ currentPath, treeData }: HeaderProps) {
  const router = useRouter()
  const { can } = usePermission()
  const [courseDevDrawerOpen, setCourseDevDrawerOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<keyof typeof COLOR_THEMES>("vercelBlue")
  const [userName, setUserName] = useState<string>("用户")
  const [aiInitialCanvasData, setAiInitialCanvasData] = useState<InitialCanvasData | null>(null)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [resetPasswordValue, setResetPasswordValue] = useState("")
  const [confirmResetPasswordValue, setConfirmResetPasswordValue] = useState("")
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [isResetPasswordLoading, setIsResetPasswordLoading] = useState(false)
  const [identitySwitchDialogOpen, setIdentitySwitchDialogOpen] = useState(false)
  useActivePageTracker()

  // [MOD] 使用全局 loading 状态 (引用计数机制)
  const isAiLoading = useLoadingStore((state) => state.isLoading)
  const startLoading = useLoadingStore((state) => state.startLoading)
  const stopLoading = useLoadingStore((state) => state.stopLoading)

  const [currentSchoolId, setCurrentSchoolId] = useLocalStorage<string | null>("education-current-school", null)
  
  let activeCollegeId = currentSchoolId ? parseInt(currentSchoolId, 10) : null
  let activeCollegeName = "学校"
  if (treeData && treeData.children && activeCollegeId) {
    const collegeNode = treeData.children.find(c => extractNumericId(c.nodeId) === activeCollegeId)
    if (collegeNode) {
      activeCollegeName = collegeNode.nodeName || "学校"
    }
  }

  // 课程详情页注册的画布数据准备回调（带缓存复用）
  const prepareCanvasData = useAiCanvasStore((state) => state.prepareCanvasData)
  const prepareOrGetCanvasData = useAiCanvasStore((state) => state.prepareOrGetCanvasData)

  const authUserId = getStoredAuthUser()?.id ?? null
  const avatarText = userName.trim().charAt(0).toUpperCase() || "U"
  const userMenuItemClassName =
    "cursor-pointer hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground data-[highlighted]:bg-primary data-[highlighted]:text-primary-foreground"
  const canManageWorkshop = can(WORKSHOP_MANAGEMENT_ACTION, WORKSHOP_MANAGEMENT_CONTEXT)

  // 处理退出登录
  const handleLogout = () => {
    clearAllAuthData()
    router.push('/login')
  }

  const handleOpenWorkshopManagement = useCallback(() => {
    router.push("/workshop-management")
  }, [router])

  const handleResetPassword = useCallback(async () => {
    if (isResetPasswordLoading) return

    const authUser = getStoredAuthUser()
    if (!authUser?.id) {
      showError("未获取到当前用户信息")
      return
    }

    const nextPassword = resetPasswordValue.trim()
    if (!nextPassword) {
      showWarning("请输入新密码")
      return
    }
    if (nextPassword.length < 6) {
      showWarning("新密码长度不能少于6位")
      return
    }
    if (!confirmResetPasswordValue.trim()) {
      showWarning("请再次输入新密码")
      return
    }
    if (nextPassword !== confirmResetPasswordValue.trim()) {
      showWarning("两次输入的密码不一致")
      return
    }

    setIsResetPasswordLoading(true)
    try {
      const response = await api.users.resetPassword({
        id: authUser.id,
        password: nextPassword,
      })

      if (response.error) {
        console.error("[Header] reset password failed:", response.error)
        showError("重置密码失败，请稍后重试")
        return
      }

      showSuccess("密码重置成功")
      setResetPasswordDialogOpen(false)
      setResetPasswordValue("")
      setConfirmResetPasswordValue("")
      setShowResetPassword(false)
    } finally {
      setIsResetPasswordLoading(false)
    }
  }, [confirmResetPasswordValue, isResetPasswordLoading, resetPasswordValue])

  useEffect(() => {
    // 从认证系统获取用户信息
    const authUser = getStoredAuthUser()
    if (authUser && authUser.userName) {
      setUserName(authUser.userName)
    }
  }, [])

  useEffect(() => {
    const loadTheme = async () => {
      const response = await api.config.getTheme()
      if (response.data && response.data.colorTheme) {
        const savedTheme = response.data.colorTheme as keyof typeof COLOR_THEMES
        if (COLOR_THEMES[savedTheme]) {
          setCurrentTheme(savedTheme)
          applyTheme(savedTheme)
        }
      }
    }
    loadTheme()
  }, [])

  // [MOD] 点击 AI 按钮：先打开 Drawer，再异步加载画布数据，避免阻塞打开动画
  const handleAiButtonClick = useCallback(async () => {
    if (isAiLoading) return
    const hasCourseCanvasProvider = !!prepareCanvasData
    setAiInitialCanvasData(hasCourseCanvasProvider ? EMPTY_INITIAL_CANVAS_DATA : null)
    setCourseDevDrawerOpen(true)

    if (!hasCourseCanvasProvider) {
      return
    }

    startLoading()

    try {
      const canvasData = await prepareOrGetCanvasData()
      if (canvasData) {
        setAiInitialCanvasData(canvasData)
      } else {
        setCourseDevDrawerOpen(false)
        showWarning("请联系专业管理员为当前课程设置毕业要求支撑关系")
      }
    } catch (error) {
      console.error("[Header] 准备课程画布数据失败:", error)
      setAiInitialCanvasData(null)
    } finally {
      stopLoading()
    }
  }, [isAiLoading, prepareCanvasData, prepareOrGetCanvasData, startLoading, stopLoading])

  const applyTheme = async (themeKey: keyof typeof COLOR_THEMES) => {
    const theme = COLOR_THEMES[themeKey]
    const root = document.documentElement

    // Update CSS custom properties
    root.style.setProperty("--naive-primary", theme.primary)
    root.style.setProperty("--naive-primary-dark", theme.primaryDark)
    root.style.setProperty("--naive-primary-light", theme.primaryLight)
    root.style.setProperty("--naive-primary-hover", theme.primaryHover)
    root.style.setProperty("--naive-primary-pressed", theme.primaryPressed)
    root.style.setProperty("--naive-primary-active", theme.primaryActive)
    root.style.setProperty("--primary", theme.oklchPrimary)
    root.style.setProperty("--accent", theme.oklchAccent)
    root.style.setProperty("--ring", theme.oklchPrimary)

    // Update chart colors with theme hue
    root.style.setProperty("--chart-1", `oklch(0.58 0.2 ${theme.hue})`)
    root.style.setProperty("--chart-2", `oklch(0.62 0.21 ${theme.hue})`)
    root.style.setProperty("--chart-3", `oklch(0.54 0.19 ${theme.hue})`)
    root.style.setProperty("--chart-4", `oklch(0.5 0.18 ${theme.hue})`)
    root.style.setProperty("--chart-5", `oklch(0.66 0.22 ${theme.hue})`)

    // Save to localStorage
    await api.config.setTheme(themeKey)
    setCurrentTheme(themeKey)
  }

  return (
    <header className="relative mb-6" data-current-path={currentPath ?? undefined}>
      <div className="flex items-center justify-between h-16 w-full px-6 rounded-2xl bg-white/40 backdrop-blur-md border border-primary/20 shadow-lg">
        {/* Left side - Welcome text */}
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold text-foreground">欢迎使用高校课程通</h1>
        </div>

        {/* Right side - User info and search */}
        <div className="flex items-center gap-4">
          {/* Semester Management */}
          {activeCollegeId ? (
            <div className="flex items-center gap-4">
              <SemesterManagement collegeId={activeCollegeId} collegeName={activeCollegeName} />
            </div>
          ) : null}

          {/* Color Palette */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                <Palette className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-md border-primary/20">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">选择主题色</div>
              <DropdownMenuSeparator />
              {Object.entries(COLOR_THEMES).map(([key, theme]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => applyTheme(key as keyof typeof COLOR_THEMES)}
                  className={cn(
                    "cursor-pointer flex items-center gap-3 py-2.5",
                    currentTheme === key ? "bg-primary/10" : "hover:bg-primary/5",
                  )}
                >
                  <div
                    className="w-6 h-6 rounded border-2 border-white shadow-sm"
                    style={{ backgroundColor: theme.primary }}
                  />
                  <span className="text-sm">{theme.name}</span>
                  {currentTheme === key && <div className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Avatar */}
          <Avatar className="h-9 w-9 border-2 border-primary/30">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {avatarText}
            </AvatarFallback>
          </Avatar>

          {/* User Name and Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="group flex items-center gap-2 text-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                <span className="text-sm font-medium">{userName}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white/95 backdrop-blur-md border-primary/20">
              <DropdownMenuItem className={userMenuItemClassName} onClick={() => setIdentitySwitchDialogOpen(true)}>
                切换身份
              </DropdownMenuItem>
              {canManageWorkshop && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className={userMenuItemClassName} onClick={handleOpenWorkshopManagement}>
                    工作坊管理
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className={cn("text-orange-600", userMenuItemClassName)} onClick={() => setResetPasswordDialogOpen(true)}>
                重置密码
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={cn("text-red-600", userMenuItemClassName)}
                onClick={handleLogout}
              >
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 课程开发助手入口 */}
          <Button
            variant="ghost"
            onClick={handleAiButtonClick}
            className="p-3 hover:bg-transparent group"
            disabled={isAiLoading}
          >
            <Image
              src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAqCAMAAAAqEZ1jAAAAAXNSR0IArs4c6QAAAAlwSFlzAAAhOAAAITgBRZYxYAAAAKJQTFRFAAAAenb/RpP/k2j/XXf7cXX6P5z7i2n8W3j7ZHP7jmn9VID7Qpf8jWn8Xnr6iWr8YHb7i2n8RJb9dWz8WXr8mWj9RpP8W3n8bW/8l2j+QJz9Q5f9ToT8fWv9ZW/8lWj9VID8YnX7Pp79QZr9pWb+RJT8m2f9k2j9SYz8jWn9hmr8UIT8fmv8VX78Xnn7d2z8ZHT7WHr7bm77Xnb7Z3D7YHH7RJOQRAAAACJ0Uk5TABAgICAwQEBAWF5gZXBwgICbn5+fo7+/vsLP39/f3urv73XwOA8AAAKfSURBVHja7dbJcuIwFIXhIzCxMTMNcdwMDoMZY4NxeP9X66srEckYQlPVvcvPBhZ8dVSIAvz03xNV/Luq4Xq9Hgo8nfDqjXq97hS1yXZNhXg2Z3o+f1KnLqx62y17Pp5smp+158EUaW6I52rkxLF3eoNpt1Ne+bR+Fd8U5Oc8Px6P5M0Evgq11ytpy0jgbk6e5cSxd2pb7yKOikpTouWyhbsNMsnpefZpOzsCI7c8brkM74/LqFSC7HkwVTu9lsB14ZJy745LlDdV5+3iQTXC7s9z3pNEggOh9s3woOFqJT2BmzUSLnMQEEeeh2+rkraiOrjZeL+XXEBwyp71Ybg+hWL+iltGt8ftKQI9QMzSlDxz9VofssIMdxitdJEvbo3jxqAGKXtt6N4OkpvgkmiFa50Ch1UU8zab/Ya4Br/IUnnewHCHg+FEh7/ExUIXdq+KG4N7z3hfzXDkaa5FmGpdMENrYWWjaoDrJtJLu4ajFFfbUduryN1ue4brb2KpjSvgvETe53R24U6Ggz+RYJnsCTMujmMJ9qELErkv9y7cyXAGtNCoI2Dqx9ymAl1bcYMLJ2NO5fZ2dmHLxiBGrJlxEAl7M1HkTFUzseeiWHOxYK+CrwLltRX3qTk7/4PbTXDdaBHLxytMdcllaaA56U1RSEyU56M0jotfYBLvynM091ni0GGtPO73nLkR7AaK6yqOKnG1g+wXrnqZz9nrw87bszdjjn/dDGffbgdX9YmT4HykaoLTp/UABGfyypx7a1yFNb0wpl7BddW8geSO5JU5TE63xhmOPb2uok8reN1Nrn4qjQNBlmfdvkB5beaoMgdP4LpFgbNuX3svtSwABoZ7WPOKa0Inxgl7DurMdfFXVV7savjK8WQ1/cz5+Q9e7A/jUZeiPQO0fwAAAABJRU5ErkJggg=="
              alt="课程开发助手"
              width={48}
              height={48}
              unoptimized
              className="object-contain transition-transform duration-200 group-hover:scale-[1.5]"
            />
          </Button>
        </div>
      </div>
      <AiAssistantDrawer
        open={courseDevDrawerOpen}
        onOpenChange={(open) => {
          setCourseDevDrawerOpen(open)
          if (!open) {
            stopLoading()
            setAiInitialCanvasData(null)
          }
        }}
        userName={userName}
        treeData={treeData}
        initialCanvasData={aiInitialCanvasData}
      />

      <IdentitySwitchDialog
        open={identitySwitchDialogOpen}
        onOpenChange={setIdentitySwitchDialogOpen}
        userId={authUserId}
        onSchoolChange={setCurrentSchoolId}
      />

      <AlertDialog
        open={resetPasswordDialogOpen}
        onOpenChange={(open) => {
          setResetPasswordDialogOpen(open)
          if (!open) {
            setResetPasswordValue("")
            setConfirmResetPasswordValue("")
            setShowResetPassword(false)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认重置密码</AlertDialogTitle>
            <AlertDialogDescription>
              请输入新密码，确认后将为当前登录用户执行重置。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Input
                type={showResetPassword ? "text" : "password"}
                placeholder="请输入新密码（至少6位）"
                value={resetPasswordValue}
                onChange={(event) => setResetPasswordValue(event.target.value)}
                disabled={isResetPasswordLoading}
                autoFocus
                className="pr-20"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowResetPassword((prev) => !prev)}
                disabled={isResetPasswordLoading}
              >
                <span className="inline-flex items-center gap-1">
                  {showResetPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showResetPassword ? "隐藏" : "显示"}
                </span>
              </button>
            </div>

            <div className="relative">
              <Input
                type={showResetPassword ? "text" : "password"}
                placeholder="请再次输入新密码"
                value={confirmResetPasswordValue}
                onChange={(event) => setConfirmResetPasswordValue(event.target.value)}
                disabled={isResetPasswordLoading}
                className="pr-4"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetPasswordLoading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleResetPassword()
              }}
              disabled={isResetPasswordLoading}
            >
              {isResetPasswordLoading ? "重置中..." : "确认重置"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}
