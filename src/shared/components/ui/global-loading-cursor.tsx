'use client'

/**
 * GlobalLoadingCursor - 全局 Loading 鼠标跟随特效组件
 *
 * 功能:
 * - 监听全局 isLoading 状态
 * - 当 isLoading === true 时，在鼠标右下角显示旋转 loading 图标
 * - 图标跟随鼠标移动
 *
 * 技术实现:
 * - 使用 Zustand 响应式订阅 isLoading 状态
 * - 使用原生 DOM 操作确保实时跟随
 */
import { useEffect } from 'react'
import { useLoadingStore } from '@/shared/stores/loading-store'

// Loading 图标相对鼠标的偏移量
const CURSOR_OFFSET = 12

export function GlobalLoadingCursor() {
  useEffect(() => {
    // 防止重复创建
    const existingEl = document.getElementById('global-loading-cursor')
    if (existingEl) {
      existingEl.remove()
    }

    // 创建 DOM 元素，使用 transform 定位（性能更好）
    const container = document.createElement('div')
    container.id = 'global-loading-cursor'
    container.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      pointer-events: none;
      z-index: 9999;
      display: none;
      will-change: transform;
    `
    // 使用内联 style 确保动画生效
    container.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
           style="animation: globalLoadingSpin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-opacity="0.25" fill="none"/>
        <path d="M12 2C6.477 2 2 6.477 2 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
      </svg>
      <style>
        @keyframes globalLoadingSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      </style>
    `
    document.body.appendChild(container)

    // 使用 pointermove 替代 mousemove（更现代、更可靠）
    const handlePointerMove = (event: PointerEvent) => {
      const x = event.clientX + CURSOR_OFFSET
      const y = event.clientY + CURSOR_OFFSET
      container.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }

    // 订阅 Zustand store - 直接更新 DOM
    const unsubscribe = useLoadingStore.subscribe((state) => {
      container.style.display = state.isLoading ? 'block' : 'none'
    })

    // 使用 document + pointermove，避免 Next.js dev 环境的潜在问题
    document.addEventListener('pointermove', handlePointerMove, { passive: true })

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      unsubscribe()
      container.remove()
    }
  }, [])

  // 不渲染任何 React 元素，完全由原生 DOM 控制
  return null
}

export default GlobalLoadingCursor
