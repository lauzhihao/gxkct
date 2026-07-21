---
id: task-075.06
title: 修复更新课程保存链路的全量覆盖与课程选择
status: To Do
assignee: []
created_date: '2026-03-25 18:38'
labels:
  - bugfix
  - canvas
  - save
  - api
dependencies: []
parent_task_id: task-075
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
修复“更新课程”保存链路中的一组事务性问题：

1. 更新 KSA 时没有真正全量覆盖，删减后服务端仍残留旧项
2. 更新章节项目时没有覆盖旧数据，而是重复追加
3. 课程矩阵重建前清理不彻底，旧矩阵数据仍残留
4. 开放式课程设计更新课程时错误提示“您在该专业下暂无负责的课程”

影响文件：
- `src/components/canvas-save-wizard.tsx`
- `src/lib/api/project-teach-goal-api.ts`

已确认根因：
- `CanvasSaveWizard` 的“我的课程”过滤只比较 `manager.label === currentUserName`
- 章节/项目保存底层 API `updateProjectTeachGoal` 仍是 stub，形成伪成功
- 保存链路中章节、KSA、课程矩阵的覆盖策略不一致

本任务需要把课程选择、章节/项目保存、KSA 覆盖、课程矩阵清理放在同一个事务性修复里处理。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 当前用户负责的课程能被正确识别，不再误报“暂无负责课程”
- [ ] #2 KSA 从 11 项缩减到 9 项后，详情页与服务端最终均为 9 项
- [ ] #3 章节项目更新后不会出现重复追加
- [ ] #4 课程矩阵在重建前能清理旧数据，不残留旧行
- [ ] #5 `project-teach-goal` 更新接口不再是本地 stub
<!-- AC:END -->

