/**
 * 表单头部组件
 * 包含标题和操作按钮
 */

import { ArrowLeft, X, Check } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Spinner } from "@/shared/components/ui/spinner"

interface FormHeaderProps {
  isEditMode: boolean
  isLoading: boolean
  autoSaveStatus: "" | "saving" | "saved" | "failed"
  onCancel: () => void
  onSubmit: () => void
}

export function FormHeader({ isEditMode, isLoading, autoSaveStatus, onCancel, onSubmit }: FormHeaderProps) {
  const handleSubmit = () => {
    onSubmit()
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} className="gap-2 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>
        <h2 className="text-xl font-bold text-foreground">{isEditMode ? "编辑专业" : "新增专业"}</h2>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
          className="gap-2 bg-transparent"
          disabled={isLoading || autoSaveStatus === "saving" || autoSaveStatus === "saved"}
        >
          <X className="w-4 h-4" />
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          className="gap-2"
          disabled={isLoading || autoSaveStatus === "saving" || autoSaveStatus === "saved"}
          variant={autoSaveStatus === "saved" ? "default" : autoSaveStatus === "failed" ? "destructive" : "default"}
        >
          {isLoading ? (
            <>
              <Spinner className="w-4 h-4" />
              保存中
            </>
          ) : autoSaveStatus === "saving" ? (
            <>
              <Spinner className="w-4 h-4" />
              自动保存中
            </>
          ) : autoSaveStatus === "saved" ? (
            <>
              <Check className="w-4 h-4" />
              已保存
            </>
          ) : autoSaveStatus === "failed" ? (
            <>
              <X className="w-4 h-4" />
              保存失败
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              保存
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
