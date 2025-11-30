---
id: task-9
title: 拆分 CourseResources 组件
status: Todo
assignee: []
created_date: '2025-12-01'
labels:
  - refactor
  - component-split
  - courses
dependencies:
  - task-2
  - task-3
priority: medium
---

## Description

将 656 行的 `course-resources.tsx` 拆分为职责清晰的小组件，提高可维护性和可测试性。

### 拆分策略

#### 1. 提取自定义 Hooks

创建 `src/modules/courses/hooks/use-course-resources.ts`：
- 管理资源列表状态
- 封装资源的 CRUD 操作
- 处理文件上传逻辑

#### 2. 拆分展示组件

创建 `src/modules/courses/components/course/resources/` 目录：

- `CourseResourcesContainer.tsx` (容器组件，约100行)
  - 使用 `use-course-resources` hook
  - 协调子组件

- `ResourcesList.tsx` (列表组件，约150行)
  - 展示资源列表（文件、教材）
  - 表格形式展示

- `ResourceUploadDialog.tsx` (上传对话框，约120行)
  - 文件上传表单
  - 上传进度显示
  - 文件类型验证

- `ResourceCard.tsx` (资源卡片，约80行)
  - 单个资源的卡片展示
  - 下载/删除操作

- `TeachingMaterialsList.tsx` (教材列表，约100行)
  - 教材专用展示组件
  - 教材详情展示

- `ResourceFilters.tsx` (筛选组件，约60行)
  - 资源类型筛选
  - 搜索功能

- `types.ts`
  - 资源相关类型定义

#### 3. 功能拆分

**文件管理功能**：
- 上传文件
- 下载文件
- 删除文件
- 文件预览

**教材管理功能**：
- 添加教材信息
- 编辑教材
- 删除教材

### 实施步骤

1. 分析现有代码，提取状态管理逻辑
2. 创建 `use-course-resources` hook
3. 创建 `resources/` 目录和基础组件
4. 实现资源列表组件
5. 实现上传对话框组件
6. 实现教材管理组件
7. 更新容器组件整合所有子组件
8. 测试所有功能

## Acceptance Criteria

- [ ] 单个文件不超过 200 行代码
- [ ] 文件上传、下载、删除功能正常
- [ ] 教材管理功能正常
- [ ] 自定义 hook 可独立测试
- [ ] 运行 `npm run lint` 无错误
- [ ] 运行 `npm run build` 成功

## Notes

- 文件上传可以考虑使用 react-dropzone 库
- 大文件上传应该显示进度条
- 考虑添加文件类型和大小限制
