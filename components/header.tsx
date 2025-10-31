"use client"

import { useState, useEffect } from "react"
import { Search, ChevronDown, User, X, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

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
}

export function Header({ onResetData }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<keyof typeof COLOR_THEMES>("vercelBlue")

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [searchOpen])

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
    <header className="relative mb-6">
      <div className="flex items-center justify-between h-16 px-6 rounded-2xl bg-white/40 backdrop-blur-md border border-primary/20 shadow-lg">
        {/* Left side - Welcome text */}
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-foreground">欢迎使用高校课程通</h1>
        </div>

        {/* Right side - User info and search */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-primary/10 transition-colors">
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
            <AvatarImage src="/diverse-user-avatars.png" alt="用户头像" />
            <AvatarFallback className="bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>

          {/* User Name and Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 hover:bg-primary/10 transition-colors">
                <span className="text-sm font-medium">张老师</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white/95 backdrop-blur-md border-primary/20">
              <DropdownMenuItem className="cursor-pointer hover:bg-primary/10">个人信息</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-primary/10">系统设置</DropdownMenuItem>
              <DropdownMenuSeparator />
              {onResetData && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-primary/10 text-orange-600"
                    onClick={onResetData}
                  >
                    重置数据
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem className="cursor-pointer hover:bg-primary/10 text-red-600">退出登录</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search Icon */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(!searchOpen)}
            className="hover:bg-primary/10 transition-colors"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Slide-out Search Box */}
      <div
        className={cn(
          "absolute top-0 right-0 h-16 transition-all duration-300 ease-in-out overflow-hidden",
          searchOpen ? "w-[480px]" : "w-0",
        )}
      >
        <div className="h-full px-6 rounded-2xl bg-white/40 backdrop-blur-md border border-primary/20 shadow-lg flex items-center gap-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索课程、专业、院系..."
            className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus={searchOpen}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(false)}
            className="hover:bg-primary/10 transition-colors h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
