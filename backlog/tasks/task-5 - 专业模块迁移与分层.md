---
id: task-5
title: 专业模块迁移与分层
status: To Do
assignee: []
created_date: '2025-11-28 12:07'
labels:
  - refactor
  - majors
dependencies:
  - task-2
  - task-3
priority: high
---

## Description

- 收敛 `components/major/**`、`components/add-major-form.tsx`、`components/data-initializer.tsx`、相关 API/模型到 `src/modules/majors/`，并建立 `components/hooks/api/model/utils` 层级。
- 拆分 page/container/hook 职责：页面层仅组合模块入口，hooks 负责数据加载和 CRUD，services（如有）负责业务规则。
- 迁移过程中同步梳理与课程、用户管理的依赖关系，抽取共有逻辑到 shared，避免模块之间直接耦合。
- 手动验证专业详情页（含矩阵、课程列表、成员列表）功能，确保迁移不影响现有交互。
