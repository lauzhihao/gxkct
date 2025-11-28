---
id: task-4
title: 课程模块迁移与分层
status: To Do
assignee: []
created_date: '2025-11-28 12:07'
labels:
  - refactor
  - courses
dependencies:
  - task-2
  - task-3
priority: high
---

## Description

- 以 REFACTOR.MD Step 3 为准，将 `components/course/**`、`components/support-label.tsx`、相关 hooks/api/model 移入 `src/modules/courses/`，构建 `components/hooks/api/model/utils/styles` 子目录。
- 将 `app` 中与课程相关的 page/route 改为轻薄层，仅渲染 `@/modules/courses` 暴露的入口组件。
- 把课程矩阵、课点管理等复杂逻辑抽离到 hooks/services，UI 组件只负责渲染与回调，确保职责清晰。
- 更新导入路径并做最小化回归，保证课程矩阵、指标映射等交互保持原行为。
