"use client"

import { Suspense, useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { TreeView } from "@/components/tree-view"
import { DetailPanel } from "@/components/detail-panel"
import { Header } from "@/components/header"
import { LoadingState } from "@/shared/components/ui/loading-state"
import { Button } from "@/shared/components/ui/button"
import { useTreeData } from "@/shared/hooks/use-tree-data"
import { useLocalStorage } from "@/shared/hooks/use-local-storage"
import { api, getStoredAuthUser, getStoredAuthToken, clearStoredAuthToken } from "@/lib/api"
import { findStarredNode, getFirstNode } from "@/shared/utils/tree-operations"
import { cn, extractNumericId } from "@/shared/utils/utils"
import type { TreeNode } from "@/types"
import { useSemesterStore } from "@/shared/stores/semester-store"
import { mergeAuthoritativeCourseNode, resolveCourseMajorId } from "./course-node-resolution"
import {
  canCommitSelectionRequest,
  createErrorSelectionResolution,
  createIdleSelectionResolution,
  createLoadingSelectionResolution,
  createReadySelectionResolution,
  getSelectionResolutionView,
  type SelectionResolutionContext,
  type SelectionResolutionState,
} from "./course-selection-resolution"

const CURRENT_SCHOOL_STORAGE_KEY = "education-current-school"
const TREE_COLLAPSED_STORAGE_KEY = "education-tree-collapsed"

const findNodeInTree = (node: TreeNode, targetId: string): TreeNode | null => {
  if (node.nodeId === targetId || node.id === targetId) {
    return node
  }

  if (!node.children || node.children.length === 0) {
    return null
  }

  for (const child of node.children) {
    const found = findNodeInTree(child, targetId)
    if (found) {
      return found
    }
  }

  return null
}

function hasNonEmptyArray<T>(value: T[] | null | undefined): value is T[] {
  return Array.isArray(value) && value.length > 0
}

function mergeTreeNodeWithRichNode(treeNode: TreeNode | null, richNode: TreeNode): TreeNode {
  if (!treeNode) {
    return richNode
  }

  return {
    ...treeNode,
    btnMenus: hasNonEmptyArray(richNode.btnMenus) ? richNode.btnMenus : treeNode.btnMenus,
    coverMenus: hasNonEmptyArray(richNode.coverMenus) ? richNode.coverMenus : treeNode.coverMenus,
    manager: richNode.manager !== undefined ? richNode.manager : treeNode.manager,
    metadata: {
      ...(treeNode.metadata ? treeNode.metadata : {}),
      ...(richNode.metadata ? richNode.metadata : {}),
    },
  }
}

export default function Page() {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <PageContent />
    </Suspense>
  )
}

function PageLoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.97_0.005_240)] via-[oklch(0.96_0.005_240)] to-[oklch(0.95_0.008_240)]">
      <LoadingState title="加载中..." className="h-screen" />
    </div>
  )
}

function PageContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [initialData, setInitialData] = useState<TreeNode | null>(null)
  const [currentSchoolId, setCurrentSchoolId] = useLocalStorage<string | null>(CURRENT_SCHOOL_STORAGE_KEY, null)
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [selectedNodePath, setSelectedNodePath] = useState<TreeNode[]>([])
  const [isTreeCollapsed, setIsTreeCollapsed] = useLocalStorage<boolean>(TREE_COLLAPSED_STORAGE_KEY, true)
  const [departmentMajors, setDepartmentMajors] = useState<Map<string, TreeNode[]>>(new Map())
  const [currentUser] = useState<{ username: string; role: string } | null>(() => {
    const authUser = getStoredAuthUser()
    if (!authUser) {
      return null
    }
    return {
      username: authUser.userName,
      role: "teacher",
    }
  })
  // 添加ref来存储TreeView的handleToggleExpand方法
  const treeViewRef = useRef<{ toggleExpand: (nodeId: string) => void }>(null)
  // 添加ref来引用右侧详情面板容器，用于滚动控制
  const detailPanelContainerRef = useRef<HTMLDivElement>(null)
  const treeRequestIdRef = useRef(0)
  const currentSchoolIdRef = useRef<string | null>(currentSchoolId)
  const selectedNodePathRef = useRef<TreeNode[]>([])
  const {
    treeData,
    addDepartment,
    addMajor,
    addCourse,
    updateNode,
    deleteNode,
    resetData: resetTreeData,
  } = useTreeData(initialData)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // [ADD] 节点选择与 URL 同步：URL 作为浏览器历史栈的载体，selectedNode 仍是 React state
  // 通过 selectedNodeRef 在异步闭包中读取最新值，避免在 setState 之外重复依赖 selectedNode
  const selectedNodeRef = useRef<TreeNode | null>(null)
  const pendingNavigationNodeRef = useRef<TreeNode | null>(null)
  const selectionRequestIdRef = useRef(0)
  const urlNodeId = searchParams.get("nodeId")
  const selectedSemesterId = useSemesterStore((state) => state.selectedSemesterId)
  const [selectionResolution, setSelectionResolution] = useState<SelectionResolutionState>(
    createIdleSelectionResolution,
  )
  const [selectionRetryToken, setSelectionRetryToken] = useState(0)
  const currentSelectionContext: SelectionResolutionContext | null = treeData !== null && urlNodeId !== null
    ? {
        treeData,
        nodeId: urlNodeId,
        semesterId: selectedSemesterId,
        retryToken: selectionRetryToken,
      }
    : null
  const selectionContextRef = useRef<SelectionResolutionContext | null>(currentSelectionContext)

  const resolveNextSelectedNode = useCallback((
    latestTree: TreeNode,
    previousSelectedNode: TreeNode | null,
    preferredSchoolId: string | null,
  ): TreeNode | null => {
    const latestSelectedNodePath = selectedNodePathRef.current

    if (previousSelectedNode) {
      const selectedByNodeId = findNodeInTree(latestTree, previousSelectedNode.nodeId)
      if (selectedByNodeId) {
        return selectedByNodeId
      }

      if (previousSelectedNode.id) {
        const selectedByNumericId = findNodeInTree(latestTree, previousSelectedNode.id)
        if (selectedByNumericId) {
          return selectedByNumericId
        }
      }

      if (latestSelectedNodePath.length > 1) {
        for (let index = latestSelectedNodePath.length - 2; index >= 0; index -= 1) {
          const fallbackNode = latestSelectedNodePath[index]
          const matchedFallbackNode = findNodeInTree(latestTree, fallbackNode.nodeId)
          if (matchedFallbackNode) {
            return matchedFallbackNode
          }
        }
      }
    }

    if (preferredSchoolId && Array.isArray(latestTree.children)) {
      const preferredSchoolNode = latestTree.children.find((child) => {
        if (child.nodeType !== "university") {
          return false
        }

        return extractNumericId(child.nodeId).toString() === preferredSchoolId
      })

      if (preferredSchoolNode) {
        return preferredSchoolNode
      }
    }

    const starredNode = findStarredNode(latestTree)
    if (starredNode) {
      return starredNode
    }

    const firstNode = getFirstNode(latestTree)
    return firstNode === undefined ? null : firstNode
  }, [])

  // [MOD] 移除冗余的 initializeFromStoredContext 调用，因为它已经在 SemesterStore 初始化时执行，且在重登过程中由 LoginForm 处理。
  // 此 useEffect 容易在 TreeData 加载时导致状态回流，从而显示“暂无学期”
  // useEffect(() => {
  //   initializeFromStoredContext(getStoredSemesterContext())
  // }, [initializeFromStoredContext])

  useEffect(() => {
    currentSchoolIdRef.current = currentSchoolId
  }, [currentSchoolId])

  useEffect(() => {
    selectedNodePathRef.current = selectedNodePath
  }, [selectedNodePath])

  // [ADD] 保持 ref 与 state 同步，供 loadTreeData 等闭包读取
  useEffect(() => {
    selectedNodeRef.current = selectedNode
  }, [selectedNode])

  // 当前完整解析上下文包含重试代次，防止旧请求在重试后写回。
  const urlNodeIdRef = useRef<string | null>(urlNodeId)
  urlNodeIdRef.current = urlNodeId
  selectionContextRef.current = currentSelectionContext

  // [ADD] 用户主动切换节点的统一入口：改写 URL 并入历史栈
  // URL → state 的同步由下面的 effect 负责，这里只负责写 URL
  const navigateToNode = useCallback((node: TreeNode | null) => {
    if (!node) {
      return
    }
    if (node.nodeId === selectedNodeRef.current?.nodeId) {
      return
    }
    pendingNavigationNodeRef.current = node
    router.push(`/?nodeId=${encodeURIComponent(node.nodeId)}`, { scroll: false })
  }, [router])

  // URL -> state：课程节点必须先从专业课程列表补齐负责人信息，再允许详情面板挂载。
  useEffect(() => {
    const requestId = selectionRequestIdRef.current + 1
    selectionRequestIdRef.current = requestId
    const invalidateRequest = () => {
      if (selectionRequestIdRef.current === requestId) {
        selectionRequestIdRef.current += 1
      }
    }

    if (treeData === null || urlNodeId === null) {
      setSelectionResolution(createIdleSelectionResolution())
      return invalidateRequest
    }

    const expectedTreeData = treeData
    const expectedNodeId = urlNodeId
    const expectedSemesterId = selectedSemesterId
    const resolutionContext: SelectionResolutionContext = {
      treeData: expectedTreeData,
      nodeId: expectedNodeId,
      semesterId: expectedSemesterId,
      retryToken: selectionRetryToken,
    }
    const canCommitRequest = () => canCommitSelectionRequest(
      selectionRequestIdRef.current,
      requestId,
      selectionContextRef.current,
      resolutionContext,
    )
    const found = findNodeInTree(expectedTreeData, expectedNodeId)
    const pendingNode = pendingNavigationNodeRef.current

    if (pendingNode?.nodeId === expectedNodeId && found !== null) {
      setSelectedNode(mergeTreeNodeWithRichNode(found, pendingNode))
      pendingNavigationNodeRef.current = null
      setSelectionResolution(createReadySelectionResolution(resolutionContext, requestId))
      return invalidateRequest
    }

    if (found === null) {
      if (pendingNode?.nodeId === expectedNodeId) {
        pendingNavigationNodeRef.current = null
      }
      setSelectedNode(null)
      setSelectionResolution(createErrorSelectionResolution(
        resolutionContext,
        requestId,
        `当前树中不存在节点 ${expectedNodeId}`,
      ))
      return invalidateRequest
    }

    if (found.nodeType !== "course") {
      setSelectedNode(found)
      setSelectionResolution(createReadySelectionResolution(resolutionContext, requestId))
      return invalidateRequest
    }

    setSelectedNode(null)
    setSelectionResolution(createLoadingSelectionResolution(resolutionContext, requestId))

    const resolveCourseNode = async () => {
      try {
        const majorId = resolveCourseMajorId(expectedTreeData, expectedNodeId)
        const response = await api.tree.getMajorCourses(majorId, expectedSemesterId)
        if (!canCommitRequest()) {
          return
        }

        if (!Array.isArray(response.data)) {
          const responseError = typeof response.error === "string" && response.error.trim() !== ""
            ? response.error
            : "课程负责人信息响应无效"
          throw new Error(responseError)
        }

        const resolvedCourseNode = mergeAuthoritativeCourseNode(found, response.data)
        if (!canCommitRequest()) {
          return
        }

        setSelectedNode(resolvedCourseNode)
        setSelectionResolution(createReadySelectionResolution(resolutionContext, requestId))
      } catch (error) {
        if (!canCommitRequest()) {
          return
        }

        const message = error instanceof Error ? error.message : "课程负责人信息加载失败"
        setSelectedNode(null)
        setSelectionResolution(createErrorSelectionResolution(resolutionContext, requestId, message))
      }
    }

    void resolveCourseNode()
    return invalidateRequest
  }, [selectedSemesterId, selectionRetryToken, treeData, urlNodeId])

  useEffect(() => {
    const loadTreeData = async () => {
      const requestId = ++treeRequestIdRef.current
      const token = getStoredAuthToken()
      if (!token) {
        router.replace("/login")
        return
      }

      setIsLoading(true)

      console.log("[Page] Start loading tree data")
      const response = await api.tree.getTree(undefined, selectedSemesterId)
      console.log("[Page] Tree API response:", response)

      if (treeRequestIdRef.current !== requestId) {
        return
      }

      if (response.status === 401) {
        // [MOD] 服务端判定 token 失效时，必须同步清除本地 token，
        // 否则登录页的“已登录则跳首页”兜底会与此处互踢形成死循环
        clearStoredAuthToken()
        router.replace("/login")
        return
      }

      if (response.data) {
        if (!Array.isArray(response.data.children)) {
          throw new Error("[Page] Tree root children is missing or invalid")
        }
        console.log("[Page] Tree data loaded. Root children count:", response.data.children.length)
        const latestTree = response.data
        const authUser = getStoredAuthUser()
        const preferredSchoolId = currentSchoolIdRef.current !== null
          ? currentSchoolIdRef.current
          : (typeof authUser?.collegeId === "number" ? String(authUser.collegeId) : null)
        setInitialData(latestTree)
        resetTreeData(latestTree)
        // [MOD] URL 的 nodeId 具有最高优先级（支持分享链接与返回键还原）；
        // 无 URL 或 URL 指向的节点已不存在时，走原有的 starred/first 兜底
        const urlNodeIdSnapshot = urlNodeIdRef.current
        const urlMatchedNode = urlNodeIdSnapshot
          ? findNodeInTree(latestTree, urlNodeIdSnapshot)
          : null
        const resolvedNode = urlMatchedNode !== null
          ? urlMatchedNode
          : resolveNextSelectedNode(latestTree, selectedNodeRef.current, preferredSchoolId)
        if (resolvedNode === null) {
          setSelectedNode(null)
        }
        // URL 与最终选中节点不一致时，用 replace 同步 URL（不入历史栈，避免首次访问就污染返回键）
        if (resolvedNode?.nodeId && resolvedNode.nodeId !== urlNodeIdSnapshot) {
          router.replace(`/?nodeId=${encodeURIComponent(resolvedNode.nodeId)}`, { scroll: false })
        }
      } else {
        console.error("[Page] Failed to load tree data:", response.error)
        const emptyTree: TreeNode = {
          nodeId: "root",
          nodeName: "根节点",
          nodeType: "root" as const,
          children: [],
        }
        setInitialData(emptyTree)
        resetTreeData(emptyTree)
        setSelectedNode(null)
      }
      setIsLoading(false)
    }

    void loadTreeData()
  }, [resetTreeData, resolveNextSelectedNode, router, selectedSemesterId])

  const effectiveSelectedNode = useMemo(() => {
    if (!selectedNode || !treeData) {
      return selectedNode
    }

    const treeNodeByNodeId = findNodeInTree(treeData, selectedNode.nodeId)
    const treeNode = treeNodeByNodeId !== null
      ? treeNodeByNodeId
      : (selectedNode.id ? findNodeInTree(treeData, selectedNode.id) : null)
    if (!treeNode) {
      return null
    }

    return mergeTreeNodeWithRichNode(treeNode, selectedNode)
  }, [selectedNode, treeData])

  const selectionResolutionView = getSelectionResolutionView(selectionResolution, currentSelectionContext)
  const canRenderDetailPanel = selectionResolutionView === "ready"
    && effectiveSelectedNode !== null
    && effectiveSelectedNode.nodeId === urlNodeId
  const currentSelectionError = selectionResolutionView === "error" && selectionResolution.status === "error"
    ? selectionResolution.error
    : null
  const urlMatchedTreeNode = treeData !== null && urlNodeId !== null
    ? findNodeInTree(treeData, urlNodeId)
    : null
  const selectionLoadingTitle = urlMatchedTreeNode?.nodeType === "course"
    ? "正在加载课程权限信息"
    : "正在加载页面信息"

  useEffect(() => {
    console.log("[Page] selectedNode changed:", selectedNode)
  }, [selectedNode])

  useEffect(() => {
    if (selectedNode?.nodeType !== "university") {
      return
    }

    setCurrentSchoolId(extractNumericId(selectedNode.nodeId).toString())
  }, [selectedNode?.nodeId, selectedNode?.nodeType, setCurrentSchoolId])

  // 当选中节点变化时，滚动右侧详情面板到顶部
  useEffect(() => {
    if (selectedNode?.nodeId && detailPanelContainerRef.current) {
      detailPanelContainerRef.current.scrollTo({ top: 0, behavior: "instant" })
    }
  }, [selectedNode?.nodeId])

  const handleAddDepartment = (universityId: string, newDepartment: Omit<TreeNode, "id" | "nodeId">) => {
    addDepartment(universityId, newDepartment)
  }

  const handleAddMajor = (departmentId: string, newMajor: Omit<TreeNode, "id" | "nodeId">) => {
    addMajor(departmentId, newMajor)
  }

  const handleAddCourse = (majorId: string, newCourse: Omit<TreeNode, "id" | "nodeId">) => {
    addCourse(majorId, newCourse)
  }

  const handleUpdateNode = (nodeId: string, updates: Partial<TreeNode>) => {
    updateNode(nodeId, updates)
  }

  const handleDeleteNode = (nodeId: string) => {
    deleteNode(nodeId)
  }

  const handleSetCurrentSchool = (schoolId: string) => {
    setCurrentSchoolId(schoolId)
  }

  const handleResetData = () => {
    if (confirm("确定要重置所有数据到初始状态吗？此操作不可撤销。")) {
      window.location.reload()
    }
  }

  const handleToggleTreeCollapse = () => {
    setIsTreeCollapsed((prev) => !prev)
  }

  // 创建handleToggleExpand函数，用于从详情面板触发树形节点的展开和动态加载
  const handleToggleExpand = (nodeId: string) => {
    if (treeViewRef.current) {
      treeViewRef.current.toggleExpand(nodeId)
    }
  }

  const refreshTreeData = useCallback(async (): Promise<boolean> => {
    try {
      const requestId = ++treeRequestIdRef.current
      const response = await api.tree.getTree(undefined, selectedSemesterId)
      if (treeRequestIdRef.current !== requestId) {
        return false
      }

      if (!response.data) {
        console.error("[Page] Failed to refresh tree data:", response.error)
        setIsLoading(false)
        return false
      }

      const latestTree = response.data
      const authUser = getStoredAuthUser()
      const preferredSchoolId = currentSchoolIdRef.current !== null
        ? currentSchoolIdRef.current
        : (typeof authUser?.collegeId === "number" ? String(authUser.collegeId) : null)
      setInitialData(latestTree)
      resetTreeData(latestTree)

      // [MOD] 树刷新后，优先保持 URL 指定的节点；若该节点已被删除，走原有兜底并同步 URL
      const urlNodeIdSnapshot = urlNodeIdRef.current
      const urlMatchedNode = urlNodeIdSnapshot
        ? findNodeInTree(latestTree, urlNodeIdSnapshot)
        : null
      const resolvedNode = urlMatchedNode !== null
        ? urlMatchedNode
        : resolveNextSelectedNode(latestTree, selectedNodeRef.current, preferredSchoolId)
      if (resolvedNode === null) {
        setSelectedNode(null)
      }
      if (resolvedNode?.nodeId && resolvedNode.nodeId !== urlNodeIdSnapshot) {
        router.replace(`/?nodeId=${encodeURIComponent(resolvedNode.nodeId)}`, { scroll: false })
      }
      setIsLoading(false)

      return true
    } catch (error) {
      console.error("[Page] Tree data refresh threw an error:", error)
      setIsLoading(false)
      return false
    }
  }, [resetTreeData, resolveNextSelectedNode, router, selectedSemesterId])

  if (isLoading || !treeData) {
    return <PageLoadingState />
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[oklch(0.97_0.005_240)] via-[oklch(0.96_0.005_240)] to-[oklch(0.95_0.008_240)] px-6 py-6 md:py-8 overflow-hidden flex flex-col">
      <div className="w-full flex flex-col flex-1 min-h-0">
        <Header
          onResetData={handleResetData}
          isTreeCollapsed={isTreeCollapsed}
          currentPath={pathname}
          selectedNodeName={effectiveSelectedNode?.nodeName}
          treeData={treeData}
        />

        <div className="flex gap-3 relative w-full flex-1 min-h-0">
          <div
            className={cn(
              "flex-shrink-0 transition-all duration-300 ease-in-out relative",
              isTreeCollapsed ? "w-[70px]" : "w-[calc(23%-0.375rem)]"
            )}
          >
            <TreeView
              ref={treeViewRef}
              treeData={treeData}
              onNodeSelect={navigateToNode}
              onSelectedNodePathChange={setSelectedNodePath}
              selectedNode={effectiveSelectedNode}
              onWorkshopCreated={refreshTreeData}
              selectedSemesterId={selectedSemesterId}
              currentSchoolId={currentSchoolId}
              onSetCurrentSchool={handleSetCurrentSchool}
              onUpdateNode={handleUpdateNode}
              isCollapsed={isTreeCollapsed}
              onToggleCollapse={handleToggleTreeCollapse}
              onDepartmentMajorsChange={setDepartmentMajors}
            />
          </div>
          <div
            ref={detailPanelContainerRef}
            className={cn(
              "flex-shrink-0 transition-all duration-300 ease-in-out overflow-y-auto",
              isTreeCollapsed ? "w-[calc(100%-70px-0.75rem)]" : "w-[calc(77%-0.375rem)]"
            )}
          >
            {canRenderDetailPanel ? (
              <DetailPanel
                node={effectiveSelectedNode}
                treeData={treeData}
                selectedNodePath={selectedNodePath}
                onNodeSelect={navigateToNode}
                onTreeRefresh={refreshTreeData}
                onAddDepartment={handleAddDepartment}
                onAddMajor={handleAddMajor}
                onAddCourse={handleAddCourse}
                onUpdateNode={handleUpdateNode}
                onDeleteNode={handleDeleteNode}
                departmentMajors={departmentMajors}
                currentUser={currentUser}
                // 传入handleToggleExpand回调
                onToggleExpand={handleToggleExpand}
              />
            ) : currentSelectionError !== null ? (
              <div
                className="flex min-h-[500px] items-center justify-center rounded-xl border border-border bg-card/30 p-6 shadow-2xl backdrop-blur-md"
                role="alert"
              >
                <div className="max-w-lg text-center">
                  <h2 className="text-lg font-semibold text-foreground">课程权限信息加载失败</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{currentSelectionError}</p>
                  <Button
                    type="button"
                    className="mt-6"
                    onClick={() => setSelectionRetryToken((currentToken) => currentToken + 1)}
                  >
                    重试
                  </Button>
                </div>
              </div>
            ) : (
              <LoadingState title={selectionLoadingTitle} variant="card" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
