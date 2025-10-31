"use client"

import { useToast } from "@/hooks/use-toast"
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  const getIcon = (variant?: string) => {
    switch (variant) {
      case "destructive":
        return <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
      case "info":
        return <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
      default:
        return null
    }
  }

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => (
        <Toast key={id} variant={variant} {...props}>
          <div className="flex items-start gap-3 flex-1">
            {getIcon(variant)}
            <div className="grid gap-1 flex-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
