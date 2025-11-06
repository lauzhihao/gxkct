import { toast } from "sonner"
import type { BackendResponse, ApiResponse } from "./types"

/**
 * 统一处理后端响应
 * code为"0"表示成功，其他值表示失败
 * 失败时使用系统message组件显示错误信息
 * @param backendResponse 后端响应数据
 * @param showErrorToast 是否显示错误提示，默认为true
 */
export function handleBackendResponse<T>(
  backendResponse: BackendResponse<T>,
  showErrorToast: boolean = true
): ApiResponse<T> {
  const { code, message, data } = backendResponse

  // code为"0"表示成功
  if (code === "0") {
    return {
      data,
      error: null,
      status: 200,
    }
  }

  // code非"0"表示失败，根据参数决定是否显示错误消息
  if (showErrorToast && message) {
    toast.error(message)
  }

  return {
    data: null,
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

