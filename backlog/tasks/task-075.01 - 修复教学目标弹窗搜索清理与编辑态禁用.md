---
id: task-075.01
title: 修复教学目标弹窗搜索清理与编辑态禁用
status: To Do
assignee: []
created_date: '2026-03-25 18:38'
labels:
  - bugfix
  - objective
  - ux
dependencies: []
parent_task_id: task-075
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
修复教学目标弹窗中的两个交互问题：

1. 搜索关键字存在时，点击“新增教学目标”应同步清空搜索框与防抖后的筛选值，避免新增后仍停留在筛选态。
2. 当前指标点已存在草稿编辑态时，应禁用新增按钮，避免同时打开多个新增草稿。

影响文件：
- `src/modules/courses/components/shared/teaching-objectives-editor.tsx`

已确认根因：
- 新增入口只调用了 `handleAddObjectiveForGoal`，没有重置 `teachingObjectivesFilterKeyword` 和 `debouncedFilterKeyword`
- `goalInput?.isEditing` 只影响输入区显示，没有绑定到新增按钮的禁用态
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 搜索关键字存在时点击新增，搜索框立即清空
- [ ] #2 防抖中的筛选态被同步复位，不出现旧筛选残留
- [ ] #3 当前 goal 处于新增编辑态时，新增按钮不可再次触发
- [ ] #4 不影响已有保存、取消、删除教学目标逻辑
<!-- AC:END -->

