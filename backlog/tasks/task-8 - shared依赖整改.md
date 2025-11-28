---
id: task-8
title: shared 层依赖整改
status: Done
assignee: []
created_date: '2025-11-28 13:25'
labels:
  - refactor
  - shared
dependencies:
  - task-5
priority: high
---

## Description

- 检查 `src/shared/**` 目录下的组件是否引用了 `@/modules/**`（目前 `course-selector` 仍依赖 `modules/majors`）。
- 依据 REFACTOR.MD 的 "shared → modules" 依赖方向，拆解或下沉相应对话框/业务逻辑，确保 shared 只提供通用能力。
- 对拆分后的组件新增模块入口/导出，更新所有引用路径，避免循环依赖。
- 补充 eslint/tsconfig import 规则（若已有则更新），禁止 shared 再次引入 modules。
- 迁移完成后执行一次 lint/类型检查，记录结果。

## Notes

- 已将 `course-selector` 迁移至 `src/modules/majors/components/shared/course-selector.tsx`，并更新 `AddMajorForm` 的引用，`src/shared/**` 不再依赖任何模块目录。
