---
id: task-075.08
title: 修复画布 KSA 编辑器输入框按内容自适应
status: Done
assignee: []
created_date: '2026-03-25 18:38'
labels:
  - bugfix
  - ksa
  - ui
dependencies: []
parent_task_id: task-075
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
让画布 KSA 编辑抽屉中的输入框根据内容高度自动增长，而不是只在收起/展开两档固定高度之间切换。

影响文件：
- `src/components/canvas-ksa-editor.tsx`
- `src/shared/components/ui/expandable-textarea.tsx`

已确认根因：
- `ExpandableTextarea` 目前是固定 `collapsedHeight/expandedHeight` 两档高度
- `CanvasKsaEditor` 直接复用了该固定高度组件，因此内容一长就会出现体验不佳
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 KSA 输入框随内容行数自动增长
- [ ] #2 空内容或短内容时保持紧凑高度
- [ ] #3 不影响其他使用 `ExpandableTextarea` 的场景
- [ ] #4 不引入滚动抖动或光标跳动问题
<!-- AC:END -->
