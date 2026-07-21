---
id: task-017.01
title: 教学目标面板自动填充 - 从课程卡片读取数据
status: Done
assignee: []
created_date: '2026-01-21 01:06'
updated_date: '2026-01-21 02:35'
labels:
  - canvas
  - feature
dependencies: []
parent_task_id: task-017
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
从课程卡片右侧菜单创建教学目标面板时，自动发送AI请求填充教学目标内容。

实现方式：
- 创建面板后延迟500ms调用 handleFillObjectivePanel
- 发送 fill_objective_panel: true 参数的AI请求
- 通过SSE canvas事件更新面板子节点

参考实现：
- handleFillObjectivePanel 函数 (ai-assistant-drawer.tsx:1445-1638)
- onConnectionMenuSelect 回调 (ai-assistant-drawer.tsx:2987-2991)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 创建教学目标面板后，自动触发AI请求生成教学目标内容
- [x] #2 新增 handleFillObjectivePanel 函数，发送 fill_objective_panel 请求
- [x] #3 生成完成后通过 SSE canvas 事件更新面板子节点
- [x] #4 课程信息不存在时，AI根据课程名称等信息生成教学目标
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 实现总结

修改文件: `src/components/ai-assistant-drawer.tsx`

### 修改内容

1. 新增 `handleFillObjectivePanel` 函数（第1445-1638行）：
   - 检查会话状态和重做状态
   - 创建用户消息和AI响应占位
   - 发送 `fill_objective_panel: true` 参数的AI请求
   - 通过SSE流式响应更新面板内容

2. 修改 `onConnectionMenuSelect` 回调逻辑（第2987-2991行）：
   - 创建教学目标面板后延迟500ms调用 `handleFillObjectivePanel`
   - 传递面板ID用于定向更新

### 工作流程
1. 用户点击课程卡片右侧加号→选择"教学目标"
2. 创建空白教学目标面板
3. 延迟500ms后自动调用 `handleFillObjectivePanel`
4. 发送AI请求，后端生成教学目标内容
5. 通过SSE canvas事件更新面板子节点
<!-- SECTION:NOTES:END -->
