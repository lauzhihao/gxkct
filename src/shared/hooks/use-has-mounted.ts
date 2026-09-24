import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

/**
 * 服务端渲染与水合阶段返回 false，挂载后返回 true。
 * 依赖 localStorage 的界面（权限、学期上下文）用它延后到挂载后再渲染，避免水合不一致。
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
