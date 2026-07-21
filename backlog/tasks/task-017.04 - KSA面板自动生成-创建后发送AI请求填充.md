---
id: task-017.04
title: KSA面板自动生成 - 创建后发送AI请求填充
status: Done
assignee: []
created_date: '2026-01-21 01:06'
updated_date: '2026-01-21 01:29'
labels:
  - canvas
  - feature
  - ai-request
dependencies:
  - task-017.03
parent_task_id: task-017
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
从课程卡片右侧菜单创建KSA面板时，自动发送请求让AI生成KSA内容并填充。

实现方式：参考课程矩阵的自动填充逻辑 (handleFillCourseMatrix)
1. 创建空白KSA面板
2. 延迟触发 AI 请求生成KSA内容（Knowledge/Skill/Attitude三类）
3. 通过 SSE canvas 事件更新面板子节点

目标格式：KsaItemData[] = {id, category: "K"|"S"|"A", index, content}

需要新增：
- handleFillKsa 函数（参考 handleFillCourseMatrix）
- 后端需要支持 fill_ksa 参数

依赖：建议在课点信息生成完成后再生成KSA，因为KSA通常基于课点分解
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 创建KSA面板后，自动触发AI请求生成KSA内容
- [x] #2 新增 handleFillKsa 函数，参考 handleFillCourseMatrix 实现
- [x] #3 生成的KSA按 K/S/A 分类，每类单独编号（K1、K2...）
- [x] #4 支持进度显示（fillKsaProgress 状态）
- [x] #5 生成完成后通过 SSE canvas 事件更新面板子节点
- [x] #6 生成过程中面板显示 loading 状态
<!-- AC:END -->
