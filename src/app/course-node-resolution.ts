import type { TreeNode } from "@/types"

function parseRequiredMajorId(majorNode: TreeNode): string {
  if (majorNode.nodeType !== "major") {
    throw new Error("Course path does not contain a valid major node")
  }

  if (typeof majorNode.id === "string") {
    const trimmedId = majorNode.id.trim()
    if (/^[1-9]\d*$/.test(trimmedId)) {
      return trimmedId
    }
  }

  const nodeIdMatch = /^major_([1-9]\d*)$/.exec(majorNode.nodeId.trim())
  if (nodeIdMatch !== null) {
    return nodeIdMatch[1]
  }

  throw new Error(`Major node ${majorNode.nodeId} has an invalid numeric id`)
}

export function findNodePathByNodeId(
  nodes: readonly TreeNode[],
  targetNodeId: string,
  ancestors: readonly TreeNode[] = [],
): TreeNode[] | null {
  if (targetNodeId.trim() === "") {
    throw new Error("Target node id is required")
  }

  for (const node of nodes) {
    const currentPath = [...ancestors, node]
    if (node.nodeId === targetNodeId) {
      return currentPath
    }

    if (Array.isArray(node.children) && node.children.length > 0) {
      const childPath = findNodePathByNodeId(node.children, targetNodeId, currentPath)
      if (childPath !== null) {
        return childPath
      }
    }
  }

  return null
}

export function resolveCourseMajorId(treeRoot: TreeNode, courseNodeId: string): string {
  const coursePath = findNodePathByNodeId([treeRoot], courseNodeId)
  if (coursePath === null) {
    throw new Error(`Course node ${courseNodeId} was not found in the current tree`)
  }

  const courseNode = coursePath[coursePath.length - 1]
  if (courseNode.nodeType !== "course") {
    throw new Error(`Node ${courseNodeId} is not a course`)
  }

  for (let index = coursePath.length - 2; index >= 0; index -= 1) {
    const ancestor = coursePath[index]
    if (ancestor.nodeType === "major") {
      return parseRequiredMajorId(ancestor)
    }
  }

  throw new Error(`Course node ${courseNodeId} has no major ancestor`)
}

export function mergeAuthoritativeCourseNode(
  sparseCourseNode: TreeNode,
  authoritativeCourses: readonly TreeNode[],
): TreeNode {
  if (sparseCourseNode.nodeType !== "course") {
    throw new Error(`Node ${sparseCourseNode.nodeId} is not a course`)
  }

  const authoritativeCourse = authoritativeCourses.find((course) => {
    return course.nodeType === "course" && course.nodeId === sparseCourseNode.nodeId
  })

  if (authoritativeCourse === undefined) {
    throw new Error(`Course node ${sparseCourseNode.nodeId} was not found in the major course list`)
  }

  if (authoritativeCourse.manager === undefined) {
    throw new Error(`Course node ${sparseCourseNode.nodeId} is missing authoritative manager data`)
  }

  return {
    ...sparseCourseNode,
    ...authoritativeCourse,
    nodeId: sparseCourseNode.nodeId,
    nodeType: "course",
    manager: authoritativeCourse.manager,
    metadata: {
      ...(sparseCourseNode.metadata ? sparseCourseNode.metadata : {}),
      ...(authoritativeCourse.metadata ? authoritativeCourse.metadata : {}),
    },
  }
}
