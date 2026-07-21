import type { TreeNode } from "@/types"

export interface SelectionResolutionContext {
  treeData: TreeNode
  nodeId: string
  semesterId: number | null
  retryToken: number
}

interface SelectionResolutionIdleState {
  status: "idle"
}

interface SelectionResolutionLoadingState {
  status: "loading"
  context: SelectionResolutionContext
  requestId: number
}

interface SelectionResolutionReadyState {
  status: "ready"
  context: SelectionResolutionContext
  requestId: number
}

interface SelectionResolutionErrorState {
  status: "error"
  context: SelectionResolutionContext
  requestId: number
  error: string
}

export type SelectionResolutionState =
  | SelectionResolutionIdleState
  | SelectionResolutionLoadingState
  | SelectionResolutionReadyState
  | SelectionResolutionErrorState

export type SelectionResolutionView = "loading" | "ready" | "error"

export function createIdleSelectionResolution(): SelectionResolutionIdleState {
  return { status: "idle" }
}

export function createLoadingSelectionResolution(
  context: SelectionResolutionContext,
  requestId: number,
): SelectionResolutionLoadingState {
  return {
    status: "loading",
    context,
    requestId,
  }
}

export function createReadySelectionResolution(
  context: SelectionResolutionContext,
  requestId: number,
): SelectionResolutionReadyState {
  return {
    status: "ready",
    context,
    requestId,
  }
}

export function createErrorSelectionResolution(
  context: SelectionResolutionContext,
  requestId: number,
  error: string,
): SelectionResolutionErrorState {
  if (error.trim() === "") {
    throw new Error("Selection resolution error message is required")
  }

  return {
    status: "error",
    context,
    requestId,
    error,
  }
}

export function areSelectionResolutionContextsEqual(
  left: SelectionResolutionContext,
  right: SelectionResolutionContext,
): boolean {
  return left.treeData === right.treeData
    && left.nodeId === right.nodeId
    && left.semesterId === right.semesterId
    && left.retryToken === right.retryToken
}

export function canCommitSelectionRequest(
  latestRequestId: number,
  expectedRequestId: number,
  latestContext: SelectionResolutionContext | null,
  expectedContext: SelectionResolutionContext,
): boolean {
  if (latestRequestId !== expectedRequestId || latestContext === null) {
    return false
  }

  return areSelectionResolutionContextsEqual(latestContext, expectedContext)
}

export function isSelectionResolutionCurrent(
  state: SelectionResolutionState,
  context: SelectionResolutionContext | null,
): boolean {
  if (state.status === "idle" || context === null) {
    return false
  }

  return areSelectionResolutionContextsEqual(state.context, context)
}

export function getSelectionResolutionView(
  state: SelectionResolutionState,
  context: SelectionResolutionContext | null,
): SelectionResolutionView {
  if (state.status === "idle") {
    return "loading"
  }

  if (context === null || !areSelectionResolutionContextsEqual(state.context, context)) {
    return "loading"
  }

  return state.status
}
