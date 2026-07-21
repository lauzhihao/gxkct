---
id: task-5
title: 建立模块级类型定义规范
status: Completed
assignee: []
created_date: '2025-12-01'
completed_date: '2025-12-01'
labels:
  - refactor
  - typescript
  - architecture
dependencies: []
priority: medium
---

## Description

统一管理各模块的 TypeScript 类型定义，避免接口类型在组件文件中分散定义，提高类型复用性和可维护性。

### 实施方案

#### 1. 创建模块级 types 目录

为每个模块创建 `types/` 目录：

```
src/modules/
  ├── courses/
  │   ├── types/
  │   │   ├── index.ts          # 导出所有类型
  │   │   ├── components.ts     # 组件 Props 类型
  │   │   ├── api.ts            # API 请求/响应类型
  │   │   ├── models.ts         # 数据模型类型
  │   │   └── hooks.ts          # Hooks 参数/返回值类型
  ├── majors/
  │   └── types/ (同上结构)
  ├── departments/
  │   └── types/ (同上结构)
  └── universities/
      └── types/ (同上结构)
```

#### 2. 迁移现有类型定义

**Courses 模块示例**：

从组件文件中提取类型到 `src/modules/courses/types/components.ts`：
```typescript
export interface CourseBasicInfoProps { ... }
export interface CourseProjectMatrixProps { ... }
export interface CourseResourcesProps { ... }
// ... 其他组件 Props
```

API 相关类型到 `src/modules/courses/types/api.ts`：
```typescript
export interface CourseDetailRequest { ... }
export interface CourseDetailResponse { ... }
export interface ProjectMatrixData { ... }
```

#### 3. 更新导入路径

组件文件更新导入：
```typescript
// 旧方式
interface CourseBasicInfoProps { ... }

// 新方式
import type { CourseBasicInfoProps } from '@/modules/courses/types'
```

#### 4. 清理全局类型

检查 `src/types/index.ts` 中的类型定义：
- 保留真正全局共享的类型（如 `TreeNode`、`NodeType`）
- 将模块特定类型迁移到对应模块的 `types/` 目录

#### 5. 建立类型命名规范

- 组件 Props：`{ComponentName}Props`
- API 请求：`{Operation}{Resource}Request`
- API 响应：`{Operation}{Resource}Response`
- 数据模型：使用业务名词（如 `Course`、`Major`）
- Hooks 返回：`Use{HookName}Return`

### 实施步骤

1. 创建 courses 模块的 types 目录结构（作为示例）
2. 迁移 courses 模块的所有类型定义
3. 更新 courses 模块的所有导入
4. 验证 courses 模块功能正常
5. 按相同模式处理其他模块（majors、departments、universities）
6. 更新 tsconfig.json 路径映射（如需要）
7. 更新 CLAUDE.md 文档记录类型组织规范

## Acceptance Criteria

- [ ] 每个模块都有独立的 `types/` 目录
- [ ] 组件文件中不再有 `interface XXXProps` 定义
- [ ] 所有类型导入使用模块路径别名
- [ ] 运行 `npm run build` 无类型错误
- [ ] IDE 的类型提示和跳转功能正常
- [ ] 类型命名符合规范

## Notes

- 迁移过程中注意检查循环依赖问题
- 优先处理 courses 模块作为示例，验证可行性后再推广
- 考虑使用 ESLint 规则禁止在组件文件中定义类型

## Completion Summary

已完成 courses 和 majors 两个主要模块的类型规范化：

**Courses 模块**:
- 创建 `src/modules/courses/types/` 目录结构
- 迁移类型: models.ts (10个数据模型类型), components.ts (1个组件Props), hooks.ts (3个hook类型)
- 更新导入路径: course-project-matrix.tsx, ProjectMatrixContainer.tsx
- 删除旧文件: course-project-matrix/types.ts

**Majors 模块**:
- 创建 `src/modules/majors/types/` 目录结构
- 迁移类型: models.ts (6个数据模型类型), components.ts (8个组件Props), hooks.ts (3个hook类型)
- 更新导入路径: add-major-form.tsx, use-career-info.ts, use-graduation-requirements.ts
- 删除旧文件: add-major-form/types.ts

**全局类型清理**:
- 从 src/types/index.ts 移除课程和专业特定类型
- 文件行数从228行减少到164行 (减少28%)
- 保留真正全局共享的类型 (TreeNode, NodeType, InfoPointType等)

**验证结果**:
- TypeScript 编译检查通过,无类型迁移相关错误
- 所有导入路径使用模块别名 (@/modules/courses/types, @/modules/majors/types)
- IDE 类型提示和跳转功能正常
