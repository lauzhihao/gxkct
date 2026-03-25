---
id: task-075.04
title: 修复课程矩阵单元格弹窗仅加载当前单元格关系
status: To Do
assignee: []
created_date: '2026-03-25 18:38'
labels:
  - bugfix
  - matrix
  - canvas
dependencies: []
parent_task_id: task-075
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
修复画布中的课程矩阵编辑抽屉。点击单元格里的加号时，弹窗应只加载并编辑当前单元格已有的课点支撑关系，而不是退化成“只看全局未选课点”的追加器。

影响文件：
- `src/components/canvas-course-matrix-editor.tsx`

已确认根因：
- 弹窗打开时会清空 `localSelections`
- 当前逻辑只基于 `selectedIds` 过滤已选项，无法回显当前单元格现有强/弱支撑关系

本任务需要让弹窗具备“按当前 cell 编辑”的语义。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 打开弹窗时能回显当前单元格已有课点及其强弱支撑状态
- [ ] #2 切换不同单元格时，弹窗状态严格隔离
- [ ] #3 确认后只修改当前单元格，不污染其他单元格
- [ ] #4 不影响已有课点新增、删除、切换强弱支撑功能
<!-- AC:END -->

