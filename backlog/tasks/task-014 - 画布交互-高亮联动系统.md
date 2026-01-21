---
id: task-014
title: 画布交互 - 高亮联动系统
status: Done
assignee: []
created_date: '2026-01-12 12:59'
updated_date: '2026-01-12 14:45'
labels:
  - canvas
  - interaction
  - highlight
dependencies:
  - task-012
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
创建画布高亮联动系统，实现选中元素时自动高亮关联元素的交互效果。

### 高亮规则

| 触发操作 | 高亮目标 | 说明 |
|---------|---------|------|
| 选中某个项目矩阵 | B中对应的章节卡片 | 通过 `chapter_id` 匹配 |
| 选中项目矩阵中的课点行 | C中对应的课点卡片 | 通过 `course_point_id` 匹配 |
| 选中项目矩阵中的KSA标签 | D中对应的KSA卡片 | 通过 `ksa_id` 匹配 |

### 实现方案

#### 1. 创建高亮状态管理 Hook

**新建文件**: `src/shared/hooks/use-canvas-highlight.ts`

```typescript
import { useState, useCallback, useMemo } from "react"
import type { CanvasElementData } from "@/components/canvas-elements/types"

export type HighlightType = "chapter" | "coursePoint" | "ksa" | null

export interface HighlightState {
  // 当前高亮的节点ID集合
  highlightedIds: Set<string>
  // 触发高亮的源节点ID
  sourceId: string | null
  // 高亮类型
  type: HighlightType
}

export interface UseCanvasHighlightReturn {
  // 高亮状态
  highlightState: HighlightState
  // 高亮指定节点
  highlightNodes: (ids: string[], sourceId: string, type: HighlightType) => void
  // 清除高亮
  clearHighlight: () => void
  // 检查节点是否高亮
  isHighlighted: (nodeId: string) => boolean
  // 根据项目矩阵选中触发高亮
  highlightByProjectMatrix: (matrixData: ProjectMatrixData, elements: CanvasElementData[]) => void
  // 根据课点选中触发高亮
  highlightByCoursePoint: (coursePointId: string, elements: CanvasElementData[]) => void
  // 根据KSA选中触发高亮
  highlightByKsa: (ksaId: string, elements: CanvasElementData[]) => void
}

export function useCanvasHighlight(): UseCanvasHighlightReturn {
  const [highlightState, setHighlightState] = useState<HighlightState>({
    highlightedIds: new Set(),
    sourceId: null,
    type: null,
  })

  const highlightNodes = useCallback((
    ids: string[],
    sourceId: string,
    type: HighlightType
  ) => {
    setHighlightState({
      highlightedIds: new Set(ids),
      sourceId,
      type,
    })
  }, [])

  const clearHighlight = useCallback(() => {
    setHighlightState({
      highlightedIds: new Set(),
      sourceId: null,
      type: null,
    })
  }, [])

  const isHighlighted = useCallback((nodeId: string) => {
    return highlightState.highlightedIds.has(nodeId)
  }, [highlightState.highlightedIds])

  // 选中项目矩阵时，高亮对应的章节卡片
  const highlightByProjectMatrix = useCallback((
    matrixData: ProjectMatrixData,
    elements: CanvasElementData[]
  ) => {
    const chapterId = matrixData.chapter_id
    // 查找对应的章节卡片
    const chapterCard = elements.find(el => 
      el.type === CanvasComponentType.CHAPTER_CARD && 
      (el.data as ChapterCardData).id === chapterId
    )
    if (chapterCard) {
      highlightNodes([chapterCard.id], matrixData.chapter_id, "chapter")
    }
  }, [highlightNodes])

  // 选中课点时，高亮对应的课点卡片
  const highlightByCoursePoint = useCallback((
    coursePointId: string,
    elements: CanvasElementData[]
  ) => {
    const coursePointCard = elements.find(el =>
      el.type === CanvasComponentType.COURSE_POINT_CARD &&
      (el.data as CoursePointCardData).id === coursePointId
    )
    if (coursePointCard) {
      highlightNodes([coursePointCard.id], coursePointId, "coursePoint")
    }
  }, [highlightNodes])

  // 选中KSA时，高亮对应的KSA卡片
  const highlightByKsa = useCallback((
    ksaId: string,
    elements: CanvasElementData[]
  ) => {
    const ksaCard = elements.find(el =>
      el.type === CanvasComponentType.KSA_ITEM &&
      (el.data as KsaItemData).id === ksaId
    )
    if (ksaCard) {
      highlightNodes([ksaCard.id], ksaId, "ksa")
    }
  }, [highlightNodes])

  return {
    highlightState,
    highlightNodes,
    clearHighlight,
    isHighlighted,
    highlightByProjectMatrix,
    highlightByCoursePoint,
    highlightByKsa,
  }
}
```

#### 2. 定义高亮样式

**文件**: `src/app/globals.css`

```css
/* 画布节点高亮样式 */
.canvas-node-highlighted {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5), 
              0 0 20px rgba(59, 130, 246, 0.3);
  animation: highlight-pulse 1.5s ease-in-out infinite;
}

@keyframes highlight-pulse {
  0%, 100% {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5), 
                0 0 20px rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.7), 
                0 0 30px rgba(59, 130, 246, 0.5);
  }
}

/* 彩虹边框高亮（可选） */
.canvas-node-rainbow-highlight {
  background: linear-gradient(white, white) padding-box,
              linear-gradient(90deg, #f79533, #f37055, #ef4e7b, #a166ab, #5073b8, #1098ad, #07b39b) border-box;
  border: 3px solid transparent;
  animation: rainbow-rotate 3s linear infinite;
}
```

### 实施步骤

1. 创建 `use-canvas-highlight.ts` Hook
2. 实现三种高亮触发方法
3. 添加 CSS 高亮样式
4. 导出 Hook 供 FlowCanvas 使用
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 创建 use-canvas-highlight.ts Hook 文件
- [x] #2 实现 highlightByProjectMatrix 方法
- [x] #3 实现 highlightByCoursePoint 方法
- [x] #4 实现 highlightByKsa 方法
- [x] #5 添加 CSS 高亮样式（边框+动画）
- [x] #6 运行 npm run build 成功
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 实施完成记录

### 新增文件
1. `src/shared/hooks/use-canvas-highlight.ts`
   - 定义 `HighlightType` 类型: `"chapter" | "coursePoint" | "ksa" | null`
   - 定义 `HighlightState` 接口: `{ highlightedIds, sourceId, type }`
   - 实现 `useCanvasHighlight` Hook 主体
   - 实现 `highlightNodes` 方法 - 高亮指定节点
   - 实现 `clearHighlight` 方法 - 清除所有高亮
   - 实现 `isHighlighted` 方法 - 检查节点高亮状态
   - 实现 `highlightByProjectMatrix` 方法 - 通过 chapter_id 匹配章节卡片
   - 实现 `highlightByCoursePoint` 方法 - 通过 course_point_id 匹配课点卡片
   - 实现 `highlightByKsa` 方法 - 通过 ksa_id 匹配 KSA 卡片

### 修改文件
2. `src/app/globals.css`
   - 添加 `.canvas-node-highlighted` 蓝色边框高亮类 + 脉冲动画
   - 添加 `@keyframes canvas-highlight-pulse` 动画定义
   - 添加 `.canvas-node-rainbow-highlight` 彩虹边框高亮类（可选）
   - 添加 `@keyframes canvas-rainbow-flow` 彩虹流动动画
   - 添加 `@keyframes canvas-rainbow-rotate` 彩虹缩放动画

### 高亮样式
- 基础高亮: 蓝色边框 (#0070f3) + 脉冲动画
- 彩虹高亮: 渐变边框 + 流动动画（可选使用）

### 使用方式
```typescript
// 在 FlowCanvas 组件中使用
import { useCanvasHighlight } from "@/shared/hooks/use-canvas-highlight"

const {
  highlightState,
  isHighlighted,
  highlightByProjectMatrix,
  highlightByCoursePoint,
  highlightByKsa,
  clearHighlight,
} = useCanvasHighlight()

// 选中项目矩阵时调用
highlightByProjectMatrix(matrixData, elements)

// 选中课点行时调用
highlightByCoursePoint(coursePointId, elements)

// 选中 KSA 标签时调用
highlightByKsa(ksaId, elements)

// 节点渲染时应用样式
className={isHighlighted(nodeId) ? "canvas-node-highlighted" : ""}
```
<!-- SECTION:NOTES:END -->
