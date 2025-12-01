# 教育树系统开发规范

## 一、项目架构概览

```
src/
├── app/                    # Next.js App Router 页面
├── components/             # 主应用组件
├── lib/api/                # API层(网络请求)
├── modules/                # 功能模块(按业务领域划分)
│   ├── courses/            # 课程模块
│   ├── majors/             # 专业模块
│   ├── departments/        # 院系模块
│   ├── universities/       # 学校模块
│   └── system/             # 系统级功能
├── shared/                 # 共享资源
│   ├── components/ui/      # 基础UI组件
│   ├── components/design-system/  # 设计系统组件
│   ├── hooks/              # 共享Hooks
│   └── utils/              # 工具函数
└── types/                  # 全局类型定义
```

---

## 二、模块结构规范

每个业务模块应遵循统一的内部结构:

```
modules/<module-name>/
├── api/              # 模块API服务
│   └── index.ts      # API统一导出
├── components/       # 模块组件
│   ├── dialogs/      # 对话框组件
│   ├── forms/        # 表单组件
│   ├── shared/       # 模块内共享组件
│   └── index.ts      # 组件统一导出
├── hooks/            # 模块专用Hooks
├── model/            # 数据模型/业务逻辑
├── services/         # 业务服务层
├── styles/           # 模块样式
├── types/            # 模块类型定义
│   ├── models.ts     # 数据模型类型
│   ├── components.ts # 组件Props类型
│   ├── hooks.ts      # Hooks返回类型
│   └── index.ts      # 统一导出
├── utils/            # 模块工具函数
└── index.tsx         # 模块入口
```

---

## 三、网络请求规范

### 3.1 API层架构

```
lib/api/
├── config.ts           # API配置(环境、baseUrl)
├── http-adapter.ts     # HTTP请求适配器
├── response-handler.ts # 响应处理器
├── storage-adapter.ts  # 存储适配器(含API调用)
├── types.ts            # API类型定义
├── index.ts            # 统一导出
└── <domain>-api.ts     # 领域API类
```

### 3.2 响应数据结构

```typescript
// 后端响应格式
interface BackendResponse<T> {
  code: string      // "0"表示成功，其他为失败
  message: string   // 响应消息
  data: T           // 业务数据
  success?: boolean
}

// 内部使用的API响应格式
interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}
```

### 3.3 API类编写规范

```typescript
// 示例: tree-api.ts
import { StorageAdapter } from "./storage-adapter"
import type { ApiResponse } from "./types"

export class TreeApi {
  private storage = new StorageAdapter()

  async getTree(): Promise<ApiResponse<TreeNode>> {
    // GET请求
    return this.storage.getFromApi<TreeNode>("/api/tree")
  }

  async updateNode(id: string, data: any): Promise<ApiResponse<TreeNode>> {
    // PUT请求
    return this.storage.putToApi<TreeNode>(`/api/node/${id}`, data)
  }
}
```

### 3.4 API使用方式

```typescript
import { api } from "@/lib/api"

// 调用API
const response = await api.tree.getTree()
if (response.error) {
  // 错误已由response-handler自动显示toast
  return
}
// 使用 response.data
```

### 3.5 环境配置

- **开发环境**: `NEXT_PUBLIC_ENVIRONMENT=dev`，使用相对路径`/api`，由Next.js代理到`localhost:38080`
- **预览环境**: `NEXT_PUBLIC_ENVIRONMENT=preview`，使用`NEXT_PUBLIC_API_BASE_URL`

---

## 四、公共组件规范

### 4.1 基础UI组件 (`@/shared/components/ui/`)

基于Radix UI封装，提供无障碍支持:

| 组件 | 用途 |
|------|------|
| `Button` | 按钮(支持variant: default/destructive/outline/secondary/ghost/link) |
| `Input` | 输入框 |
| `Dialog` | 对话框 |
| `Select` | 下拉选择 |
| `Tabs` | 标签页 |
| `Table` | 表格 |
| `Card` | 卡片容器 |
| `Badge` | 徽章标签 |
| `Checkbox` | 复选框 |
| `Switch` | 开关 |
| `Tooltip` | 提示 |
| `Popover` | 弹出层 |
| `Sheet` | 侧边抽屉 |
| `Spinner` | 加载指示器 |
| `Empty` | 空状态 |

### 4.2 设计系统组件 (`@/shared/components/design-system/`)

```typescript
import { SectionCard, SectionHeader, Divider } from "@/shared/components/design-system"

// SectionCard - 区块卡片
<SectionCard variant="default" padding="md">
  <SectionHeader title="标题" />
  <Divider />
  {/* 内容 */}
</SectionCard>
```

---

## 五、工具函数规范

### 5.1 通用工具 (`@/shared/utils/utils.ts`)

```typescript
import { cn } from "@/shared/utils/utils"

// cn - 合并Tailwind类名
<div className={cn("base-class", condition && "conditional-class", className)} />
```

### 5.2 Toast通知 (`@/shared/utils/toast-utils.ts`)

```typescript
import { showError, showSuccess, showWarning, showInfo } from "@/shared/utils/toast-utils"

showSuccess("操作成功")
showError("操作失败")
showWarning("警告信息")
showInfo("提示信息")
```

### 5.3 树操作 (`@/shared/utils/tree-operations.ts`)

```typescript
import {
  findNodeById,
  findParentNode,
  updateNodeInTree,
  deleteNodeFromTree,
  addNodeToTree,
  getAllNodesOfType,
  searchNodes,
  getFirstLeafNode
} from "@/shared/utils/tree-operations"
```

### 5.4 存储工具 (`@/shared/utils/storage.ts`)

```typescript
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
  safeLocalStorageRemove,
  safeLocalStorageGetString,
  safeLocalStorageSetString
} from "@/shared/utils/storage"

// 自动处理SSR环境和JSON序列化
const data = safeLocalStorageGet<MyType>("key", defaultValue)
safeLocalStorageSet("key", data)
```

---

## 六、Hooks规范

### 6.1 共享Hooks (`@/shared/hooks/`)

| Hook | 用途 |
|------|------|
| `useLocalStorage` | 本地存储状态管理 |
| `useToast` | Toast通知管理 |
| `useSearch` | 搜索功能 |
| `useTreeData` | 树数据管理 |
| `useTreeSearch` | 树搜索功能 |
| `useMobile` | 移动端检测 |

### 6.2 useLocalStorage 使用示例

```typescript
import { useLocalStorage } from "@/shared/hooks/use-local-storage"

const [value, setValue, removeValue] = useLocalStorage<string>("key", "default")
```

---

## 七、类型定义规范

### 7.1 全局类型 (`@/types/index.ts`)

```typescript
// 节点类型
type NodeType = "root" | "university" | "department" | "major" | "course"

// 树节点
interface TreeNode {
  id: string
  name: string
  type: NodeType
  children?: TreeNode[]
  metadata?: NodeMetadata
  isStarred?: boolean
}

// 支撑强度
type SupportStrength = "strong" | "weak"

// 信息点类型
type InfoPointType = "K" | "S" | "A"
```

### 7.2 模块类型

模块特定类型放在模块内部:
```typescript
// 导入模块类型
import type { CourseMetadata, CoursePoint } from "@/modules/courses/types"
```

---

## 八、样式规范

### 8.1 颜色系统

使用CSS变量定义，基于OKLCH色彩空间:

```css
/* 主色(Vercel Blue) */
--primary: oklch(0.58 0.2 240);

/* 语义色 */
--destructive: oklch(0.577 0.245 27.325);  /* 危险/错误 */
--muted: oklch(0.94 0.006 240);            /* 弱化 */
--accent: oklch(0.62 0.21 240);            /* 强调 */
```

### 8.2 Tailwind使用规范

```typescript
// 推荐: 使用cn合并类名
<Button className={cn("custom-class", condition && "conditional")}>

// 推荐: 使用设计系统变量
<div className="bg-background text-foreground border-border">

// 避免: 硬编码颜色值
<div className="bg-blue-500">  // 不推荐
```

---

## 九、导入路径规范

使用`@/`别名导入:

```typescript
// 正确
import { Button } from "@/shared/components/ui/button"
import { api } from "@/lib/api"
import type { TreeNode } from "@/types"

// 错误
import { Button } from "../../../shared/components/ui/button"
```

---

## 十、命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `CourseDetailPanel` |
| Hook | camelCase, use前缀 | `useLocalStorage` |
| 工具函数 | camelCase | `findNodeById` |
| 类型/接口 | PascalCase | `ApiResponse` |
| 常量 | UPPER_SNAKE_CASE | `STORAGE_KEYS` |
| 文件(组件) | kebab-case | `course-detail-panel.tsx` |
| 文件(工具) | kebab-case | `tree-operations.ts` |

---

## 十一、注释规范

```typescript
/**
 * 函数描述
 * @param param1 - 参数说明
 * @returns 返回值说明
 */
export function myFunction(param1: string): boolean {
  // 行内注释使用中文
  return true
}
```

---

## 十二、错误处理规范

```typescript
// API调用统一错误处理
const response = await api.tree.getTree()
if (response.error) {
  // response-handler已自动显示toast
  // 这里处理业务逻辑(如设置空状态)
  return
}

// 使用response.data (此时已确保非null)
```

---

## 附录A: 常用导入清单

```typescript
// UI组件
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"

// 设计系统
import { SectionCard, SectionHeader, Divider } from "@/shared/components/design-system"

// 工具函数
import { cn } from "@/shared/utils/utils"
import { showSuccess, showError } from "@/shared/utils/toast-utils"

// API
import { api } from "@/lib/api"
import type { ApiResponse } from "@/lib/api"

// 类型
import type { TreeNode, NodeType } from "@/types"

// Hooks
import { useLocalStorage } from "@/shared/hooks/use-local-storage"
```

