---
id: task-075.09
title: 修复 AI 画布聊天过程态展示与开课报告回跳
status: To Do
assignee: []
created_date: '2026-03-25 18:38'
labels:
  - bugfix
  - ai
  - canvas
  - sse
dependencies: []
parent_task_id: task-075
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
修复 AI 聊天驱动画布链路中的两个问题：

1. 章节、教学目标、课程信息等面板缺少过程数据展示
2. 项目矩阵生成完成后没有自动回到开课报告节点

影响文件：
- `src/components/ai-assistant-drawer.tsx`
- `src/shared/hooks/use-processed-nodes.ts`

已确认根因：
- 当前 `fillProgress` 路由和 `progressMessage` 注入只覆盖部分面板
- 项目矩阵完成后的 `onComplete` 只会继续选中当前项目矩阵

本任务还需要顺带验证：上传到 OSS 的画布快照是否完整包含 `project_matrix` 和 `course_report`，以便区分前端快照问题和后端技能误判问题。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 章节、教学目标、课程信息等面板能够显示过程数据
- [ ] #2 项目矩阵完成后，若开课报告节点已存在则自动聚焦到开课报告节点
- [ ] #3 聊天区与画布面板的过程态文案保持一致
- [ ] #4 能够验证上传快照是否包含最新 `project_matrix` / `course_report`
<!-- AC:END -->

