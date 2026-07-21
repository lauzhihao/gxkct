---
name: code-refactor
description: Refactors and optimizes code for better maintainability, reduced bundle size, and improved readability. Ensures existing functionality remains unchanged.
context: fork
user_invocable: true
---

# Code Refactor & Optimization Skill

## Overview

This skill provides **code-level refactoring analysis** for improving existing **TypeScript/JavaScript code** in a React-based application.

**Important:** This skill does NOT directly modify code. It analyzes the target file and generates structured task files in `backlog/tasks/` directory for later execution.

> **Explicit Prohibition:**
> Any change that affects application behavior, existing features, business logic, or user interactions is strictly forbidden.

---

## Execution Steps

### Step 1: File Location

When user provides a target file (filename, full path, or keyword):

1. **Search Strategy:**
   - If full path provided: Verify file exists at that location
   - If filename provided: Search in `src/` directory recursively
   - If keyword provided: Search for files containing the keyword in name

2. **Search Commands:**
   ```bash
   # For exact filename
   find src/ -name "filename.tsx" -o -name "filename.ts" -o -name "filename.js"

   # For keyword search
   find src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) | grep -i "keyword"
   ```

3. **If file not found:**
   - Report: "未找到文件: [用户输入]"
   - Suggest similar files if any partial matches exist
   - Stop execution

4. **If multiple files found:**
   - List all matches with full paths
   - Ask user to specify which file to refactor

---

### Step 2: File Type Detection & Analysis

Determine file type and applicable refactoring rules:

| Extension | Type | Refactoring Focus |
|-----------|------|-------------------|
| `.ts` | TypeScript | Type optimization, imports, utilities |
| `.tsx` | React Component | Component patterns, hooks, props |
| `.js` | JavaScript | ES6+ patterns, module structure |
| `.jsx` | React Component (JS) | Component patterns, props |
| `.css` | Stylesheet | Class consolidation, variables |

---

### Step 3: Code Analysis

Before generating tasks, analyze the file for:

1. **Code Metrics:**
   - Total lines of code
   - Number of functions/components
   - Import count
   - Exported items

2. **Issues to Identify:**
   - Duplicate code blocks
   - Overly long functions (>50 lines)
   - Poor variable/function naming
   - Unused imports
   - Magic numbers/strings
   - Deep nesting (>3 levels)
   - Inconsistent patterns
   - Type issues (any, unknown overuse)
   - Missing memoization opportunities
   - Commented-out code blocks

3. **Report Format:**
   ```
   文件分析报告: [filepath]
   ─────────────────────────
   类型: [file type]
   代码行数: [lines]
   函数/组件数: [count]

   发现的问题:
   1. [issue description] (行 XX-XX)
   2. [issue description] (行 XX-XX)
   ...
   ```

---

### Step 4: Task Generation

Generate task files in `backlog/tasks/` directory using the Backlog MCP tools.

**Task Naming Convention:**
- Main task: `task-XXX - 重构-[filename]-[brief description].md`
- Sub-tasks: `task-XXX.01 - [specific refactor item].md`

**Use `mcp__backlog__task_create` with:**
```
title: 重构 [filename] - [brief description]
description: [detailed analysis and refactoring plan]
status: To Do
labels: [refactor, code-quality, + file-type label]
priority: medium
acceptanceCriteria: [list of verification items]
```

**For complex files (>300 lines or >5 issues), create sub-tasks:**
- Each major refactoring item becomes a sub-task
- Use `parentTaskId` to link to main task

---

## Optimization Scope

### 1. Code Volume Reduction

**Allowed:**
- Remove unused imports
- Delete commented-out code blocks
- Remove `console.log` debug statements
- Consolidate duplicate code into utility functions
- Merge related type definitions
- Simplify verbose conditional expressions

**Prohibited:**
- Removing code that appears unused without verification
- Deleting comments that document business logic

### 2. Variable & Function Naming

**Naming Conventions:**

| Category | Rule | Example |
|----------|------|---------|
| Variables | Descriptive camelCase | `userProfile`, `isLoading` |
| Booleans | Prefix with `is`, `has`, `should`, `can` | `isValid`, `hasError` |
| Arrays | Plural names | `items`, `users`, `chapters` |
| Functions | Verb-noun pattern | `fetchUser`, `calculateTotal` |
| Event handlers | `handle[Event]` or `on[Event]` | `handleSubmit`, `onClick` |
| Components | PascalCase, descriptive | `UserProfileCard`, `CourseMatrixEditor` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |

### 3. Code Reuse & Patterns

**Allowed:**
- Extract repeated logic into utility functions
- Create custom hooks from component logic
- Extract repeated JSX into sub-components
- Consolidate similar event handlers
- Use object destructuring
- Apply optional chaining (`?.`)
- Use array methods (map, filter, reduce)

### 4. TypeScript Type Optimization

**Allowed:**
- Replace `any` with specific types
- Extract repeated type definitions to shared types
- Use generics to reduce type duplication
- Add type guards for safer type narrowing
- Use union types and discriminated unions

**Prohibited:**
- Changing exported type interfaces
- Modifying function signatures

### 5. React Performance Patterns

**Allowed:**
- Wrap pure components with `React.memo`
- Add `useCallback` for stable callbacks passed to children
- Add `useMemo` for expensive computations
- Extract large components into smaller focused ones

**Prohibited:**
- Changing component props interface
- Modifying render logic or conditional rendering
- Altering state management patterns

### 6. Import Organization

**Order:**
1. React and framework imports
2. Third-party library imports
3. Internal modules (absolute paths)
4. Relative imports
5. Type imports
6. Style imports

**Optimization:**
- Consolidate multiple imports from same module
- Use named imports for tree-shaking
- Remove unused imports

### 7. Code Organization

**Allowed:**
- Group related functions together
- Separate concerns (logic vs presentation)
- Extract pure functions from components

**File splitting criteria (suggest as sub-task):**
- File exceeds 300 lines
- Contains multiple unrelated concerns
- Has reusable logic that belongs elsewhere

### 8. Security & Cleanup

**Check for:**
- Hardcoded sensitive information
- Potential XSS risks in JSX
- Unsafe type assertions

---

## Task Output Format

### Main Task Template

```markdown
---
id: task-XXX
title: 重构 [filename] - 代码优化
status: To Do
labels:
  - refactor
  - code-quality
  - [file-type]
priority: medium
---

## Description

对 `[filepath]` 进行代码重构优化。

### 文件概况
- 类型: [TypeScript/React Component/etc.]
- 代码行数: [lines]
- 函数/组件数: [count]

### 发现的问题
1. [问题描述] (行 XX-XX)
2. [问题描述] (行 XX-XX)
...

### 重构目标
- 代码行数: [current] → [target] (预计减少 [N] 行)
- 消除重复代码
- 改进命名规范
- 优化类型定义

## Acceptance Criteria

- [ ] #1 [具体验证项]
- [ ] #2 [具体验证项]
- [ ] #3 所有现有功能保持不变
- [ ] #4 无 TypeScript 编译错误
- [ ] #5 代码通过 lint 检查
```

### Sub-Task Template

```markdown
---
id: task-XXX.01
title: [具体重构项]
status: To Do
parent_task_id: task-XXX
labels:
  - refactor
priority: medium
---

## Description

[详细描述这个具体的重构任务]

当前位置: [filepath] 第 XX-XX 行

### 具体修改
- [修改点1]
- [修改点2]

## Acceptance Criteria

- [ ] #1 [验证项]
- [ ] #2 功能不变
```

---

## Hard Constraints

1. **NEVER modify existing functionality** - Analysis only, no direct code changes
2. **NEVER change public API/exports** - Flag as warning in task if needed
3. **NEVER alter test assertions or expected behavior**
4. **NEVER remove code that appears unused without verification**
5. **ALWAYS preserve comments that document business logic**
6. **ALWAYS generate tasks in backlog/tasks/ directory**
7. **ALWAYS include verification criteria in tasks**

---

## Example Usage

User input: `/code-refactor use-tree-data`

Response:
```
[MODE: RESEARCH]

正在搜索文件...
找到: src/shared/hooks/use-tree-data.ts

文件分析报告: src/shared/hooks/use-tree-data.ts
─────────────────────────
类型: TypeScript React Hook
代码行数: 245
函数/组件数: 12

发现的问题:
1. 重复的空值检查逻辑 (行 45-48, 67-70, 89-92)
2. 过长的 handleNodeUpdate 函数 (行 120-180, 60行)
3. 魔法字符串 'education-tree-data' (行 15, 23)
4. 未使用的导入 'useRef' (行 3)
5. 可以用 useCallback 包装的回调函数 (行 85, 102, 145)

[MODE: PLAN]

将生成以下任务:

主任务: task-018 - 重构 use-tree-data.ts - 代码优化
子任务:
- task-018.01 - 移除未使用导入和提取常量
- task-018.02 - 创建 isValidNode 工具函数
- task-018.03 - 拆分 handleNodeUpdate 函数
- task-018.04 - 添加 useCallback 优化

正在创建任务文件...

[完成] 已生成 4 个任务文件到 backlog/tasks/ 目录
```
