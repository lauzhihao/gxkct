---
id: task-11
title: 右侧视图活动标签埋点梳理
status: Planned
assignee: []
created_date: '2024-05-06'
labels:
  - instrumentation
  - frontend
dependencies: []
priority: high
---

## 背景

AI 助手需要实时获知用户当前在右侧详情区域所查看的视图（包括 Tab、编辑态、弹窗等）。目前仅在 Tabs 层面写入 `currentActivePage`，当进入“编辑课程”“新增院系”等子组件时未同步埋点，导致活动视图信息缺失。本任务旨在列出需要补充埋点的 TSX 文件与建议改法，逐个落地并跟踪完成状态。

## 修改范围（需依次落实，并在完成后更新本任务状态）

1. **src/components/add-course-form.tsx**
   - 引入 `useActivePageTracker`，在表单挂载时写入 `setActivePage('course-edit', '课程信息编辑')` 或根据场景决定是编辑/新增。
   - 在表单提交、取消或组件卸载时恢复至调用方传入的标签（可通过 props 追加回调）。

2. **src/modules/courses/components/course-detail-panel.tsx**
   - 当 `isEditingCourse` 置为 `true` 时同步写入“课程信息编辑”，退出编辑后恢复到当前 Tab 对应的 label。
   - 若进入 `CourseThreeLevelMatrix` 的教学目标编辑（`isEditingTeachingObjectives`）或 `CourseResources` 的特定模式，也需触发自定义标签。

3. **src/modules/majors/components/major-detail-panel.tsx**
   - 进入专业信息编辑、快速建课、学期切换确认等特殊视图时写入对应标签（例如“专业信息编辑”“快速创建课程”）。
   - 弹窗关闭或操作完成时恢复 Tabs 所在视图。

4. **src/modules/majors/components/dialogs/quick-create-course-dialog.tsx**
   - 在 `open` 为 `true` 时调用 `setActivePage('major-quick-course', '快速创建课程')`，关闭时恢复。

5. **src/modules/majors/components/forms/add-major-form/AddMajorFormContainer.tsx** 及 `sections/` 下的子表单
   - 表单整体加载后写入“创建/编辑专业”标签；若表单自身拆分步骤，可根据步骤切换更新 label。

6. **src/modules/departments/components/department-detail-panel.tsx**
   - 进入院系编辑、快速创建专业弹窗、删除确认对话框等场景时同步标签，例如“院系信息编辑”“快速创建专业”。

7. **src/modules/departments/components/shared/quick-create-major-dialog.tsx**
   - 同 `quick-create-course-dialog`，在 Dialog 打开/关闭时维护活跃标签。

8. **src/modules/universities/components/university-detail-panel.tsx**
   - 打开“新增院系”对话框或“设为当前学校”流程时写入自定义标签，如“新增院系”。

9. **src/shared/components/members/index.tsx**（及其子组件）
   - 如果成员管理 Tab 内部存在深层编辑或弹窗，需要同样写入/恢复标签，如“成员详情”“新增成员”。

10. **src/modules/courses/components/course/supervision/** 下的弹窗或表格交互
    - 针对 `CourseSupervision` 中的编辑、评分、督导流程视图设置标签，例如“教学督导详情”。

11. **src/modules/courses/components/course/resources/**
    - 资源上传、文件夹创建、版本详情等侧滑/弹窗也应写入“课程资源 - 上传文件”等细分标签。

12. **src/modules/universities/components/shared/teaching-quality.tsx** 与 **src/modules/majors/components/shared/teaching-quality-stats.tsx**
    - 若内含多步分析或弹窗（例如导出报告、添加指标），同样需要在打开时更新标签。

> 注：上述路径为第一批重点关注文件。后续若在右侧详情或其子树中新建视图/弹窗，均需在代码评审 checklist 中确认是否调用 `useActivePageTracker`。

## 建议步骤

1. 在每个文件实现 `useActivePageTracker` 调用，并封装 `enterView(label)` / `exitView()` 帮助函数，避免重复字符串。
2. 为常见状态定义常量，例如 `ACTIVE_PAGE_LABELS.course.edit`，集中管理文案。
3. 开发完成后使用浏览器存储面板观察 `currentActivePage`，确保在进入/退出各视图时值正确切换。
4. 每完成一个文件的改造，更新本任务文件或补充到 `task-status-report.md`，防止遗漏。

## 验收标准

- [ ] 上述列出的 TSX 文件均已在对应的视图入口/退出点调用 `useActivePageTracker`。
- [ ] `currentActivePage` 在进入编辑/弹窗等场景时能显示准确中文文案，并在关闭后恢复。
- [ ] AI 助手面包屑能实时展示“选中节点 >> 活动子视图”链路。
- [ ] 新增视图的文案统一集中在常量/枚举中，避免魔法字符串。

