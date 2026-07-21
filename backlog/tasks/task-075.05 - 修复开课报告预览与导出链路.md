---
id: task-075.05
title: 修复开课报告预览与导出链路
status: To Do
assignee: []
created_date: '2026-03-25 18:38'
labels:
  - bugfix
  - report
  - export
  - canvas
dependencies: []
parent_task_id: task-075
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
修复开课报告预览与导出链路中的一组关联问题：

1. 导出开课报告时授课教师名字丢失
2. 预览区域中的课程矩阵显示旧快照，而不是当前画布最新数据
3. `导出 Word` 按钮出现过早，导致用户在未更新课程前导出旧数据
4. 课程预览中的课点名称列读错字段，导致名称不显示

影响文件：
- `src/components/canvas-course-report-preview.tsx`
- `src/shared/hooks/use-canvas-drawers.ts`

已确认根因：
- 预览组件当前主要消费打开抽屉瞬间的 `data` 快照
- 课点名称列使用了错误字段
- 导出已保存课程时直接走 `exportReport(courseId)`，没有收口到“更新课程成功之后”
- 当前画布课程信息没有稳定讲师字段，导出 fallback 不完整
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 预览中的课程矩阵与当前画布最新卡片数据一致
- [ ] #2 课点列表名称列显示真实名称而非空值
- [ ] #3 在“更新课程”完成前不显示或不可用 `导出 Word` 按钮
- [ ] #4 更新课程完成后导出的 Word 中包含授课教师信息
- [ ] #5 不影响现有开课报告预览的其它基础信息展示
<!-- AC:END -->

