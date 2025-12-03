# 上下文
文件名：tasks/course-resources-update.md
创建于：2025-12-03 17:40:28
创建者：AI助理
关联协议：RIPER-5 + Multidimensional + Agent Protocol 

# 任务描述
用户希望课程资源组件仅展示一个区域，区域内需同时显示目录与对象，并按类型排序（目录优先）。搜索框与操作按钮需挪至组件右上方并与面包屑对齐，同时所有按钮在 hover 状态下需呈现白色文字或图标。

# 项目概述
教育树系统，Next.js + React + Tailwind，课程详情页中的课程资源模块允许在目录树结构下浏览 OSS 风格的资源对象，需要保证 UI 统一、布局简洁且符合设计规范。

---

# 分析 (由 RESEARCH 模式填充)
- 课程资源 UI 由 `CourseResourcesContainer` 负责，当前目录与对象分处两个独立区域，导致子目录为空时会出现“暂无子目录”和“暂无文件”的双重空状态。
- 搜索与工具栏位于对象区域内部，仅在进入非根目录时显示，且未与面包屑统一对齐。
- `ResourceObjectList` 仅渲染对象列表，不支持文件夹条目，网格/列表视图之间样式不同。
- 多个按钮 hover 状态颜色不一致，需统一为白色文字/图标。

# 提议的解决方案 (由 INNOVATE 模式填充)
- 采用统一资源条目方案：将目录视为特殊对象，组合为单一列表/网格展示，并按类型排序（目录优先）。
- 重构 `ResourceObjectList` 以支持目录与对象混排，并在空状态时只展示一块提示区域。
- 在 `CourseResourcesContainer` 中调整顶栏布局：面包屑在左，右侧放置搜索与操作按钮，使其在任意目录层级都可见。
- 为所有按钮提供统一的 hover 类（如 `hover:text-white hover:[&>svg]:text-white`）。

# 实施计划 (由 PLAN 模式生成)
- 文件：`src/modules/courses/components/course/resources/CourseResourcesContainer.tsx`
  - 移除 `FolderGrid`，整合目录与对象渲染逻辑，新增统一的资源数据结构，调整布局位置与按钮 hover 样式。
- 文件：`src/modules/courses/components/course/resources/ResourceObjectList.tsx`
  - 扩展为混合列表（目录+对象），在网格/列表视图中分别定义目录样式与交互。
- 文件：`src/modules/courses/components/course/resources/types.ts`
  - 更新类型定义，增加 `ResourceEntry`、`onFolderClick` 等。
- 文件：`src/modules/courses/components/course/resources/ResourceSearchBar.tsx`
  - 支持附加类名并调整 hover 行为。
- 文件：`src/modules/courses/components/course/resources/index.ts`
  - 移除 `FolderGrid` 导出，保持导出一致。
- 文件：`src/modules/courses/components/course/resources/FolderGrid.tsx`
  - 若完全被替代则删除。

实施检查清单：
1. 重构 `ResourceObjectList.tsx`：新增统一资源条目结构，支持目录+对象混排及统一空状态和 hover 样式。
2. 更新 `types.ts`，提供新的 `ResourceEntry`、`ResourceObjectListProps`（含文件夹点击回调等）。
3. 调整 `CourseResourcesContainer.tsx`，整合顶部布局、移除 `FolderGrid`、生成合并条目并传递，统一按钮 hover 类。
4. 删除 `FolderGrid.tsx` 并更新 `index.ts` 导出，清理无用组件。
5. 修改 `ResourceSearchBar.tsx` 与其调用，确保右上角布局与 hover 统一。

# 当前执行步骤
> 正在执行："全部步骤已完成，等待用户确认"

# 任务进度

# 最终审查

* 2025-12-03 17:42:26
    * 步骤：1. 重构 `ResourceObjectList.tsx`
    * 修改：src/modules/courses/components/course/resources/ResourceObjectList.tsx
    * 更改摘要：实现目录与对象混排渲染、统一空状态，并为下载按钮增加 hover 变体。
    * 原因：执行计划步骤 1
    * 阻碍：无
    * 用户确认状态：待确认
* 2025-12-03 23:30:14
    * 步骤：2. 更新 `types.ts`
    * 修改：src/modules/courses/components/course/resources/types.ts
    * 更改摘要：新增资源条目联合类型，将列表组件的 props 改为传入统一 entries，并支持文件夹点击回调。
    * 原因：执行计划步骤 2
    * 阻碍：无
    * 用户确认状态：待确认
* 2025-12-03 23:32:15
    * 步骤：3. 调整 `CourseResourcesContainer.tsx`
    * 修改：src/modules/courses/components/course/resources/CourseResourcesContainer.tsx
    * 更改摘要：移除 `FolderGrid`，重构顶栏布局以放置搜索和刷新操作，合并目录与对象数据并传递给 `ResourceObjectList`，同时在相同区域内呈现加载/错误状态与统一的按钮 hover 效果。
    * 原因：执行计划步骤 3
    * 阻碍：无
    * 用户确认状态：待确认
* 2025-12-03 23:32:42
    * 步骤：4. 删除 `FolderGrid.tsx`
    * 修改：src/modules/courses/components/course/resources/index.ts, src/modules/courses/components/course/resources/FolderGrid.tsx
    * 更改摘要：移除未使用的 `FolderGrid` 组件文件并更新组件导出，避免悬空引用。
    * 原因：执行计划步骤 4
    * 阻碍：无
    * 用户确认状态：待确认
* 2025-12-03 23:33:19
    * 步骤：5. 修改 `ResourceSearchBar.tsx`
    * 修改：src/modules/courses/components/course/resources/ResourceSearchBar.tsx, src/modules/courses/components/course/resources/types.ts, src/modules/courses/components/course/resources/CourseResourcesContainer.tsx
    * 更改摘要：为搜索栏提供 className 扩展并统一操作按钮 hover 风格，确保在右上角布局下视图切换、批量下载与上传按钮 hover 时显示白色图标/文字。
    * 原因：执行计划步骤 5
    * 阻碍：无
    * 用户确认状态：待确认

追加任务：接入通用 FileUpload 组件替换上传按钮，确保与现有操作区布局一致，并暂时复用占位上传回调。
* 2025-12-03 23:38:49
    * 步骤：追加任务 - 接入通用 FileUpload 组件
    * 修改：src/modules/courses/components/course/resources/CourseResourcesContainer.tsx, src/modules/courses/components/course/resources/ResourceSearchBar.tsx, src/modules/courses/components/course/resources/types.ts
    * 更改摘要：将上传按钮替换为共享 FileUpload 组件，定义统一上传回调并允许在搜索栏中传入 upload props，保证 hover 效果与顶栏布局一致。
    * 原因：用户新增要求
    * 阻碍：无
    * 用户确认状态：待确认
* 2025-12-03 23:41:53
    * 步骤：追加任务 - 首页按钮显示规则与面包屑 hover 调整
    * 修改：src/modules/courses/components/course/resources/CourseResourcesContainer.tsx, src/modules/courses/components/course/resources/ResourceBreadcrumb.tsx
    * 更改摘要：根据是否进入目录控制刷新/上传按钮与搜索工具区的呈现，根目录不显示；同时为可点击的面包屑按钮添加 hover 白色文字样式。
    * 原因：用户新增要求
    * 阻碍：无
    * 用户确认状态：待确认
* 2025-12-03 23:44:56
    * 步骤：追加任务 - 首页样式与上传按钮布局调整
    * 修改：
        - src/modules/courses/components/course/resources/types.ts
        - src/modules/courses/components/course/resources/ResourceObjectList.tsx
        - src/modules/courses/components/course/resources/CourseResourcesContainer.tsx
        - src/modules/courses/components/course/resources/ResourceSearchBar.tsx
        - src/shared/components/ui/file-upload.tsx
    * 更改摘要：根目录改为列表样式并放大文件夹图标，新增 `isRootLevel` 控制；为 FileUpload 添加容器类名以保持布局，搜索栏内上传按钮与批量下载保持同一行。
    * 原因：用户新增要求
    * 阻碍：无
    * 用户确认状态：待确认
* 2025-12-03 23:46:39
    * 步骤：追加任务 - 根目录使用网格展示文件夹
    * 修改：src/modules/courses/components/course/resources/ResourceObjectList.tsx
    * 更改摘要：根目录改为网格布局，上方展示放大的文件夹图标，下方显示名称并移除箭头。
    * 原因：用户新增要求
    * 阻碍：无
    * 用户确认状态：待确认
* 2025-12-03 23:53:32
    * 步骤：追加任务 - 新建文件夹交互
    * 修改：
        - src/modules/courses/components/course/resources/types.ts
        - src/modules/courses/components/course/resources/ResourceSearchBar.tsx
        - src/modules/courses/components/course/resources/CourseResourcesContainer.tsx
    * 更改摘要：在批量下载左侧加入“新建文件夹”按钮，点击弹出命名对话框并进行字符校验（<=64 且无特殊符号），仅当名称合法时启用确认，暂以提示方式反馈。
    * 原因：用户新增要求
    * 阻碍：无
    * 用户确认状态：待确认
* 2025-12-03 23:59:17
    * 步骤：追加任务 - 根目录与父容器间距
    * 修改：src/modules/courses/components/course/resources/ResourceObjectList.tsx
    * 更改摘要：根目录文件夹网格添加 `pb-[15px]`，确保底部与父容器保持 15px 垂直间距。
    * 原因：用户新增要求
    * 阻碍：无
    * 用户确认状态：待确认
* 2025-12-04 00:00:20
    * 步骤：追加任务 - 根目录搜索框
    * 修改：src/modules/courses/components/course/resources/CourseResourcesContainer.tsx
    * 更改摘要：新增 `rootFolderSearch` 状态与输入框，仅在课程资源首页展示用于过滤文件夹的搜索框，并对目录列表进行实时筛选，退出根目录时清空搜索词。
    * 原因：用户新增要求
    * 阻碍：无
    * 用户确认状态：待确认

* 2025-12-04 00:06:33
    * 步骤：追加任务 - 创建文件夹接口与逻辑
    * 修改：src/lib/api/resource-api.ts, src/lib/api/index.ts, src/modules/courses/api/courseResourcesApi.ts, src/modules/courses/components/course/resources/CourseResourcesContainer.tsx
    * 更改摘要：新增 createFolder 接口签名及 API 封装，并在课程资源容器中调用该 API 创建新文件夹，增加弹窗 hover 样式与加载状态。
    * 原因：用户新增要求
    * 阻碍：无
    * 用户确认状态：待确认

# 新任务 - 课程资源选择器
* 需求：实现一个 Windows 资源管理器风格的课程资源选择器弹窗，可单/多选文件（调用方决定），支持逐层浏览/搜索，仅选取资源并返回id及完整路径，不涉及写操作。

* 2025-12-04 01:33:57
    * 步骤：实现课程资源选择器
    * 修改：src/modules/courses/components/dialogs/course-resource-picker-dialog.tsx, src/modules/courses/components/course/resources/ResourceObjectList.tsx, src/modules/courses/components/index.ts
    * 更改摘要：新增只读的课程资源选择器弹窗，复用现有目录与搜索逻辑，提供单/多选文件并返回路径；重构 ResourceObjectList 为统一网格样式且按类型展示图标。
    * 原因：用户新增要求
    * 阻碍：无
    * 用户确认状态：待确认

* 2025-12-04 01:44:01
    * 步骤：为教学督导评分添加支撑材料选择
    * 修改：src/modules/courses/components/course/supervision/course-supervision-detail.tsx
    * 更改摘要：在每个评语输入区域下新增支撑材料区，支持调用课程资源选择器选择/清空资源，标签样式符合要求。
    * 原因：用户新增要求
    * 阻碍：无
    * 用户确认状态：待确认

* 2025-12-04 01:46:02
    * 步骤：优化支撑材料展示与评语字数提示
    * 修改：src/modules/courses/components/course/supervision/course-supervision-detail.tsx
    * 更改摘要：支撑材料区改为单行滚动标签，评语输入框内右下角展示字数统计，符合最新交互需求。
    * 原因：用户新增要求
    * 阻碍：无
    * 用户确认状态：待确认

* 2025-12-04 01:47:13
    * 步骤：支撑材料文案与指示调整
    * 修改：src/modules/courses/components/course/supervision/course-supervision-detail.tsx
    * 更改摘要：支撑材料区域默认提示改为“可附加课程资源作为评分依据”，移除标题右侧重复的提示文案，保持指引信息一致。
    * 原因：用户反馈
    * 阻碍：无
    * 用户确认状态：待确认

* 2025-12-04 01:47:57
    * 步骤：支撑材料区域与按钮对齐调整
    * 修改：src/modules/courses/components/course/supervision/course-supervision-detail.tsx
    * 更改摘要：支撑材料提示文案与右侧加号按钮在同一行水平对齐，并保持标签滚动展示。
    * 原因：用户反馈
    * 阻碍：无
    * 用户确认状态：待确认

* 2025-12-04 01:48:26
    * 步骤：支撑材料提示字号统一
    * 修改：src/modules/courses/components/course/supervision/course-supervision-detail.tsx
    * 更改摘要：将默认提示文案调整为 text-sm，使其与加号按钮所在行的视觉权重一致。
    * 原因：用户反馈
    * 阻碍：无
    * 用户确认状态：待确认

* 2025-12-04 01:49:54
    * 步骤：课程资源选择器布局调整
    * 修改：src/modules/courses/components/dialogs/course-resource-picker-dialog.tsx
    * 更改摘要：选择器顶部改为“搜索框在上、面包屑在下”，列表继续使用统一网格，满足样式需求。
    * 原因：用户反馈
    * 阻碍：无
    * 用户确认状态：待确认

* 2025-12-04 01:50:06
    * 步骤：资源列表列数调整
    * 修改：src/modules/courses/components/course/resources/ResourceObjectList.tsx
    * 更改摘要：统一网格为 3 列起步（小屏即 3 列，lg 以上 4 列），满足“每行 3 个图标”需求。
    * 原因：用户反馈
    * 阻碍：无
    * 用户确认状态：待确认

* 2025-12-04 01:51:37
    * 步骤：资源网格列数/名称展示修订
    * 修改：src/modules/courses/components/course/resources/ResourceObjectList.tsx
    * 更改摘要：强制网格在所有屏幕保持 3 列，并将文件夹/文件名称设置为单行截断，符合最新视觉要求。
    * 原因：用户反馈
    * 阻碍：无
    * 用户确认状态：待确认
