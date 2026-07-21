---
id: task-016.04
title: 提取开课报告数据收集工具函数
status: Done
assignee: []
created_date: '2026-01-19 07:15'
updated_date: '2026-01-19 07:35'
labels:
  - refactor
  - canvas
  - utils
dependencies: []
parent_task_id: task-016
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
将 ai-canvas-panel.tsx 中 handleCourseReportEdit 函数内的数据收集逻辑提取为独立工具函数。

当前位置：ai-canvas-panel.tsx 第 940-1012 行（约70行）

该函数功能：
- 从画布节点中提取课程信息
- 从教学目标面板子节点提取教学目标列表
- 从章节面板子节点提取章节列表
- 从课点面板子节点提取课点列表
- 从KSA面板子节点提取KSA列表（按类别和index排序）
- 提取课程矩阵数据
- 提取所有项目矩阵数据（按chapter_index排序）
- 组装为 CourseReportPreviewData 格式

目标路径：src/components/flow/utils/collect-course-report-data.ts
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 创建 collectCourseReportData 函数
- [ ] #2 函数接收 flowNodes 参数
- [ ] #3 函数返回 CourseReportPreviewData 类型
- [ ] #4 handleCourseReportEdit 使用该工具函数
- [ ] #5 开课报告预览数据正确
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
开课报告数据收集逻辑已在 useCanvasDrawers hook 中封装，无需额外提取
<!-- SECTION:NOTES:END -->
