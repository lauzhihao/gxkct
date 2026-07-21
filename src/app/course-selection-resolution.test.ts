import assert from "node:assert/strict"
import test from "node:test"
import type { TreeNode } from "../types"

type CourseSelectionResolutionModule = typeof import("./course-selection-resolution")

async function loadCourseSelectionResolution(): Promise<CourseSelectionResolutionModule> {
  const moduleUrl = new URL("./course-selection-resolution.ts", import.meta.url)
  return import(moduleUrl.href) as Promise<CourseSelectionResolutionModule>
}

function createTree(nodeId: string): TreeNode {
  return {
    nodeId,
    nodeName: nodeId,
    nodeType: "root",
    children: [],
  }
}

test("moves from idle to loading for the active context", async () => {
  const {
    createIdleSelectionResolution,
    createLoadingSelectionResolution,
    getSelectionResolutionView,
  } = await loadCourseSelectionResolution()
  const context = {
    treeData: createTree("root-a"),
    nodeId: "course_7",
    semesterId: 11,
    retryToken: 0,
  }

  const idle = createIdleSelectionResolution()
  assert.equal(getSelectionResolutionView(idle, context), "loading")

  const loading = createLoadingSelectionResolution(context, 1)
  assert.equal(loading.status, "loading")
  assert.equal(getSelectionResolutionView(loading, context), "loading")
})

test("shows an error only for the exact request context", async () => {
  const {
    createErrorSelectionResolution,
    getSelectionResolutionView,
  } = await loadCourseSelectionResolution()
  const context = {
    treeData: createTree("root-a"),
    nodeId: "course_7",
    semesterId: 11,
    retryToken: 0,
  }
  const errorState = createErrorSelectionResolution(context, 1, "load failed")

  assert.equal(errorState.error, "load failed")
  assert.equal(getSelectionResolutionView(errorState, context), "error")
})

test("retry invalidates the old error and rejects the old request before the latest retry succeeds", async () => {
  const {
    canCommitSelectionRequest,
    createErrorSelectionResolution,
    createLoadingSelectionResolution,
    createReadySelectionResolution,
    getSelectionResolutionView,
  } = await loadCourseSelectionResolution()
  const treeData = createTree("root-a")
  const initialContext = {
    treeData,
    nodeId: "course_7",
    semesterId: 11,
    retryToken: 0,
  }
  const retryContext = {
    ...initialContext,
    retryToken: 1,
  }
  const errorState = createErrorSelectionResolution(initialContext, 1, "load failed")

  assert.equal(getSelectionResolutionView(errorState, retryContext), "loading")
  assert.equal(canCommitSelectionRequest(2, 1, retryContext, initialContext), false)

  const retryLoading = createLoadingSelectionResolution(retryContext, 2)
  assert.equal(getSelectionResolutionView(retryLoading, retryContext), "loading")
  assert.equal(canCommitSelectionRequest(2, 2, retryContext, retryContext), true)

  const retryReady = createReadySelectionResolution(retryContext, 2)
  assert.equal(getSelectionResolutionView(retryReady, retryContext), "ready")
})

test("tree URL or semester changes prevent an old request from committing", async () => {
  const { canCommitSelectionRequest } = await loadCourseSelectionResolution()
  const treeData = createTree("root-a")
  const expectedContext = {
    treeData,
    nodeId: "course_7",
    semesterId: 11,
    retryToken: 0,
  }
  const changedContexts = [
    { ...expectedContext, treeData: createTree("root-b") },
    { ...expectedContext, nodeId: "course_8" },
    { ...expectedContext, semesterId: 12 },
  ]

  changedContexts.forEach((latestContext) => {
    assert.equal(canCommitSelectionRequest(1, 1, latestContext, expectedContext), false)
  })
})

test("request id mismatch prevents a response from committing", async () => {
  const { canCommitSelectionRequest } = await loadCourseSelectionResolution()
  const context = {
    treeData: createTree("root-a"),
    nodeId: "course_7",
    semesterId: null,
    retryToken: 0,
  }

  assert.equal(canCommitSelectionRequest(2, 1, context, context), false)
  assert.equal(canCommitSelectionRequest(1, 1, null, context), false)
})
