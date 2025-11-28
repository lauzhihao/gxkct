---
id: task-2
title: 构建模块化目录骨架
status: Done
assignee: []
created_date: '2025-11-28 12:07'
labels:
  - refactor
  - architecture
dependencies: []
priority: high
---

## Description

- 按 REFACTOR.MD Step 1 在项目根下建立 `src/modules`、`src/shared`、`src/types`、`src/config` 等骨架目录，并保留 `app` 目录作为路由层。
- 将现有 `app` 目录迁移到 `src/app`，更新 `next.config.mjs`、`tsconfig.json` 中的 `baseUrl`、`paths` (保持 `@/*` 指向 `src/*`) 以对齐新结构。
- 调整构建或脚本引用路径，确保 move 后 `pnpm dev/build` 可运行且路径别名解析正常。
- 输出一份目录初始化记录 (可放 backlog/docs) 说明新增目录及命名规范，供后续模块任务参考。
