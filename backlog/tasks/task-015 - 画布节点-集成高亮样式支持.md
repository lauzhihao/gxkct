---
id: task-015
title: 画布节点 - 集成高亮样式支持
status: Done
assignee: []
created_date: '2026-01-12 12:59'
updated_date: '2026-01-12 14:56'
labels:
  - canvas
  - nodes
  - highlight
dependencies:
  - task-014
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在画布节点组件中集成高亮样式支持，实现选中时的视觉反馈效果。

### 需要修改的节点组件

| 组件文件 | 说明 |
|---------|------|
| `chapter-node.tsx` | 章节卡片节点 |
| `course-point-node.tsx` | 课点卡片节点 |
| `ksa-node.tsx` | KSA卡片节点 |
| `project-matrix-node.tsx` | 项目矩阵节点（触发源） |

### 修改内容

#### 1. 扩展节点 Props 接口

在各节点组件中添加高亮相关属性：

```typescript
interface NodeProps {
  // ... 原有属性
  highlighted?: boolean
  onRowClick?: (rowId: string, rowType: "coursePoint" | "ksa") => void
}
```

#### 2. 修改章节/课点/KSA卡片节点

**文件**: `src/components/flow/nodes/chapter-node.tsx` 等

```typescript
export const ChapterNode = memo(function ChapterNode({ 
  data, 
  selected,
  highlighted = false,
}: NodeProps<ChapterCardData> & { highlighted?: boolean }) {
  return (
    <div className={cn(
      "bg-white rounded-lg border-2 shadow-sm transition-all",
      selected && "border-purple-500",
      highlighted && "canvas-node-highlighted",
      !selected && !highlighted && "border-purple-200"
    )}>
      {/* 节点内容 */}
    </div>
  )
})
```

#### 3. 修改项目矩阵节点

**文件**: `src/components/flow/nodes/project-matrix-node.tsx`

添加行点击事件，触发高亮：

```typescript
export const ProjectMatrixNode = memo(function ProjectMatrixNode({
  data,
  selected,
  onRowClick,
}: NodeProps<ProjectMatrixData> & { 
  onRowClick?: (rowId: string, rowType: "coursePoint" | "ksa") => void 
}) {
  const handleCoursePointClick = (coursePointId: string) => {
    onRowClick?.(coursePointId, "coursePoint")
  }

  const handleKsaClick = (ksaId: string) => {
    onRowClick?.(ksaId, "ksa")
  }

  return (
    <div className="...">
      {/* 表格内容 */}
      {data.rows.map(row => (
        <tr 
          key={row.course_point_id}
          onClick={() => handleCoursePointClick(row.course_point_id)}
          className="cursor-pointer hover:bg-gray-100"
        >
          <td>{row.course_point_name}</td>
          <td>
            {row.ksa_supports?.map(ksa => (
              <span 
                key={ksa.id}
                onClick={(e) => {
                  e.stopPropagation()
                  handleKsaClick(ksa.id)
                }}
                className="cursor-pointer hover:underline"
              >
                {ksa.level}
              </span>
            ))}
          </td>
        </tr>
      ))}
    </div>
  )
})
```

#### 4. 在 FlowCanvas 中集成高亮逻辑

**文件**: `src/components/flow/flow-canvas.tsx`

```typescript
import { useCanvasHighlight } from "@/shared/hooks/use-canvas-highlight"

export function FlowCanvas({ nodes, edges, ... }: FlowCanvasProps) {
  const { highlightState, isHighlighted, ... } = useCanvasHighlight()

  // 为节点注入 highlighted 属性
  const nodesWithHighlight = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        highlighted: isHighlighted(node.id),
      },
    }))
  }, [nodes, isHighlighted])

  return (
    <ReactFlow
      nodes={nodesWithHighlight}
      edges={edges}
      ...
    />
  )
}
```

### 实施步骤

1. 扩展 FlowNodeData 类型，添加 highlighted 字段
2. 修改 ChapterNode 组件，添加高亮样式
3. 修改 CoursePointNode 组件，添加高亮样式
4. 修改 KsaNode 组件，添加高亮样式
5. 修改 ProjectMatrixNode 组件，添加行点击事件
6. 在 FlowCanvas 中集成 useCanvasHighlight Hook
7. 测试高亮联动效果
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 章节卡片节点支持 highlighted 属性
- [x] #2 课点卡片节点支持 highlighted 属性
- [x] #3 KSA卡片节点支持 highlighted 属性
- [x] #4 项目矩阵节点支持行点击事件
- [x] #5 FlowCanvas 集成高亮状态管理
- [x] #6 高亮效果有动画过渡
- [x] #7 运行 npm run build 成功
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 实施完成记录

### 修改文件清单

1. **`src/components/flow/nodes/base-flow-node.tsx`**
   - 在 `BaseFlowNodeProps` 接口中添加 `highlighted?: boolean` 属性
   - 在组件参数中解构 `highlighted = false`
   - 在外层 div 的 className 中添加条件类 `canvas-node-highlighted`
   - 将 `transition-shadow` 改为 `transition-all duration-200` 以支持平滑过渡

2. **`src/components/flow/nodes/chapter-node.tsx`**
   - 扩展 NodeProps 类型为 `NodeProps<ChapterCardData & { highlighted?: boolean }>`
   - 从 data 中解构 `highlighted` 属性
   - 将 `highlighted` 传递给 `BaseFlowNode`

3. **`src/components/flow/nodes/course-point-node.tsx`**
   - 扩展 NodeProps 类型为 `NodeProps<CoursePointCardData & { highlighted?: boolean }>`
   - 从 data 中解构 `highlighted` 属性
   - 将 `highlighted` 传递给 `BaseFlowNode`

4. **`src/components/flow/nodes/ksa-node.tsx`**
   - 扩展 NodeProps 类型为 `NodeProps<KsaItemData & { highlighted?: boolean }>`
   - 从 data 中解构 `highlighted` 属性
   - 将 `highlighted` 传递给 `BaseFlowNode`

5. **`src/components/flow/nodes/project-matrix-node.tsx`**
   - 新增 `ProjectMatrixNodeData` 接口，扩展 `ProjectMatrixData`
   - 添加 `highlighted`、`onCoursePointClick`、`onKsaClick` 属性
   - 实现 `handleCoursePointClick` 处理课点行点击
   - 实现 `handleKsaClick` 处理 KSA 标签点击（阻止冒泡）
   - 表格行添加点击事件和 hover 样式
   - 在课点名称旁显示 KSA 标签，支持点击

6. **`src/components/flow/flow-canvas.tsx`**
   - 在 `FlowCanvasProps` 中添加:
     - `highlightedNodeIds?: Set<string>` - 高亮节点 ID 集合
     - `onCoursePointRowClick?: (coursePointId: string) => void` - 课点行点击回调
     - `onKsaTagClick?: (ksaId: string) => void` - KSA 标签点击回调
   - 新增 `processedNodes` useMemo 处理节点数据注入
   - 为项目矩阵节点注入 `onCoursePointClick` 和 `onKsaClick` 回调
   - 为所有节点注入 `highlighted` 状态
   - ReactFlow 使用 `processedNodes` 替代原 `nodes`

### 使用方式

```typescript
// 在使用 FlowCanvas 的父组件中
import { useCanvasHighlight } from "@/shared/hooks/use-canvas-highlight"

const {
  highlightState,
  highlightByCoursePoint,
  highlightByKsa,
  clearHighlight,
} = useCanvasHighlight()

<FlowCanvas
  nodes={nodes}
  edges={edges}
  highlightedNodeIds={highlightState.highlightedIds}
  onCoursePointRowClick={(coursePointId) => {
    highlightByCoursePoint(coursePointId, elements)
  }}
  onKsaTagClick={(ksaId) => {
    highlightByKsa(ksaId, elements)
  }}
/>
```

### 高亮样式

使用 task-014 中定义的 `.canvas-node-highlighted` CSS 类，提供:
- 蓝色边框发光效果
- 脉冲动画视觉反馈
- 平滑过渡动画
<!-- SECTION:NOTES:END -->
