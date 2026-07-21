---
id: task-017.02
title: 章节项目面板自动填充 - 从课程卡片读取数据
status: Done
assignee: []
created_date: '2026-01-21 01:06'
updated_date: '2026-01-21 01:22'
labels:
  - canvas
  - feature
dependencies: []
parent_task_id: task-017
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
从课程卡片右侧菜单创建章节项目面板时，自动从课程信息卡片的 metadata.chapters 中读取数据并填充子节点卡片。

数据来源：CourseInfoData.metadata.chapters
数据格式：Array<{id, name, theoryHours?, practiceHours?}>
目标格式：ChapterCardData[] = {id, index, name, theory_hours?, practice_hours?}

参考实现：
- 课程矩阵创建逻辑 (ai-assistant-drawer.tsx:2009-2055)
- updateCanvasPanelChildren 函数 (use-canvas-elements.ts:722-795)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 创建独立的 handleFillChapterPanel 函数，向后端发送 fill_chapter_panel 请求
- [x] #2 创建章节面板后延迟调用 handleFillChapterPanel
- [x] #3 章节面板重做时调用 handleFillChapterPanel 而非通用重做
- [x] #4 移除创建时的前端自动填充逻辑（改为后端填充）
<!-- AC:END -->
