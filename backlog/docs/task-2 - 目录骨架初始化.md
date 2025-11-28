# Task-2 目录骨架初始化记录
- 日期：2025-11-28 12:07
- 负责人：AI

## 结构调整
1. 创建 `src/` 作为唯一源码根目录，并将原 `app/`, `components/`, `hooks/`, `lib/`, `mock-data/`, `styles/`, `types/` 全部迁移至 `src` 下。
2. 在 `src/` 下新增 `modules/`（students/teachers/system 三个模块，各自包含 components/hooks/api/services/model/utils/styles 子目录，并以 `.gitkeep` 占位）、`shared/`（components/hooks/utils/styles）、`config/`。
3. 保留 `src/types` 用于全局类型定义，后续任务可视情况拆分。

## 配置更新
- `tsconfig.json`：设置 `baseUrl: "src"`，并将 `@/*` 指向 `src`，确保新目录解析正确。
- `components.json`：调整 Shadcn CLI `css` 路径至 `src/app/globals.css`。

## 后续约束
- 新功能需落地在 `src/modules/<feature>` 分层结构或 `src/shared`，禁止回退到根级目录。
- app 路由层保持轻薄，仅负责模块入口挂载。
