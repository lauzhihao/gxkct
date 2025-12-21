import type React from "react"
import type { Metadata } from "next"
// import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Toaster } from "@/shared/components/ui/toaster"

export const metadata: Metadata = {
  title: "高校课程通",
  description: "Created with v0",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        {children}
        {/* <Analytics /> */}
        <Toaster />
      </body>
    </html>
  )
}
