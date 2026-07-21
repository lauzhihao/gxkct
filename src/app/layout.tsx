import type React from "react"
import type { Metadata } from "next"
import { Noto_Sans_SC } from "next/font/google"
// import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Toaster } from "@/shared/components/ui/toaster"
import { GlobalLoadingCursor } from "@/shared/components/ui/global-loading-cursor"

const notoSansScFont = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "optional",
  preload: true,
  variable: "--font-noto-sans-sc",
  fallback: ["PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", "DengXian", "sans-serif"],
})

export const metadata: Metadata = {
  title: "高校课程通",
  description: "Created with v0",
  generator: "v0.app",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSansScFont.variable} font-sans antialiased`}>
        {children}
        {/* <Analytics /> */}
        <Toaster />
        <GlobalLoadingCursor />
      </body>
    </html>
  )
}
