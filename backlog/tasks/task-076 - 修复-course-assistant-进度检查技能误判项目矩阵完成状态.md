---
id: task-076
title: 修复 course-assistant 进度检查技能误判项目矩阵完成状态
status: To Do
assignee: []
created_date: '2026-03-25 18:38'
labels:
  - bugfix
  - backend
  - ai
  - progress
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
修复聊天式课程开发中的进度检查技能误判问题：即使已经产生开课报告，仍提示待完成组件中包含项目矩阵。

该问题不属于当前前端仓库的直接 owning 逻辑，已定位到跨仓后端实现：
- `/root/projects/lang-graph-gxkct/course_assistant/tools/progress.py`

已确认根因：
- 后端进度检查对 `project_matrix` 的完成判定字段口径与前端真实画布结构不一致
- 当前更像是按错误的行级字段判断“项目矩阵未完成”，而不是基于矩阵级 `task_objectives` 与行级 `objective_supports` 的真实组合判断

本任务需独立于前端任务处理，不与 `task-075` 的前端修复混发。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 当项目矩阵已具备完整任务目标与支撑关系时，进度检查不再误报“项目矩阵待完成”
- [ ] #2 当开课报告已经生成时，待完成组件列表与真实画布状态一致
- [ ] #3 前后端对 `project_matrix` 完成态的字段口径统一
- [ ] #4 修复后保留对未完成项目矩阵的正确识别能力
<!-- AC:END -->
