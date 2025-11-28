---
id: task-6
title: 系统管理及跨模块功能迁移
status: To Do
assignee: []
created_date: '2025-11-28 12:07'
labels:
  - refactor
  - system
dependencies:
  - task-2
  - task-3
priority: medium
---

## Description

- 将当前散落在 `components/detail-panel/**`、`components/tree-view.tsx`、`components/header.tsx`、`app/orders` 等系统/全局管理相关代码迁移到 `src/modules/system/`，构建相同的分层结构。
- 梳理系统级 Hooks（如树节点状态、主题、权限等）并判断应归属 shared 还是 system 模块，避免与业务模块交叉引用。
- 确保 `app` 路由层维持原 URL，不破坏既有导航、布局与主题 Provider。
- 完成迁移后进行全局 UI smoke test，确认系统工具栏、树形导航、订单页仍旧工作正常。
