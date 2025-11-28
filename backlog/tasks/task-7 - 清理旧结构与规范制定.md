---
id: task-7
title: 清理旧结构与规范制定
status: To Do
assignee: []
created_date: '2025-11-28 12:07'
labels:
  - refactor
  - governance
dependencies:
  - task-4
  - task-5
  - task-6
priority: medium
---

## Description

- 依据 REFACTOR.MD Step 4~6，删除已无引用的旧组件/Hook/API 路径，并在必要位置保留过渡导出，逐步替换所有历史引用。
- 全局搜索旧路径别名、重复工具、未分层代码，统一指向 `modules/*` 与 `shared/*`，同步更新 lint/tsconfig 以防回归。
- 在 `backlog/docs` 或 `docs/` 中补充《项目目录规范》文档，说明新模块命名、依赖方向（shared→modules）与新增功能落地流程。
- 最终执行一次构建与核心手动回归，记录验证结果供上线检查。
