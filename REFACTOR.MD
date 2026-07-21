好，那我给你一份可以直接给 CodeX / 团队使用的重构说明文档，目标是：

不改任何现有功能，只改代码结构：按业务分包 + 职责分层。

我按“正式重构方案文档”的格式写，你可以直接复制到你们项目文档里。

⸻

1. 重构目标与约束

1.1 重构目标

在不改变现有功能行为的前提下，对现有 Next.js 项目进行代码结构重构，达到：
	1.	按业务模块（Feature）组织代码：如学生管理、老师管理、系统管理等。
	2.	在每个业务模块内部按职责分层：page / components / hooks / api / services / model / utils / styles。
	3.	提升代码可读性、可维护性与可扩展性，降低模块间耦合。
	4.	为后续增加新业务、重构逻辑、引入测试打好基础。

1.2 约束条件
	•	功能不变：所有页面路由、交互行为、接口调用结果必须保持不变。
	•	接口不变：前后端 API 协议不修改（除非存在 bug）。
	•	对外路径不变：保持现有 URL 路由不变（如 /students、/teachers 等）。
	•	对接系统不受影响：不会更改任何对外暴露的 HTTP 接口路径、签名。
	•	优先重用现有代码：能移动就移动，尽量避免“重写”导致引入新 bug。

⸻

2. 目标架构概述

2.1 架构思路（一句话）

顶层按业务模块分包（students / teachers / system），模块内部按职责分层（components / hooks / api / model / utils / styles / services）。

2.2 面向 Next.js 的结构（假定使用 App Router）
	•	src/app/ 保持作为路由入口层，尽量只做页面注册和布局，不堆业务代码。
	•	所有具体业务实现移入 src/modules/ 目录中。
	•	可复用的通用组件/工具等放在 src/shared/ 下。

⸻

3. 目标目录结构（建议标准）

以下是重构完成后的目标结构示例，请按此标准进行归类调整。

src/
  app/
    layout.tsx
    page.tsx             # 系统首页
    students/
      page.tsx           # /students 页面入口（轻薄层）
    teachers/
      page.tsx           # /teachers 页面入口
    system/
      page.tsx           # /system 页面入口
    # 其他路由同理...

  modules/
    students/
      index.tsx          # 学生模块主组件（可选：容器）
      components/
        StudentList.tsx
        StudentItem.tsx
        StudentForm.tsx
        # 其他仅学生模块使用的组件
      hooks/
        useStudents.ts   # 包含学生列表加载、CRUD 等逻辑
        useStudentForm.ts
      api/
        studentsApi.ts   # 与后端学生相关接口
      services/
        studentService.ts# 与 UI 无关的纯业务逻辑（可选）
      model/
        student.ts       # Student 类型定义等
      utils/
        studentFormatter.ts
      styles/
        index.module.css

    teachers/
      index.tsx
      components/
      hooks/
      api/
      services/
      model/
      utils/
      styles/

    system/
      index.tsx
      components/
      hooks/
      api/
      services/
      model/
      utils/
      styles/

  shared/
    components/
      Table.tsx
      Modal.tsx
      Pagination.tsx
      # 其他通用 UI 组件
    hooks/
      usePagination.ts
      useDebounce.ts
      useDialog.ts
    utils/
      request.ts         # axios/fetch 封装
      storage.ts
      format.ts
    styles/
      globals.css

  types/
    global.ts            # 全局通用类型（如通用分页类型）
  config/
    env.ts               # 环境变量/常量配置
    routes.ts            # 路由常量（如路径映射）

注意：具体模块名称可根据你现有的业务模块调整，但建议统一风格。

⸻

4. 模块内分层规范

以 modules/students/ 为例，定义清晰的职责边界：

4.1 page.tsx（路由入口层）

位置：src/app/students/page.tsx

职责：
	•	仅负责与 Next.js 路由对接。
	•	不写业务逻辑，只负责渲染模块入口组件。

示例：

// src/app/students/page.tsx
import StudentsModule from "@/modules/students";

export default function StudentsPage() {
  return <StudentsModule />;
}

4.2 modules/students/index.tsx（模块入口/容器）

职责：
	•	作为本业务模块在前端内部的入口。
	•	组装本模块的页面布局与主组件。
	•	可以包含一些简单布局逻辑，但不直接写具体业务逻辑（业务逻辑放在 hooks / services）。

示例：

// src/modules/students/index.tsx
import StudentList from "./components/StudentList";
import StudentForm from "./components/StudentForm";

export default function StudentsModule() {
  return (
    <div className="p-6 space-y-4">
      <h1>学生管理</h1>
      <StudentForm />
      <StudentList />
    </div>
  );
}

4.3 components/（UI 展示层）

原则：
	•	只负责接收 props → 渲染 UI → 触发回调。
	•	不直接调用后端，不直接操作全局状态。
	•	业务逻辑通过 props 的形式传入（如 onSubmit、onDelete）。

示例：

// src/modules/students/components/StudentList.tsx
import { useStudents } from "../hooks/useStudents";
import StudentItem from "./StudentItem";

export default function StudentList() {
  const { listQuery } = useStudents();

  if (listQuery.isLoading) return <p>加载中...</p>;
  if (listQuery.isError) return <p>加载失败</p>;

  return (
    <div>
      {listQuery.data.map((s) => (
        <StudentItem key={s.id} student={s} />
      ))}
    </div>
  );
}

注：上面示例里 useStudents 已经是一小部分业务逻辑；如果你希望组件更“纯”，也可以将数据注入从上层传入。

4.4 hooks/（业务逻辑层）

职责：
	•	负责本模块的状态管理 + 业务流程。
	•	集中封装 CRUD、loading 状态、错误处理等。
	•	典型会结合 TanStack Query / 自定义状态管理等。

示例：

// src/modules/students/hooks/useStudents.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsApi } from "../api/studentsApi";
import type { Student } from "../model/student";

export function useStudents() {
  const qc = useQueryClient();

  const listQuery = useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: studentsApi.list,
  });

  const create = useMutation({
    mutationFn: studentsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Student> }) =>
      studentsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => studentsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });

  return { listQuery, create, update, remove };
}

4.5 api/（后端访问层）

职责：
	•	仅处理 HTTP 请求相关逻辑。
	•	不夹杂业务逻辑，不处理复杂数据转换（如有复杂领域规则，放 services）。

示例：

// src/modules/students/api/studentsApi.ts
import request from "@/shared/utils/request";
import type { Student } from "../model/student";

export const studentsApi = {
  list: () => request.get<Student[]>("/students"),
  create: (data: Omit<Student, "id">) => request.post("/students", data),
  update: (id: number, data: Partial<Student>) =>
    request.put(`/students/${id}`, data),
  remove: (id: number) => request.delete(`/students/${id}`),
};

4.6 services/（业务服务层，可选）

职责：
	•	处理与 UI 无关、与 HTTP 无关的纯业务逻辑。
	•	比如：批量计算、领域规则校验、组合多个 API 调用的流水线等。
	•	如果暂时比较简单，可以不建 services，后续可以逐步抽。

4.7 model/（领域模型与类型）

职责：
	•	使用 TypeScript 定义领域模型（Student、Teacher 等）。
	•	提供统一的数据结构约束。

示例：

// src/modules/students/model/student.ts
export interface Student {
  id: number;
  name: string;
  age: number;
  grade: string;
}

4.8 utils/（模块内部工具函数）

职责：
	•	本模块专用的小工具函数，如格式化方法、简单计算等。
	•	跨模块复用的工具函数放到 shared/utils/。

4.9 styles/（模块样式）

职责：
	•	存放与本模块相关的 CSS / SCSS / CSS Module 文件。
	•	推荐使用 CSS Module 或 Tailwind，避免全局污染。

⸻

5. 重构执行步骤（保证功能不受影响）

Step 0：冻结规范 & 配置准备
	1.	在团队中确认本重构文档为当前标准。
	2.	在 tsconfig.json / jsconfig.json 中配置路径别名（如已配置可略）：

{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@/*": ["*"]
    }
  }
}


	3.	确保有基础测试手段（至少手动测试清单）。

⸻

Step 1：创建新目录骨架（不移动代码）
	1.	在 src/ 下创建：
	•	modules/
	•	shared/
	•	types/（如需要）
	•	config/（如需要）
	2.	为每个业务模块创建空目录：

src/modules/students/
src/modules/teachers/
src/modules/system/



此阶段不改任何现有逻辑，仅创建结构。

⸻

Step 2：抽取 shared（全局复用）层
	1.	分析当前代码中通用组件/工具/Hook：
	•	通用表格、弹窗、表单组件等 → shared/components/
	•	节流、防抖、分页等 Hook → shared/hooks/
	•	请求封装、通用日期/字符串处理等 → shared/utils/
	2.	迁移代码并保持原有导出 API 不变。
	3.	将原有引用路径替换为 @/shared/...，保证功能不变。

⸻

Step 3：按业务模块迁移（逐模块重构）

对每一个业务模块（例如学生管理模块），采用**“搬家 + 局部分层”**的策略：

3.1 标记该模块涉及的所有文件
	•	找出所有与学生管理相关的页面、组件、hook、service、api 调用等。
	•	将这些文件列表记录下来（方便对照测试）。

3.2 将模块文件移动到 modules/students/ 下
例如：
	•	原来：
	•	src/app/students/page.tsx
	•	src/components/StudentList.tsx
	•	src/services/studentService.ts
	•	src/api/student.ts
	•	迁移后：
	•	src/app/students/page.tsx（保留，只做引导）
	•	src/modules/students/index.tsx
	•	src/modules/students/components/StudentList.tsx
	•	src/modules/students/api/studentsApi.ts
	•	src/modules/students/hooks/useStudents.ts
	•	…

迁移时，先只做“移动 + 修正导入路径”，逻辑不做复杂修改，避免引入新 bug。

3.3 按职责拆分模块内部文件
	1.	把页面中的业务逻辑抽出放入 hooks/。
	2.	把散落的 fetch/axios 调用集中到 api/。
	3.	把类型定义集中到 model/。
	4.	把样式集中到 styles/。
	5.	将模块相关工具放入 utils/。

拆分过程中，保证每一步修改之后：
	•	能成功编译
	•	主要功能能正常运行（建议每个步骤后做最小回归检查）

⸻

Step 4：清理旧结构 & 兼容导出（如需）
	1.	当某个模块完全迁移完成后：
	•	删除旧的散乱文件（已无引用）。
	•	如有必要，保留原路径的“中转导出”，防止其他代码还在引用旧路径：

// 旧路径中转，例如 src/components/StudentList.tsx
export { default } from "@/modules/students/components/StudentList";


	•	然后再逐步将其他模块中的引用改成新路径。

	2.	最终目标：所有业务文件统一从 modules/ 与 shared/ 引入。

⸻

Step 5：逐步迁移其他业务模块（teachers / system / …）

对每一个模块重复 Step 3，直到所有业务模块都完成迁移与分层。

⸻

Step 6：收尾与规范化
	1.	全局搜索：
	•	旧目录引用路径
	•	旧的 API 调用方式
	•	重复的工具函数
	2.	清理：
	•	未使用的文件
	•	重复功能（合并到 shared 或对应模块）
	3.	增加一份《项目目录规范》文档，要求新代码必须按本架构落地。

⸻

6. 测试与验证策略

为确保“现有功能不受影响”，建议至少执行：
	1.	基础回归测试
	•	对每个业务模块（学生/老师/系统），列出关键功能点：
	•	查询、分页、筛选
	•	新增、编辑、删除
	•	导入导出（如有）
	•	每迁移一个模块，完成对应模块的手工回归。
	2.	接口回归
	•	确认所有 api/ 中的 URL、参数、返回解析未变。
	•	如有 Postman / Swagger 等，可对照检查。
	3.	编译 & 构建
	•	npm run lint（如有）
	•	npm run build
	•	确保线上构建流程不报错。

如已有自动化测试（unit/e2e），应在每轮重构后跑一遍。

⸻

7. 后续规范（避免回退到“乱写”）
	1.	所有新功能必须按本架构落地：
	•	新业务 → 新建 modules/<feature>/
	•	新页面 → 放在对应 module 的 components//hooks/ 中组合使用
	2.	禁止在 app/ 目录中写复杂业务逻辑。
	3.	禁止在 shared/ 中直接访问具体业务模块代码（保持单向依赖：shared → modules）。
	4.	定期 Code Review 重点关注：
	•	业务逻辑是否被写进组件中
	•	是否有新出现的散乱 api 调用、工具函数等

⸻

如果你愿意，我可以下一步：
	•	帮你根据你现在项目的大致目录，做一个“旧结构 → 新结构”的映射表，方便你直接让 CodeX 执行；
	•	或者按照“学生管理模块”先写一套具体迁移前后代码对照示例（原来的 page 写法 vs 拆成 page + module + hooks + api 的写法），用来给 CodeX 当few-shot例子。