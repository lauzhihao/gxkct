---
id: task-075.07
title: 修复 KSA 批量创建重复编号
status: To Do
assignee: []
created_date: '2026-03-25 18:38'
labels:
  - bugfix
  - ksa
dependencies: []
parent_task_id: task-075
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
修复 KSA 批量创建后出现两个 `S8`、两个 `S9` 等重复编号的问题。

影响文件：
- `src/modules/courses/components/dialogs/ksa-dialog.tsx`

已确认根因：
- 批量新增后本地列表的重新加载与 level 计算不稳定
- 当前逻辑缺少按类别统一重排 level 的收口步骤

本任务需要在批量新增、编辑、删除之后重新校验并收敛类别内编号。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 批量新增后同一类别内 level 不重复
- [ ] #2 删除后再次新增不会继承错误的旧 level
- [ ] #3 编辑、删除、批量新增后都能维持 `K/S/A` 类别内连续编号
- [ ] #4 不影响 KSA 选择弹窗已有的强弱支撑选择逻辑
<!-- AC:END -->

