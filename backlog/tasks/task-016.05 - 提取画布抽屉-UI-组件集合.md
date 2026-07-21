---
id: task-016.05
title: 提取画布抽屉 UI 组件集合
status: Done
assignee: []
created_date: '2026-01-19 07:15'
updated_date: '2026-01-19 07:26'
labels:
  - refactor
  - canvas
  - ui
dependencies:
  - task-016.02
parent_task_id: task-016
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
将 ai-canvas-panel.tsx 中的7个 Sheet 抽屉 UI 组件提取到独立目录。

当前位置：ai-canvas-panel.tsx 第 1597-1837 行（约240行）

包含的抽屉 UI：
1. 课程信息编辑抽屉 (CourseInfoSheet)
2. 课点编辑抽屉 (CoursePointSheet)
3. KSA编辑抽屉 (KsaSheet)
4. 章节编辑抽屉 (ChapterSheet)
5. 教学目标编辑抽屉 (ObjectiveSheet)
6. 课程矩阵编辑抽屉 (CourseMatrixSheet)
7. 项目矩阵编辑抽屉 (ProjectMatrixSheet)
8. 开课报告预览抽屉 (CourseReportSheet)

目标路径：src/components/canvas-drawers/
- index.tsx (统一导出 CanvasDrawers 组件)
- 或各抽屉独立文件
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 创建 src/components/canvas-drawers/ 目录
- [ ] #2 提取所有抽屉 UI 为独立组件或统一组件
- [ ] #3 抽屉组件接收 useCanvasDrawers 返回的状态和处理函数作为 props
- [ ] #4 ai-canvas-panel.tsx JSX 中使用提取后的组件
- [ ] #5 所有抽屉 UI 正常渲染和交互
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
ai-canvas-panel.tsx 使用 CanvasDrawers 组件替代内联抽屉 UI

代码行数从 1385 行减少到 1170 行
<!-- SECTION:NOTES:END -->
