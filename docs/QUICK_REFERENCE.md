# 开发规范快速参考

## 导入路径
```typescript
// 使用 @/ 别名，不用相对路径
import { Button } from "@/shared/components/ui/button"
import { api } from "@/lib/api"
import type { TreeNode } from "@/types"
```

## 项目结构
```
src/
├── app/              # Next.js页面
├── lib/api/          # API层
├── modules/          # 业务模块(courses/majors/departments/universities/system)
├── shared/           # 共享资源(components/ui, design-system, hooks, utils)
└── types/            # 全局类型
```

## 模块内部结构
```
modules/<name>/
├── api/              # API服务 + index.ts导出
├── components/       # 组件(dialogs/forms/shared) + index.ts导出
├── hooks/            # 模块Hooks
├── types/            # 类型(models.ts/components.ts/hooks.ts/index.ts)
├── model/            # 数据模型
├── services/         # 业务服务
├── utils/            # 工具函数
└── index.tsx         # 模块入口
```

## API调用规范

### 响应格式
```typescript
// 后端响应
interface BackendResponse<T> {
  code: string      // "0"成功，其他失败
  message: string
  data: T
  success?: boolean
}

// 内部API响应
interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}
```

### 使用方式
```typescript
import { api } from "@/lib/api"

const response = await api.tree.getTree()
if (response.error) {
  // 错误已自动toast，处理业务逻辑
  return
}
// 使用 response.data
```

### API类编写
```typescript
import { StorageAdapter } from "./storage-adapter"
import type { ApiResponse } from "./types"

export class TreeApi {
  private storage = new StorageAdapter()
  
  async getTree(): Promise<ApiResponse<TreeNode>> {
    return this.storage.getFromApi<TreeNode>("/api/tree")
  }
  
  async updateNode(id: string, data: any): Promise<ApiResponse<TreeNode>> {
    return this.storage.putToApi<TreeNode>(`/api/node/${id}`, data)
  }
}
```

## UI组件
```typescript
// @/shared/components/ui/
Button | Input | Dialog | Select | Tabs | Table | Card | Badge
Checkbox | Switch | Tooltip | Popover | Sheet | Spinner | Empty
```

## 设计系统组件
```typescript
import { SectionCard, SectionHeader, Divider } from "@/shared/components/design-system"

<SectionCard variant="default|outlined|elevated" padding="sm|md|lg|none">
  <SectionHeader title="标题" />
  <Divider />
</SectionCard>
```

## 工具函数

| 工具 | 导入 | 用途 |
|------|------|------|
| `cn()` | `@/shared/utils/utils` | 合并Tailwind类名 |
| `showSuccess/Error/Warning/Info()` | `@/shared/utils/toast-utils` | 通知 |
| `findNodeById/findParentNode/updateNodeInTree/deleteNodeFromTree/addNodeToTree/getAllNodesOfType/searchNodes/getFirstLeafNode` | `@/shared/utils/tree-operations` | 树操作 |
| `safeLocalStorageGet/Set/Remove/GetString/SetString` | `@/shared/utils/storage` | 存储(SSR安全) |

## Hooks
```typescript
// @/shared/hooks/
useLocalStorage<T>(key, initialValue) → [value, setValue, removeValue]
useToast() → { toasts, toast, dismiss }
useSearch() | useTreeData() | useTreeSearch() | useMobile()
```

## 全局类型
```typescript
// @/types/index.ts
type NodeType = "root" | "university" | "department" | "major" | "course"
type SupportStrength = "strong" | "weak"
type InfoPointType = "K" | "S" | "A"

interface TreeNode {
  id: string
  name: string
  type: NodeType
  children?: TreeNode[]
  metadata?: NodeMetadata
  isStarred?: boolean
}
```

## 命名规范
| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `CourseDetailPanel` |
| Hook | camelCase+use前缀 | `useLocalStorage` |
| 函数 | camelCase | `findNodeById` |
| 类型/接口 | PascalCase | `ApiResponse` |
| 常量 | UPPER_SNAKE_CASE | `STORAGE_KEYS` |
| 文件 | kebab-case | `course-detail-panel.tsx` |

## 样式规范
```typescript
// 使用cn合并类名
<Button className={cn("base", condition && "conditional", className)} />

// 使用CSS变量
<div className="bg-background text-foreground border-border" />

// 不要硬编码颜色
// 避免: className="bg-blue-500"
```

## 注释规范
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

## 错误处理
```typescript
// API错误已自动toast，检查response.error
const response = await api.tree.getTree()
if (response.error) {
  // 处理业务逻辑(如设置空状态)
  return
}
// response.data已确保非null
```

## 环境配置
- **开发**: `NEXT_PUBLIC_ENVIRONMENT=dev` → 相对路径`/api` → 代理到`localhost:38080`
- **预览**: `NEXT_PUBLIC_ENVIRONMENT=preview` → `NEXT_PUBLIC_API_BASE_URL`

## 模块类型导入
```typescript
// 全局类型
import type { TreeNode, NodeType } from "@/types"

// 模块类型
import type { CourseMetadata, CoursePoint } from "@/modules/courses/types"
```

