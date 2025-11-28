# 上下文
文件名：task-6-progress.md
创建于：2025-11-28 14:21:10
创建者：AI
关联协议：RIPER-5 + Multidimensional + Agent Protocol 

# 任务描述
按照 backlog/tasks/task-6 - 系统管理及跨模块功能迁移.md 要求，接管系统级 UI（Header、TreeView、DetailPanel、app/orders）并迁入 src/modules/system/ 层，确保 hooks 依赖合理分配，保持 app 路由不变。

# 项目概述
Next.js 教育树系统，正在逐步将 legacy 组件迁移到以模块为单位的分层结构。课程与专业模块已完成拆分，系统级组件仍位于 src/components/ 与 app/orders。

---

# 分析 (由 RESEARCH 模式填充)
- `src/components/detail-panel` 目前仅剩 DetailPanel 聚合入口、types 与旧的 teaching-task-form，实际业务子面板已经迁往 modules/*，需要将入口与类型沉入 system 模块并清理引用。
- `src/components/tree-view.tsx`、`src/components/header.tsx` 仍位于 legacy components 目录，依赖 shared hooks（use-tree-search、use-tree-data）以及 modules/departments、modules/majors hooks。
- `src/modules/system/` 目录已创建骨架（api/components/hooks/model/services/styles/utils），但尚无实现或导出文件，app/page.tsx 依然直接依赖 legacy 组件。
- `src/shared/hooks/use-tree-data.ts`、`src/shared/hooks/use-tree-search.ts` 专属于系统树形管理逻辑，仅由 app/page.tsx 与 TreeView 使用，需要评估是否迁移到 system 模块，避免 shared 与业务模块交叉。
- `src/app/orders/page.tsx` 在当前工作区被删除，HEAD 版本仅包含占位 UI 逻辑，需在迁移过程中以 system 模块形式供路由复用，保持 `/orders` URL。
- 多个模块（如 `modules/departments/components/shared/statistics-cards.tsx`）仍通过 `@/components/tree-view` 引用 TreeNode 类型，迁移后需统一改用 `@/types` 或 system 模块的导出，避免循环依赖。

# 提议的解决方案 (由 INNOVATE 模式填充)
待补充。

# 实施计划 (由 PLAN 模式生成)
待补充。
```
实施检查清单：
1. [具体操作1]
2. [具体操作2]
...
n. [最终操作]
```

# 当前执行步骤 (由 EXECUTE 模式在开始执行某步骤时更新)
> 正在执行: ""

# 任务进度 (由 EXECUTE 模式在每步完成后追加)

# 最终审查 (由 REVIEW 模式填充)
待补充。
