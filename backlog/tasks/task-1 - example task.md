---
id: task-9
title: TreeView 与模块解耦
status: Done
assignee: []
created_date: '2025-11-28 13:26'
labels:
  - refactor
  - architecture
dependencies:
  - task-5
  - task-6
priority: medium
---

## Description

- 将 `src/components/tree-view.tsx` 中 Department/Major 数据加载、偏好缓存等业务逻辑抽到对应模块 hooks（如 `modules/departments/hooks/useDepartmentMajors`）。
- App 路由层（`src/app/page.tsx`）仅持有模块暴露的入口与简单状态，TreeView 负责渲染，业务数据通过 props/hook 注入。
- 抽离后的 hook 需封装 API 调用/本地缓存，并提供最小 API 给树形组件。
- 更新相关单测/文档，确保 TreeView 仍能展开节点、加载数据。
- 完成后运行 `pnpm lint`，记录检查通过结果。

## Notes

- 新增 `useDepartmentMajors`、`useMajorCourses` 两个 hooks（位于 `modules/departments/hooks` 与 `modules/majors/hooks`），TreeView 调用 hooks 暴露的 `load*` 方法加载数据。
- TreeView 移除了对 `setDepartmentMajors`/`setMajorCourses` 等内部状态的直接管理，满足“业务逻辑迁入模块”要求。
