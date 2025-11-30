---
id: task-8
title: 提取常用样式组件到设计系统
status: Todo
assignee: []
created_date: '2025-12-01'
labels:
  - refactor
  - design-system
  - ui
dependencies: []
priority: low
---

## Description

当前组件中存在大量重复的 Tailwind 样式组合，如卡片容器、分隔线、标题栏等。将这些重复的样式模式提取为独立的设计系统组件，提高开发效率和视觉一致性。

### 识别的样式模式

#### 1. 卡片容器

在多个组件中重复出现：
```tsx
<div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-5">
```

#### 2. 节标题

```tsx
<div className="flex items-center gap-2 mb-4">
  <div className="w-2 h-2 rounded-sm bg-primary" />
  <h3 className="text-base font-semibold text-foreground">标题</h3>
</div>
```

#### 3. 虚线分隔线

```tsx
<div className="border-t border-dashed border-border mb-4" />
```

#### 4. 标签徽章

```tsx
<Badge className="...">状态</Badge>
```

### 创建设计系统组件

#### 1. 创建 `src/shared/components/design-system/` 目录

```
design-system/
  ├── Card/
  │   ├── Card.tsx
  │   ├── CardHeader.tsx
  │   ├── CardBody.tsx
  │   └── CardFooter.tsx
  ├── SectionHeader/
  │   ├── SectionHeader.tsx
  │   └── index.ts
  ├── Divider/
  │   ├── Divider.tsx
  │   └── index.ts
  └── index.ts
```

#### 2. 实现 Card 组件族

```typescript
// Card.tsx
interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'outlined' | 'elevated'
  className?: string
}

export function Card({ children, variant = 'default', className }: CardProps) {
  return (
    <div className={cn(
      'rounded-lg border border-border backdrop-blur-sm',
      variant === 'default' && 'bg-secondary/30 p-5',
      variant === 'outlined' && 'bg-transparent p-5',
      variant === 'elevated' && 'bg-card shadow-lg p-6',
      className
    )}>
      {children}
    </div>
  )
}

// CardHeader.tsx
interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
```

#### 3. 实现 SectionHeader 组件

```typescript
interface SectionHeaderProps {
  title: string
  icon?: React.ReactNode
  variant?: 'default' | 'accent'
}

export function SectionHeader({ title, icon, variant = 'default' }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {variant === 'accent' && <div className="w-2 h-2 rounded-sm bg-primary" />}
      {icon}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
  )
}
```

#### 4. 实现 Divider 组件

```typescript
interface DividerProps {
  variant?: 'solid' | 'dashed'
  spacing?: 'sm' | 'md' | 'lg'
}

export function Divider({ variant = 'dashed', spacing = 'md' }: DividerProps) {
  return (
    <div className={cn(
      'border-t border-border',
      variant === 'dashed' && 'border-dashed',
      spacing === 'sm' && 'my-2',
      spacing === 'md' && 'my-4',
      spacing === 'lg' && 'my-6'
    )} />
  )
}
```

### 重构现有组件使用新组件

#### 示例：重构 CourseBasicInfo

```tsx
// 重构前
<div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-5">
  <div className="flex items-center gap-2 mb-4">
    <div className="w-2 h-2 rounded-sm bg-primary" />
    <h3 className="text-base font-semibold text-foreground">基本信息</h3>
  </div>
  <div className="border-t border-dashed border-border mb-4" />
  {/* 内容 */}
</div>

// 重构后
import { Card, SectionHeader, Divider } from '@/shared/components/design-system'

<Card>
  <SectionHeader title="基本信息" variant="accent" />
  <Divider />
  {/* 内容 */}
</Card>
```

### 实施步骤

1. 创建 `design-system/` 目录结构
2. 实现核心设计组件（Card、SectionHeader、Divider）
3. 编写组件文档和使用示例
4. 在一个模块（如 courses）中试用新组件
5. 验证效果和开发体验
6. 逐步迁移其他模块的组件
7. 在 Storybook 中展示设计系统组件（可选）

## Acceptance Criteria

- [ ] 创建了 `src/shared/components/design-system/` 目录
- [ ] 实现了 Card、SectionHeader、Divider 组件
- [ ] 至少 30% 的组件已迁移使用新的设计组件
- [ ] 所有设计组件有完整的 TypeScript 类型
- [ ] 组件支持 variant 属性提供样式变体
- [ ] 运行 `npm run lint` 无错误
- [ ] 运行 `npm run build` 成功
- [ ] 视觉效果与重构前一致

## Notes

- 设计系统组件应该保持简单，避免过度抽象
- 可以参考 shadcn/ui 的组件设计模式
- 后续可以扩展更多设计组件（Grid、Stack、Typography 等）
- 考虑使用 CVA (Class Variance Authority) 管理变体样式
