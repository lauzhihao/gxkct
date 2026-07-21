---
id: task-016.02
title: 提取 useCanvasDrawers 抽屉状态管理 hook
status: Done
assignee: []
created_date: '2026-01-19 07:15'
updated_date: '2026-01-19 07:24'
labels:
  - refactor
  - canvas
  - hooks
dependencies: []
parent_task_id: task-016
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
将 ai-canvas-panel.tsx 中的多个编辑抽屉状态和处理函数提取为独立的自定义 hook。

当前位置：ai-canvas-panel.tsx 第 289-846 行（约560行）

包含的抽屉状态：
- editDialog - 编辑弹窗状态
- coursePointDrawer - 课点编辑抽屉
- ksaDrawer - KSA编辑抽屉
- chapterDrawer - 章节编辑抽屉
- objectiveDrawer - 教学目标编辑抽屉
- courseMatrixDrawer - 课程矩阵编辑抽屉
- projectMatrixDrawer - 项目矩阵编辑抽屉
- courseReportDrawer - 开课报告预览抽屉

包含的处理函数：
- handleNodeEdit, handleEditSave, handleEditCancel
- handleCoursePointsSave, handleCoursePointDrawerClose, handleCoursePointPanelEdit
- handleKsaItemsSave, handleKsaDrawerClose, handleKsaPanelEdit
- handleChaptersSave, handleChapterDrawerClose, handleChapterPanelEdit
- handleObjectivesSave, handleObjectiveDrawerClose, handleObjectivePanelEdit
- handleCourseMatrixSave, handleCourseMatrixDrawerClose, handleCourseMatrixEdit
- handleProjectMatrixSave, handleProjectMatrixDrawerClose, handleProjectMatrixEdit
- handleCourseReportEdit, handleCourseReportDrawerClose

目标路径：src/shared/hooks/use-canvas-drawers.ts
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 创建 useCanvasDrawers hook 在 src/shared/hooks/use-canvas-drawers.ts
- [ ] #2 hook 导出所有抽屉状态和处理函数
- [ ] #3 hook 接收必要的回调参数（onNodeDataUpdate, onCoursePointsUpdate 等）
- [ ] #4 ai-canvas-panel.tsx 使用该 hook 替代内联状态
- [ ] #5 所有抽屉功能正常工作
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
hook 已创建: src/shared/hooks/use-canvas-drawers.ts

ai-canvas-panel.tsx 已修改使用 hook

代码行数从 1850 行减少到 1385 行
<!-- SECTION:NOTES:END -->
