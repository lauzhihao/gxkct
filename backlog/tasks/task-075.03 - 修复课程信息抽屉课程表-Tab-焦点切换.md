---
id: task-075.03
title: 修复课程信息抽屉课程表 Tab 焦点切换
status: To Do
assignee: []
created_date: '2026-03-25 18:38'
labels:
  - bugfix
  - form
  - accessibility
dependencies: []
parent_task_id: task-075
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
修复课程信息抽屉中“授课时间/课程表”区域的键盘焦点切换问题，使用户可以使用 `Tab` 和 `Shift+Tab` 在课程表单元格之间连续导航。

影响文件：
- `src/components/add-course-form.tsx`

已确认根因：
- 当前单元格采用 `readOnly Input` 聚焦后切换成 `textarea` 的实现
- 该实现会破坏浏览器原生焦点链，导致 `Tab` 无法稳定切换到相邻单元格

本任务需要把课程表单元格编辑模式改造成可持续键盘导航的结构。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 课程表所有可编辑单元格支持 `Tab` 正向切换
- [ ] #2 课程表所有可编辑单元格支持 `Shift+Tab` 反向切换
- [ ] #3 焦点切换过程中不会因为组件切换导致丢焦
- [ ] #4 不影响鼠标点击编辑、删除行、新增行逻辑
<!-- AC:END -->

