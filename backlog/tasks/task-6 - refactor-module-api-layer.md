---
id: task-6
title: 重构模块 API 层职责
status: Todo
assignee: []
created_date: '2025-12-01'
labels:
  - refactor
  - architecture
  - api
dependencies:
  - task-5
priority: medium
---

## Description

当前 `src/modules/*/api/` 层只是简单转发 `src/lib/api` 的调用，没有提供额外价值。需要重新定义这一层的职责，要么移除冗余，要么增强功能。

### 方案A：移除冗余 API 层

如果模块 API 层只是简单转发，直接让组件调用 `src/lib/api`：

```typescript
// 当前方式（冗余）
// src/modules/courses/api/courseDetailApi.ts
export const courseDetailApi = {
  getCourseDetail(courseId: string) {
    return api.courseDetail.getCourseDetail(courseId)
  }
}

// 组件中
import { courseDetailApi } from '@/modules/courses/api/courseDetailApi'
const response = await courseDetailApi.getCourseDetail(id)

// 简化后（直接调用）
// 组件中
import { api } from '@/lib/api'
const response = await api.courseDetail.getCourseDetail(id)
```

**优点**：减少中间层，代码更直接
**缺点**：模块对外部 API 的依赖更明显

### 方案B：增强 API 层职责

保留 `modules/*/api/` 层，但赋予其更多职责：

1. **数据转换**：将后端数据格式转换为前端数据模型
2. **缓存管理**：实现模块级别的请求缓存
3. **请求聚合**：合并多个 API 调用
4. **错误处理**：提供模块特定的错误处理逻辑
5. **类型适配**：确保返回的数据符合模块的类型定义

```typescript
// 增强后的 API 层示例
export class CourseApiService {
  private cache = new Map<string, CachedData>()

  async getCourseDetail(courseId: string): Promise<CourseDetailViewModel> {
    // 缓存检查
    if (this.cache.has(courseId)) {
      return this.cache.get(courseId)!.data
    }

    // API 调用
    const response = await api.courseDetail.getCourseDetail(courseId)

    // 数据转换
    const viewModel = this.transformToViewModel(response.data)

    // 更新缓存
    this.cache.set(courseId, { data: viewModel, timestamp: Date.now() })

    return viewModel
  }

  private transformToViewModel(data: any): CourseDetailViewModel {
    // 复杂的数据转换逻辑
    return { ... }
  }
}
```

**优点**：模块更独立，便于单元测试，支持复杂业务逻辑
**缺点**：增加代码量，需要维护更多抽象层

### 推荐方案

**采用方案B（增强职责）**，理由：

1. 提供缓存层减少重复请求
2. 数据转换逻辑集中管理
3. 便于 mock 数据进行单元测试
4. 符合模块自治原则

### 实施步骤

#### 阶段1：定义 API 服务接口

创建 `src/modules/courses/api/CourseApiService.ts`：
- 定义清晰的服务接口
- 实现缓存机制
- 添加数据转换方法

#### 阶段2：实现核心功能

为 courses 模块实现：
- `getCourseDetail` 带缓存
- `updateCourseDetail` 自动清除缓存
- `getCourseMatrix` 聚合多个 API 调用

#### 阶段3：迁移组件调用

更新所有使用 `courseDetailApi` 的组件：
- 使用新的服务接口
- 处理转换后的数据格式

#### 阶段4：推广到其他模块

将成熟的模式应用到：
- majors 模块
- departments 模块
- universities 模块

## Acceptance Criteria

- [ ] API 服务层有明确的职责（缓存/转换/聚合）
- [ ] 实现了请求缓存机制，避免重复请求
- [ ] 数据转换逻辑从组件中移除，集中到 API 层
- [ ] 每个 API 服务有对应的单元测试
- [ ] 运行 `npm run lint` 无错误
- [ ] 运行 `npm run build` 成功
- [ ] 所有功能正常，且性能有提升（减少网络请求）

## Notes

- 缓存策略需要考虑数据更新后的失效机制
- 可以使用 SWR 或 React Query 等成熟的数据获取库
- 数据转换逻辑应该是纯函数，便于测试
