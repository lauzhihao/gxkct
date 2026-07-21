import dagre from "dagre"
import type { Node, Edge } from "@xyflow/react"
import { NODE_DEFAULT_SIZES, FlowNodeType } from "./types"

/**
 * 布局方向类型
 */
export type LayoutDirection = "TB" | "LR" | "BT" | "RL"

/**
 * 布局配置选项
 */
export interface LayoutOptions {
  // 布局方向: TB(上到下), LR(左到右), BT(下到上), RL(右到左)
  direction?: LayoutDirection
  // 节点间水平间距
  nodeSep?: number
  // 层级间垂直间距
  rankSep?: number
  // 边距
  marginX?: number
  marginY?: number
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  direction: "LR",  // 水平思维导图式布局：从左到右
  nodeSep: 80,
  rankSep: 120,
  marginX: 60,
  marginY: 60,
}

/**
 * 获取节点尺寸
 */
function getNodeSize(node: Node): { width: number; height: number } {
  const nodeType = node.type as FlowNodeType
  if (nodeType && NODE_DEFAULT_SIZES[nodeType]) {
    return NODE_DEFAULT_SIZES[nodeType]
  }
  // 默认尺寸
  return { width: 280, height: 100 }
}

/**
 * 使用 dagre 对节点进行自动布局
 * @param nodes 节点数组
 * @param edges 边数组
 * @param options 布局选项
 * @returns 带有新位置的节点数组
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): Node[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // 创建 dagre 图
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({
    rankdir: opts.direction,
    nodesep: opts.nodeSep,
    ranksep: opts.rankSep,
    marginx: opts.marginX,
    marginy: opts.marginY,
  })

  // 添加节点到图中
  nodes.forEach((node) => {
    const size = getNodeSize(node)
    dagreGraph.setNode(node.id, {
      width: size.width,
      height: size.height,
    })
  })

  // 添加边到图中
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // 执行布局计算
  dagre.layout(dagreGraph)

  // 返回带有新位置的节点
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    const size = getNodeSize(node)

    // dagre 返回的是节点中心点，需要转换为左上角坐标
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - size.width / 2,
        y: nodeWithPosition.y - size.height / 2,
      },
    }
  })
}

/**
 * 计算适合画布的视口
 * @param nodes 节点数组
 * @param padding 边距
 */
export function calculateFitView(
  nodes: Node[],
  padding: number = 50
): { x: number; y: number; zoom: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0, zoom: 1 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  nodes.forEach((node) => {
    const size = getNodeSize(node)
    const { x, y } = node.position

    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + size.width)
    maxY = Math.max(maxY, y + size.height)
  })

  const width = maxX - minX + padding * 2
  const height = maxY - minY + padding * 2

  return {
    x: minX - padding,
    y: minY - padding,
    zoom: Math.min(1, Math.min(800 / width, 600 / height)),
  }
}

/**
 * 生成边的唯一ID
 */
export function generateEdgeId(source: string, target: string): string {
  return `edge_${source}_${target}`
}

/**
 * 根据层级关系生成默认边
 * 课程信息 → 教学目标 → 课点 → KSA → 课程矩阵 → 项目矩阵
 */
export function generateHierarchyEdges(nodes: Node[]): Edge[] {
  const edges: Edge[] = []

  // 按类型分组节点
  const nodesByType: Record<string, Node[]> = {}
  nodes.forEach((node) => {
    const type = node.type || "unknown"
    if (!nodesByType[type]) {
      nodesByType[type] = []
    }
    nodesByType[type].push(node)
  })

  // 定义层级连接关系
  const hierarchy: [string, string][] = [
    [FlowNodeType.COURSE_INFO, FlowNodeType.OBJECTIVE],
    [FlowNodeType.OBJECTIVE, FlowNodeType.COURSE_POINT],
    [FlowNodeType.COURSE_POINT, FlowNodeType.KSA],
    [FlowNodeType.KSA, FlowNodeType.COURSE_MATRIX],
    [FlowNodeType.COURSE_MATRIX, FlowNodeType.PROJECT_MATRIX],
  ]

  // 为每个层级创建连接
  hierarchy.forEach(([sourceType, targetType]) => {
    const sourceNodes = nodesByType[sourceType] || []
    const targetNodes = nodesByType[targetType] || []

    // 每个源节点连接到所有目标节点
    sourceNodes.forEach((source) => {
      targetNodes.forEach((target) => {
        edges.push({
          id: generateEdgeId(source.id, target.id),
          source: source.id,
          target: target.id,
          type: "smoothstep",
        })
      })
    })
  })

  return edges
}
