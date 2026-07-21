import assert from "node:assert/strict"
import test from "node:test"
import type { TreeNode } from "../types"

type CourseNodeResolutionModule = typeof import("./course-node-resolution")

async function loadCourseNodeResolution(): Promise<CourseNodeResolutionModule> {
  const moduleUrl = new URL("./course-node-resolution.ts", import.meta.url)
  return import(moduleUrl.href) as Promise<CourseNodeResolutionModule>
}

function createCourseTree(): TreeNode {
  return {
    nodeId: "root",
    nodeName: "Root",
    nodeType: "root",
    children: [
      {
        nodeId: "department_7",
        id: "7",
        nodeName: "Department",
        nodeType: "department",
        children: [
          {
            nodeId: "major_9",
            id: "9",
            nodeName: "Major",
            nodeType: "major",
            children: [
              {
                nodeId: "course_7",
                id: "7",
                nodeName: "Course",
                nodeType: "course",
                manager: null,
              },
            ],
          },
        ],
      },
    ],
  }
}

test("resolves the major from structural ancestry without parentId", async () => {
  const { resolveCourseMajorId } = await loadCourseNodeResolution()
  const tree = createCourseTree()

  assert.equal(resolveCourseMajorId(tree, "course_7"), "9")
})

test("matches a course by full nodeId when numeric ids repeat across levels", async () => {
  const { findNodePathByNodeId } = await loadCourseNodeResolution()
  const tree = createCourseTree()
  const path = findNodePathByNodeId([tree], "course_7")

  assert.notEqual(path, null)
  assert.deepEqual(path?.map((node) => node.nodeId), [
    "root",
    "department_7",
    "major_9",
    "course_7",
  ])
})

test("merges authoritative manager data into a sparse course node", async () => {
  const { mergeAuthoritativeCourseNode } = await loadCourseNodeResolution()
  const sparseCourse = createCourseTree().children?.[0].children?.[0].children?.[0]
  assert.notEqual(sparseCourse, undefined)

  const merged = mergeAuthoritativeCourseNode(sparseCourse as TreeNode, [
    {
      nodeId: "course_7",
      id: "7",
      nodeName: "Course",
      nodeType: "course",
      manager: [{ value: "42", label: "Teacher" }],
    },
  ])

  assert.deepEqual(merged.manager, [{ value: "42", label: "Teacher" }])
})

test("keeps an authoritative empty manager list instead of stale tree managers", async () => {
  const { mergeAuthoritativeCourseNode } = await loadCourseNodeResolution()
  const sparseCourse: TreeNode = {
    nodeId: "course_7",
    id: "7",
    nodeName: "Course",
    nodeType: "course",
    manager: [{ value: "42", label: "Stale Teacher" }],
  }

  const merged = mergeAuthoritativeCourseNode(sparseCourse, [
    {
      nodeId: "course_7",
      id: "7",
      nodeName: "Course",
      nodeType: "course",
      manager: [],
    },
  ])

  assert.deepEqual(merged.manager, [])
})

test("keeps an authoritative null manager instead of stale tree managers", async () => {
  const { mergeAuthoritativeCourseNode } = await loadCourseNodeResolution()
  const sparseCourse: TreeNode = {
    nodeId: "course_7",
    id: "7",
    nodeName: "Course",
    nodeType: "course",
    manager: [{ value: "42", label: "Stale Teacher" }],
  }

  const merged = mergeAuthoritativeCourseNode(sparseCourse, [
    {
      nodeId: "course_7",
      id: "7",
      nodeName: "Course",
      nodeType: "course",
      manager: null,
    },
  ])

  assert.equal(merged.manager, null)
})

test("throws when the course has no major ancestor or authoritative match", async () => {
  const {
    mergeAuthoritativeCourseNode,
    resolveCourseMajorId,
  } = await loadCourseNodeResolution()
  const courseWithoutMajor: TreeNode = {
    nodeId: "root",
    nodeName: "Root",
    nodeType: "root",
    children: [
      {
        nodeId: "course_7",
        id: "7",
        nodeName: "Course",
        nodeType: "course",
        manager: null,
      },
    ],
  }

  assert.throws(
    () => resolveCourseMajorId(courseWithoutMajor, "course_7"),
    /has no major ancestor/,
  )
  assert.throws(
    () => mergeAuthoritativeCourseNode(courseWithoutMajor.children?.[0] as TreeNode, []),
    /was not found in the major course list/,
  )
})
