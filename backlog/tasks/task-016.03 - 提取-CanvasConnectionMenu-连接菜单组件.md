---
id: task-016.03
title: 提取 CanvasConnectionMenu 连接菜单组件
status: Done
assignee: []
created_date: '2026-01-19 07:15'
updated_date: '2026-01-19 07:35'
labels:
  - refactor
  - canvas
  - ui
dependencies: []
parent_task_id: task-016
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
将 ai-canvas-panel.tsx 中的连接菜单渲染逻辑提取为独立组件。

当前位置：ai-canvas-panel.tsx 第 1409-1595 行（约186行）

该组件功能：
- 在连线松开时显示上下文菜单
- 根据源节点类型显示不同的菜单选项
- 处理菜单选项点击事件
- 检查各面板是否已存在以禁用相应选项

复杂逻辑：
- 从项目矩阵拖出时只显示开课报告选项
- 从课程矩阵拖出时只显示项目矩阵选项
- 从基础面板拖出时只显示课程矩阵选项
- 默认菜单显示教学目标/课点/章节/KSA选项

目标路径：src/components/canvas-drawers/canvas-connection-menu.tsx
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 创建 CanvasConnectionMenu 组件
- [ ] #2 组件接收 connectionMenu 状态、flowNodes、onMenuSelect 等 props
- [ ] #3 保留所有条件判断逻辑
- [ ] #4 ai-canvas-panel.tsx 使用提取后的组件
- [ ] #5 连接菜单功能正常工作
<!-- AC:END -->
