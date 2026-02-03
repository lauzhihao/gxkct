"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw, FolderPlus, Copy, Scissors, Trash2, Search as SearchIcon } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Empty, EmptyDescription, EmptyTitle } from "@/shared/components/ui/empty"
import { Input } from "@/shared/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { ResourceBreadcrumb } from "./ResourceBreadcrumb"
import { ResourceSearchBar } from "./ResourceSearchBar"
import { ResourceObjectList } from "./ResourceObjectList"
import type { ResourceEntry } from "./types"
import { useCourseResources } from "@/modules/courses/hooks/use-course-resources"
import { courseResourcesApi } from "@/modules/courses/api/courseResourcesApi"
import { showError, showSuccess, showInfo } from "@/shared/utils/toast-utils"

interface CourseResourcesContainerProps {
  nodeId: string | null
}

export function CourseResourcesContainer({ nodeId }: CourseResourcesContainerProps) {
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
    viewMode,
    setViewMode,
    enterFolder,
    goToBreadcrumb,
    refreshCurrentLevel,
    initializeFolders,
  } = useCourseResources(nodeId)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [folderNameError, setFolderNameError] = useState<string | null>(null)
  const [rootFolderSearch, setRootFolderSearch] = useState("")
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  useEffect(() => {
    setSelectedIds(new Set())
  }, [currentParentId])

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

  const toggleSelect = useCallback((objectId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(objectId)) {
        next.delete(objectId)
      } else {
        next.add(objectId)
      }
      return next
    })
  }, [])

  const handleDeleteSelected = useCallback(async () => {
    if (!nodeId || !currentParentId || selectedIds.size === 0) return
    setIsDeleting(true)
    try {
      const response = await courseResourcesApi.batchAction(nodeId, {
        action: "delete",
        sourceFolderId: currentParentId,
        objectIds: Array.from(selectedIds),
      })
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
  }, [nodeId, currentParentId, selectedIds, refreshCurrentLevel])

  const calculateChecksum = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  }, [])

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      if (!nodeId || !currentParentId) {
        showError("请先进入具体目录再上传文件")
        return []
      }
      const uploadedPaths: string[] = []
      for (const file of files) {
        const signatureResponse = await courseResourcesApi.getUploadSignature(nodeId, currentParentId, {
          fileName: file.name,
          mimeType: file.type || undefined,
          size: file.size,
        })
        if (signatureResponse.error || !signatureResponse.data) {
          const message = signatureResponse.error ?? "获取上传签名失败"
          showError(message)
          throw new Error(message)
        }
        const { uploadUrl, uploadHeaders, uploadMethod, uploadPath } = signatureResponse.data
        if (!uploadUrl || !uploadPath) {
          const message = "上传签名响应缺少必要信息"
          showError(message)
          throw new Error(message)
        }
        const uploadResponse = await fetch(uploadUrl, {
          method: uploadMethod ?? "PUT",
          headers: uploadHeaders,
          body: file,
        })
        if (!uploadResponse.ok) {
          const message = `上传文件 ${file.name} 失败`
          showError(message)
          throw new Error(message)
        }
        const checksum = await calculateChecksum(file)
        const confirmResponse = await courseResourcesApi.confirmUpload(nodeId, currentParentId, {
          fileName: file.name,
          uploadPath,
          size: file.size,
          mimeType: file.type || undefined,
          checksum,
        })
        if (confirmResponse.error) {
          showError(confirmResponse.error)
          throw new Error(confirmResponse.error)
        }
        uploadedPaths.push(uploadPath)
      }
      showSuccess("文件上传成功")
      refreshCurrentLevel()
      return uploadedPaths
    },
    [calculateChecksum, currentParentId, nodeId, refreshCurrentLevel],
  )

  const resetFolderForm = useCallback(() => {
    setNewFolderName("")
    setFolderNameError(null)
  }, [])

  const handleOpenCreateFolder = useCallback(() => {
    resetFolderForm()
    setIsCreatingFolder(false)
    setIsCreateFolderOpen(true)
  }, [resetFolderForm])

  const validateFolderName = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      return "文件夹名称不能为空"
    }
    if (trimmed.length > 64) {
      return "文件夹名称不能超过64个字符"
    }
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9\s]+$/.test(trimmed)) {
      return "文件夹名称包含特殊符号，请重新输入"
    }
    return null
  }, [])

  const handleFolderNameChange = useCallback(
    (value: string) => {
      setNewFolderName(value)
      setFolderNameError(validateFolderName(value))
    },
    [validateFolderName],
  )

  const handleCreateFolderConfirm = useCallback(async () => {
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
      })
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
  }, [currentParentId, newFolderName, nodeId, refreshCurrentLevel, resetFolderForm, validateFolderName])

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

  const filteredDirectories = useMemo(() => {
    if (!isRootLevel || !rootFolderSearch.trim()) {
      return directories
    }
    const keyword = rootFolderSearch.trim().toLowerCase()
    return directories.filter((folder) => folder.name.toLowerCase().includes(keyword))
  }, [directories, isRootLevel, rootFolderSearch])

  const resourceEntries = useMemo<ResourceEntry[]>(() => {
    const folderEntries: ResourceEntry[] = filteredDirectories.map((folder) => ({
      type: "folder",
      folder,
    }))
    const objectEntries: ResourceEntry[] = objects.map((object) => ({
      type: "object",
      object,
    }))
    return [...folderEntries, ...objectEntries]
  }, [filteredDirectories, objects])

  const hasSelectableObjects = resourceEntries.some((entry) => entry.type === "object")
  const showActions = !needInitialization && !isRootLevel
  const isCreateFolderDisabled = isLoading
  const isCreateFolderConfirmDisabled =
    isCreatingFolder || Boolean(folderNameError) || newFolderName.trim().length === 0

  if (!nodeId) {
    return (
      <Empty>
        <EmptyTitle>暂无课程数据</EmptyTitle>
        <EmptyDescription>请选择具体课程后查看课程资源。</EmptyDescription>
      </Empty>
    )
  }

  return (
    <>
      <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ResourceBreadcrumb path={breadcrumbs} onCrumbClick={goToBreadcrumb} />
        {showActions ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <ResourceSearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="搜索当前目录下的文件"
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              uploadProps={{
                onUpload: handleUploadFiles,
                buttonText: "上传",
                fileType: "任意文件",
                maxFileCount: 20,
                disabled: isLoading,
                buttonClassName: "text-muted-foreground",
              }}
              onCreateFolderClick={handleOpenCreateFolder}
              disableCreateFolder={isCreateFolderDisabled}
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
          <p className="text-sm text-muted-foreground">当前课程尚未初始化资源目录</p>
          <Button onClick={initializeFolders} disabled={isInitializing} className="min-w-[160px]">
            {isInitializing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            初始化目录
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          正在加载目录
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {hasSelectableObjects && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>已选 {selectedCount} 个对象</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="gap-1 text-muted-foreground transition-colors hover:bg-primary hover:text-white hover:[&>svg]:text-white"
                >
                  <Copy className="h-4 w-4" />
                  复制
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="gap-1 text-muted-foreground transition-colors hover:bg-primary hover:text-white hover:[&>svg]:text-white"
                >
                  <Scissors className="h-4 w-4" />
                  剪切
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1 transition-colors hover:bg-primary hover:text-white hover:[&>svg]:text-white"
                  disabled={selectedCount === 0 || isDeleting}
                  onClick={handleDeleteSelected}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  删除
                </Button>
              </div>
            </div>
          )}
          <div className="relative pb-[15px]">
            <ResourceObjectList
              entries={resourceEntries}
              viewMode={viewMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onFolderClick={enterFolder}
              isRootLevel={isRootLevel}
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
            <Button
              onClick={handleCreateFolderConfirm}
              disabled={isCreateFolderConfirmDisabled}
              className="transition-colors hover:bg-primary hover:text-white"
            >
              {isCreatingFolder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
