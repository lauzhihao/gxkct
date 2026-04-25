"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ReactElement } from "react"
import { ArrowRight, CheckCircle2, Clock, Loader2, TriangleAlert, Upload, XCircle } from "lucide-react"
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
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { OrganizationTreePanel } from "@/shared/components/organization-tree-panel"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"
import {
  importMajorApi,
  type ImportMajorItemStatus,
  type ImportMajorNodeType,
  type ImportMajorStreamEvent,
  type ImportMajorStreamItemPayload,
  type ImportMajorStreamRequest,
} from "@/lib/api/import-major-api"
import type { TreeNode } from "@/types"

const EMPTY_SELECTED_IDS = new Set<string>()
const SOURCE_INITIAL_EXPANDED_IDS = ["root"]
const ERROR_MESSAGE_CLASS_NAME =
  "rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 " +
  "text-sm text-destructive"

interface ImportMajorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  treeData: TreeNode | null
  currentDepartment: TreeNode
}

type TargetTreeState =
  | {
      status: "ready"
      tree: TreeNode
      school: TreeNode
      department: TreeNode
    }
  | {
      status: "error"
      message: string
    }

type ImportPhase = "selecting" | "importing" | "failed"
type ImportNodeStatus = ImportMajorItemStatus
interface ImportNodeProgress {
  status: ImportNodeStatus
  reason: string | null
}

function getPanelNodeId(node: TreeNode): string {
  if (node.id) return node.id
  if (node.nodeId) return node.nodeId
  throw new Error("组织节点缺少可用ID")
}

function getNodeKey(node: TreeNode): string {
  if (node.id) return node.id
  if (node.nodeId) return node.nodeId
  throw new Error("组织节点缺少可用ID")
}

function getDepartmentDisplayName(node: TreeNode): string {
  if (node.nodeName) return node.nodeName
  if (node.name) return node.name
  throw new Error("目标院系缺少名称")
}

function isSameBusinessNode(candidate: TreeNode, target: TreeNode): boolean {
  if (candidate.nodeId === target.nodeId) return true
  if (candidate.id) {
    if (target.id) {
      if (candidate.id === target.id && candidate.nodeType === target.nodeType) return true
    }
  }
  return false
}

function findNodePath(root: TreeNode, target: TreeNode): TreeNode[] | null {
  if (isSameBusinessNode(root, target)) return [root]

  if (!root.children) return null

  for (const child of root.children) {
    const childPath = findNodePath(child, target)
    if (childPath) {
      return [root, ...childPath]
    }
  }

  return null
}

function findNodeByKey(root: TreeNode, targetKey: string): TreeNode | null {
  if (getNodeKey(root) === targetKey) return root
  if (root.nodeId === targetKey) return root
  if (root.id === targetKey) return root

  if (!root.children) return null

  for (const child of root.children) {
    const foundNode = findNodeByKey(child, targetKey)
    if (foundNode) return foundNode
  }

  return null
}

function buildTargetTree(treeData: TreeNode | null, currentDepartment: TreeNode): TargetTreeState {
  if (!treeData) {
    return { status: "error", message: "无法获取组织树数据，暂不能绘制导入目标。" }
  }

  if (currentDepartment.nodeType !== "department") {
    return { status: "error", message: "当前节点不是院系，暂不能导入专业。" }
  }

  const path = findNodePath(treeData, currentDepartment)
  if (!path) {
    return { status: "error", message: "无法在组织树中定位当前院系。" }
  }

  const school = path.find((item) => item.nodeType === "university")
  if (!school) {
    return { status: "error", message: "无法在组织树中定位当前学校。" }
  }

  const targetDepartment = { ...currentDepartment, children: [] }
  const targetSchool = { ...school, children: [targetDepartment] }

  return {
    status: "ready",
    tree: targetSchool,
    school: targetSchool,
    department: targetDepartment,
  }
}

function isImportableSourceNode(node: TreeNode): boolean {
  if (node.nodeType === "major") return true
  if (node.nodeType === "course") return true
  return false
}

function isSelectedOrIndeterminate(checked: boolean | "indeterminate"): boolean {
  if (checked === true) return true
  if (checked === "indeterminate") return true
  return false
}

function isCourseParentMatched(parentId: string, majorKey: string, major: TreeNode): boolean {
  if (parentId === majorKey) return true
  if (major.id) {
    if (parentId === major.id) return true
  }
  if (parentId === major.nodeId) return true
  return false
}

function getImportStatusLabel(status: ImportNodeStatus): string {
  if (status === "pending") return "等待开始"
  if (status === "running") return "正在导入"
  if (status === "completed") return "导入完成"
  if (status === "failed") return "导入失败"
  return "导入异常"
}

function isImportNodeStatus(value: unknown): value is ImportNodeStatus {
  if (value === "pending") return true
  if (value === "running") return true
  if (value === "completed") return true
  if (value === "failed") return true
  if (value === "warning") return true
  return false
}

function readNonEmptyString(value: string | undefined, message: string): string {
  if (typeof value !== "string") {
    throw new Error(message)
  }
  if (value.trim().length === 0) {
    throw new Error(message)
  }
  return value
}

function parseNumericIdFromText(value: string): number | null {
  const pureNumber = value.match(/^\d+$/)
  if (pureNumber) {
    return Number(value)
  }

  const trailingNumber = value.match(/_(\d+)$/)
  if (trailingNumber) {
    return Number(trailingNumber[1])
  }

  return null
}

function getBusinessNumericId(node: TreeNode, label: string): number {
  const candidates: string[] = []

  if (node.id) {
    candidates.push(node.id)
  }
  if (node.nodeId) {
    candidates.push(node.nodeId)
  }

  for (const candidate of candidates) {
    const parsedId = parseNumericIdFromText(candidate)
    if (typeof parsedId === "number") {
      return parsedId
    }
  }

  throw new Error(`${label}缺少有效数字ID`)
}

function getSourceNodeId(node: TreeNode): string {
  return readNonEmptyString(node.nodeId, "来源节点缺少nodeId")
}

function getSourceNodeName(node: TreeNode): string {
  return readNonEmptyString(node.nodeName, "来源节点缺少名称")
}

function readImportNodeType(node: TreeNode): ImportMajorNodeType {
  if (node.nodeType === "major") return "major"
  if (node.nodeType === "course") return "course"
  throw new Error("只支持导入专业或课程节点")
}

function collectNodesWithMajorContext(treeData: TreeNode | null, selectedNodes: TreeNode[]): TreeNode[] {
  const nodesByKey = new Map<string, TreeNode>()

  selectedNodes.forEach((node) => {
    if (node.nodeType === "course") {
      if (!node.parentId) {
        throw new Error("课程节点缺少所属专业ID")
      }
      if (!treeData) {
        throw new Error("无法获取来源树数据，不能定位课程所属专业")
      }

      const parentMajor = findNodeByKey(treeData, node.parentId)
      if (!parentMajor) {
        throw new Error("无法定位课程所属专业")
      }
      if (parentMajor.nodeType !== "major") {
        throw new Error("课程节点所属父级不是专业")
      }
      nodesByKey.set(getNodeKey(parentMajor), parentMajor)
    }
    nodesByKey.set(getNodeKey(node), node)
  })

  return Array.from(nodesByKey.values())
}

function findCourseParentMajor(treeData: TreeNode | null, courseNode: TreeNode): TreeNode {
  if (!courseNode.parentId) {
    throw new Error("课程节点缺少所属专业ID")
  }
  if (!treeData) {
    throw new Error("无法获取来源树数据，不能定位课程所属专业")
  }

  const parentMajor = findNodeByKey(treeData, courseNode.parentId)
  if (!parentMajor) {
    throw new Error("无法定位课程所属专业")
  }
  if (parentMajor.nodeType !== "major") {
    throw new Error("课程节点所属父级不是专业")
  }
  return parentMajor
}

function buildImportPayloadItem(treeData: TreeNode | null, node: TreeNode): ImportMajorStreamItemPayload {
  const nodeType = readImportNodeType(node)
  const item: ImportMajorStreamItemPayload = {
    nodeType,
    sourceNodeId: getSourceNodeId(node),
    nodeName: getSourceNodeName(node),
  }

  if (node.parentId) {
    item.sourceParentId = node.parentId
  }

  if (nodeType === "course") {
    const parentMajor = findCourseParentMajor(treeData, node)
    item.sourceMajorId = getBusinessNumericId(parentMajor, "来源专业")
  }

  return item
}

function buildImportPayload(
  treeData: TreeNode | null,
  transferredNodes: TreeNode[],
): ImportMajorStreamRequest {
  if (transferredNodes.length === 0) {
    throw new Error("请先选择要导入的专业或课程")
  }

  return {
    items: transferredNodes.map((node) => buildImportPayloadItem(treeData, node)),
  }
}

function buildTargetTreeWithTransferredNodes(
  targetTreeState: TargetTreeState,
  transferredNodes: TreeNode[],
): TreeNode | null {
  if (targetTreeState.status === "error") return null

  const majorMap = new Map<string, TreeNode>()
  const looseCourses: TreeNode[] = []

  transferredNodes.forEach((node) => {
    if (node.nodeType === "major") {
      majorMap.set(getNodeKey(node), { ...node, children: [] })
    }
  })

  transferredNodes.forEach((node) => {
    if (node.nodeType !== "course") return

    let attached = false
    if (node.parentId) {
      for (const [majorKey, major] of majorMap.entries()) {
        if (isCourseParentMatched(node.parentId, majorKey, major)) {
          const currentChildren = major.children ? major.children : []
          major.children = [...currentChildren, { ...node, children: [] }]
          attached = true
          break
        }
      }
    }

    if (!attached) {
      looseCourses.push({ ...node, children: [] })
    }
  })

  const targetDepartment: TreeNode = {
    ...targetTreeState.department,
    children: [...Array.from(majorMap.values()), ...looseCourses],
  }

  return {
    ...targetTreeState.school,
    children: [targetDepartment],
  }
}

export function ImportMajorDialog({ open, onOpenChange, treeData, currentDepartment }: ImportMajorDialogProps) {
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set())
  const [selectedSourceNodes, setSelectedSourceNodes] = useState<Map<string, TreeNode>>(new Map())
  const [transferredNodes, setTransferredNodes] = useState<TreeNode[]>([])
  const [isConfirmImportOpen, setIsConfirmImportOpen] = useState(false)
  const [importPhase, setImportPhase] = useState<ImportPhase>("selecting")
  const [importStatusByNodeId, setImportStatusByNodeId] = useState<Map<string, ImportNodeProgress>>(new Map())
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null)

  const resetDialogState = useCallback(() => {
    setSelectedSourceIds(new Set())
    setSelectedSourceNodes(new Map())
    setTransferredNodes([])
    setIsConfirmImportOpen(false)
    setImportPhase("selecting")
    setImportStatusByNodeId(new Map())
    setImportErrorMessage(null)
  }, [])

  useEffect(() => {
    if (open) {
      resetDialogState()
    }
  }, [open, resetDialogState])

  const targetTreeState = useMemo(() => {
    return buildTargetTree(treeData, currentDepartment)
  }, [currentDepartment, treeData])

  const targetExpandedIds = useMemo(() => {
    if (targetTreeState.status === "error") return []
    const transferredMajorIds = transferredNodes
      .filter((node) => node.nodeType === "major")
      .map((node) => getNodeKey(node))
    return [getPanelNodeId(targetTreeState.school), getPanelNodeId(targetTreeState.department), ...transferredMajorIds]
  }, [targetTreeState, transferredNodes])

  const targetTree = useMemo(() => {
    return buildTargetTreeWithTransferredNodes(targetTreeState, transferredNodes)
  }, [targetTreeState, transferredNodes])

  const targetDepartmentName = useMemo(() => {
    return getDepartmentDisplayName(currentDepartment)
  }, [currentDepartment])

  const isImporting = importPhase === "importing"
  const shouldShowImportProgress = importPhase !== "selecting"

  const handleToggleSource = (
    nodeId: string,
    cascadeIds: string[],
    checked: boolean | "indeterminate",
    node: TreeNode,
    cascadeNodes: TreeNode[],
  ) => {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev)

      if (cascadeIds.length > 0) {
        if (isSelectedOrIndeterminate(checked)) {
          next.delete(nodeId)
          cascadeIds.forEach((cascadeId) => next.delete(cascadeId))
        } else {
          next.add(nodeId)
          cascadeIds.forEach((cascadeId) => next.add(cascadeId))
        }
        return next
      }

      if (checked === true) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })

    setSelectedSourceNodes((prev) => {
      const next = new Map(prev)

      if (cascadeIds.length > 0) {
        if (isSelectedOrIndeterminate(checked)) {
          next.delete(nodeId)
          cascadeIds.forEach((cascadeId) => next.delete(cascadeId))
        } else {
          next.set(nodeId, node)
          cascadeNodes.forEach((cascadeNode) => next.set(getNodeKey(cascadeNode), cascadeNode))
        }
        return next
      }

      if (checked === true) {
        next.delete(nodeId)
      } else {
        next.set(nodeId, node)
      }
      return next
    })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (isImporting) return
    if (!nextOpen) {
      resetDialogState()
    }
    onOpenChange(nextOpen)
  }

  const applyImportStreamEvent = useCallback((event: ImportMajorStreamEvent) => {
    if (event.type !== "item") {
      return
    }
    const nodeId = event.nodeId
    const status = event.status
    const reason = event.reason

    if (!nodeId) {
      throw new Error("导入进度事件缺少节点ID")
    }
    if (!isImportNodeStatus(status)) {
      throw new Error("导入进度事件状态无效")
    }

    setImportStatusByNodeId((prev) => {
      const next = new Map(prev)
      next.set(nodeId, {
        status,
        reason: typeof reason === "string" && reason.trim().length > 0 ? reason : null,
      })
      return next
    })
  }, [])

  const handleTransferToTarget = () => {
    if (isImporting) return
    const selectedNodes = Array.from(selectedSourceNodes.values()).filter((node) => {
      return selectedSourceIds.has(getNodeKey(node))
    })
    const nodesToTransfer = collectNodesWithMajorContext(treeData, selectedNodes)
    setTransferredNodes((prev) => {
      const next = new Map<string, TreeNode>()
      prev.forEach((node) => next.set(getNodeKey(node), node))
      nodesToTransfer.forEach((node) => next.set(getNodeKey(node), node))
      return Array.from(next.values())
    })
    setSelectedSourceIds(new Set())
    setSelectedSourceNodes(new Map())
  }

  const handleRequestConfirmImport = () => {
    if (isImporting) return
    setIsConfirmImportOpen(true)
  }

  const handleConfirmCopy = async () => {
    setIsConfirmImportOpen(false)
    setImportPhase("importing")
    setImportErrorMessage(null)
    setImportStatusByNodeId(() => {
      const next = new Map<string, ImportNodeProgress>()
      transferredNodes.forEach((node) => {
        next.set(getSourceNodeId(node), {
          status: "pending",
          reason: null,
        })
      })
      return next
    })

    try {
      const targetDepartmentId = getBusinessNumericId(currentDepartment, "目标院系")
      const payload = buildImportPayload(treeData, transferredNodes)
      await importMajorApi.importMajorStream(targetDepartmentId, payload, applyImportStreamEvent)
      setTransferredNodes([])
      setImportStatusByNodeId(new Map())
      setImportPhase("selecting")
    } catch (error) {
      const message = error instanceof Error ? error.message : "导入专业失败"
      setImportErrorMessage(message)
      setImportPhase("failed")
    }
  }

  const handleLockedEscapeKeyDown = (event: Event) => {
    if (isImporting) {
      event.preventDefault()
    }
  }

  const handleLockedPointerDownOutside = (event: Event) => {
    if (isImporting) {
      event.preventDefault()
    }
  }

  const renderImportStatusSuffix = useCallback((node: TreeNode): ReactElement | null => {
    const progress = importStatusByNodeId.get(getSourceNodeId(node))
    if (!progress) return null

    const { status, reason } = progress
    const statusLabel = getImportStatusLabel(status)
    const iconClassName = "h-4 w-4"
    let iconElement: ReactElement
    const ariaLabel = reason ? `${statusLabel}：${reason}` : statusLabel

    if (status === "pending") {
      iconElement = (
        <span className="text-muted-foreground">
          <Clock className={iconClassName} />
        </span>
      )
    } else if (status === "running") {
      iconElement = (
        <span className="text-primary">
          <Loader2 className={`${iconClassName} animate-spin`} />
        </span>
      )
    } else if (status === "completed") {
      iconElement = (
        <span className="text-emerald-600">
          <CheckCircle2 className={iconClassName} />
        </span>
      )
    } else if (status === "failed") {
      iconElement = (
        <span className="text-destructive">
          <XCircle className={iconClassName} />
        </span>
      )
    } else {
      iconElement = (
        <span className="text-amber-500">
          <TriangleAlert className={iconClassName} />
        </span>
      )
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex h-6 w-6 items-center justify-center" aria-label={ariaLabel}>
            {iconElement}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="space-y-1">
          <p>{statusLabel}</p>
          {reason && <p>{reason}</p>}
        </TooltipContent>
      </Tooltip>
    )
  }, [importStatusByNodeId])

  const isConfirmDisabled = targetTreeState.status === "error" ? true : transferredNodes.length === 0

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="flex max-h-[88vh] !w-[70vw] !max-w-[70vw] flex-col"
          showCloseButton={!isImporting}
          onEscapeKeyDown={handleLockedEscapeKeyDown}
          onPointerDownOutside={handleLockedPointerDownOutside}
        >
          <DialogHeader>
            <DialogTitle>导入专业</DialogTitle>
            <DialogDescription>用于迁移或复制专业/课程</DialogDescription>
          </DialogHeader>

          {targetTreeState.status === "error" ? (
            <div className={ERROR_MESSAGE_CLASS_NAME}>
              {targetTreeState.message}
            </div>
          ) : (
            <>
              {importErrorMessage && (
                <div className={ERROR_MESSAGE_CLASS_NAME}>
                  {importErrorMessage}
                </div>
              )}
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <section className="flex min-h-0 flex-col gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">From</h3>
                    <p className="mt-1 text-sm text-muted-foreground">选择要复制的专业/课程</p>
                  </div>
                  <OrganizationTreePanel
                    treeData={treeData}
                    selectedIds={selectedSourceIds}
                    onToggleSelect={handleToggleSource}
                    selectable
                    disabled={isImporting}
                    showRoot={false}
                    isNodeSelectable={isImportableSourceNode}
                    cascadeSelection
                    initialExpandedIds={SOURCE_INITIAL_EXPANDED_IDS}
                    emptyText="暂无可导入的来源专业"
                  />
                </section>

                <div className="flex items-center justify-center px-1 lg:pt-16">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleTransferToTarget}
                    disabled={isImporting || selectedSourceIds.size === 0}
                    className="h-10 w-10 rounded-full border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    <ArrowRight className="h-5 w-5 rotate-90 lg:rotate-0" />
                  </Button>
                </div>

                <section className="flex min-h-0 flex-col gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">To</h3>
                    <p className="mt-1 text-sm text-muted-foreground">已存在的专业/课程将被忽略。</p>
                  </div>
                  <OrganizationTreePanel
                    treeData={targetTree}
                    selectedIds={EMPTY_SELECTED_IDS}
                    readOnly
                    showRoot
                    showSearch={false}
                    enableDynamicLoading={false}
                    initialExpandedIds={targetExpandedIds}
                    renderNodeSuffix={shouldShowImportProgress ? renderImportStatusSuffix : undefined}
                    emptyText="暂无目标院系"
                  />
                </section>
              </div>
            </>
          )}

          <DialogFooter className="gap-2">
            {!isImporting && (
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                关闭
              </Button>
            )}
            <Button
              onClick={handleRequestConfirmImport}
              disabled={isImporting || isConfirmDisabled}
              className="gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在导入
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  开始导入
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmImportOpen} onOpenChange={setIsConfirmImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认导入</AlertDialogTitle>
            <AlertDialogDescription>
              确认将选中的数据复制到{targetDepartmentName}？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCopy}>确认复制</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
