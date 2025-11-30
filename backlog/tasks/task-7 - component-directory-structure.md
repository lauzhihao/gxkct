---
id: task-7
title: 统一模块组件目录结构
status: Completed
assignee: []
created_date: '2025-12-01'
completed_date: '2025-12-01'
labels:
  - refactor
  - architecture
  - organization
dependencies:
  - task-3
  - task-4
priority: medium
---

## Description

当前各模块的组件目录组织方式不统一，缺少按职责分类。需要建立统一的目录结构规范，提高代码可发现性和可维护性。

### 现状分析

**Courses 模块**：
```
components/
  ├── course/               # 所有课程组件平铺在此
  │   ├── course-basic-info.tsx
  │   ├── course-project-matrix.tsx (1241行)
  │   ├── course-resources.tsx
  │   └── ...
  └── course-detail-panel.tsx
```

**Majors 模块**：
```
components/
  ├── forms/                # 有forms分类
  │   └── add-major-form.tsx
  ├── shared/               # 有shared分类
  │   ├── course-selector.tsx
  │   └── quick-create-course-dialog.tsx
  ├── major/                # 专业特定组件
  │   ├── major-basic-info.tsx
  │   └── major-matrix.tsx
  └── major-detail-panel.tsx
```

Majors 模块的组织更好，有明确的职责分类。

### 标准目录结构

建立统一的模块组件目录结构：

```
src/modules/{module}/components/
  ├── {entity}/             # 实体主要组件（如 course/, major/）
  │   ├── {Entity}BasicInfo.tsx
  │   ├── {Entity}DetailPanel.tsx
  │   └── ... (与实体强关联的展示组件)
  ├── forms/                # 表单组件
  │   ├── Add{Entity}Form/  # 复杂表单拆分为目录
  │   │   ├── index.tsx
  │   │   ├── BasicInfoStep.tsx
  │   │   └── ...
  │   └── Edit{Entity}Form.tsx
  ├── dialogs/              # 对话框组件
  │   ├── {Purpose}Dialog.tsx
  │   └── ...
  ├── shared/               # 模块内共享组件
  │   ├── {SharedComponent}.tsx
  │   └── ...
  └── index.ts              # 统一导出
```

### 实施计划

#### 1. Courses 模块重组

```
src/modules/courses/components/
  ├── course/
  │   ├── CourseBasicInfo.tsx           # 基本信息展示
  │   ├── CourseDetailPanel.tsx         # 详情面板容器
  │   ├── matrix/                        # 矩阵相关组件
  │   │   ├── CourseMajorMatrix.tsx
  │   │   ├── CourseProjectMatrix/      # 项目矩阵（已拆分）
  │   │   │   ├── index.tsx
  │   │   │   ├── ProjectMatrixTable.tsx
  │   │   │   └── ...
  │   │   └── CourseThreeLevelMatrix.tsx
  │   ├── resources/                     # 资源管理
  │   │   ├── CourseResources.tsx
  │   │   └── ResourceUpload.tsx
  │   └── supervision/                   # 督导相关
  │       ├── CourseSupervision.tsx
  │       └── CourseSupervisionDetail.tsx
  ├── forms/
  │   └── AddCourseForm/                # 课程创建表单（待拆分）
  ├── dialogs/
  │   ├── TaskObjectivesDialog.tsx
  │   └── KsaDialog.tsx
  ├── shared/
  │   ├── TeachingObjectivesEditor.tsx
  │   └── CoursePointsEditor.tsx
  └── index.ts
```

#### 2. 统一命名规范

- **组件文件**：使用 PascalCase，如 `CourseBasicInfo.tsx`
- **目录**：使用 kebab-case 或 camelCase，如 `matrix/` 或 `projectMatrix/`
- **导出文件**：统一使用 `index.ts` 导出模块组件

#### 3. 创建统一导出文件

每个模块创建 `components/index.ts`：

```typescript
// src/modules/courses/components/index.ts
export { CourseDetailPanel } from './course/CourseDetailPanel'
export { CourseBasicInfo } from './course/CourseBasicInfo'
export { CourseProjectMatrix } from './course/matrix/CourseProjectMatrix'
// ... 导出所有公开组件

// 外部可以这样导入
import { CourseDetailPanel, CourseBasicInfo } from '@/modules/courses/components'
```

### 实施步骤

1. **Courses 模块重组**（作为示例）
   - 创建新的目录结构
   - 移动和重命名文件
   - 更新所有导入路径
   - 创建 `index.ts` 导出文件
   - 验证功能正常

2. **Majors 模块调整**
   - 按照统一规范微调现有结构
   - 补充缺失的分类（如 dialogs/）

3. **Departments 和 Universities 模块**
   - 应用相同的结构
   - 保持一致性

4. **更新文档**
   - 在 CLAUDE.md 中记录组件目录规范
   - 创建模块组件组织最佳实践文档

## Acceptance Criteria

- [ ] 所有模块使用统一的目录结构
- [ ] 每个模块有 `components/index.ts` 统一导出
- [ ] 组件按职责分类（forms/、dialogs/、shared/、{entity}/）
- [ ] 所有导入路径更新正确
- [ ] 运行 `npm run lint` 无错误
- [ ] 运行 `npm run build` 成功
- [ ] 所有功能正常

## Notes

- 文件移动时使用 git mv 保留提交历史
- 可以使用 VSCode 的重构功能批量更新导入路径
- 目录重组可能影响多个文件，建议分批进行并及时提交
