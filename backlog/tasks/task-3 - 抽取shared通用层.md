---
id: task-3
title: 抽取 shared 通用层
status: Done
assignee: []
created_date: '2025-11-28 12:07'
labels:
  - refactor
  - shared
dependencies:
  - task-2
priority: high
---

## Description

- 根据 REFACTOR.MD Step 2 盘点当前 `components/`, `hooks/`, `lib/`, `styles/` 下可复用的 UI、Hook、工具（如通用按钮/表格/树、usePagination、请求封装等）。
- 将复用代码迁移到 `src/shared/{components,hooks,utils,styles}`，并为关键模块补充 `index.ts` 统一导出，保持外部 API 不变。
- 梳理并更新所有引用路径为 `@/shared/...`，保证 tree shaking 友好，且不引入循环依赖。
- 输出一份 shared 清单，列出迁移项、原路径、新路径和后续复用约束，便于代码评审。
