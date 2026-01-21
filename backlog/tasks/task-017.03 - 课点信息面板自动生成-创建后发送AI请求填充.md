---
id: task-017.03
title: 课点信息面板自动生成 - 创建后发送AI请求填充
status: Done
assignee: []
created_date: '2026-01-21 01:06'
updated_date: '2026-01-21 01:18'
labels:
  - canvas
  - feature
  - ai-request
dependencies: []
parent_task_id: task-017
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
从课程卡片右侧菜单创建课点信息面板时，自动发送请求让AI生成课点内容并填充。

实现方式：参考课程矩阵的自动填充逻辑 (handleFillCourseMatrix)
1. 创建空白课点面板
2. 延迟触发 AI 请求生成课点内容
3. 通过 SSE canvas 事件更新面板子节点

目标格式：CoursePointCardData[] = {id, index, name, description?}

需要新增：
- handleFillCoursePoints 函数（参考 handleFillCourseMatrix）
- 后端需要支持 fill_course_points 参数
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 创建课点信息面板后，自动触发AI请求生成课点内容
- [x] #2 新增 handleFillCoursePoints 函数，参考 handleFillCourseMatrix 实现
- [x] #3 支持进度显示（fillCoursePointsProgress 状态）
- [x] #4 生成完成后通过 SSE canvas 事件更新面板子节点
- [x] #5 生成过程中面板显示 loading 状态
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 实现总结

### 修改文件

1. **src/components/ai-assistant-drawer.tsx**
   - 第286行: 新增 `fillCoursePointsProgress` 状态
   - 第1232-1432行: 新增 `handleFillCoursePoints` 函数
   - 第2435行: 创建课点面板后调用 `handleFillCoursePoints`
   - 第2451行: 传递 `fillCoursePointsProgress` 给 `AiCanvasPanel`

2. **src/components/ai-canvas-panel.tsx**
   - 第156行: 新增 `fillCoursePointsProgress` prop 定义
   - 第197行: 新增参数解构默认值
   - 第609行: 传递给 `useProcessedNodes`

3. **src/shared/hooks/use-processed-nodes.ts**
   - 第53行: 新增 `fillCoursePointsProgress` 接口定义
   - 第118行: 新增参数解构
   - 第248行: 为课点面板注入 `progressMessage`
   - 第282行: 添加到 useMemo 依赖数组

4. **src/components/flow/nodes/base-panel-node.tsx**
   - 第62行: 新增 `progressMessage` prop 定义
   - 第95行: 新增参数解构
   - 第137-142行: 在 loading 遮罩中显示进度消息

5. **src/components/flow/nodes/course-point-panel-node.tsx**
   - 第19行: 新增 `progressMessage` 类型定义
   - 第73行: 传递 `progressMessage` 给 `BasePanelNode`

### 工作流程
1. 用户点击课程卡片右侧加号→选择"课点信息"
2. 创建空白课点面板
3. 延迟200ms后自动调用 `handleFillCoursePoints`
4. 发送 `fill_course_points: true` 参数的AI请求
5. 通过SSE流式响应更新面板内容
6. 进度信息显示在面板的loading遮罩中

### 依赖后端
后端需要支持 `fill_course_points` 参数，并通过SSE返回 canvas 事件更新课点面板子节点
<!-- SECTION:NOTES:END -->
