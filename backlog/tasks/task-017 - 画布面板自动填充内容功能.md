---
id: task-017
title: 画布面板自动填充内容功能
status: Done
assignee: []
created_date: '2026-01-21 01:05'
updated_date: '2026-01-21 02:35'
labels:
  - canvas
  - feature
  - ai-assistant
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
从课程卡片右侧加号菜单创建面板时，自动为面板填充内容。

创建的面板会自动发送AI请求填充内容：
- 教学目标面板：发送 fill_objective_panel 请求，由后端AI生成
- 章节项目面板：发送 fill_chapter_panel 请求，由后端AI生成
- 课点信息面板：发送 fill_course_point_panel 请求，由后端AI生成
- KSA面板：发送 fill_ksa_panel 请求，由后端AI生成

涉及文件：
- src/components/ai-assistant-drawer.tsx (主要修改)
- src/components/canvas-elements/types.ts (数据类型参考)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 task-017.01 教学目标面板自动填充完成
- [x] #2 task-017.02 章节项目面板自动填充完成
- [x] #3 task-017.03 课点信息面板AI自动生成完成
- [x] #4 task-017.04 KSA面板AI自动生成完成
<!-- AC:END -->
