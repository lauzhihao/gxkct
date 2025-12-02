# 组织架构选择器组件使用指南

## 概述

`OrganizationSelector` 是一个弹窗组件，用于在应用中选择组织架构节点（大学、部门、专业、课程等）。它支持单选和多选模式，并集成了搜索功能和动态加载。

## 组件位置

- **组件文件**: `src/shared/components/organization-selector.tsx`
- **Hook文件**: `src/shared/hooks/use-organization-selector.ts`

## 基本使用

### 导入

```typescript
import { OrganizationSelector } from "@/shared/components/organization-selector"
import { useTreeData } from "@/shared/hooks/use-tree-data"
```

### 简单示例

```typescript
import { useState } from "react"
import { OrganizationSelector } from "@/shared/components/organization-selector"
import { useTreeData } from "@/shared/hooks/use-tree-data"
import type { TreeNode } from "@/types"

export function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState<TreeNode[]>([])
  const { treeData } = useTreeData(null)

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        选择组织架构
      </button>

      <OrganizationSelector
        open={isOpen}
        onOpenChange={setIsOpen}
        treeData={treeData}
        onConfirm={(nodes) => {
          setSelectedNodes(nodes)
          console.log("选中的节点:", nodes)
        }}
        mode="multiple"
        title="选择组织架构"
        description="选择要操作的组织架构节点"
      />
    </>
  )
}
```

## Props 说明

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `open` | boolean | 是 | 弹窗是否打开 |
| `onOpenChange` | (open: boolean) => void | 是 | 弹窗打开/关闭回调 |
| `treeData` | TreeNode \| null | 是 | 树形数据 |
| `onConfirm` | (selectedNodes: TreeNode[]) => void | 是 | 确认选择的回调 |
| `mode` | "single" \| "multiple" | 否 | 选择模式，默认为"multiple" |
| `title` | string | 否 | 弹窗标题，默认为"选择组织架构" |
| `description` | string | 否 | 弹窗描述 |
| `initialSelected` | Set<string> | 否 | 初始选中的节点ID集合 |

## 实际应用示例

在"新增教学质量督导任务"页面中的使用：

```typescript
const [isPublishScopeDialogOpen, setIsPublishScopeDialogOpen] = useState(false)
const [publishScopeNodes, setPublishScopeNodes] = useState<TreeNode[]>([])
const { treeData } = useTreeData(null)

// 在表单中
<OrganizationSelector
  open={isPublishScopeDialogOpen}
  onOpenChange={setIsPublishScopeDialogOpen}
  treeData={treeData}
  onConfirm={(selectedNodes) => {
    setPublishScopeNodes(selectedNodes)
    setFormData({
      ...formData,
      publishScope: selectedNodes.map((node) => node.id),
    })
  }}
  mode="multiple"
  title="选择发布范围"
  description="选择此任务的发布范围，可选择多个组织架构节点"
  initialSelected={new Set(formData.publishScope || [])}
/>
```

## 功能特性

- **搜索功能**: 支持快速搜索组织架构节点
- **动态加载**: Department和Major节点在展开时动态加载子节点
- **单选/多选**: 支持两种选择模式
- **复选框**: 直观的复选框UI
- **节点展开/收起**: 支持树形结构的展开和收起
- **初始选中**: 支持设置初始选中的节点

## Hook: useOrganizationSelector

用于管理选中状态的Hook。

### 使用示例

```typescript
const {
  selectedIds,      // 选中的节点ID集合
  toggleSelect,     // 切换选中状态
  setSelected,      // 设置选中的节点
  clearSelected,    // 清空选中
  getSelectedNodes, // 从树中获取选中的节点
  isSelected,       // 检查节点是否被选中
} = useOrganizationSelector(initialSelected, "multiple")
```

## 类型定义

### TeachingSupervisoryTask 扩展

```typescript
export interface TeachingSupervisoryTask {
  // ... 其他字段
  publishScope?: string[] // 发布范围：选中的组织架构节点ID列表
}
```

## 注意事项

1. 确保传入的 `treeData` 不为 null，否则组件会显示"暂无数据"
2. `onConfirm` 回调会返回完整的 TreeNode 对象数组
3. 如果需要存储选中的节点，建议只存储节点ID（`node.id`）
4. 搜索功能会自动展开包含匹配项的父节点
5. 组件内部使用了 `useTreeSearch`、`useDepartmentMajors` 和 `useMajorCourses` hooks，确保这些依赖可用

