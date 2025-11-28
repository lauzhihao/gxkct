# 上下文
文件名：task-4-progress.md
创建于：2025-11-28 12:46:19
创建者：AI
关联协议：RIPER-5 + Multidimensional + Agent Protocol 

# 任务描述
按照 backlog/tasks/task-4 - 课程模块迁移与分层.md 的要求，将课程模块迁移到 src/modules/courses/ 下，并完成分层结构与路径调整。

# 项目概述
Next.js 教育树系统，需要将 legacy 组件拆分到 modules/shared 结构，保持现有功能不变。

---

# 分析 (由 RESEARCH 模式填充)
课程相关代码目前位于 src/components/course/** 与 detail-panel/course-detail.tsx，尚未迁入 modules。需要将课程矩阵、课程详情、API 调用等拆分到模块层。

# 提议的解决方案 (由 INNOVATE 模式填充)
采用“搬家 + 容器与 hooks 分离”策略：移动所有课程组件至 modules/courses，并抽离数据逻辑到 hooks/api 层，UI 组件保持轻量。

# 实施计划 (由 PLAN 模式生成)
见实施检查清单。
```
实施检查清单：
1. 在 src/modules 下创建 courses 子目录及子层级，并添加 index.tsx 出口。
2. 迁移 course-detail 面板到模块 components。
3. 迁移 course/ 目录及子组件到 modules/courses/components。
4. 迁移课程 hooks 到 modules/courses/hooks，并调整引用。
5. 新增课程模块 api 层包装文件，组件使用模块内 api。
6. 抽出模型与工具至 modules/courses/model 与 utils。
7. 更新 detail-panel 等引用，统一从 @/modules/courses 导出。
8. 全量更新旧路径引用并验证。
```

# 当前执行步骤 (由 EXECUTE 模式在开始执行某步骤时更新)
> 正在执行: "8. 全量更新旧路径引用并验证。"

# 任务进度 (由 EXECUTE 模式在每步完成后追加)
1. [2025-11-28 12:46:19]
										
	*   步骤：1. 在 src/modules 下创建 courses 子目录及子层级，并添加 index.tsx 出口。
	*   修改：新建 `src/modules/courses/{components,hooks,api,model,services,utils,styles}` 目录及 `src/modules/courses/index.tsx`，同时创建 `backlog/docs/task-4-progress.md` 记录。
	*   更改摘要：初始化课程模块骨架目录与对外入口，准备后续迁移。
	*   原因：执行计划步骤 1。
	*   阻碍：无。
	*   用户确认状态：成功。
2. [2025-11-28 12:47:48]

	*   步骤：2. 迁移 course-detail 面板到模块 components。
	*   修改：将 `src/components/detail-panel/course-detail.tsx` 移动到 `src/modules/courses/components/course-detail-panel.tsx`，修正类型导入路径，并更新 `src/components/detail-panel/index.tsx` 改为从 `@/modules/courses` 引用课程详情入口。
	*   更改摘要：课程详情面板已归属课程模块并通过模块出口对外暴露。
	*   原因：执行计划步骤 2。
	*   阻碍：无。
	*   用户确认状态：成功。
3. [2025-11-28 12:49:12]

	*   步骤：3. 迁移 course/ 目录及子组件到 modules/courses/components。
	*   修改：将 `src/components/course` 整体移动至 `src/modules/courses/components/course`，并更新课程详情面板内的 import 路径指向模块目录。
	*   更改摘要：课程模块 UI 组件已归档到 modules/courses 下，方便后续按职责分层。
	*   原因：执行计划步骤 3。
	*   阻碍：无。
	*   用户确认状态：成功。
4. [2025-11-28 12:51:03]

	*   步骤：4. 迁移课程 hooks 到 modules/courses/hooks，并调整引用。
	*   修改：将 `course-matrix/hooks/use-course-matrix-data.tsx` 移动至 `src/modules/courses/hooks/use-course-matrix-data.tsx`，并更新 CourseMatrix 相关组件与上下文引用路径。
	*   更改摘要：课程矩阵数据 Hook 已归档至模块 hooks 目录，为后续复用与共享做准备。
	*   原因：执行计划步骤 4。
	*   阻碍：无。
	*   用户确认状态：成功。
5. [2025-11-28 12:57:46]

	*   步骤：5. 新增课程模块 api 层包装文件，组件使用模块内 api。
	*   修改：在 `src/modules/courses/api/` 下增加 `courseDetailApi.ts`、`courseGoalsApi.ts`、`coursePointsApi.ts`、`courseMatrixApi.ts`、`projectMatrixApi.ts`、`courseResourcesApi.ts`、`courseTeachingTasksApi.ts` 等封装；课程详情、矩阵、课点管理、项目矩阵、资源、教学督导等组件改为依赖模块 api。
	*   更改摘要：课程模块内部不再直接依赖 `@/lib/api`，由模块 api 封装支撑后续分层和替换。
	*   原因：执行计划步骤 5。
	*   阻碍：无。
	*   用户确认状态：成功。
6. [2025-11-28 13:01:41]

	*   步骤：6. 抽出模型与工具至 modules/courses/model 与 utils。
	*   修改：将 `course-matrix/utils/course-matrix-utils.ts` 移至 `src/modules/courses/utils/` 并更新所有引用；新增 `src/modules/courses/model/course-matrix.ts` 抽离 CourseMatrix 相关类型，`use-course-matrix-data.tsx` 改为引用模型类型与新路径工具。
	*   更改摘要：课程矩阵共享逻辑已沉淀到模块 utils 与 model，方便后续扩展与复用。
	*   原因：执行计划步骤 6。
	*   阻碍：无。
	*   用户确认状态：成功。
7. [2025-11-28 13:02:30]

	*   步骤：7. 更新 detail-panel 等引用，统一从 @/modules/courses 导出。
	*   修改：复核 `DetailPanel`、`app` 等入口，确保仅经 `@/modules/courses` 访问课程组件；全局搜索确认无 `@/components/course` 旧路径引用。
	*   更改摘要：引用层已完全切换至模块入口，无遗留旧路径。
	*   原因：执行计划步骤 7。
	*   阻碍：无。
	*   用户确认状态：成功。
8. [2025-11-28 13:03:45]

	*   步骤：8. 全量更新旧路径引用并验证。
	*   修改：执行 `rg '@/components/course'`、`rg '@/modules/courses/components/course'` 等全局搜索确认引用一致，并确保 `DetailPanel` 仅依赖模块入口。
	*   更改摘要：验证通过，课程模块迁移已闭环。
	*   原因：执行计划步骤 8。
	*   阻碍：无。
	*   用户确认状态：成功。

# 最终审查 (由 REVIEW 模式填充)
待完成。
