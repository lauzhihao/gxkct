"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group"
import { RichTextEditor } from "@/shared/components/ui/rich-text-editor"
import { showError, showSuccess, showWarning } from "@/shared/utils/toast-utils"
import { api, getStoredAuthUser } from "@/lib/api"
import { canvasApi } from "@/lib/api/canvas-api"
import { isRichTextEmpty } from "@/shared/utils/rich-text"
import { extractNumericId } from "@/shared/utils/utils"
import type { TreeNode } from "@/types"

export interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 当前学校树（root → university → department → major → course） */
  treeData?: TreeNode | null
  /** 当前学校 ID（用于在 root 下定位活动学校） */
  currentSchoolId?: number | null
}

type FeedbackType = "system_error" | "optimization"

const FEEDBACK_TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: "system_error", label: "系统错误" },
  { value: "optimization", label: "优化建议" },
]

/** 简单 UUID 生成（用于反馈 unique_code） */
function generateUniqueCode(prefix: string): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}_${timestamp}_${random}`
}

function getActiveCollegeNode(
  treeData: TreeNode | null | undefined,
  currentSchoolId: number | null | undefined,
): TreeNode | null {
  if (!treeData || !treeData.children || !currentSchoolId) return null
  return (
    treeData.children.find(
      (child) => extractNumericId(child.nodeId) === currentSchoolId,
    ) ?? null
  )
}

export function FeedbackDialog({
  open,
  onOpenChange,
  treeData,
  currentSchoolId,
}: FeedbackDialogProps) {
  const authUser = getStoredAuthUser()
  const account = authUser?.email ?? "-"
  const userName = authUser?.userName ?? "-"

  // 表单状态
  const [departmentNodeId, setDepartmentNodeId] = useState<string>("")
  const [majorNodeId, setMajorNodeId] = useState<string>("")
  const [courseNodeId, setCourseNodeId] = useState<string>("")
  const [feedbackType, setFeedbackType] = useState<FeedbackType | "">("")
  const [description, setDescription] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  // 树形数据
  const collegeNode = useMemo(
    () => getActiveCollegeNode(treeData, currentSchoolId),
    [treeData, currentSchoolId],
  )

  const departmentOptions = useMemo(() => {
    return collegeNode?.children?.filter((c) => c.nodeType === "department") ?? []
  }, [collegeNode])

  const majorOptions = useMemo(() => {
    if (!departmentNodeId) return []
    const dept = departmentOptions.find((d) => d.nodeId === departmentNodeId)
    return dept?.children?.filter((c) => c.nodeType === "major") ?? []
  }, [departmentOptions, departmentNodeId])

  const courseOptions = useMemo(() => {
    if (!majorNodeId) return []
    const major = majorOptions.find((m) => m.nodeId === majorNodeId)
    return major?.children?.filter((c) => c.nodeType === "course") ?? []
  }, [majorOptions, majorNodeId])

  const resetForm = useCallback(() => {
    setDepartmentNodeId("")
    setMajorNodeId("")
    setCourseNodeId("")
    setFeedbackType("")
    setDescription("")
  }, [])

  useEffect(() => {
    if (!open) resetForm()
  }, [open, resetForm])

  const handleDepartmentChange = (value: string) => {
    setDepartmentNodeId(value)
    setMajorNodeId("")
    setCourseNodeId("")
  }
  const handleMajorChange = (value: string) => {
    setMajorNodeId(value)
    setCourseNodeId("")
  }

  /**
   * 富文本图片上传：调用 OSS presign → PUT 上传 → 返回可访问 URL
   * RichTextEditor 内部会把返回的 URL 作为 <img src> 嵌入到 description HTML 中
   */
  const uploadFeedbackRichTextImage = useCallback(
    async (file: File): Promise<string> => {
      if (!file.type.startsWith("image/")) {
        throw new Error("仅支持上传图片文件")
      }
      const trimmedMimeType = file.type.trim()
      if (trimmedMimeType.length === 0) {
        throw new Error("图片 MIME type 缺失，无法上传")
      }

      const now = new Date()
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
      const timestamp = Date.now()
      const rawFileName =
        file.name.trim().length > 0 ? file.name : `feedback-image-${timestamp}.png`
      const safeFileName = rawFileName.replace(/[^a-zA-Z0-9._一-龥-]/g, "_")
      const fileName = `gxkct/feedback_rich_text_images/${dateStr}/${timestamp}_${safeFileName}`

      const presignResponse = await canvasApi.getPresignUrl({
        fileName,
        mimeType: trimmedMimeType,
        size: file.size,
      })

      if (presignResponse.error || !presignResponse.data) {
        throw new Error(presignResponse.error || "获取图片上传签名失败")
      }

      const responseData = presignResponse.data as unknown as Record<string, unknown>
      const uploadUrl =
        typeof responseData.uploadUrl === "string"
          ? responseData.uploadUrl
          : typeof responseData.url === "string"
            ? responseData.url
            : ""
      const ossKey =
        typeof responseData.ossKey === "string"
          ? responseData.ossKey
          : typeof responseData.uploadPath === "string"
            ? responseData.uploadPath
            : ""
      const uploadHeaders = (() => {
        const rawHeaders =
          "headers" in responseData ? responseData.headers : responseData.uploadHeaders
        if (!rawHeaders || typeof rawHeaders !== "object" || Array.isArray(rawHeaders)) {
          return {}
        }
        return Object.fromEntries(
          Object.entries(rawHeaders).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        )
      })()

      if (uploadUrl.length === 0 || ossKey.length === 0) {
        throw new Error("上传签名响应缺少必要字段")
      }

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": trimmedMimeType,
          ...uploadHeaders,
        },
        body: file,
      })

      if (!uploadResponse.ok) {
        throw new Error(`上传图片失败，HTTP ${uploadResponse.status}`)
      }

      const urlObj = new URL(uploadUrl)
      return `${urlObj.origin}/${ossKey}`
    },
    [],
  )

  const handleSubmit = async () => {
    if (submitting) return

    if (!feedbackType) {
      showWarning("请选择问题类型")
      return
    }
    if (isRichTextEmpty(description)) {
      showWarning("请填写问题描述")
      return
    }

    setSubmitting(true)
    try {
      const departmentId = departmentNodeId
        ? extractNumericId(departmentNodeId)
        : null
      const majorId = majorNodeId ? extractNumericId(majorNodeId) : null
      const courseId = courseNodeId ? extractNumericId(courseNodeId) : null

      const response = await api.message.submitFeedback({
        unique: generateUniqueCode("fb"),
        departmentId,
        majorId,
        courseId,
        feedbackType,
        description,
      })

      if (response.error) {
        showError(response.error || "提交反馈失败")
        return
      }

      showSuccess("反馈已提交，感谢您的支持")
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto"
        onInteractOutside={(e) => {
          if (submitting) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>问题反馈</DialogTitle>
          <DialogDescription>
            您的反馈将帮助我们持续改进系统。带 * 字段为必填项；可在描述中直接粘贴或拖入截图。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* 用户信息（只读） */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">账号</Label>
              <Input value={account} readOnly disabled className="bg-muted/40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">姓名</Label>
              <Input value={userName} readOnly disabled className="bg-muted/40" />
            </div>
          </div>

          {/* 院系/专业/课程 三级级联 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">院系（选填）</Label>
              <Select
                value={departmentNodeId}
                onValueChange={handleDepartmentChange}
                disabled={departmentOptions.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择院系" />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((d) => (
                    <SelectItem key={d.nodeId} value={d.nodeId}>
                      {d.nodeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">专业（选填）</Label>
              <Select
                value={majorNodeId}
                onValueChange={handleMajorChange}
                disabled={!departmentNodeId || majorOptions.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择专业" />
                </SelectTrigger>
                <SelectContent>
                  {majorOptions.map((m) => (
                    <SelectItem key={m.nodeId} value={m.nodeId}>
                      {m.nodeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">课程（选填）</Label>
              <Select
                value={courseNodeId}
                onValueChange={setCourseNodeId}
                disabled={!majorNodeId || courseOptions.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择课程" />
                </SelectTrigger>
                <SelectContent>
                  {courseOptions.map((c) => (
                    <SelectItem key={c.nodeId} value={c.nodeId}>
                      {c.nodeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 问题类型 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              问题类型<span className="text-destructive ml-0.5">*</span>
            </Label>
            <RadioGroup
              value={feedbackType}
              onValueChange={(v) => setFeedbackType(v as FeedbackType)}
              className="flex gap-6"
            >
              {FEEDBACK_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <RadioGroupItem value={opt.value} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* 描述（富文本，支持图片粘贴/拖入） */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              问题描述<span className="text-destructive ml-0.5">*</span>
            </Label>
            <div className="rounded-md border">
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="请详细描述您遇到的问题或建议，可粘贴或拖入截图..."
                onPasteImageUpload={uploadFeedbackRichTextImage}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                提交中...
              </>
            ) : (
              "提交反馈"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
