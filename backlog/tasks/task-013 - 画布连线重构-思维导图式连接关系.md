---
id: task-013
title: 画布连线重构 - 思维导图式连接关系
status: To Do
assignee: []
created_date: '2026-01-12 12:58'
labels:
  - canvas
  - edges
  - refactor
dependencies:
  - task-012
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
修改画布自动连线生成逻辑，实现新的思维导图式连接关系。

### 目标连线结构

**静态连线（7+N条）**：
| 连线类型 | 数量 | 说明 |
|---------|------|------|
| 课程信息 → A/B/C/D | 4条 | 思维导图一对多展开 |
| A/B/C → 课程矩阵 | 3条 | 三个面板汇聚（D不参与） |
| 课程矩阵 → 项目矩阵[] | N条 | 按章节数分散 |

### 修改内容

#### 1. 更新 `generateHierarchyEdges` 函数

**文件**: `src/components/flow/utils/layout.ts`

```typescript
/**
 * 根据新的思维导图式层级关系生成边
 */
export function generateHierarchyEdges(nodes: Node[]): Edge[] {
  const edges: Edge[] = []
  const nodesByType = groupNodesByType(nodes)

  // 1. 课程信息 → 四个基础面板（一对多）
  const courseInfoNodes = nodesByType[FlowNodeType.COURSE_INFO] || []
  const basicPanelTypes = [
    FlowNodeType.OBJECTIVE_PANEL,
    FlowNodeType.CHAPTER_PANEL,
    FlowNodeType.COURSE_POINT_PANEL,
    FlowNodeType.KSA_PANEL,
  ]
  
  courseInfoNodes.forEach(source => {
    basicPanelTypes.forEach(panelType => {
      const targetNodes = nodesByType[panelType] || []
      targetNodes.forEach(target => {
        edges.push({
          id: generateEdgeId(source.id, target.id),
          source: source.id,
          target: target.id,
          sourceHandle: "right",
          targetHandle: "left",
          type: "smoothstep",
        })
      })
    })
  })

  // 2. A/B/C → 课程矩阵（多对一汇聚，D不参与）
  const matrixInputTypes = [
    FlowNodeType.OBJECTIVE_PANEL,
    FlowNodeType.CHAPTER_PANEL,
    FlowNodeType.COURSE_POINT_PANEL,
  ]
  const courseMatrixNodes = nodesByType[FlowNodeType.COURSE_MATRIX] || []
  
  matrixInputTypes.forEach(panelType => {
    const sourceNodes = nodesByType[panelType] || []
    sourceNodes.forEach(source => {
      courseMatrixNodes.forEach(target => {
        edges.push({
          id: generateEdgeId(source.id, target.id),
          source: source.id,
          target: target.id,
          sourceHandle: "right",
          targetHandle: "left",
          type: "smoothstep",
        })
      })
    })
  })

  // 3. 课程矩阵 → 项目矩阵（一对多分散）
  const projectMatrixNodes = nodesByType[FlowNodeType.PROJECT_MATRIX] || []
  courseMatrixNodes.forEach(source => {
    projectMatrixNodes.forEach(target => {
      edges.push({
        id: generateEdgeId(source.id, target.id),
        source: source.id,
        target: target.id,
        sourceHandle: "right",
        targetHandle: "left",
        type: "smoothstep",
      })
    })
  })

  return edges
}
```

#### 2. 修改 `handleCanvasEvent` 中的自动连线逻辑

**文件**: `src/shared/hooks/use-canvas-elements.ts`

更新 Panel 和矩阵创建时的自动连线生成：

```typescript
// Panel 创建时的连线逻辑
if (COURSE_INFO_TO_PANELS.includes(component)) {
  // 查找课程信息节点，建立连线
  const courseInfoNode = elements.find(el => el.type === CanvasComponentType.COURSE_INFO)
  if (courseInfoNode) {
    addEdge({
      source: courseInfoNode.id,
      target: elementId,
      sourceHandle: "right",
      targetHandle: "left",
    })
  }
}

// 课程矩阵创建时的连线逻辑
if (component === CanvasComponentType.COURSE_MATRIX) {
  PANELS_TO_MATRIX.forEach(panelType => {
    const panel = elements.find(el => el.type === panelType)
    if (panel) {
      addEdge({
        source: panel.id,
        target: elementId,
        sourceHandle: "right",
        targetHandle: "left",
      })
    }
  })
}

// 项目矩阵创建时的连线逻辑
if (component === CanvasComponentType.PROJECT_MATRIX) {
  const courseMatrix = elements.find(el => el.type === CanvasComponentType.COURSE_MATRIX)
  if (courseMatrix) {
    addEdge({
      source: courseMatrix.id,
      target: elementId,
      sourceHandle: "right",
      targetHandle: "left",
    })
  }
}
```

#### 3. 更新节点 Handle 配置

**文件**: `src/components/flow/utils/types.ts`

修改 `NODE_HANDLE_CONFIG`，将连接点从上下改为左右：

```typescript
export const NODE_HANDLE_CONFIG: Record<FlowNodeType, HandleConfig[]> = {
  [FlowNodeType.COURSE_INFO]: [
    { id: "right", position: Position.Right, type: "source" },
  ],
  [FlowNodeType.OBJECTIVE_PANEL]: [
    { id: "left", position: Position.Left, type: "target" },
    { id: "right", position: Position.Right, type: "source" },
  ],
  // ... 其他节点类似
}
```

### 实施步骤

1. 更新 `NODE_HANDLE_CONFIG`，将连接点改为左右方向
2. 重写 `generateHierarchyEdges` 函数
3. 修改 `handleCanvasEvent` 中各组件的自动连线逻辑
4. 确保 KSA 面板不生成到课程矩阵的连线
5. 测试连线效果
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 课程信息向右连接到四个基础面板（4条线）
- [ ] #2 教学目标/章节/课点三个面板向右连接到课程矩阵（3条线）
- [ ] #3 KSA面板不生成到课程矩阵的连线
- [ ] #4 课程矩阵向右连接到所有项目矩阵（N条线）
- [ ] #5 连线方向为左到右（sourceHandle=right, targetHandle=left）
- [ ] #6 运行 npm run build 成功
<!-- AC:END -->
