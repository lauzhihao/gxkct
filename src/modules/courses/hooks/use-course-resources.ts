"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ResourceFolder, ResourcePagination } from "@/lib/api"
import { courseResourcesApi } from "@/modules/courses/api/courseResourcesApi"
import { showError } from "@/shared/utils/toast-utils"

// 后端返回的资源项类型（包含文件夹和文件）
interface ResourceItem extends ResourceFolder {
  type: "folder" | "file"
  size?: number | null
  mimeType?: string | null
  downloadUrl?: string | null
  uploader?: { id: string; name: string | null } | null
  uploadedAt?: string | null
  version?: string | null
}

// 文件对象类型（用于前端展示）
export interface ResourceObject {
  id: string
  name: string
  displayName?: string
  type: "file"
  size: number
  mimeType: string
  downloadUrl: string
  uploader?: { id: string; name: string | null } | null
  uploadedAt: string | null
}

export interface ResourceBreadcrumbNode {
  id: string | null
  name: string
}

const ROOT_CRUMB: ResourceBreadcrumbNode = {
  id: null,
  name: "课程资源",
}

interface UseCourseResourcesResult {
  breadcrumbs: ResourceBreadcrumbNode[]
  currentParentId: string | null
  directories: ResourceFolder[]
  objects: ResourceObject[]
  objectsPagination: ResourcePagination | null
  isLoading: boolean
  isObjectsLoading: boolean
  error: string | null
  objectsError: string | null
  needInitialization: boolean
  isInitializing: boolean
  isRootLevel: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  viewMode: "grid" | "list"
  setViewMode: (mode: "grid" | "list") => void
  enterFolder: (folder: ResourceFolder) => void
  goToBreadcrumb: (index: number) => void
  refreshCurrentLevel: () => void
  initializeFolders: () => Promise<void>
}

export function useCourseResources(courseId?: string | null): UseCourseResourcesResult {
  const [directories, setDirectories] = useState<ResourceFolder[]>([])
  const [objects, setObjects] = useState<ResourceObject[]>([])
  const [objectsPagination, setObjectsPagination] = useState<ResourcePagination | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<ResourceBreadcrumbNode[]>([ROOT_CRUMB])
  const [currentParentId, setCurrentParentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isObjectsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [objectsError] = useState<string | null>(null)
  const [needInitialization, setNeedInitialization] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const loadFolders = useCallback(
    async (parentId: string | null, nextBreadcrumbs?: ResourceBreadcrumbNode[]) => {
      if (!courseId) return
      setIsLoading(true)
      setError(null)
      try {
        const response = await courseResourcesApi.getFolders(courseId, parentId ?? undefined)
        if (response.error) {
          setError(response.error)
          showError(response.error)
          setDirectories([])
          setObjects([])
          setNeedInitialization(parentId === null)
          return
        }
        const list = (response.data ?? []) as ResourceItem[]
        // 根据type字段分离文件夹和文件
        const folders: ResourceFolder[] = []
        const files: ResourceObject[] = []
        for (const item of list) {
          if (item.type === "folder") {
            folders.push({
              id: item.id,
              name: item.name,
              parentId: item.parentId,
              hasChildren: item.hasChildren,
              filesCount: item.filesCount,
              latestUploadedAt: item.latestUploadedAt,
            })
          } else if (item.type === "file") {
            files.push({
              id: item.id,
              name: item.name,
              type: "file",
              size: item.size ?? 0,
              mimeType: item.mimeType ?? "application/octet-stream",
              downloadUrl: item.downloadUrl ?? "",
              uploader: item.uploader,
              uploadedAt: item.uploadedAt ?? null,
            })
          }
        }
        if (parentId === null && folders.length === 0) {
          setNeedInitialization(true)
        } else {
          setNeedInitialization(false)
        }
        if (nextBreadcrumbs) {
          setBreadcrumbs(nextBreadcrumbs)
        }
        setDirectories(folders)
        setObjects(files)
        setCurrentParentId(parentId)
      } catch (err) {
        const message = err instanceof Error ? err.message : "加载目录失败"
        setError(message)
        showError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [courseId],
  )

  const enterFolder = useCallback(
    (folder: ResourceFolder) => {
      const nextBreadcrumbs = [...breadcrumbs, { id: folder.id, name: folder.name }]
      void loadFolders(folder.id, nextBreadcrumbs)
    },
    [breadcrumbs, loadFolders],
  )

  const goToBreadcrumb = useCallback(
    (index: number) => {
      if (index < 0 || index >= breadcrumbs.length) return
      const nextBreadcrumbs = breadcrumbs.slice(0, index + 1)
      const target = nextBreadcrumbs[nextBreadcrumbs.length - 1]
      void loadFolders(target.id, nextBreadcrumbs)
    },
    [breadcrumbs, loadFolders],
  )

  const refreshCurrentLevel = useCallback(() => {
    void loadFolders(currentParentId, breadcrumbs)
  }, [breadcrumbs, currentParentId, loadFolders])

  const initializeFolders = useCallback(async () => {
    if (!courseId || isInitializing) return
    setIsInitializing(true)
    setError(null)
    try {
      const response = await courseResourcesApi.initializeFolders(courseId)
      if (response.error) {
        showError(response.error)
        setError(response.error)
        return
      }
      await loadFolders(null, [ROOT_CRUMB])
      setSearchTerm("")
    } catch (err) {
      const message = err instanceof Error ? err.message : "初始化目录失败"
      setError(message)
      showError(message)
    } finally {
      setIsInitializing(false)
    }
  }, [courseId, isInitializing, loadFolders])

  useEffect(() => {
    if (!courseId) {
      setDirectories([])
      setObjects([])
      setObjectsPagination(null)
      setBreadcrumbs([ROOT_CRUMB])
      setCurrentParentId(null)
      setNeedInitialization(false)
      setError(null)
      setSearchTerm("")
      return
    }
    setBreadcrumbs([ROOT_CRUMB])
    setCurrentParentId(null)
    setSearchTerm("")
    void loadFolders(null, [ROOT_CRUMB])
  }, [courseId, loadFolders])

  const state = useMemo<UseCourseResourcesResult>(
    () => ({
      breadcrumbs,
      currentParentId,
      directories,
      objects,
      objectsPagination,
      isLoading,
      isObjectsLoading,
      error,
      objectsError,
      needInitialization,
      isInitializing,
      isRootLevel: currentParentId === null,
      searchTerm,
      setSearchTerm,
      viewMode,
      setViewMode,
      enterFolder,
      goToBreadcrumb,
      refreshCurrentLevel,
      initializeFolders,
    }),
    [
      breadcrumbs,
      currentParentId,
      directories,
      objects,
      objectsPagination,
      isLoading,
      isObjectsLoading,
      error,
      objectsError,
      needInitialization,
      isInitializing,
      searchTerm,
      viewMode,
      enterFolder,
      goToBreadcrumb,
      refreshCurrentLevel,
      initializeFolders,
    ],
  )

  return state
}
