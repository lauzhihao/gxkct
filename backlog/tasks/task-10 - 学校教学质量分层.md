---
id: task-10
title: 学校模块教学质量分层
status: Done
assignee: []
created_date: '2025-11-28 13:27'
labels:
  - refactor
  - universities
dependencies:
  - task-6
priority: medium
---

## Description

- 参照课程模块做法，将 `src/modules/universities/components/shared/teaching-quality*.tsx` 中的 API 调用和状态拆分至 `modules/universities/hooks`、`modules/universities/api`。
- TeachingQuality 组件改为只负责渲染/触发动作；教学任务列表、表单、评价等业务逻辑由 hooks 管理。
- 为新的 hook/service 编写类型定义与导出，避免组件之间直接引用 `@/lib/api`。
- 更新使用 TeachingQuality 的所有入口（如 UniversityDetail），确保 props/interface 一致。
- 执行最小化验证（lint + 关键交互手测），记录结果到 backlog/docs。

## Notes

- 新增 `useTeachingTasks` hook（`modules/universities/hooks/use-teaching-tasks.ts`），封装教学任务的加载、创建、更新、自动保存与状态变更逻辑。
- `TeachingQuality` 组件改为使用该 hook 提供的数据与方法，不再直接依赖 `api.teachingTasks`。
