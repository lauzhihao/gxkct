"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ResourceFolder, ResourceObjectSummary, ResourcePagination } from "@/lib/api"
import { courseResourcesApi } from "@/modules/courses/api/courseResourcesApi"
import { showError } from "@/shared/utils/toast-utils"

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
  objects: ResourceObjectSummary[]
  objectsPagination: ResourcePagination | null
  isLoading: boolean
  error: string | null
  isObjectsLoading: boolean
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
  reloadObjects: () => void
  initializeFolders: () => Promise<void>
}

export function useCourseResources(courseId?: string | null): UseCourseResourcesResult {
  const [directories, setDirectories] = useState<ResourceFolder[]>([])
  const [objects, setObjects] = useState<ResourceObjectSummary[]>([])
  const [objectsPagination, setObjectsPagination] = useState<ResourcePagination | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<ResourceBreadcrumbNode[]>([ROOT_CRUMB])
  const [currentParentId, setCurrentParentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isObjectsLoading, setIsObjectsLoading] = useState(false)
  const [objectsError, setObjectsError] = useState<string | null>(null)
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
          setNeedInitialization(parentId === null)
          return
        }
        const list = response.data ?? []
        if (parentId === null && list.length === 0) {
          setNeedInitialization(true)
        } else {
          setNeedInitialization(false)
        }
        if (nextBreadcrumbs) {
          setBreadcrumbs(nextBreadcrumbs)
        }
        setDirectories(list)
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

  const loadObjects = useCallback(
    async (folderId: string | null, keyword?: string) => {
      if (!courseId || !folderId) {
        setObjects([])
        setObjectsPagination(null)
        setObjectsError(null)
        return
      }
      setIsObjectsLoading(true)
      setObjectsError(null)
      try {
        const response = await courseResourcesApi.getObjects(courseId, {
          folderId,
          keyword: keyword?.trim() ? keyword : undefined,
          offset: 0,
          limit: viewMode === "grid" ? 24 : 50,
          sortField: "uploadedAt",
          sortOrder: "desc",
          viewMode,
        })
        if (response.error) {
          setObjects([])
          setObjectsPagination(null)
          setObjectsError(response.error)
          showError(response.error)
          return
        }
        setObjects(response.data?.items ?? [])
        setObjectsPagination(response.data?.pagination ?? null)
      } catch (err) {
        const message = err instanceof Error ? err.message : "加载文件失败"
        setObjectsError(message)
        showError(message)
      } finally {
        setIsObjectsLoading(false)
      }
    },
    [courseId, viewMode],
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
    void loadObjects(currentParentId, searchTerm)
  }, [breadcrumbs, currentParentId, loadFolders, loadObjects, searchTerm])

  const reloadObjects = useCallback(() => {
    void loadObjects(currentParentId, searchTerm)
  }, [currentParentId, loadObjects, searchTerm])

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
      setObjects([])
      setObjectsPagination(null)
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
      setObjectsError(null)
      return
    }
    setBreadcrumbs([ROOT_CRUMB])
    setCurrentParentId(null)
    setSearchTerm("")
    void loadFolders(null, [ROOT_CRUMB])
  }, [courseId, loadFolders])

  useEffect(() => {
    if (!courseId || !currentParentId) {
      setObjects([])
      setObjectsPagination(null)
      setObjectsError(null)
      return
    }
    void loadObjects(currentParentId, searchTerm)
  }, [courseId, currentParentId, searchTerm, viewMode, loadObjects])

  const state = useMemo<UseCourseResourcesResult>(
    () => ({
      breadcrumbs,
      currentParentId,
      directories,
      objects,
      objectsPagination,
      isLoading,
      error,
      isObjectsLoading,
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
      reloadObjects,
      initializeFolders,
    }),
    [
      breadcrumbs,
      currentParentId,
      directories,
      objects,
      objectsPagination,
      isLoading,
      error,
      isObjectsLoading,
      objectsError,
      needInitialization,
      isInitializing,
      searchTerm,
      viewMode,
      enterFolder,
      goToBreadcrumb,
      refreshCurrentLevel,
      reloadObjects,
      initializeFolders,
    ],
  )

  return state
}
