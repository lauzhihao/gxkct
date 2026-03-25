---
id: task-075.10
title: 修复开放式课程设计预览中的课点名称展示
status: To Do
assignee: []
created_date: '2026-03-25 18:38'
labels:
  - bugfix
  - course-dev
  - preview
dependencies: []
parent_task_id: task-075
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
修复开放式课程设计预览页中课点名称没有正确显示的问题。

影响文件：
- `src/components/course-dev-assistant/utils/data-extractor.ts`
- `src/components/course-dev-assistant/utils/markdown-generator.ts`

已确认根因：
- 自由输入课点时，解析器把真实内容放进 `description`，却把标题固定写成 `课点N`
- 预览生成器又优先展示 `point.title`，导致最终看到的是泛化标题或错误名称

本任务需要统一课点“名称/描述”的语义，让预览展示真实名称。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 自由输入课点后，预览页展示真实课点名称
- [ ] #2 推荐课点与手工输入课点的展示语义一致
- [ ] #3 不影响导出 JSON 的现有结构
- [ ] #4 不影响后续 KSA 与课点的关联展示
<!-- AC:END -->

