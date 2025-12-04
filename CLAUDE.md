# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 开发要求与沟通规范 (Development Requirements & Communication Standards)

### 核心开发规则

1. 精通JavaScript编程和React框架，思维符合程序员解决问题的逻辑
2. 代码始终遵循React最佳实践（抽象、复用已有代码）
3. **不要**额外增加测试用例或测试页面
4. **不要**启动开发服务器（开发服务器始终开启）
5. 使用中文回复所有问题，**禁止**在任何回答中加入表情符号
6. **禁止进行总结性回答或生成任何文档，只需修改代码**

### RIPER-5 + 多维思维 + 智能执行协议

工作必须严格遵循以下五阶段协议：

#### [MODE: RESEARCH] - 研究阶段
- **目的**：信息收集和深入理解
- **允许**：阅读文件、提出澄清问题、理解代码结构、分析系统架构、识别技术债务
- **禁止**：提出建议、实施改变、规划、任何解决方案的暗示
- **输出**：以 `[MODE: RESEARCH]` 开始，仅提供观察和问题，使用Markdown格式

#### [MODE: INNOVATE] - 创新阶段
- **目的**：头脑风暴潜在方法
- **允许**：讨论多种解决方案、评估优缺点、探索架构替代方案
- **禁止**：具体规划、实现细节、代码编写、承诺特定解决方案
- **输出**：以 `[MODE: INNOVATE]` 开始，自然流畅的段落呈现想法，保持解决方案之间的有机联系

#### [MODE: PLAN] - 规划阶段
- **目的**：创建详尽的技术规范
- **必须包含**：
  - 文件路径和组件关系
  - 函数/类修改及其签名
  - 数据结构更改
  - 错误处理策略
  - 完整依赖管理
  - 测试方法
- **禁止**：代码编写、"示例代码"、跳过或简化规范
- **输出**：编号检查清单，每个原子操作作为单独的项目

#### [MODE: EXECUTE] - 执行阶段
- **目的**：严格按照规划实施
- **允许**：
  - 仅实现计划中明确详述的内容
  - 严格按检查清单执行
  - 微小偏差修正（必须先报告再执行）
  - 在实现后更新任务进度
- **禁止**：
  - 任何未报告的计划偏离
  - 未规定的改进或功能添加
  - 跳过或简化代码部分
- **微小偏差处理**：必须先报告问题和修正方案，再执行

#### [MODE: REVIEW] - 审查阶段
- **目的**：验证实施与最终计划的一致性
- **必须做**：逐行比较代码与计划、验证检查清单完成情况、检查安全隐患、确认代码可维护性
- **输出**：明确标记任何偏差，提供最终判断

### 关键协议指南

- **每个响应开头必须声明当前模式**：`[MODE: MODE_NAME]`
- **自动模式转换**：RESEARCH → INNOVATE → PLAN → EXECUTE → REVIEW，无需显式过渡命令
- **100%忠实执行**：EXECUTE模式中必须完全遵循计划（允许报告并执行微小修正）
- **分析深度**：应与问题重要性相匹配
- **始终保持**与原始需求的明确联系
- **禁用表情符号**输出

### 代码处理与输出指南

**代码块格式**（必须遵循）：

```language:file_path
 ... 上下文代码 ...
 {{ AURA: [Add/Modify/Delete] - [简要原因] }}
+    新增或修改的代码行
-    删除的代码行
 ... 上下文代码 ...
```

**代码生成原则**：
- 始终在代码块中包含语言和文件路径标识符
- 修改必须有明确的中文注释，解释其意图
- 避免不必要的代码更改，保持修改范围最小化
- 所有生成的注释和日志输出必须使用中文
- 不要使用项目符号（除非明确要求）
- 不要使用代码占位符（除非计划的一部分）
- 不要修改不相关的代码
- 不要使用未经验证的依赖项

---

## Project Overview

Education Tree System is a Next.js 16 + React 19 web application for managing hierarchical educational structures (universities → departments → majors → courses). It provides a comprehensive interface for creating, editing, and managing course curricula with support for teaching objectives, course points, resources, and quality matrices.

## Key Technology Stack

- **Framework**: Next.js 16.0.0 (App Router)
- **UI Library**: React 19.2.0 with React Hook Form for form management
- **Styling**: Tailwind CSS 4 + PostCSS
- **UI Components**: Radix UI primitives (modular, headless components)
- **Charting**: Recharts for data visualization
- **State Management**: Custom hooks with localStorage persistence
- **Type System**: TypeScript 5 with strict mode
- **Form Validation**: Zod for schema validation

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                 # Main dashboard page
│   ├── layout.tsx               # Root layout with theme provider
│   ├── login/                   # Authentication page
│   └── globals.css              # Global styles
├── components/                  # Main application components
│   ├── tree-view.tsx           # Tree navigation component
│   ├── header.tsx              # Header with controls
│   ├── add-course-form.tsx     # Course creation form
│   └── detail-panel/           # Detail panel components for editing
├── modules/                     # Feature modules
│   ├── courses/                # Course management
│   ├── majors/                 # Major management
│   ├── departments/            # Department management
│   └── universities/           # University management
│   └── system/                 # System-level features
├── lib/api/                     # API layer and adapters
│   ├── index.ts                # Main API export
│   ├── config.ts               # API configuration
│   ├── http-adapter.ts         # HTTP request handler
│   ├── tree-api.ts             # Tree structure API
│   ├── matrix-api.ts           # Matrix operations
│   ├── user-api.ts             # User management
│   ├── course-detail-api.ts    # Course details
│   ├── teaching-task-api.ts    # Teaching tasks
│   └── [other-api].ts          # Specialized API modules
├── mock-data/                   # Mock data for development
│   ├── universities.json
│   ├── courses.json
│   └── [other-data].json
├── shared/                      # Shared utilities and components
│   ├── hooks/
│   │   ├── use-tree-data.ts    # Core tree manipulation hook
│   │   ├── use-local-storage.ts
│   │   ├── use-search.ts
│   │   └── use-toast.ts
│   ├── utils/
│   │   ├── tree-operations.ts  # Tree traversal utilities
│   │   ├── storage.ts          # Storage helpers
│   │   ├── toast-utils.ts      # Toast notification helpers
│   │   └── utils.ts            # General utilities
│   └── components/
│       ├── ui/                 # Radix UI wrapper components
│       ├── theme-provider.tsx
│       └── data-initializer.tsx
└── types/
    └── index.ts                # TypeScript type definitions
```

## API Architecture

The API layer is abstraction-based with three environment-aware modes:

1. **Development** (`NEXT_PUBLIC_ENVIRONMENT=dev`): Uses relative `/api` paths proxied to `localhost:38080` via Next.js rewrites
2. **Preview** (`NEXT_PUBLIC_ENVIRONMENT=preview`): Uses full URL from `NEXT_PUBLIC_API_BASE_URL` (defaults to `https://preview.gxkct.com/college`)

Key API classes (all in `src/lib/api/`):
- `TreeApi`: Manages hierarchical tree structure (get/create/update nodes)
- `MatrixApi`: Course and project matrix operations
- `CourseDetailApi`: Detailed course information
- `TeachingTaskApi`: Teaching supervisory tasks
- `UserApi`: User management
- `CourseGoalsApi`, `CoursePointsApi`, `ProjectTeachGoalApi`: Course-specific data

All API responses are typed with `ApiResponse<T>` interface and include error handling via `handleBackendResponse()`.

## Common Development Commands

```bash
# Development
npm run dev           # Start dev server (typically on :3000)

# Build & Deploy
npm run build         # Production build
npm run build:preview # Build for preview environment with NEXT_PUBLIC_ENVIRONMENT=preview
npm start             # Start production server

# Code Quality
npm run lint          # Run ESLint
```

## Data Model & Type System

Core type hierarchy defined in `src/types/index.ts`:

```typescript
TreeNode {
  id: string
  name: string
  type: "root" | "university" | "department" | "major" | "course"
  children?: TreeNode[]
  metadata?: NodeMetadata (type-specific metadata)
  isStarred?: boolean
}
```

**Metadata by type**:
- `UniversityMetadata`: description, address, website, establishedYear
- `DepartmentMetadata`: description, head, contact
- `MajorMetadata`: objectives, duration, degree, matrix support levels
- `CourseMetadata`: teaching objectives, course points, chapters, resources, materials, KSA data, matrices

**Course-specific types**:
- `CoursePoint`: Represents key learning points with K/S/A (Knowledge/Skill/Attitude) classifications
- `TeachingObjective`: Course-level learning outcomes
- `Chapter`: Course chapters with theory/practice hours
- `Resource`: Course materials and files
- `CourseMatrixCell`: Matrix cell with support strength (strong/weak)

## State Management & Persistence

1. **Local Storage**: Uses custom `useLocalStorage` hook for client-side persistence
   - Current selected school: `education-current-school`
   - Tree collapse state: `education-tree-collapsed`

2. **Custom Hook**: `useTreeData()` provides comprehensive tree manipulation:
   - `addSchool()`, `addDepartment()`, `addMajor()`, `addCourse()`
   - `updateNode()`, `deleteNode()`, `findNodeById()`
   - Automatically syncs with backend via API

3. **Authentication**: Uses localStorage-based auth:
   - Token: `auth_token`
   - User data: `auth_user`
   - Functions: `getStoredAuthUser()`, `setStoredAuthUser()`, `isAuthenticated()`

## Component Architecture

**Two-panel layout** (main `src/app/page.tsx`):
- **Left panel** (`TreeView`): Hierarchical navigation with collapse/expand, showing tree structure
- **Right panel** (`DetailPanel`): Context-aware details and editing interface

**Key component patterns**:
- Form components use React Hook Form + Zod validation
- UI primitives wrapped from Radix UI (accessible, unstyled, styled with Tailwind)
- Modular detail panels in `src/components/detail-panel/` for each node type
- Toast notifications via Sonner library with custom `useToast()` hook

## Build & Environment Configuration

**Next.js Configuration** (`next.config.mjs`):
- Supports static export for preview environment
- Relative path API proxying for development via rewrites
- TypeScript strict mode enabled
- Image optimization disabled for deployment flexibility

**TypeScript Paths** (`tsconfig.json`):
- Base path: `src/`
- Path alias: `@/*` maps to `src/*`

## Important Notes

1. **Mock Data**: For development, mock data in `src/mock-data/` is loaded via `data-initializer.ts` when API is unavailable
2. **Styling**: Tailwind CSS 4 with custom theme colors (oklch-based gradients)
3. **Accessibility**: Radix UI ensures WCAG compliance
4. **Tree Operations**: Core tree manipulation logic in `src/shared/utils/tree-operations.ts` handles node lookup, traversal
5. **Error Handling**: Centralized response handler in `src/lib/api/response-handler.ts` manages all API responses
6. **Chinese Language**: UI labels and comments use Chinese; keep this convention for consistency
7. **No ESLint Config**: Project uses Next.js default ESLint configuration without custom rules

## Testing Notes

- Run `npm run lint` before committing for code quality checks
- For single test execution, use appropriate test runner (Jest/Vitest commands if set up)
- Build verification: `npm run build` to catch TypeScript errors

## API Endpoints Reference

Common patterns (implementation in respective API classes):

- `GET /api/tree` - Fetch full tree structure
- `POST /api/[resource]` - Create new resource
- `PUT /api/[resource]/:id` - Update resource
- `DELETE /api/[resource]/:id` - Delete resource
- `GET /api/matrix/course/:id` - Get course matrix
- `GET /api/teaching-tasks` - List teaching tasks

Check individual API class files for specific endpoints and parameters.
