---
id: task-012
title: 画布布局重构 - 水平思维导图式布局
status: Done
assignee: []
created_date: '2026-01-12 12:58'
updated_date: '2026-01-12 14:09'
labels:
  - canvas
  - layout
  - refactor
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
将画布从纵向堆叠布局改为水平思维导图式布局，实现从左到右的信息流向。

### 目标布局结构

```
                                    ┌───────────────┐
                                    │ A. 教学目标   │───────────┐
                                    └───────────────┘           │
                                                                │
                                    ┌───────────────┐           │        ┌───────────────┐      ┌─────────────┐
                                    │ B. 章节项目   │───────────┼───────→│   课程矩阵    │─────→│ 项目矩阵 1  │
┌───────────────┐                   └───────────────┘           │        └───────────────┘      ├─────────────┤
│    课程信息   │──────────────────→                            │                              │ 项目矩阵 2  │
└───────────────┘                   ┌───────────────┐           │                              ├─────────────┤
                                    │ C. 课点信息   │───────────┘                              │ 项目矩阵 3  │
                                    └───────────────┘                                          └─────────────┘
                                    
                                    ┌───────────────┐
                                    │ D. KSA三要素  │  (无静态连线，纯交互高亮)
                                    └───────────────┘
```

### 修改内容

#### 1. 定义新的连接关系常量

**文件**: `src/shared/hooks/use-canvas-elements.ts`

```typescript
// 课程信息 → 四个基础面板（一对多，水平展开）
const COURSE_INFO_TO_PANELS = [
  CanvasComponentType.OBJECTIVE_PANEL,    // A - 教学目标
  CanvasComponentType.CHAPTER_PANEL,      // B - 章节项目
  CanvasComponentType.COURSE_POINT_PANEL, // C - 课点信息
  CanvasComponentType.KSA_PANEL,          // D - KSA三要素
]

// 汇聚到课程矩阵的面板（A/B/C，不包含D）
const PANELS_TO_MATRIX = [
  CanvasComponentType.OBJECTIVE_PANEL,
  CanvasComponentType.CHAPTER_PANEL,
  CanvasComponentType.COURSE_POINT_PANEL,
]

// 水平布局层级
const LAYOUT_COLUMNS = {
  COURSE_INFO: 0,      // 第0列：课程信息
  BASIC_PANELS: 1,     // 第1列：四个基础面板（A/B/C/D）
  COURSE_MATRIX: 2,    // 第2列：课程矩阵
  PROJECT_MATRIX: 3,   // 第3列：项目矩阵
}
```

#### 2. 修改位置计算逻辑

将 `calculateNextPosition` 和 Panel 创建逻辑从纵向堆叠改为水平分层：

- 第0列：课程信息卡片
- 第1列：四个基础面板纵向排列（A在上，D在下）
- 第2列：课程矩阵
- 第3列：项目矩阵（纵向排列）

布局参数：
```typescript
const COLUMN_GAP = 120       // 列间距
const ROW_GAP = 40           // 同列内行间距
const COLUMN_X_POSITIONS = [60, 450, 1150, 1900]  // 各列起始X坐标
```

#### 3. 修改 dagre 布局默认方向

**文件**: `src/components/flow/utils/layout.ts`

```typescript
const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  direction: "LR",  // 改为从左到右
  nodeSep: 80,
  rankSep: 120,
  marginX: 60,
  marginY: 60,
}
```

### 实施步骤

1. 备份当前布局常量和计算逻辑
2. 定义新的连接关系常量
3. 重写 Panel 位置计算函数 `calculatePanelPosition`
4. 更新 `handleCanvasEvent` 中的 CREATE 逻辑
5. 修改 dagre 默认布局方向
6. 测试四个基础面板的水平布局效果
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 课程信息在最左侧，四个基础面板在其右侧纵向排列
- [x] #2 四个面板（A/B/C/D）从上到下依次为：教学目标、章节、课点、KSA
- [x] #3 课程矩阵在四个面板右侧
- [x] #4 项目矩阵在课程矩阵右侧
- [x] #5 dagre 自动布局方向为 LR
- [x] #6 运行 npm run build 成功
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 实施完成记录

### 修改文件
1. `src/shared/hooks/use-canvas-elements.ts`
   - 添加水平布局常量: `COURSE_INFO_TO_PANELS`, `BASIC_PANELS_ORDER`, `PANELS_TO_MATRIX`, `LAYOUT_COLUMNS`, `COLUMN_X_POSITIONS`, `COMPONENT_TO_COLUMN`
   - 新增 `calculateHorizontalPosition` 函数计算水平布局位置
   - 重写 `recalculatePanelPositions` 和 `recalculateAllPanelPositions` 为水平布局版本
   - 修改 `handleCanvasEvent` 中 CREATE 和 SET 逻辑适配水平布局
   - 连线方向改为 `sourceHandle: "right"`, `targetHandle: "left"`

2. `src/components/flow/utils/layout.ts`
   - dagre 默认布局方向改为 `LR`
   - 调整间距: `nodeSep: 80`, `rankSep: 120`, `marginX: 60`, `marginY: 60`

### 布局结构
- 第0列 (X=60): 课程信息
- 第1列 (X=450): 四个基础面板 (A/B/C/D 纵向排列)
- 第2列 (X=1120): 课程矩阵
- 第3列 (X=2300): 项目矩阵

### 连线关系
- 课程信息 → 四个基础面板 (一对多)
- A/B/C 面板 → 课程矩阵 (多对一, KSA 无静态连线)
- 课程矩阵 → 项目矩阵 (一对多)

## Bug修复记录

### 问题1: 面板位置重叠
**原因**: `calculateHorizontalPosition` 在前序面板不存在时没有累加默认高度
**修复**: 修改位置计算逻辑，即使前序面板不存在也按默认高度累加 Y 坐标

### 问题2: 连线不显示
**原因**: 连线使用了 `sourceHandle: "right"`, `targetHandle: "left"`，但节点只定义了 `top`/`bottom` Handle
**修复**: 
- `BaseFlowNode` 添加 `showLeftHandle` 和 `showRightHandle` 属性
- `BasePanelNode` 添加 `showLeftHandle` 和 `showRightHandle` 属性
- `CourseMatrixNode` 设置 `showLeftHandle={true}` 和 `showRightHandle={true}`
- `ProjectMatrixNode` 设置 `showLeftHandle={true}` 和 `showRightHandle={false}`

## 布局优化记录

### 优化1: 调整列 X 坐标避免重叠
**修改**: `COLUMN_X_POSITIONS = [60, 460, 1160, 2360]`
- 第0列 (X=60): 课程信息 (320px)
- 第1列 (X=460): 四个面板 (600px)
- 第2列 (X=1160): 课程矩阵 (1100px)
- 第3列 (X=2360): 项目矩阵 (800px)
- 列间距: 100px

### 优化2: 课程信息和课程矩阵垂直居中
**新增辅助函数**: `calculateBasicPanelsRange(elements)`
- 计算四个基础面板的总高度和中心 Y 坐标

**修改 `calculateHorizontalPosition`**:
- 课程信息: Y = centerY - selfHeight/2
- 课程矩阵: Y = centerY - selfHeight/2
- 项目矩阵: 第一个垂直居中，后续依次向下

**同步修改 `recalculateAllPanelPositions`**:
- 加载画布数据时也能正确计算垂直居中位置
<!-- SECTION:NOTES:END -->
