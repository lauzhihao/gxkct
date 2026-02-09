import type { Node } from "@xyflow/react"

import type { DemoNodeData } from "./mock-data"

const FALLBACK_SIZE = { width: 140, height: 100 }

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

function getNodeSize(node: Node<DemoNodeData>): { width: number; height: number } {
  return {
    width: toNumber(node.style?.width, FALLBACK_SIZE.width),
    height: toNumber(node.style?.height, FALLBACK_SIZE.height),
  }
}

interface Rect {
  left: number
  top: number
  right: number
  bottom: number
  centerX: number
  centerY: number
  width: number
  height: number
}

function toRect(node: Node<DemoNodeData>, position: { x: number; y: number }): Rect {
  const size = getNodeSize(node)

  return {
    left: position.x,
    top: position.y,
    right: position.x + size.width,
    bottom: position.y + size.height,
    centerX: position.x + size.width / 2,
    centerY: position.y + size.height / 2,
    width: size.width,
    height: size.height,
  }
}

function clampInParent(
  node: Node<DemoNodeData>,
  parentNode: Node<DemoNodeData> | undefined,
  position: { x: number; y: number }
): { x: number; y: number } {
  if (!parentNode) {
    return position
  }

  const parentSize = getNodeSize(parentNode)
  const childSize = getNodeSize(node)

  return {
    x: Math.min(Math.max(0, position.x), Math.max(0, parentSize.width - childSize.width)),
    y: Math.min(Math.max(0, position.y), Math.max(0, parentSize.height - childSize.height)),
  }
}

export function resolveDragCollisions(
  nodes: Node<DemoNodeData>[],
  draggedNodeId: string,
  minGap: number
): Node<DemoNodeData>[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const draggedNode = nodeMap.get(draggedNodeId)
  if (!draggedNode) {
    return nodes
  }

  const scopeParentId = draggedNode.parentId ?? null
  const scopeNodeIds = nodes
    .filter((node) => (node.parentId ?? null) === scopeParentId)
    .map((node) => node.id)
  const queue = [draggedNodeId]
  const nextPositions = new Map<string, { x: number; y: number }>()

  nodes.forEach((node) => {
    nextPositions.set(node.id, { ...node.position })
  })

  let guard = 0
  while (queue.length > 0 && guard < 800) {
    guard += 1
    const currentId = queue.shift()
    if (!currentId) {
      continue
    }

    const currentNode = nodeMap.get(currentId)
    const currentPosition = nextPositions.get(currentId)
    if (!currentNode || !currentPosition) {
      continue
    }

    const currentRect = toRect(currentNode, currentPosition)

    for (const otherId of scopeNodeIds) {
      if (otherId === currentId) {
        continue
      }

      const otherNode = nodeMap.get(otherId)
      const otherPosition = nextPositions.get(otherId)
      if (!otherNode || !otherPosition) {
        continue
      }

      const otherRect = toRect(otherNode, otherPosition)
      const overlapX = currentRect.width / 2 + otherRect.width / 2 + minGap - Math.abs(currentRect.centerX - otherRect.centerX)
      const overlapY = currentRect.height / 2 + otherRect.height / 2 + minGap - Math.abs(currentRect.centerY - otherRect.centerY)

      if (overlapX <= 0 || overlapY <= 0) {
        continue
      }

      const shouldPushX = overlapX <= overlapY
      const directionX = currentRect.centerX <= otherRect.centerX ? 1 : -1
      const directionY = currentRect.centerY <= otherRect.centerY ? 1 : -1

      const shifted = {
        x: otherPosition.x + (shouldPushX ? overlapX * directionX : 0),
        y: otherPosition.y + (!shouldPushX ? overlapY * directionY : 0),
      }

      const parentNode = otherNode.parentId ? nodeMap.get(otherNode.parentId) : undefined
      nextPositions.set(otherId, clampInParent(otherNode, parentNode, shifted))
      queue.push(otherId)
    }
  }

  return nodes.map((node) => {
    const nextPosition = nextPositions.get(node.id)
    if (!nextPosition) {
      return node
    }

    if (node.position.x === nextPosition.x && node.position.y === nextPosition.y) {
      return node
    }

    return {
      ...node,
      position: nextPosition,
    }
  })
}
