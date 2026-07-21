import { toast } from "sonner"
import type { BackendResponse, ApiResponse } from "./types"
import { clearAllAuthData } from "./auth-config"

/**
 * 统一处理后端响应
 * code为"0"表示成功，其他值表示失败
 * 失败时使用系统message组件显示错误信息
 * @param backendResponse 后端响应数据
 * @param showErrorToast 是否显示错误提示，默认为true
 */
export function handleBackendResponse<T>(
  backendResponse: BackendResponse<T>,
  showErrorToast?: boolean
): ApiResponse<T> {
  const { code, message, data } = backendResponse

  const forceLogoutWithMessage = (defaultMessage: string): ApiResponse<T> => {
    const finalMessage = message || defaultMessage
    if (showErrorToast !== false) {
      toast.error(finalMessage)
    }
    clearAllAuthData()
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname
      const isLoginPage = currentPath === "/login"
      if (!isLoginPage) {
        window.location.href = "/login"
      }
    }
    return {
      data: null as T,
      error: finalMessage,
      status: 401,
    }
  }

  // code为"0"表示成功
  if (code === "0") {
    return {
      data,
      error: null,
      status: 200,
    }
  }

  // 账号被禁用：code "20019"，提示并强制退出登录
  if (code === "20019") {
    return forceLogoutWithMessage("账号已被禁用，请联系管理员")
  }

  // TOKEN 失效处理：code "20024" 表示 TOKEN 解析失败，强制跳转登录页
  if (code === "20024") {
    return forceLogoutWithMessage("TOKEN已失效，请重新登录")
  }

  // code非"0"表示失败，根据参数决定是否显示错误消息
  if (showErrorToast && message) {
    toast.error(message)
  }

  return {
    data: null as T,
    error: message || "请求失败",
    status: parseInt(code) || 500,
  }
}

/**
 * 模拟后端响应格式
 * 将内部数据包装成后端响应格式
 */
export function createSuccessResponse<T>(data: T): BackendResponse<T> {
  return {
    code: "0",
    message: "success",
    data,
    success: true,
  }
}

/**
 * 创建错误响应
 */
export function createErrorResponse(message: string, code: string = "500"): BackendResponse<null> {
  return {
    code,
    message,
    data: null,
    success: false,
  }
}
