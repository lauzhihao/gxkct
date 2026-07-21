"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Spinner } from "@/shared/components/ui/spinner"
import { MemberSelector } from "@/shared/components/member-selector"
import { majorApiService } from "@/modules/majors/api"
import { showError, showSuccess } from "@/shared/utils/toast-utils"
import type { TaskMember, TreeNode, TreeNodeManager } from "@/types"

interface MajorManager {
  id: number | string
  name: string
  account: string
  auth: string
  hasPersistableId: boolean
}

interface MajorSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  major: TreeNode | null
  departmentId: string
  departmentName: string
  selectedSemesterId: number | null
  canDeleteMajor: boolean
  onSaved: (majorId: string, updates: { majorName?: string; managers?: TreeNodeManager[] }) => void
  onDeleted: (majorId: string) => void
}

const parsePositiveInteger = (value: string | number | null | undefined, fieldName: string): number => {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName}缺失`)
  }

  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${fieldName}无效`)
  }

  return parsed
}

const resolveMajorId = (major: TreeNode): string => {
  if (typeof major.id === "string" && major.id.trim().length > 0) {
    return major.id
  }
  if (typeof major.nodeId === "string" && major.nodeId.trim().length > 0) {
    const match = major.nodeId.match(/\d+/)
    if (match && match[0].trim().length > 0) {
      return match[0]
    }
  }
  throw new Error("专业ID缺失")
}

const resolveMajorName = (major: TreeNode): string => {
  if (typeof major.nodeName === "string" && major.nodeName.trim().length > 0) {
    return major.nodeName
  }
  if (typeof major.name === "string" && major.name.trim().length > 0) {
    return major.name
  }
  throw new Error("专业名称缺失")
}

const buildInitialManagers = (major: TreeNode): MajorManager[] => {
  const managers = Array.isArray(major.manager) ? major.manager : []
  return managers.map((manager, index) => {
    if (typeof manager.label !== "string" || manager.label.trim().length === 0) {
      throw new Error("专业负责人姓名缺失")
    }

    const numericManagerId = Number.parseInt(String(manager.value), 10)
    const hasPersistableId = Number.isFinite(numericManagerId) && numericManagerId > 0

    return {
      id: hasPersistableId ? numericManagerId : `existing-manager-${index}`,
      account: "",
      name: manager.label,
      auth: "专业负责人",
      hasPersistableId,
    }
  })
}

const buildManagers = (managers: MajorManager[]): TreeNodeManager[] => managers.map((manager) => ({
  value: String(manager.id),
  label: manager.name,
}))

export function MajorSettingsDialog({
  open,
  onOpenChange,
  major,
  departmentId,
  departmentName,
  selectedSemesterId,
  canDeleteMajor,
  onSaved,
  onDeleted,
}: MajorSettingsDialogProps) {
  const [majorName, setMajorName] = useState("")
  const [initialMajorName, setInitialMajorName] = useState("")
  const [managers, setManagers] = useState<MajorManager[]>([])
  const [managersTouched, setManagersTouched] = useState(false)
  const [memberSelectorOpen, setMemberSelectorOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const majorNameInputRef = useRef<HTMLInputElement>(null)

  const currentUniversityId = useMemo(() => {
    if (typeof window === "undefined") {
      return undefined
    }

    const stored = localStorage.getItem("education-current-school")
    if (stored === null || stored.trim().length === 0) {
      return undefined
    }

    try {
      const parsed = JSON.parse(stored) as unknown
      if (typeof parsed === "string" && parsed.trim().length > 0) {
        return parsed
      }
      if (typeof parsed === "number" && Number.isFinite(parsed)) {
        return String(parsed)
      }
    } catch (error) {
      console.error("[MajorSettingsDialog] 当前学校ID解析失败:", error)
    }

    return undefined
  }, [])

  useEffect(() => {
    if (!open || major === null) {
      setMajorName("")
      setInitialMajorName("")
      setManagers([])
      setManagersTouched(false)
      setConfirmDeleteOpen(false)
      return
    }

    try {
      const resolvedMajorName = resolveMajorName(major)
      setMajorName(resolvedMajorName)
      setInitialMajorName(resolvedMajorName)
      setManagers(buildInitialManagers(major))
      setManagersTouched(false)
      setTimeout(() => {
        majorNameInputRef.current?.focus()
      }, 0)
    } catch (error) {
      const message = error instanceof Error ? error.message : "专业数据无效"
      showError(message, "无法打开专业设置")
      onOpenChange(false)
    }
  }, [major, onOpenChange, open])

  const handleMemberSelect = (selected: TaskMember | TaskMember[]) => {
    const selectedManagers = Array.isArray(selected) ? selected : [selected]
    setManagers(selectedManagers.map((manager) => ({
      id: manager.id,
      account: manager.account,
      name: manager.name,
      auth: manager.auth,
      hasPersistableId: true,
    })))
    setManagersTouched(true)
  }

  const removeManager = (index: number) => {
    setManagers((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
    setManagersTouched(true)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleSave = async () => {
    if (major === null) {
      showError("专业数据缺失，无法保存", "保存失败")
      return
    }
    if (majorName.trim().length === 0) {
      showError("请输入专业名称", "验证失败")
      return
    }
    if (managers.length === 0) {
      showError("请至少选择一位专业负责人", "验证失败")
      return
    }

    let numericMajorId: number
    let managerIds: number[] | undefined

    try {
      numericMajorId = parsePositiveInteger(resolveMajorId(major), "专业ID")
      if (managersTouched) {
        managerIds = managers.map((manager) => {
          if (!manager.hasPersistableId) {
            throw new Error(`专业负责人"${manager.name}"缺少可保存的ID，请重新选择专业负责人`)
          }
          return parsePositiveInteger(manager.id, `专业负责人"${manager.name}"的ID`)
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "专业设置数据无效"
      showError(message, "验证失败")
      return
    }

    const trimmedMajorName = majorName.trim()
    const nameChanged = trimmedMajorName !== initialMajorName
    if (!nameChanged && managerIds === undefined) {
      showError("没有需要保存的专业设置", "保存失败")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await majorApiService.updateMajorSettings({
        majorId: numericMajorId,
        ...(nameChanged ? { name: trimmedMajorName } : {}),
        ...(managerIds !== undefined ? { managerIds } : {}),
      })

      if (response.error) {
        showError(response.error, "保存失败")
        return
      }

      const savedUpdates: { majorName?: string; managers?: TreeNodeManager[] } = {}
      if (nameChanged) {
        savedUpdates.majorName = trimmedMajorName
      }
      if (managerIds !== undefined) {
        savedUpdates.managers = buildManagers(managers)
      }

      onSaved(resolveMajorId(major), savedUpdates)
      showSuccess("专业设置已更新", "保存成功")
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存专业设置失败"
      console.error("[MajorSettingsDialog] 保存专业设置失败:", error)
      showError(message, "保存失败")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (major === null) {
      showError("专业数据缺失，无法删除", "删除失败")
      return
    }
    if (typeof selectedSemesterId !== "number" || !Number.isFinite(selectedSemesterId)) {
      showError("未获取到学期信息，无法删除专业", "删除失败")
      return
    }

    let majorId: string
    try {
      majorId = resolveMajorId(major)
      parsePositiveInteger(majorId, "专业ID")
    } catch (error) {
      const message = error instanceof Error ? error.message : "专业ID无效"
      showError(message, "删除失败")
      return
    }

    setIsDeleting(true)
    try {
      const response = await majorApiService.deleteMajor(selectedSemesterId, majorId)

      if (response.error) {
        showError(response.error, "删除专业失败")
        return
      }

      showSuccess("专业已删除", "删除成功")
      setConfirmDeleteOpen(false)
      onDeleted(majorId)
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除专业失败"
      console.error("[MajorSettingsDialog] 删除专业失败:", error)
      showError(message, "删除专业失败")
    } finally {
      setIsDeleting(false)
    }
  }

  const resolvedMajorName = (() => {
    if (major === null) {
      return ""
    }
    try {
      return resolveMajorName(major)
    } catch {
      return ""
    }
  })()

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>专业设置</DialogTitle>
            <DialogDescription>调整专业基本信息与专业负责人</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">所属院系</label>
              <Input value={departmentName} readOnly />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                专业名称 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  ref={majorNameInputRef}
                  placeholder="请输入专业名称"
                  value={majorName}
                  onChange={(event) => setMajorName(event.target.value.slice(0, 64))}
                  maxLength={64}
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  {majorName.length}/64
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                专业负责人 <span className="text-red-500">*</span>
              </label>
              <div className="min-h-10 rounded-md bg-background px-3 py-2 flex items-center justify-between gap-2 border border-gray-300">
                <div className="flex items-center flex-wrap gap-2 flex-1 overflow-hidden">
                  {managers.length > 0 ? (
                    managers.map((manager, index) => (
                      <div key={manager.id} className="gap-1 bg-primary/5 border border-primary/20 text-foreground text-sm px-2 py-1 flex items-center">
                        {manager.name}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            removeManager(index)
                          }}
                          className="ml-1 hover:text-destructive"
                          aria-label={`移除${manager.name}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">点击右侧加号选择负责人</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 flex-shrink-0 hover:bg-primary [&:hover>svg]:text-white"
                  onClick={() => setMemberSelectorOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(true)}
              className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={!canDeleteMajor || isSubmitting || isDeleting || major === null}
            >
              <Trash2 className="w-4 h-4" />
              删除专业
            </Button>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel} className="gap-2 bg-transparent" disabled={isSubmitting || isDeleting}>
                <X className="w-4 h-4" />
                取消
              </Button>
              <Button onClick={handleSave} disabled={majorName.trim().length === 0 || managers.length === 0 || isSubmitting || isDeleting} className="gap-2">
                {isSubmitting ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                保存
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除专业</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除专业"<span className="font-semibold text-foreground">{resolvedMajorName}</span>"吗？此操作将同时移除该专业在当前学期下的课程绑定，且无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MemberSelector
        mode="multiple"
        nodeType="department"
        departmentId={departmentId}
        universityId={currentUniversityId}
        open={memberSelectorOpen}
        onOpenChange={setMemberSelectorOpen}
        onConfirm={handleMemberSelect}
        title="选择专业负责人"
        description="请选择该专业的负责人（支持多选）"
        initialSelectedMembers={managers
          .filter((manager) => manager.hasPersistableId)
          .map((manager) => ({
            id: parsePositiveInteger(manager.id, `专业负责人"${manager.name}"的ID`),
            account: manager.account,
            name: manager.name,
            auth: manager.auth,
          }))}
      />
    </>
  )
}
