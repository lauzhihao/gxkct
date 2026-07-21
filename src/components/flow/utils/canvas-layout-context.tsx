"use client"

import { createContext, useContext } from "react"
import type { ReactNode } from "react"
import type { CanvasLayoutMode } from "./canvas-layout"

const CanvasLayoutContext = createContext<CanvasLayoutMode>("horizontal")

export function CanvasLayoutProvider({
  layoutMode,
  children,
}: {
  layoutMode: CanvasLayoutMode
  children: ReactNode
}) {
  return (
    <CanvasLayoutContext.Provider value={layoutMode}>
      {children}
    </CanvasLayoutContext.Provider>
  )
}

export function useCanvasLayoutMode(): CanvasLayoutMode {
  return useContext(CanvasLayoutContext)
}
