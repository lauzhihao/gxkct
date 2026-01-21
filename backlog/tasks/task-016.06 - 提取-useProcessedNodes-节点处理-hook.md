---
id: task-016.06
title: 提取 useProcessedNodes 节点处理 hook
status: Done
assignee: []
created_date: '2026-01-19 07:15'
updated_date: '2026-01-19 07:35'
labels:
  - refactor
  - canvas
  - hooks
dependencies:
  - task-016.02
parent_task_id: task-016
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
将 ai-canvas-panel.tsx 中的 processedNodes useMemo 逻辑提取为独立的自定义 hook。

当前位置：ai-canvas-panel.tsx 第 1173-1318 行（约145行）

该 hook 功能：
- 预先计算每个 Panel 的子节点数量
- 为节点注入高亮状态 (highlighted)
- 为节点注入删除/更新 loading 状态 (isDeleting)
- 为节点注入各种回调函数 (onDelete, onRefresh, onEdit, onAdd 等)
- 根据节点类型注入不同的属性
- 处理项目矩阵、课程信息、课程矩阵、开课报告、Panel 节点的特殊逻辑

目标路径：src/shared/hooks/use-processed-nodes.ts
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 创建 useProcessedNodes hook 在 src/shared/hooks/use-processed-nodes.ts
- [ ] #2 hook 接收 flowNodes、highlightState、deletingNodeIds、updatingPanelIds 等参数
- [ ] #3 hook 接收各种回调函数作为参数
- [ ] #4 hook 返回处理后的节点数组
- [ ] #5 节点注入逻辑与原来完全一致
<!-- AC:END -->
