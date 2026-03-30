"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ChangeEvent } from "react"
import Image from "next/image"
import { CheckCircle2, Image as ImageIcon, Loader2, Plus, Trash2, Upload } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { useToast } from "@/shared/hooks/use-toast"
import { cn } from "@/shared/utils/utils"
import { workshopApi } from "@/lib/api/workshop-api"
import type { CreateWorkshopPayload, ImportedWorkshopUser, ImportedWorkshopUserGroups } from "@/types/workshop"

interface WorkshopManagementFormProps {
  onWorkshopCreated?: () => Promise<boolean> | void
  onCancel?: () => void
  showCancelButton?: boolean
  active?: boolean
  className?: string
}

interface DepartmentInput {
  key: string
  name: string
}

interface PreviewRow extends ImportedWorkshopUser {
  group: number
}

function createDepartmentKey(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function WorkshopManagementForm({
  onWorkshopCreated,
  onCancel,
  showCancelButton = true,
  active,
  className,
}: WorkshopManagementFormProps) {
  const { toast } = useToast()
  const bannerInputRef = useRef<HTMLInputElement | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const bannerPreviewRef = useRef("")

  const [workshopName, setWorkshopName] = useState("")
  const [departments, setDepartments] = useState<DepartmentInput[]>([{ key: createDepartmentKey(), name: "" }])
  const [hasValidationAttempt, setHasValidationAttempt] = useState(false)

  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState("")
  const [bannerUrl, setBannerUrl] = useState("")
  const [bannerError, setBannerError] = useState("")

  const [userFileName, setUserFileName] = useState("")
  const [importedGroups, setImportedGroups] = useState<ImportedWorkshopUserGroups>([])
  const [isImporting, setIsImporting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isBannerPreviewOpen, setIsBannerPreviewOpen] = useState(false)

  const resetForm = useCallback(() => {
    setWorkshopName("")
    setDepartments([{ key: createDepartmentKey(), name: "" }])
    setHasValidationAttempt(false)
    setImportedGroups([])
    setUserFileName("")
    setIsImporting(false)
    setIsSubmitting(false)
    setBannerFile(null)
    setBannerUrl("")
    setBannerError("")

    if (bannerPreviewRef.current !== "") {
      URL.revokeObjectURL(bannerPreviewRef.current)
      bannerPreviewRef.current = ""
    }
    setBannerPreview("")

    if (bannerInputRef.current) {
      bannerInputRef.current.value = ""
    }

    if (importInputRef.current) {
      importInputRef.current.value = ""
    }
  }, [])

  useEffect(() => {
    if (active) {
      resetForm()
    }
  }, [active, resetForm])

  useEffect(() => {
    return () => {
      if (bannerPreviewRef.current !== "") {
        URL.revokeObjectURL(bannerPreviewRef.current)
        bannerPreviewRef.current = ""
      }
    }
  }, [])

  const previewRows = useMemo<PreviewRow[]>(() => {
    const rows: PreviewRow[] = []
    importedGroups.forEach((groupUsers, groupIndex) => {
      groupUsers.forEach((user) => {
        rows.push({
          ...user,
          group: groupIndex + 1,
        })
      })
    })
    return rows
  }, [importedGroups])

  const isFormValid = useMemo(() => {
    if (workshopName.trim() === "") {
      return false
    }
    return departments.every((department) => department.name.trim() !== "")
  }, [workshopName, departments])

  const updateDepartmentName = (key: string, value: string) => {
    setDepartments((prev) => prev.map((department) => {
      if (department.key === key) {
        return { ...department, name: value }
      }
      return department
    }))
  }

  const addDepartment = () => {
    if (departments.length >= 5) {
      return
    }
    setDepartments((prev) => [...prev, { key: createDepartmentKey(), name: "" }])
  }

  const removeDepartment = (key: string) => {
    if (departments.length <= 1) {
      return
    }
    setDepartments((prev) => prev.filter((department) => department.key !== key))
  }

  const openBannerPicker = () => {
    bannerInputRef.current?.click()
  }

  const handleBannerChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "文件类型错误",
        description: "请选择图片文件（jpg/png/webp 等）",
        duration: 3000,
      })
      event.target.value = ""
      return
    }

    const fileSizeInMb = file.size / 1024 / 1024
    if (fileSizeInMb > 5) {
      toast({
        variant: "destructive",
        title: "图片过大",
        description: "Banner 图片大小不能超过 5MB",
        duration: 3000,
      })
      event.target.value = ""
      return
    }

    if (bannerPreviewRef.current !== "") {
      URL.revokeObjectURL(bannerPreviewRef.current)
      bannerPreviewRef.current = ""
    }

    const previewUrl = URL.createObjectURL(file)
    setBannerFile(file)
    setBannerUrl("")
    setBannerError("")
    setBannerPreview(previewUrl)
    bannerPreviewRef.current = previewUrl
  }

  const clearBanner = () => {
    if (bannerPreviewRef.current !== "") {
      URL.revokeObjectURL(bannerPreviewRef.current)
      bannerPreviewRef.current = ""
    }
    setBannerFile(null)
    setBannerUrl("")
    setBannerError("")
    setBannerPreview("")
    if (bannerInputRef.current) {
      bannerInputRef.current.value = ""
    }
  }

  const openImportPicker = () => {
    if (!isFormValid || isImporting || isSubmitting) {
      return
    }
    importInputRef.current?.click()
  }

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setIsImporting(true)
    setImportedGroups([])
    setUserFileName(file.name)

    const response = await workshopApi.importUsers(file)
    setIsImporting(false)

    if (response.error) {
      toast({
        variant: "destructive",
        title: "导入失败",
        description: response.error,
        duration: 3000,
      })
      return
    }

    const data = response.data
    if (!data || !Array.isArray(data.users)) {
      toast({
        variant: "destructive",
        title: "解析失败",
        description: "用户数据格式不正确，请检查导入文件",
        duration: 3000,
      })
      return
    }

    setImportedGroups(data.users)
    toast({
      title: "导入成功",
      description: `已解析 ${data.users.length} 个班组的用户数据`,
      duration: 2000,
    })
  }

  const ensureBannerUrl = async (): Promise<string | null> => {
    if (bannerUrl.trim() !== "") {
      return bannerUrl
    }
    if (!bannerFile) {
      return null
    }

    const response = await workshopApi.uploadBanner(bannerFile)
    if (response.error || !response.data || response.data.url.trim() === "") {
      const message = response.error ? response.error : "上传 Banner 图片失败"
      setBannerError(message)
      toast({
        variant: "destructive",
        title: "上传失败",
        description: message,
        duration: 3000,
      })
      return null
    }

    setBannerUrl(response.data.url)
    setBannerError("")
    return response.data.url
  }

  const triggerDownload = (blob: Blob, filename: string, mimeType: string) => {
    const typedBlob = new Blob([blob], { type: mimeType })
    const objectUrl = URL.createObjectURL(typedBlob)
    const anchor = document.createElement("a")
    anchor.style.display = "none"
    anchor.href = objectUrl
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(objectUrl)
  }

  const handleSubmit = async () => {
    setHasValidationAttempt(true)

    if (workshopName.trim() === "") {
      toast({
        variant: "destructive",
        title: "验证失败",
        description: "请填写工作坊名称",
        duration: 3000,
      })
      return
    }

    const invalidDepartment = departments.find((department) => department.name.trim() === "")
    if (invalidDepartment) {
      toast({
        variant: "destructive",
        title: "验证失败",
        description: "班组名称不能为空",
        duration: 3000,
      })
      return
    }

    if (!bannerFile && bannerUrl.trim() === "") {
      setBannerError("请先选择并上传 Banner 图片")
      toast({
        variant: "destructive",
        title: "验证失败",
        description: "请上传 Banner 图片",
        duration: 3000,
      })
      return
    }

    if (previewRows.length === 0) {
      toast({
        variant: "destructive",
        title: "验证失败",
        description: "请先导入用户数据",
        duration: 3000,
      })
      return
    }

    setIsSubmitting(true)
    const uploadedBannerUrl = await ensureBannerUrl()

    if (!uploadedBannerUrl) {
      setIsSubmitting(false)
      return
    }

    const payload: CreateWorkshopPayload = {
      college: {
        id: 0,
        name: workshopName.trim(),
        image: uploadedBannerUrl,
      },
      departments: departments.map((department) => ({
        id: 0,
        name: department.name.trim(),
      })),
    }

    const response = await workshopApi.createWorkshop(payload)
    setIsSubmitting(false)

    if (response.error || !response.data) {
      const message = response.error ? response.error : "创建工作坊失败"
      toast({
        variant: "destructive",
        title: "创建失败",
        description: message,
        duration: 3000,
      })
      return
    }

    triggerDownload(response.data.blob, response.data.filename, response.data.mimeType)

    toast({
      title: "创建成功",
      description: "工作坊已创建，用户账号文件已开始下载",
      duration: 2500,
    })

    if (onWorkshopCreated) {
      await onWorkshopCreated()
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-2 md:w-1/4">
        <Label className="text-sm font-medium">
          Banner 图片 <span className="text-destructive">*</span>
        </Label>
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (bannerPreview !== "") {
              setIsBannerPreviewOpen(true)
              return
            }
            openBannerPicker()
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              if (bannerPreview !== "") {
                setIsBannerPreviewOpen(true)
                return
              }
              openBannerPicker()
            }
          }}
          className="relative w-full min-h-[168px] rounded-lg border overflow-hidden bg-muted/20 cursor-pointer"
        >
          {bannerPreview !== "" ? (
            <>
              <Image
                src={bannerPreview}
                alt="Banner 预览"
                width={1900}
                height={395}
                className="w-full h-full object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
              <div className="absolute bottom-2 left-2 rounded bg-black/45 px-2 py-1 text-[11px] text-white">点击查看原图</div>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  clearBanner()
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <div className="h-full min-h-[168px] w-full flex flex-col items-center justify-center gap-2 px-3 text-center">
              <div className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                <ImageIcon className="h-4 w-4" />
                选择图片
              </div>
              <div className="text-xs text-muted-foreground">建议上传1900x395或近似比例的图片以保证最佳显示效果。</div>
            </div>
          )}
        </div>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBannerChange}
        />
        <div className="text-sm text-muted-foreground">
          {bannerFile ? `已选图片：${bannerFile.name}` : "尚未选择图片"}
        </div>
        {bannerError !== "" && <div className="text-sm text-destructive">{bannerError}</div>}
      </div>

      <div className="space-y-2 md:w-1/4">
        <Label className="text-sm font-medium">
          工作坊名称 <span className="text-destructive">*</span>
        </Label>
        <Input
          value={workshopName}
          onChange={(event) => setWorkshopName(event.target.value)}
          placeholder="请输入工作坊名称（必填）"
          className={hasValidationAttempt && workshopName.trim() === "" ? "border-destructive" : undefined}
          maxLength={64}
        />
        {hasValidationAttempt && workshopName.trim() === "" && (
          <div className="text-sm text-destructive">工作坊名称不能为空</div>
        )}
      </div>

      <div className="space-y-3 md:w-1/4">
        <Label className="text-sm font-medium">班组设置</Label>
        <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
          {departments.map((department, index) => (
            <div key={department.key} className="flex items-start gap-3">
              <div className="w-16 text-sm text-muted-foreground pt-2">班组{index + 1}</div>
              <div className="flex-1">
                <Input
                  value={department.name}
                  onChange={(event) => updateDepartmentName(department.key, event.target.value)}
                  placeholder={`请输入班组${index + 1}名称（必填）`}
                  className={hasValidationAttempt && department.name.trim() === "" ? "border-destructive" : undefined}
                  maxLength={64}
                />
                {hasValidationAttempt && department.name.trim() === "" && (
                  <div className="text-sm text-destructive mt-1">班组{index + 1}名称不能为空</div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                {index === departments.length - 1 && departments.length < 5 && (
                  <Button type="button" variant="outline" size="icon" onClick={addDepartment}>
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
                {departments.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeDepartment(department.key)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isFormValid && (
        <div className="space-y-3 md:w-1/4">
          <Label className="text-sm font-medium">用户导入</Label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={openImportPicker}
              disabled={isImporting || isSubmitting}
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              导入新用户
            </Button>
            <span className="text-sm text-muted-foreground">{userFileName !== "" ? `已选文件：${userFileName}` : "请选择 .xls 或 .xlsx 文件"}</span>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept=".xls,.xlsx"
            className="hidden"
            onChange={handleImportChange}
          />
        </div>
      )}

      {isImporting && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在解析文件，请稍候...
        </div>
      )}

      {!isImporting && previewRows.length > 0 && (
        <div className="space-y-2 w-full md:w-1/2">
          <Label className="text-sm font-medium">导入用户预览</Label>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-3 py-2">序号</th>
                  <th className="text-left px-3 py-2">班组</th>
                  <th className="text-left px-3 py-2">姓名</th>
                  <th className="text-left px-3 py-2">登录账号</th>
                  <th className="text-left px-3 py-2">密码</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr
                    key={`${row.account}-${row.group}-${index}`}
                    className="border-t odd:bg-muted/10 even:bg-background hover:bg-primary/5 transition-colors"
                  >
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">{row.group}</td>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.account}</td>
                    <td className="px-3 py-2">{row.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-start gap-2">
        {showCancelButton && onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            取消
          </Button>
        )}
        <Button
          type="button"
          className="gap-2"
          onClick={handleSubmit}
          disabled={isSubmitting || isImporting || previewRows.length === 0}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          创建
        </Button>
      </div>

      <Dialog open={isBannerPreviewOpen} onOpenChange={setIsBannerPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Banner 原图预览</DialogTitle>
          </DialogHeader>
          {bannerPreview !== "" && (
            <div className="border rounded-lg overflow-hidden">
              <Image
                src={bannerPreview}
                alt="Banner 原图"
                width={1900}
                height={395}
                className="w-full h-auto"
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
