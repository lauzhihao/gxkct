import { toast } from "@/hooks/use-toast"

/**
 * Common toast utility functions for the entire system
 * Provides consistent error, success, warning, and info notifications
 */

export const showError = (message: string, title = "错误") => {
  toast({
    variant: "destructive",
    title,
    description: message,
  })
}

export const showSuccess = (message: string, title = "成功") => {
  toast({
    title,
    description: message,
  })
}

export const showWarning = (message: string, title = "警告") => {
  toast({
    title,
    description: message,
  })
}

export const showInfo = (message: string, title = "提示") => {
  toast({
    title,
    description: message,
  })
}
