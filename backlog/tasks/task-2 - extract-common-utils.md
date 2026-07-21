---
id: task-2
title: 提取公共工具函数到 shared/utils
status: Completed
assignee: []
created_date: '2025-12-01'
completed_date: '2025-12-01'
labels:
  - refactor
  - utils
  - DRY
dependencies: []
priority: high
---

## Description

将重复出现在多个组件中的工具函数提取到 `src/shared/utils/` 目录，消除代码重复，提高可维护性。

### 具体任务

1. **创建 `src/shared/utils/date-utils.ts`**
   - 提取 `formatDate` 函数（当前在3个文件中重复定义）
   - 添加 `formatDateTime`、`formatDateRange` 等扩展函数
   - 支持可配置的日期格式选项

2. **创建 `src/shared/utils/data-transform.ts`**
   - 提取课程类型映射逻辑（`getCourseType`、`getCourseName`）
   - 创建通用的枚举映射工具函数

3. **更新现有组件**
   - `src/modules/courses/components/course/course-basic-info.tsx`
   - `src/modules/courses/components/course/course-supervision-detail.tsx`
   - `src/modules/courses/components/course/course-supervision.tsx`
   - 移除本地定义的工具函数，改为导入共享版本

4. **添加类型定义**
   - 为所有工具函数添加完整的 TypeScript 类型
   - 导出类型供其他模块使用

5. **文档更新**
   - 在 `CLAUDE.md` 中记录新增的工具函数模块
   - 添加函数使用示例

## Acceptance Criteria

- [ ] `formatDate` 函数只在 `src/shared/utils/date-utils.ts` 中定义一次
- [ ] 所有之前使用本地 `formatDate` 的组件已更新为使用共享版本
- [ ] 运行 `npm run lint` 无错误
- [ ] 运行 `npm run build` 成功
- [ ] 所有工具函数有完整的 TypeScript 类型定义

## Notes

- 确保 `formatDate` 的行为与原有实现完全一致，避免引入破坏性变更
- 可考虑使用 `date-fns` 库替代手动实现，但需评估包体积影响
- 提取过程中如发现其他重复工具函数，一并处理
