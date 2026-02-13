"use client"

import { useMemo } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

type KnowledgeNodeData = {
  title: string
  subtitle: string
}

const MOCK_NODE_COUNT = 240
const GRID_COLUMNS = 16

const TOPIC_POOL = [
  "视觉基础",
  "色彩策略",
  "排版系统",
  "交互模式",
  "信息架构",
  "组件规范",
  "可用性评估",
  "无障碍设计",
  "原型表达",
  "设计协作",
  "需求拆解",
  "实验验证",
]

const DETAIL_POOL = [
  "概念梳理 / 原则提炼 / 案例对照",
  "任务拆分 / 结构映射 / 评审复盘",
  "流程沉淀 / 规范约束 / 质量校验",
  "问题识别 / 假设验证 / 结论输出",
  "场景推演 / 组件拼装 / 交付说明",
]

function KnowledgeNodeCard({ data, selected }: NodeProps<Node<KnowledgeNodeData>>) {
  return (
    <div className={`gemini-knowledge-node ${selected ? "gemini-knowledge-node-selected" : ""}`}>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        style={{ width: 6, height: 6, opacity: 0, pointerEvents: "none" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        style={{ width: 6, height: 6, opacity: 0, pointerEvents: "none" }}
      />
      <div className="gemini-knowledge-node-title">{data.title}</div>
      <div className="gemini-knowledge-node-subtitle">{data.subtitle}</div>
    </div>
  )
}

function createKnowledgeNodes(count: number): Node<KnowledgeNodeData>[] {
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / GRID_COLUMNS)
    const column = index % GRID_COLUMNS
    const topic = TOPIC_POOL[index % TOPIC_POOL.length]
    const detail = DETAIL_POOL[index % DETAIL_POOL.length]

    return {
      id: `node-${index}`,
      type: "knowledgeNode",
      position: {
        x: 120 + column * 242 + (row % 2 === 0 ? 0 : 28),
        y: 110 + row * 168 + (column % 3) * 8,
      },
      data: {
        title: index === 0 ? "UI设计基础知识图谱" : `${topic}模块 ${index.toString().padStart(3, "0")}`,
        subtitle: index === 0 ? "核心总览 / 课程主轴 / 结构导航" : detail,
      },
    }
  })
}

function createKnowledgeEdges(count: number): Edge[] {
  const edges: Edge[] = []

  for (let index = 1; index < count; index += 1) {
    const parentIndex = Math.floor((index - 1) / 3)
    edges.push({
      id: `e-tree-${parentIndex}-${index}`,
      source: `node-${parentIndex}`,
      target: `node-${index}`,
      type: "simplebezier",
    })

    if (index % 6 === 0 && index + 1 < count) {
      edges.push({
        id: `e-cross-${index}-${index + 1}`,
        source: `node-${index}`,
        target: `node-${index + 1}`,
        type: "simplebezier",
      })
    }
  }

  return edges
}

const INITIAL_NODES = createKnowledgeNodes(MOCK_NODE_COUNT)
const INITIAL_EDGES = createKnowledgeEdges(MOCK_NODE_COUNT)

function InfiniteKnowledgeCanvasInner() {
  const nodeTypes = useMemo(() => ({ knowledgeNode: KnowledgeNodeCard }), [])
  const [nodes, , onNodesChange] = useNodesState<Node<KnowledgeNodeData>>(INITIAL_NODES)
  const [edges, , onEdgesChange] = useEdgesState(INITIAL_EDGES)
  const isHighDensity = nodes.length >= 120

  return (
    <div className="gemini-knowledge-canvas-root">
      <ReactFlow
        className={`gemini-knowledge-flow ${isHighDensity ? "is-high-density" : ""}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        defaultViewport={{ x: -220, y: -160, zoom: 1.53 }}
        minZoom={0.2}
        maxZoom={2.2}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        onlyRenderVisibleElements
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: "simplebezier",
          style: {
            stroke: "rgba(160, 189, 237, 0.55)",
            strokeWidth: 2,
          },
        }}
      >
        <Panel position="top-left" className="gemini-knowledge-hint">
          拖动画布浏览，滚轮缩放（点击控件可一键总览） · {nodes.length} 节点 / {edges.length} 连线
        </Panel>
        <MiniMap
          position="top-right"
          className="gemini-knowledge-minimap"
          nodeColor="#8bb7ff"
          nodeStrokeColor="#d6e5ff"
          maskColor="rgba(10, 16, 27, 0.7)"
          pannable
          zoomable
        />
        <Controls showInteractive={false} className="gemini-knowledge-controls" />
        <Background variant={BackgroundVariant.Lines} gap={22} size={1} color="rgba(147, 172, 218, 0.14)" />
      </ReactFlow>
    </div>
  )
}

export function InfiniteKnowledgeCanvas() {
  return (
    <ReactFlowProvider>
      <InfiniteKnowledgeCanvasInner />
    </ReactFlowProvider>
  )
}
