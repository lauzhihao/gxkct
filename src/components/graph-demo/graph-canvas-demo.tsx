"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { resolveDragCollisions } from "./collision"
import "./graph-canvas-demo.css"
import { createDemoGraph, DEMO_GRID_SIZE, type DemoMode, type DemoNodeData } from "./mock-data"
import { graphDemoNodeTypes } from "./nodes"
import { RainbowBezierEdge } from "./rainbow-bezier-edge"

function GraphCanvasInner() {
  const [mode, setMode] = useState<DemoMode>("graph")
  const initialGraph = useMemo(() => createDemoGraph(mode), [mode])
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<DemoNodeData>>(initialGraph.nodes)
  const [edges, setEdges] = useEdgesState<Edge>(initialGraph.edges)
  const [lastResolveMs, setLastResolveMs] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const nodesRef = useRef<Node<DemoNodeData>[]>(initialGraph.nodes)
  const edgeTypes = useMemo(() => ({ rainbowBezier: RainbowBezierEdge }), [])

  useEffect(() => {
    const nextGraph = createDemoGraph(mode)
    setNodes(nextGraph.nodes)
    setEdges(nextGraph.edges)
    nodesRef.current = nextGraph.nodes
  }, [mode])

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  const handleNodeDragStop: NodeMouseHandler = useCallback((_event, draggedNode) => {
    const start = performance.now()
    const nextNodes = resolveDragCollisions(nodesRef.current, draggedNode.id, 10)
    const elapsed = performance.now() - start
    setLastResolveMs(elapsed)
    setNodes(nextNodes)
    nodesRef.current = nextNodes
  }, [])

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedId(node.id)
  }, [])

  return (
    <div className="graph-demo-page">
      <div className="graph-demo-toolbar">
        <button
          type="button"
          className={`graph-demo-btn ${mode === "horizontal" ? "graph-demo-btn-active" : ""}`}
          onClick={() => setMode("horizontal")}
        >
          Horizontal
        </button>
        <button
          type="button"
          className={`graph-demo-btn ${mode === "vertical" ? "graph-demo-btn-active" : ""}`}
          onClick={() => setMode("vertical")}
        >
          Vertical
        </button>
        <button
          type="button"
          className={`graph-demo-btn ${mode === "graph" ? "graph-demo-btn-active" : ""}`}
          onClick={() => setMode("graph")}
        >
          Graph
        </button>
        <div className="graph-demo-stats">
          <div>Nodes: {nodes.length}</div>
          <div>Edges: {edges.length}</div>
          <div>Resolve: {lastResolveMs.toFixed(2)} ms</div>
          <div>Selected: {selectedId || "None"}</div>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={graphDemoNodeTypes as never}
        edgeTypes={edgeTypes as never}
        onNodesChange={onNodesChange}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.3}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: "rainbowBezier",
        }}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap pannable zoomable />
        <Controls showInteractive={false} />
        <Background variant={BackgroundVariant.Lines} gap={DEMO_GRID_SIZE} size={1} color="#d1d9e6" />
      </ReactFlow>
    </div>
  )
}

export function GraphCanvasDemo() {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  )
}
