"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useReactFlow, type OnConnectEnd } from "@xyflow/react"
import type { ConnectionMenuState, ConnectionMenuOption } from "./connection-menu"

/**
 * useConnectionMenu Hook 配置参数
 */
export interface UseConnectionMenuOptions {
  // 连接菜单选择回调（包含画布坐标位置）
  onConnectionMenuSelect?: (option: ConnectionMenuOption, sourceNodeId: string | null, position?: { x: number; y: number }) => void
}

/**
 * 连接菜单管理 Hook
 * 管理连接菜单的状态和处理逻辑
 */
export function useConnectionMenu(options: UseConnectionMenuOptions) {
  const { onConnectionMenuSelect } = options
  const { screenToFlowPosition } = useReactFlow()
  const containerRef = useRef<HTMLDivElement>(null)

  // 连接菜单状态
  const [connectionMenu, setConnectionMenu] = useState<ConnectionMenuState>({
    visible: false,
    x: 0,
    y: 0,
    sourceNodeId: null,
    sourceHandle: null,
  })

  // 处理连接结束事件（连线松开时）
  const handleConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      // 只在连接未完成时显示菜单（即松开时没有连接到目标节点）
      if (!connectionState.isValid) {
        const mouseEvent = event as MouseEvent
        // 获取容器的位置
        const containerRect = containerRef.current?.getBoundingClientRect()
        if (containerRect) {
          setConnectionMenu({
            visible: true,
            x: mouseEvent.clientX - containerRect.left,
            y: mouseEvent.clientY - containerRect.top,
            sourceNodeId: connectionState.fromNode?.id || null,
            sourceHandle: connectionState.fromHandle?.id || null,
          })
        }
      }
    },
    []
  )

  // 处理菜单选择
  const handleMenuSelect = useCallback(
    (option: ConnectionMenuOption) => {
      // 将菜单的屏幕坐标转换为画布坐标
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (containerRect) {
        const screenX = containerRect.left + connectionMenu.x
        const screenY = containerRect.top + connectionMenu.y
        const flowPosition = screenToFlowPosition({ x: screenX, y: screenY })
        onConnectionMenuSelect?.(option, connectionMenu.sourceNodeId, flowPosition)
      } else {
        onConnectionMenuSelect?.(option, connectionMenu.sourceNodeId)
      }
      setConnectionMenu((prev) => ({ ...prev, visible: false }))
    },
    [onConnectionMenuSelect, connectionMenu.sourceNodeId, connectionMenu.x, connectionMenu.y, screenToFlowPosition]
  )

  // 关闭菜单
  const closeMenu = useCallback(() => {
    setConnectionMenu((prev) => ({ ...prev, visible: false }))
  }, [])

  // 点击画布其他区域关闭菜单
  useEffect(() => {
    const handleClickOutside = () => {
      if (connectionMenu.visible) {
        closeMenu()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [connectionMenu.visible, closeMenu])

  return {
    containerRef,
    connectionMenu,
    setConnectionMenu,
    handleConnectEnd,
    handleMenuSelect,
    closeMenu,
  }
}
