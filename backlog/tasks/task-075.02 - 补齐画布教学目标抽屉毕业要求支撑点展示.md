---
id: task-075.02
title: 补齐画布教学目标抽屉毕业要求支撑点展示
status: To Do
assignee: []
created_date: '2026-03-25 18:38'
labels:
  - bugfix
  - canvas
  - objective
dependencies: []
parent_task_id: task-075
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在画布中的教学目标编辑抽屉里显示每个教学目标对应的毕业要求支撑点标签。

影响文件：
- `src/components/canvas-objective-editor.tsx`

已确认根因：
- `ObjectiveCardData.supports` 已在数据结构中保留并能被画布节点消费
- 抽屉编辑器当前只渲染目标文本输入，没有渲染 `supports` 相关 UI

本任务只补展示，不改变保存协议和数据结构。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 每条教学目标下方可见其毕业要求支撑点标签
- [ ] #2 无 `supports` 的目标保持正常编辑，不报错
- [ ] #3 不修改 `ObjectiveCardData` 存储格式
- [ ] #4 不影响抽屉内新增、删除、保存教学目标的现有行为
<!-- AC:END -->

