import type { Edge, Node } from "@xyflow/react"

export const DEMO_GRID_SIZE = 24

export const COURSE_HEX_SIZE = {
  width: DEMO_GRID_SIZE * 10,
  height: DEMO_GRID_SIZE * 8,
}

export const SUPPORT_HEX_SIZE = {
  width: DEMO_GRID_SIZE * 6,
  height: DEMO_GRID_SIZE * 5,
}

export const MAJOR_RING_SIZE = {
  width: DEMO_GRID_SIZE * 28,
  height: DEMO_GRID_SIZE * 28,
}

export type DemoMode = "horizontal" | "vertical" | "graph"

export type DemoNodeData = Record<string, unknown> & {
  label: string
  subtitle?: string
  code?: string
}

const SUPPORT_ITEMS = [
  { code: "1.1", label: "工程知识" },
  { code: "1.2", label: "问题分析" },
  { code: "2.1", label: "方案设计" },
  { code: "2.2", label: "实验验证" },
  { code: "3.1", label: "工具应用" },
  { code: "3.2", label: "系统集成" },
  { code: "4.1", label: "沟通表达" },
  { code: "4.2", label: "团队协作" },
  { code: "5.1", label: "终身学习" },
  { code: "5.2", label: "工程伦理" },
]

function createCourseNode(position: { x: number; y: number }): Node<DemoNodeData> {
  return {
    id: "course-center",
    type: "courseHex",
    position,
    data: {
      label: "机器学习课程设计",
      subtitle: "课程卡片 10 格六边形",
    },
    style: {
      width: COURSE_HEX_SIZE.width,
      height: COURSE_HEX_SIZE.height,
    },
  }
}

function createRingNode(position: { x: number; y: number }): Node<DemoNodeData> {
  return {
    id: "major-ring",
    type: "majorRing",
    position,
    data: {
      label: "专业矩阵",
      subtitle: "圆形容器，内部支撑关系六边形",
    },
    style: {
      width: MAJOR_RING_SIZE.width,
      height: MAJOR_RING_SIZE.height,
    },
  }
}

function createSupportNodes(): Node<DemoNodeData>[] {
  const centerX = MAJOR_RING_SIZE.width / 2
  const centerY = MAJOR_RING_SIZE.height / 2
  const radius = MAJOR_RING_SIZE.width * 0.34

  return SUPPORT_ITEMS.map((item, index) => {
    const angle = (Math.PI * 2 * index) / SUPPORT_ITEMS.length - Math.PI / 2
    const x = centerX + Math.cos(angle) * radius - SUPPORT_HEX_SIZE.width / 2
    const y = centerY + Math.sin(angle) * radius - SUPPORT_HEX_SIZE.height / 2

    return {
      id: `support-${item.code}`,
      type: "supportHex",
      parentId: "major-ring",
      extent: "parent",
      position: {
        x,
        y,
      },
      data: {
        label: item.label,
        code: item.code,
        subtitle: "6 格六边形",
      },
      style: {
        width: SUPPORT_HEX_SIZE.width,
        height: SUPPORT_HEX_SIZE.height,
      },
    }
  })
}

function createEdges(mode: DemoMode): Edge[] {
  // 课程中心只连接专业矩阵圆圈本体，不连接圆圈内部元素。
  // 圆圈内部元素之间也不创建连线。
  return [
    {
      id: `edge-course-ring-${mode}`,
      source: "course-center",
      target: "major-ring",
      sourceHandle: "bottom",
      targetHandle: "top",
      type: "rainbowBezier",
      animated: false,
    },
  ]
}

export function createDemoGraph(mode: DemoMode): {
  nodes: Node<DemoNodeData>[]
  edges: Edge[]
} {
  const base = {
    horizontal: {
      course: { x: 120, y: 360 },
      ring: { x: 560, y: 170 },
    },
    vertical: {
      course: { x: 520, y: 80 },
      ring: { x: 340, y: 370 },
    },
    graph: {
      course: { x: 520, y: 330 },
      ring: { x: 980, y: 120 },
    },
  }[mode]

  const ringNode = createRingNode(base.ring)
  const nodes: Node<DemoNodeData>[] = [
    createCourseNode(base.course),
    ringNode,
    ...createSupportNodes(),
  ]

  return {
    nodes,
    edges: createEdges(mode),
  }
}
