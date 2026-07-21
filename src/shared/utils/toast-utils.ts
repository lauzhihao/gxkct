import { toast } from "@/shared/hooks/use-toast"

const DEFAULT_TOAST_DURATION = 3000
const ERROR_TOAST_DURATION = 5000

/**
 * Common toast utility functions for the entire system
 * Provides consistent error, success, warning, and info notifications
 */

export const showError = (message: string, title = "错误") => {
  toast({
    variant: "destructive",
    title,
    description: message,
    duration: ERROR_TOAST_DURATION,
  })
}

export const showSuccess = (message: string, title = "成功") => {
  toast({
    title,
    description: message,
    duration: DEFAULT_TOAST_DURATION,
  })
}

export const showWarning = (message: string, title = "警告") => {
  toast({
    title,
    description: message,
    duration: DEFAULT_TOAST_DURATION,
  })
}

export const showInfo = (message: string, title = "提示") => {
  toast({
    title,
    description: message,
    duration: DEFAULT_TOAST_DURATION,
  })
}
