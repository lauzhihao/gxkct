---
id: task-016.01
title: 提取 CustomZoomControls 缩放控件组件
status: Done
assignee: []
created_date: '2026-01-19 07:15'
updated_date: '2026-01-19 07:35'
labels:
  - refactor
  - canvas
dependencies: []
parent_task_id: task-016
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
将 ai-canvas-panel.tsx 中的 CustomZoomControls 组件提取到独立文件。

当前位置：ai-canvas-panel.tsx 第 91-158 行（约70行）

该组件功能：
- 显示当前缩放比例
- 提供放大/缩小按钮（按5%步进）
- 提供适应视图按钮
- 监听视口变化更新显示

目标路径：src/components/flow/controls/zoom-controls.tsx
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CustomZoomControls 组件移动到 src/components/flow/controls/zoom-controls.tsx
- [ ] #2 ai-canvas-panel.tsx 改为导入使用
- [ ] #3 组件导出名称保持不变
- [ ] #4 缩放功能正常工作
<!-- AC:END -->
