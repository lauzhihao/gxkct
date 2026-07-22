"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { RefreshCw, FolderPlus, Download, Copy, Scissors, Trash2, Search as SearchIcon, Upload } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Empty, EmptyDescription, EmptyTitle } from "@/shared/components/ui/empty"
import { Input } from "@/shared/components/ui/input"
import { Spinner } from "@/shared/components/ui/spinner"
import { LoadingState } from "@/shared/components/ui/loading-state"
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
import { ResourceBreadcrumb } from "./ResourceBreadcrumb"
import { ResourceSearchBar } from "./ResourceSearchBar"
import { ResourceObjectList } from "./ResourceObjectList"
import { ResourceDestinationPickerDialog } from "./ResourceDestinationPickerDialog"
import { ResourcePreviewDrawer } from "./ResourcePreviewDrawer"
import { resolveSafeResourceUrl } from "./resource-preview-types"
import {
  canConfirmResourceDestination,
  canStartResourceBatchTransfer,
  changeResourceInteractionMode,
  createResourceBatchTransferSnapshot,
  parseResourceBatchActionOutcome,
  toggleResourceSelection,
  type ResourceBatchTransferAction,
  type ResourceBatchTransferSnapshot,
  type ResourceInteractionMode,
} from "./resource-interaction-state"
import { validateCompleteFileName, validateFolderName } from "./resource-name-validation"
import type { ResourceEntry, ResourcePreviewTarget, ResourceRenameTarget, TemporaryUploadItem } from "./types"
import { useCourseResources } from "@/modules/courses/hooks/use-course-resources"
import { useResourceViewPreference } from "@/modules/courses/hooks/use-resource-view-preference"
import { courseResourcesApi, type ResourceOwnerType } from "@/modules/courses/api/courseResourcesApi"
import { showError, showSuccess } from "@/shared/utils/toast-utils"

interface CourseResourcesContainerProps {
  nodeId: string | null
  courseEditable?: boolean
  /** 资源归属层级；缺省按课程处理 */
  ownerType?: ResourceOwnerType
}

const MAX_RESOURCE_UPLOAD_SIZE = 1024 * 1024 * 1024
const FALLBACK_RESOURCE_MIME_TYPE = "application/octet-stream"

class UploadCanceledError extends Error {
  constructor(message = "已取消上传") {
    super(message)
    this.name = "UploadCanceledError"
  }
}

const MAX_RESOURCE_UPLOAD_COUNT = 20

const resolveUploadMimeType = (file: File): string => {
  if (typeof file.type !== "string") {
    throw new Error("文件类型无效，无法上传")
  }

  const normalizedMimeType = file.type.trim()
  if (normalizedMimeType.length === 0) {
    return FALLBACK_RESOURCE_MIME_TYPE
  }

  return normalizedMimeType
}

const createUploadHeaders = (
  uploadHeaders: Record<string, string> | undefined,
  mimeType: string,
): Record<string, string> => {
  if (!uploadHeaders) {
    return {
      "Content-Type": mimeType,
    }
  }

  const hasContentTypeHeader = Object.keys(uploadHeaders).some((key) => key.toLowerCase() === "content-type")
  if (hasContentTypeHeader) {
    return uploadHeaders
  }

  return {
    ...uploadHeaders,
    "Content-Type": mimeType,
  }
}

export function CourseResourcesContainer({ nodeId, courseEditable = false, ownerType }: CourseResourcesContainerProps) {
  const canManageCourseResource = courseEditable

  const {
    breadcrumbs,
    directories,
    objects,
    isLoading,
    error,
    needInitialization,
    isInitializing,
    isRootLevel,
    currentParentId,
    searchTerm,
    setSearchTerm,
    enterFolder,
    goToBreadcrumb,
    refreshCurrentLevel,
    initializeFolders,
  } = useCourseResources(nodeId, ownerType)
  const { viewMode, setViewMode } = useResourceViewPreference()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [interactionMode, setInteractionMode] = useState<ResourceInteractionMode>("normal")
  const [isDeleting, setIsDeleting] = useState(false)
  const [isBatchDownloading, setIsBatchDownloading] = useState(false)
  const [batchTransferSnapshot, setBatchTransferSnapshot] = useState<ResourceBatchTransferSnapshot | null>(null)
  const [isBatchTransferring, setIsBatchTransferring] = useState(false)
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [folderNameError, setFolderNameError] = useState<string | null>(null)
  const [rootFolderSearch, setRootFolderSearch] = useState("")
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [temporaryUploads, setTemporaryUploads] = useState<TemporaryUploadItem[]>([])
  const [isDropActive, setIsDropActive] = useState(false)
  const [renameTarget, setRenameTarget] = useState<ResourceRenameTarget | null>(null)
  const [renameName, setRenameName] = useState("")
  const [renameNameError, setRenameNameError] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [previewTarget, setPreviewTarget] = useState<ResourcePreviewTarget | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ResourceRenameTarget | null>(null)
  const [isDeletingTarget, setIsDeletingTarget] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const uploadXhrMapRef = useRef(new Map<string, XMLHttpRequest>())
  const canceledUploadIdsRef = useRef(new Set<string>())

  useEffect(() => {
    setSelectedIds(new Set())
    setInteractionMode("normal")
    setRenameTarget(null)
    setRenameName("")
    setRenameNameError(null)
    setIsRenaming(false)
    setPreviewTarget(null)
    setIsPreviewOpen(false)
    setDeleteTarget(null)
    setIsDeletingTarget(false)
    setBatchTransferSnapshot(null)
  }, [currentParentId, nodeId])

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>()
      objects.forEach((obj) => {
        if (prev.has(obj.id)) {
          next.add(obj.id)
        }
      })
      return next
    })
  }, [objects])

  useEffect(() => {
    if (!isRootLevel) {
      setRootFolderSearch("")
    }
  }, [isRootLevel])

  useEffect(() => {
    setTemporaryUploads((prev) => {
      canceledUploadIdsRef.current = new Set(prev.map((item) => item.id))
      return []
    })
    uploadXhrMapRef.current.forEach((xhr) => {
      xhr.abort()
    })
    uploadXhrMapRef.current.clear()
    setIsDropActive(false)
  }, [currentParentId, nodeId])

  const toggleSelect = useCallback((objectId: string) => {
    setSelectedIds((currentIds) => (
      toggleResourceSelection(interactionMode, currentIds, objectId)
    ))
  }, [interactionMode])

  const handleToggleBatchMode = useCallback(() => {
    const nextMode = interactionMode === "normal" ? "batch" : "normal"
    const nextState = changeResourceInteractionMode(nextMode)
    setInteractionMode(nextState.mode)
    setSelectedIds(nextState.selectedIds)
    setBatchTransferSnapshot(null)
  }, [interactionMode])

  const handleFolderClick = useCallback((folder: Parameters<typeof enterFolder>[0]) => {
    const nextState = changeResourceInteractionMode("normal")
    setInteractionMode(nextState.mode)
    setSelectedIds(nextState.selectedIds)
    enterFolder(folder)
  }, [enterFolder])

  const handleBreadcrumbClick = useCallback((index: number) => {
    const nextState = changeResourceInteractionMode("normal")
    setInteractionMode(nextState.mode)
    setSelectedIds(nextState.selectedIds)
    goToBreadcrumb(index)
  }, [goToBreadcrumb])

  const handleDeleteSelected = useCallback(async () => {
    if (!courseEditable) return
    if (!nodeId || !currentParentId || selectedIds.size === 0) return
    setIsDeleting(true)
    try {
      const response = await courseResourcesApi.batchAction(nodeId, {
        action: "delete",
        sourceFolderId: currentParentId,
        objectIds: Array.from(selectedIds),
      }, ownerType)
      if (response.error) {
        showError(response.error)
        return
      }
      showSuccess("删除成功")
      setSelectedIds(new Set())
      refreshCurrentLevel()
    } catch (err) {
      const message = err instanceof Error ? err.message : "删除失败"
      showError(message)
    } finally {
      setIsDeleting(false)
    }
  }, [courseEditable, nodeId, currentParentId, selectedIds, refreshCurrentLevel, ownerType])

  const handleBatchDownload = useCallback(async () => {
    if (!courseEditable || !nodeId || selectedIds.size === 0) return

    setIsBatchDownloading(true)
    try {
      const response = await courseResourcesApi.createBatchDownload(nodeId, Array.from(selectedIds), ownerType)
      if (response.error !== null) {
        showError(response.error)
        return
      }
      if (response.data === null) {
        showError("批量下载响应为空")
        return
      }

      const { taskId, status, downloadUrl } = response.data
      if (typeof taskId !== "string" || taskId.trim().length === 0) {
        showError("批量下载响应缺少有效的任务 ID")
        return
      }
      if (typeof status !== "string" || status.trim().length === 0) {
        showError("批量下载响应缺少有效的任务状态")
        return
      }
      if (downloadUrl === null) {
        showSuccess(`批量下载任务已创建，状态：${status}，任务 ID：${taskId}`)
        return
      }
      if (typeof downloadUrl !== "string") {
        showError("批量下载响应包含无效的下载地址")
        return
      }

      const safeDownloadUrl = resolveSafeResourceUrl(downloadUrl, "批量下载地址")
      const anchor = document.createElement("a")
      anchor.href = safeDownloadUrl
      anchor.download = ""
      anchor.target = "_blank"
      anchor.rel = "noopener noreferrer"
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      showSuccess("批量下载已开始")
    } catch (error) {
      const message = error instanceof Error ? error.message : "批量下载失败"
      showError(message)
    } finally {
      setIsBatchDownloading(false)
    }
  }, [courseEditable, nodeId, ownerType, selectedIds])

  const handleOpenBatchTransfer = useCallback((action: ResourceBatchTransferAction) => {
    const canStartTransfer = canStartResourceBatchTransfer({
      mode: interactionMode,
      courseEditable,
      selectedCount: selectedIds.size,
      nodeId,
      sourceFolderId: currentParentId,
      needInitialization,
      isLoading,
      isBatchDownloading,
      isDeleting,
      isBatchTransferring,
    })
    if (!canStartTransfer) {
      showError("当前状态无法执行批量复制或移动")
      return
    }
    if (currentParentId === null) {
      throw new Error("批量操作缺少源目录 ID")
    }
    setBatchTransferSnapshot(
      createResourceBatchTransferSnapshot(action, currentParentId, selectedIds),
    )
  }, [
    courseEditable,
    currentParentId,
    interactionMode,
    isBatchDownloading,
    isBatchTransferring,
    isDeleting,
    isLoading,
    needInitialization,
    nodeId,
    selectedIds,
  ])

  const handleCopySelected = useCallback(() => {
    handleOpenBatchTransfer("copy")
  }, [handleOpenBatchTransfer])

  const handleCutSelected = useCallback(() => {
    handleOpenBatchTransfer("move")
  }, [handleOpenBatchTransfer])

  const handleBatchTransferOpenChange = useCallback((open: boolean) => {
    if (!open && !isBatchTransferring) {
      setBatchTransferSnapshot(null)
    }
  }, [isBatchTransferring])

  const handleConfirmBatchTransfer = useCallback(async (targetFolderId: string) => {
    if (batchTransferSnapshot === null) {
      showError("批量操作上下文已失效，请重新选择文件")
      return
    }
    if (!courseEditable) {
      showError("当前资源不可编辑")
      return
    }
    if (nodeId === null) {
      showError("当前资源不可编辑")
      return
    }
    const canConfirmDestination = canConfirmResourceDestination({
      sourceFolderId: batchTransferSnapshot.sourceFolderId,
      targetFolderId,
      isLoading: false,
      isSubmitting: isBatchTransferring,
    })
    if (!canConfirmDestination) {
      showError("请选择与源目录不同的有效目标目录")
      return
    }

    setIsBatchTransferring(true)
    try {
      const response = await courseResourcesApi.batchAction(nodeId, {
        action: batchTransferSnapshot.action,
        sourceFolderId: batchTransferSnapshot.sourceFolderId,
        targetFolderId,
        objectIds: [...batchTransferSnapshot.objectIds],
      }, ownerType)
      if (response.error !== null) {
        showError(response.error)
        return
      }
      if (response.data === null) {
        showError("批量复制或移动响应为空")
        return
      }

      const outcome = parseResourceBatchActionOutcome(
        response.data,
        batchTransferSnapshot.objectIds,
      )
      const succeededCount = outcome.succeededIds.length
      const failedCount = outcome.failedIds.length
      const actionLabel = batchTransferSnapshot.action === "copy" ? "复制" : "移动"

      if (batchTransferSnapshot.action === "move" && succeededCount > 0) {
        refreshCurrentLevel()
      }
      setBatchTransferSnapshot(null)
      if (failedCount === 0) {
        const nextState = changeResourceInteractionMode("normal")
        setInteractionMode(nextState.mode)
        setSelectedIds(nextState.selectedIds)
        showSuccess(`${actionLabel}成功：成功 ${succeededCount} 个，失败 0 个`)
        return
      }

      setInteractionMode("batch")
      setSelectedIds(new Set(outcome.failedIds))
      const resultLabel = succeededCount > 0 ? "部分完成" : "失败"
      showError(`${actionLabel}${resultLabel}：成功 ${succeededCount} 个，失败 ${failedCount} 个`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "批量复制或移动失败"
      showError(message)
    } finally {
      setIsBatchTransferring(false)
    }
  }, [
    batchTransferSnapshot,
    courseEditable,
    isBatchTransferring,
    nodeId,
    ownerType,
    refreshCurrentLevel,
  ])

  const calculateChecksum = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  }, [])

  const updateTemporaryUpload = useCallback((uploadId: string, updater: (item: TemporaryUploadItem) => TemporaryUploadItem) => {
    setTemporaryUploads((prev) => prev.map((item) => (item.id === uploadId ? updater(item) : item)))
  }, [])

  const removeTemporaryUpload = useCallback((uploadId: string) => {
    setTemporaryUploads((prev) => prev.filter((item) => item.id !== uploadId))
    uploadXhrMapRef.current.delete(uploadId)
    canceledUploadIdsRef.current.delete(uploadId)
  }, [])

  const uploadSingleFile = useCallback(
    async (uploadId: string, file: File) => {
      if (!courseEditable) {
        return
      }
      if (!nodeId || !currentParentId) {
        throw new Error("请先进入具体目录再上传文件")
      }

      const throwIfCanceled = () => {
        if (canceledUploadIdsRef.current.has(uploadId)) {
          throw new UploadCanceledError(`已取消上传 ${file.name}`)
        }
      }

      const resolvedMimeType = resolveUploadMimeType(file)
      updateTemporaryUpload(uploadId, (item) => ({
        ...item,
        mimeType: resolvedMimeType,
        progress: 0,
        status: "uploading",
        errorMessage: null,
      }))

      try {
        throwIfCanceled()

        const signatureResponse = await courseResourcesApi.getUploadSignature(nodeId, currentParentId, {
          fileName: file.name,
          mimeType: resolvedMimeType,
          size: file.size,
        }, ownerType)
        if (signatureResponse.error || !signatureResponse.data) {
          const message = signatureResponse.error ?? "获取上传签名失败"
          throw new Error(message)
        }

        throwIfCanceled()

        const { uploadUrl, uploadHeaders, uploadMethod, uploadPath } = signatureResponse.data
        if (!uploadUrl || !uploadPath) {
          throw new Error("上传签名响应缺少必要信息")
        }

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          uploadXhrMapRef.current.set(uploadId, xhr)
          xhr.open(uploadMethod ?? "PUT", uploadUrl)

          Object.entries(createUploadHeaders(uploadHeaders, resolvedMimeType)).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value)
          })

          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) {
              return
            }

            updateTemporaryUpload(uploadId, (item) => ({
              ...item,
              progress: (event.loaded / event.total) * 100,
            }))
          }

          xhr.onload = () => {
            uploadXhrMapRef.current.delete(uploadId)
            if (canceledUploadIdsRef.current.has(uploadId)) {
              reject(new UploadCanceledError(`已取消上传 ${file.name}`))
              return
            }
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
              return
            }

            reject(new Error(`上传文件 ${file.name} 失败`))
          }

          xhr.onerror = () => {
            uploadXhrMapRef.current.delete(uploadId)
            if (canceledUploadIdsRef.current.has(uploadId)) {
              reject(new UploadCanceledError(`已取消上传 ${file.name}`))
              return
            }
            reject(new Error(`上传文件 ${file.name} 失败，网络连接已中断`))
          }

          xhr.onabort = () => {
            uploadXhrMapRef.current.delete(uploadId)
            reject(new UploadCanceledError(`已取消上传 ${file.name}`))
          }

          xhr.send(file)
        })

        throwIfCanceled()

        const checksum = await calculateChecksum(file)
        throwIfCanceled()

        const confirmResponse = await courseResourcesApi.confirmUpload(nodeId, currentParentId, {
          fileName: file.name,
          uploadPath,
          size: file.size,
          mimeType: resolvedMimeType,
          checksum,
        }, ownerType)
        if (confirmResponse.error) {
          throw new Error(confirmResponse.error)
        }

        removeTemporaryUpload(uploadId)
        showSuccess(`文件 ${file.name} 上传成功`)
        refreshCurrentLevel()
      } catch (error) {
        uploadXhrMapRef.current.delete(uploadId)
        if (error instanceof UploadCanceledError) {
          removeTemporaryUpload(uploadId)
          return
        }

        const message = error instanceof Error ? error.message : "上传过程中出错"
        updateTemporaryUpload(uploadId, (item) => ({
          ...item,
          status: "error",
          progress: 0,
          errorMessage: message,
        }))
      }
    },
    [calculateChecksum, courseEditable, currentParentId, nodeId, refreshCurrentLevel, removeTemporaryUpload, updateTemporaryUpload, ownerType],
  )

  const enqueueUploads = useCallback(
    (files: File[]) => {
      if (!courseEditable) {
        return
      }
      if (!nodeId || !currentParentId) {
        showError("请先进入具体目录再上传文件")
        return
      }
      if (files.length === 0) {
        return
      }

      const currentCount = temporaryUploads.length
      if (currentCount + files.length > MAX_RESOURCE_UPLOAD_COUNT) {
        showError(`单次最多处理 ${MAX_RESOURCE_UPLOAD_COUNT} 个文件`)
        return
      }

      const validFiles = files.filter((file) => {
        if (file.size > MAX_RESOURCE_UPLOAD_SIZE) {
          showError(`文件 ${file.name} 超过大小限制`)
          return false
        }

        return true
      })
      if (validFiles.length === 0) {
        return
      }

      const nextUploads = validFiles.map<TemporaryUploadItem>((file) => ({
        id: `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        name: file.name,
        size: file.size,
        mimeType: file.type.trim().length > 0 ? file.type : FALLBACK_RESOURCE_MIME_TYPE,
        progress: 0,
        status: "queued",
        errorMessage: null,
      }))

      setTemporaryUploads((prev) => [...nextUploads, ...prev])
      nextUploads.forEach((upload) => {
        void uploadSingleFile(upload.id, upload.file)
      })
    },
    [courseEditable, currentParentId, nodeId, temporaryUploads.length, uploadSingleFile],
  )

  const handleRetryUpload = useCallback(
    (uploadId: string) => {
      const upload = temporaryUploads.find((item) => item.id === uploadId)
      if (!upload) {
        return
      }

      canceledUploadIdsRef.current.delete(uploadId)
      void uploadSingleFile(uploadId, upload.file)
    },
    [temporaryUploads, uploadSingleFile],
  )

  const handleCancelUpload = useCallback(
    (uploadId: string) => {
      canceledUploadIdsRef.current.add(uploadId)
      const activeXhr = uploadXhrMapRef.current.get(uploadId)
      if (activeXhr) {
        activeXhr.abort()
      }
      removeTemporaryUpload(uploadId)
    },
    [removeTemporaryUpload],
  )

  const handleOpenFileSelector = useCallback(() => {
    if (!courseEditable) {
      return
    }

    uploadInputRef.current?.click()
  }, [courseEditable])

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (files) {
        enqueueUploads(Array.from(files))
      }

      event.target.value = ""
    },
    [enqueueUploads],
  )

  const handleDropZoneDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!courseEditable || isRootLevel) {
      return
    }

    event.preventDefault()
    setIsDropActive(true)
  }, [courseEditable, isRootLevel])

  const handleDropZoneDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDropActive(false)
  }, [])

  const handleDropZoneDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!courseEditable || isRootLevel) {
        return
      }

      event.preventDefault()
      setIsDropActive(false)
      enqueueUploads(Array.from(event.dataTransfer.files))
    },
    [courseEditable, enqueueUploads, isRootLevel],
  )

  const resetFolderForm = useCallback(() => {
    setNewFolderName("")
    setFolderNameError(null)
  }, [])

  const handleOpenCreateFolder = useCallback(() => {
    if (!courseEditable) return
    resetFolderForm()
    setIsCreatingFolder(false)
    setIsCreateFolderOpen(true)
  }, [courseEditable, resetFolderForm])

  const handleFolderNameChange = useCallback(
    (value: string) => {
      setNewFolderName(value)
      setFolderNameError(validateFolderName(value))
    },
    [],
  )

  const handleCreateFolderConfirm = useCallback(async () => {
    if (!courseEditable) return
    const error = validateFolderName(newFolderName)
    if (error) {
      setFolderNameError(error)
      return
    }
    if (!nodeId || !currentParentId) {
      return
    }
    setIsCreatingFolder(true)
    try {
      const response = await courseResourcesApi.createFolder(nodeId, currentParentId, {
        name: newFolderName.trim(),
      }, ownerType)
      if (response.error) {
        setFolderNameError(response.error)
        showError(response.error)
        return
      }
      showSuccess("文件夹创建成功")
      setIsCreateFolderOpen(false)
      resetFolderForm()
      refreshCurrentLevel()
    } catch (err) {
      const message = err instanceof Error ? err.message : "新建文件夹失败"
      showError(message)
    } finally {
      setIsCreatingFolder(false)
    }
  }, [courseEditable, currentParentId, newFolderName, nodeId, refreshCurrentLevel, resetFolderForm, ownerType])

  const resetRenameForm = useCallback(() => {
    setRenameTarget(null)
    setRenameName("")
    setRenameNameError(null)
    setIsRenaming(false)
  }, [])

  const handleOpenRename = useCallback((target: ResourceRenameTarget) => {
    if (!courseEditable || isRootLevel) return
    setRenameTarget(target)
    setRenameName(target.name)
    setRenameNameError(
      target.type === "folder"
        ? validateFolderName(target.name)
        : validateCompleteFileName(target.name),
    )
    setIsRenaming(false)
  }, [courseEditable, isRootLevel])

  const handleRenameNameChange = useCallback((value: string) => {
    setRenameName(value)
    if (!renameTarget) {
      setRenameNameError("未找到要重命名的资源")
      return
    }
    setRenameNameError(
      renameTarget.type === "folder"
        ? validateFolderName(value)
        : validateCompleteFileName(value),
    )
  }, [renameTarget])

  const handleRenameConfirm = useCallback(async () => {
    if (!courseEditable || isRootLevel) {
      showError("当前目录不允许重命名资源")
      return
    }
    if (!renameTarget) {
      showError("未找到要重命名的资源")
      return
    }
    const resourceLabel = renameTarget.type === "folder" ? "文件夹" : "文件"
    const validationError = renameTarget.type === "folder"
      ? validateFolderName(renameName)
      : validateCompleteFileName(renameName)
    if (validationError) {
      setRenameNameError(validationError)
      return
    }
    if (!nodeId) {
      showError("无法确定资源归属，重命名失败")
      return
    }

    setIsRenaming(true)
    try {
      const response = await courseResourcesApi.renameObject(nodeId, renameTarget.id, {
        name: renameName.trim(),
      }, ownerType)
      if (response.error) {
        setRenameNameError(response.error)
        showError(response.error)
        return
      }
      showSuccess(`${resourceLabel}重命名成功`)
      resetRenameForm()
      refreshCurrentLevel()
    } catch (err) {
      const message = err instanceof Error ? err.message : "重命名失败"
      setRenameNameError(message)
      showError(message)
    } finally {
      setIsRenaming(false)
    }
  }, [courseEditable, isRootLevel, nodeId, ownerType, refreshCurrentLevel, renameName, renameTarget, resetRenameForm])

  const handleRenameOpenChange = useCallback((open: boolean) => {
    if (!open) {
      resetRenameForm()
    }
  }, [resetRenameForm])

  const handleOpenPreview = useCallback((target: ResourcePreviewTarget) => {
    setPreviewTarget(target)
    setIsPreviewOpen(true)
  }, [])

  const handlePreviewOpenChange = useCallback((open: boolean) => {
    setIsPreviewOpen(open)
  }, [])

  const handlePreviewCloseAnimationEnd = useCallback(() => {
    setPreviewTarget(null)
  }, [])

  const loadPreviewDetail = useCallback(async (resourceId: string): Promise<unknown> => {
    if (!nodeId) {
      throw new Error("无法确定资源归属，预览加载失败")
    }
    const response = await courseResourcesApi.getObjectDetail(nodeId, resourceId, ownerType)
    if (response.error !== null) {
      throw new Error(response.error)
    }
    if (response.data === null) {
      throw new Error("资源详情响应为空")
    }
    return response.data
  }, [nodeId, ownerType])

  const handleOpenDelete = useCallback((target: ResourceRenameTarget) => {
    if (!courseEditable || isRootLevel) {
      return
    }
    setDeleteTarget(target)
  }, [courseEditable, isRootLevel])

  const handleDeleteTargetOpenChange = useCallback((open: boolean) => {
    if (!open && !isDeletingTarget) {
      setDeleteTarget(null)
    }
  }, [isDeletingTarget])

  const handleDeleteTargetConfirm = useCallback(async () => {
    if (!courseEditable || isRootLevel) {
      showError("当前目录不允许删除资源")
      return
    }
    if (!nodeId || deleteTarget === null) {
      showError("未找到要删除的资源")
      return
    }

    setIsDeletingTarget(true)
    try {
      const response = await courseResourcesApi.deleteObject(nodeId, deleteTarget.id, ownerType)
      if (response.error !== null) {
        showError(response.error)
        return
      }
      showSuccess(`${deleteTarget.type === "folder" ? "文件夹" : "文件"}删除成功`)
      setSelectedIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(deleteTarget.id)
        return nextIds
      })
      if (previewTarget !== null && previewTarget.id === deleteTarget.id) {
        setIsPreviewOpen(false)
        setPreviewTarget(null)
      }
      setDeleteTarget(null)
      refreshCurrentLevel()
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败"
      showError(message)
    } finally {
      setIsDeletingTarget(false)
    }
  }, [courseEditable, deleteTarget, isRootLevel, nodeId, ownerType, previewTarget, refreshCurrentLevel])

  const handleInitializeFoldersWithPermission = useCallback(() => {
    if (!courseEditable) return
    initializeFolders()
  }, [courseEditable, initializeFolders])

  const handleCreateFolderOpenChange = useCallback(
    (open: boolean) => {
      setIsCreateFolderOpen(open)
      if (!open) {
        resetFolderForm()
        setIsCreatingFolder(false)
      }
    },
    [resetFolderForm],
  )

  const selectedCount = selectedIds.size
  const canStartBatchTransfer = canStartResourceBatchTransfer({
    mode: interactionMode,
    courseEditable,
    selectedCount,
    nodeId,
    sourceFolderId: currentParentId,
    needInitialization,
    isLoading,
    isBatchDownloading,
    isDeleting,
    isBatchTransferring,
  })

  const filteredDirectories = useMemo(() => {
    if (!isRootLevel || !rootFolderSearch.trim()) {
      return directories
    }
    const keyword = rootFolderSearch.trim().toLowerCase()
    return directories.filter((folder) => folder.name.toLowerCase().includes(keyword))
  }, [directories, isRootLevel, rootFolderSearch])

  const resourceEntries = useMemo<ResourceEntry[]>(() => {
    const uploadEntries: ResourceEntry[] = temporaryUploads.map((upload) => ({
      type: "upload",
      upload,
    }))
    const folderEntries: ResourceEntry[] = filteredDirectories.map((folder) => ({
      type: "folder",
      folder,
    }))
    const objectEntries: ResourceEntry[] = objects.map((object) => ({
      type: "object",
      object,
    }))
    return [...uploadEntries, ...folderEntries, ...objectEntries]
  }, [filteredDirectories, objects, temporaryUploads])

  const hasSelectableObjects = resourceEntries.some((entry) => entry.type === "object")
  const showActions = !needInitialization && !isRootLevel
  const isCreateFolderDisabled = isLoading
  const isCreateFolderConfirmDisabled =
    isCreatingFolder || Boolean(folderNameError) || newFolderName.trim().length === 0
  const isRenameConfirmDisabled =
    isRenaming || Boolean(renameNameError) || renameName.trim().length === 0 || renameName.trim() === renameTarget?.name

  if (!nodeId) {
    return (
      <Empty>
        <EmptyTitle>暂无资源数据</EmptyTitle>
        <EmptyDescription>请选择具体对象后查看文件资源。</EmptyDescription>
      </Empty>
    )
  }

  return (
    <>
      <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ResourceBreadcrumb path={breadcrumbs} onCrumbClick={handleBreadcrumbClick} />
        {showActions ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <ResourceSearchBar
              courseEditable={courseEditable}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="搜索当前目录下的文件"
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onSelectFiles={handleOpenFileSelector}
              disableUpload={isLoading || isRootLevel}
              onCreateFolderClick={handleOpenCreateFolder}
              disableCreateFolder={isCreateFolderDisabled}
              interactionMode={interactionMode}
              onToggleBatchMode={handleToggleBatchMode}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshCurrentLevel}
                disabled={isLoading}
                className="text-muted-foreground transition-colors hover:bg-primary hover:text-white hover:[&>svg]:text-white"
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                刷新
              </Button>
            </div>
          </div>
        ) : (
          isRootLevel && !needInitialization && (
            <div className="flex w-full justify-end sm:w-auto">
              <div className="relative w-full max-w-xs sm:w-64">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={rootFolderSearch}
                  onChange={(e) => setRootFolderSearch(e.target.value)}
                  placeholder="搜索文件夹"
                  className="h-9 w-full pl-9"
                />
              </div>
            </div>
          )
        )}
      </div>
      {needInitialization ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/40 py-12 text-center">
          <FolderPlus className="h-10 w-10 text-primary" />
          <p className="text-sm text-muted-foreground">尚未初始化资源目录</p>
          <Button
            onClick={handleInitializeFoldersWithPermission}
            disabled={!courseEditable || isInitializing}
            className="min-w-[160px]"
          >
            {isInitializing && <Spinner className="mr-2" />}
            初始化目录
          </Button>
        </div>
      ) : isLoading ? (
        <LoadingState title="正在加载目录" />
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {interactionMode === "batch" && hasSelectableObjects && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>已选 {selectedCount} 个对象</span>
              <div className="flex flex-wrap items-center gap-2">
                {canManageCourseResource && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 transition-colors hover:bg-primary hover:text-white hover:[&>svg]:text-white"
                    disabled={nodeId === null || selectedCount === 0 || isBatchDownloading}
                    onClick={handleBatchDownload}
                  >
                    {isBatchDownloading ? (
                      <>
                        <Spinner className="h-4 w-4" />
                        正在准备
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        下载
                      </>
                    )}
                  </Button>
                )}
                {canManageCourseResource && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canStartBatchTransfer}
                    onClick={handleCopySelected}
                    className="gap-1 text-muted-foreground transition-colors hover:bg-primary hover:text-white hover:[&>svg]:text-white"
                  >
                    <Copy className="h-4 w-4" />
                    复制
                  </Button>
                )}
                {canManageCourseResource && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canStartBatchTransfer}
                    onClick={handleCutSelected}
                    className="gap-1 text-muted-foreground transition-colors hover:bg-primary hover:text-white hover:[&>svg]:text-white"
                  >
                    <Scissors className="h-4 w-4" />
                    剪切
                  </Button>
                )}
                {canManageCourseResource && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1 transition-colors hover:bg-primary hover:text-white hover:[&>svg]:text-white"
                    disabled={selectedCount === 0 || isDeleting}
                    onClick={handleDeleteSelected}
                  >
                    {isDeleting ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                    删除
                  </Button>
                )}
              </div>
            </div>
          )}
          <div
            className={
              isDropActive
                ? "relative rounded-xl border-2 border-dashed border-primary bg-primary/5 p-3 pb-[15px] transition-colors"
                : "relative pb-[15px]"
            }
            onDragOver={handleDropZoneDragOver}
            onDragLeave={handleDropZoneDragLeave}
            onDrop={handleDropZoneDrop}
          >
            {!isRootLevel && canManageCourseResource && (
              <input
                ref={uploadInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
              />
            )}
            {isDropActive && (
              <div className="pointer-events-none mb-3 flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-background/80 px-4 py-3 text-sm text-primary">
                <Upload className="h-4 w-4" />
                松开鼠标后开始上传文件
              </div>
            )}
            <ResourceObjectList
              entries={resourceEntries}
              viewMode={viewMode}
              selectedIds={selectedIds}
              interactionMode={interactionMode}
              onToggleSelect={toggleSelect}
              onFolderClick={handleFolderClick}
              onCancelUpload={handleCancelUpload}
              onRetryUpload={handleRetryUpload}
              isRootLevel={isRootLevel}
              canRename={canManageCourseResource && !isRootLevel}
              onRename={handleOpenRename}
              canDelete={canManageCourseResource && !isRootLevel}
              onDelete={handleOpenDelete}
              onPreview={handleOpenPreview}
            />
          </div>
        </div>
      )}
      </div>
      <Dialog open={isCreateFolderOpen} onOpenChange={handleCreateFolderOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建文件夹</DialogTitle>
            <DialogDescription>请输入新文件夹名称，最多64个字符且不可包含特殊符号。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input value={newFolderName} onChange={(e) => handleFolderNameChange(e.target.value)} maxLength={64} placeholder="文件夹名称" />
            {folderNameError && <p className="text-xs text-destructive">{folderNameError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => handleCreateFolderOpenChange(false)}
              className="transition-colors hover:bg-primary hover:text-white"
            >
              取消
            </Button>
            {canManageCourseResource && (
              <Button
                onClick={handleCreateFolderConfirm}
                disabled={isCreateFolderConfirmDisabled}
                className="transition-colors hover:bg-primary hover:text-white"
              >
                {isCreatingFolder && <Spinner className="mr-2" />}
                确认
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {batchTransferSnapshot === null ? null : (
        <ResourceDestinationPickerDialog
          open
          nodeId={nodeId}
          ownerType={ownerType}
          sourceFolderId={batchTransferSnapshot.sourceFolderId}
          action={batchTransferSnapshot.action}
          isSubmitting={isBatchTransferring}
          onOpenChange={handleBatchTransferOpenChange}
          onConfirm={(targetFolderId) => void handleConfirmBatchTransfer(targetFolderId)}
        />
      )}
      <Dialog open={renameTarget !== null} onOpenChange={handleRenameOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名{renameTarget?.type === "folder" ? "文件夹" : "文件"}</DialogTitle>
            <DialogDescription>
              {renameTarget?.type === "file"
                ? "请输入完整文件名，可包含空格、点号、连字符和下划线，最多64个字符。"
                : "请输入新名称，最多64个字符且不可包含特殊符号。"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              value={renameName}
              onChange={(event) => handleRenameNameChange(event.target.value)}
              maxLength={64}
              placeholder="资源名称"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter" && !isRenameConfirmDisabled) {
                  event.preventDefault()
                  void handleRenameConfirm()
                }
              }}
            />
            {renameNameError && <p className="text-xs text-destructive">{renameNameError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={resetRenameForm}
              disabled={isRenaming}
              className="transition-colors hover:bg-primary hover:text-white"
            >
              取消
            </Button>
            {canManageCourseResource && !isRootLevel && (
              <Button
                onClick={() => void handleRenameConfirm()}
                disabled={isRenameConfirmDisabled}
                className="transition-colors hover:bg-primary hover:text-white"
              >
                {isRenaming && <Spinner className="mr-2" />}
                确认
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {deleteTarget === null ? null : (
        <AlertDialog open onOpenChange={handleDeleteTargetOpenChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除{deleteTarget.type === "folder" ? "文件夹" : "文件"}</AlertDialogTitle>
              <AlertDialogDescription>
                {`“${deleteTarget.name}”删除后无法恢复，请确认是否继续。`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingTarget}>取消</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeletingTarget}
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={(event) => {
                  event.preventDefault()
                  void handleDeleteTargetConfirm()
                }}
              >
                {isDeletingTarget ? <Spinner className="mr-2" /> : null}
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {previewTarget === null ? null : (
        <ResourcePreviewDrawer
          open={isPreviewOpen}
          resourceId={previewTarget.id}
          initialDisplayName={previewTarget.name}
          onOpenChange={handlePreviewOpenChange}
          onCloseAnimationEnd={handlePreviewCloseAnimationEnd}
          loadDetail={loadPreviewDetail}
        />
      )}
    </>
  )
}
