# Task-3 shared 通用层迁移记录
- 日期：2025-11-28 12:07
- 负责人：AI

## 迁移内容
1. UI 组件：原 `src/components/ui/**/*` 迁至 `src/shared/components/ui/**/*`。
2. 复用组件：`course-selector.tsx`、`member-selector*.tsx`、`members.tsx`、`support-label.tsx`、`theme-provider.tsx`、`data-initializer.tsx` 等迁至 `src/shared/components/`。
3. Hooks：`src/hooks` 全量迁至 `src/shared/hooks`，统一从 `@/shared/hooks` 引用。
4. 工具：`lib/utils.ts`、`storage.ts`、`toast-utils.ts`、`tree-operations.ts` 迁至 `src/shared/utils/`。

## 路径与配置
- 所有原 `@/components/ui/*`、`@/components/shared/*`、`@/hooks/*`、`@/lib/{utils,storage,toast-utils,tree-operations}` 的引用，统一更新为 `@/shared/...` 路径。
- `components.json` 别名更新：`components`→`@/shared/components`，`utils`→`@/shared/utils`，`ui`→`@/shared/components/ui`，`hooks`→`@/shared/hooks`。

## 后续要求
- 新增通用组件/Hook/工具需直接落地 `src/shared`，禁止回写 `src/components` 或 `src/lib`。
- 业务模块引用 shared 代码时统一使用 `@/shared/...` 别名，避免相对路径。
