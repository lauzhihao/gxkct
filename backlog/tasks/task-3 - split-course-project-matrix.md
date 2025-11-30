---
id: task-3
title: 拆分 CourseProjectMatrix 大组件
status: Completed
assignee: []
created_date: '2025-12-01'
completed_date: '2025-12-01'
labels:
  - refactor
  - component-split
  - courses
dependencies:
  - task-2
priority: high
---

## Description

将 1241 行的 `course-project-matrix.tsx` 拆分为多个职责清晰的小组件，提高代码可维护性和可测试性。

### 拆分策略

#### 1. 提取自定义 Hooks

创建 `src/modules/courses/hooks/use-project-matrix.ts`：
- 管理 `projectMatrixData`、`chapterTaskObjectives`、`ksaData` 等状态
- 封装数据加载逻辑（API调用）
- 提供 `loadProjectMatrix`、`updateKsaSupport` 等方法

创建 `src/modules/courses/hooks/use-task-objectives.ts`：
- 管理任务目标相关状态和对话框
- 提供任务目标的 CRUD 操作

创建 `src/modules/courses/hooks/use-ksa-management.ts`：
- 管理 KSA（知识/技能/态度）相关状态
- 提供 KSA 的增删改查功能

#### 2. 拆分展示组件

创建 `src/modules/courses/components/course/course-project-matrix/` 目录：

- `ProjectMatrixContainer.tsx` (容器组件，约100行)
  - 使用上述 hooks 管理状态
  - 协调子组件交互

- `ProjectMatrixTable.tsx` (表格组件，约200行)
  - 渲染项目矩阵表格
  - 接收只读数据，触发编辑事件

- `TaskObjectivesDialog.tsx` (对话框组件，约150行)
  - 任务目标编辑对话框
  - 独立的状态管理和UI

- `KsaDialog.tsx` (对话框组件，约150行)
  - KSA编辑对话框
  - 包含K/S/A三个分类的展示和编辑

- `MatrixCell.tsx` (单元格组件，约50行)
  - 可编辑的矩阵单元格
  - 处理支撑关系的选择

- `types.ts`
  - 定义所有组件共享的接口类型

#### 3. 更新主组件

- 保留 `course-project-matrix.tsx` 作为入口
- 导入并组合上述拆分的组件
- 减少到约 100-150 行代码

### 实施步骤

1. 创建新的目录结构和文件框架
2. 提取自定义 hooks，确保状态管理逻辑正确迁移
3. 逐个创建展示组件，从最小的单元格组件开始
4. 更新容器组件，集成所有子组件
5. 更新主入口文件，使用新的容器组件
6. 删除旧代码，验证功能完整性

## Acceptance Criteria

- [ ] 单个文件不超过 300 行代码
- [ ] 每个组件有明确的单一职责
- [ ] 自定义 hooks 可独立测试
- [ ] 所有组件有完整的 TypeScript 类型定义
- [ ] 运行 `npm run lint` 无错误
- [ ] 运行 `npm run build` 成功
- [ ] 项目矩阵功能与重构前完全一致

## Notes

- 拆分过程中保持git提交的原子性，每完成一个子组件就提交
- 优先确保功能稳定，性能优化可后续进行
- 考虑使用 React.memo 优化大表格的渲染性能
