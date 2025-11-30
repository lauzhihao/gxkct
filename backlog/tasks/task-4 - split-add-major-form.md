---
id: task-4
title: 拆分 AddMajorForm 大组件
status: Completed
assignee: []
created_date: '2025-12-01'
completed_date: '2025-12-01'
labels:
  - refactor
  - component-split
  - majors
dependencies:
  - task-2
priority: high
---

## Description

将 1509 行的 `add-major-form.tsx` 拆分为多个职责清晰的表单组件，提高代码可维护性。

### 拆分策略

#### 1. 创建表单分步组件目录

创建 `src/modules/majors/components/forms/add-major/` 目录：

- `AddMajorFormContainer.tsx` (容器组件，约150行)
  - 管理整个表单的状态和提交逻辑
  - 协调各步骤组件

- `BasicInfoStep.tsx` (基本信息步骤，约200行)
  - 专业名称、学制、学位等基本信息
  - 使用 React Hook Form 局部表单管理

- `ObjectivesStep.tsx` (培养目标步骤，约200行)
  - 培养目标列表的增删改
  - 独立的状态和验证逻辑

- `RequirementsStep.tsx` (毕业要求步骤，约200行)
  - 毕业要求（VOS）配置
  - 矩阵支撑关系设置

- `MatrixSupportStep.tsx` (矩阵支撑步骤，约200行)
  - 毕业要求与培养目标的矩阵关系
  - 可视化支撑强度选择

- `ReviewStep.tsx` (审核确认步骤，约150行)
  - 展示所有填写内容的摘要
  - 提供最终确认和提交

- `FormNavigation.tsx` (导航组件，约80行)
  - 步骤指示器
  - 上一步/下一步按钮

- `types.ts`
  - 表单数据类型定义
  - 各步骤 Props 接口

#### 2. 提取自定义 Hooks

创建 `src/modules/majors/hooks/use-add-major-form.ts`：
- 管理多步骤表单状态（当前步骤、各步骤数据）
- 提供步骤跳转、数据验证、表单提交等方法
- 与 React Hook Form 集成

#### 3. 优化表单数据流

- 使用 React Context 在步骤组件间共享表单状态
- 每个步骤组件只关注自己的数据片段
- 统一的验证和错误处理机制

### 实施步骤

1. 分析现有表单逻辑，绘制数据流图
2. 创建新的目录结构
3. 提取 `use-add-major-form` hook
4. 逐步创建各步骤组件（从 BasicInfoStep 开始）
5. 创建容器组件整合所有步骤
6. 更新 `add-major-form.tsx` 使用新架构
7. 测试所有表单功能和验证逻辑

## Acceptance Criteria

- [ ] 单个文件不超过 250 行代码
- [ ] 每个步骤组件可独立复用
- [ ] 表单验证逻辑清晰，错误提示准确
- [ ] 运行 `npm run lint` 无错误
- [ ] 运行 `npm run build` 成功
- [ ] 所有表单功能（添加、验证、提交）正常工作
- [ ] 步骤间数据传递正确

## Notes

- 表单拆分后应保持原有的用户体验
- 考虑添加表单数据的本地存储（防止意外关闭丢失数据）
- 可复用的表单字段组件应提取到 `shared/components/forms/`
