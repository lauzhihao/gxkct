# 质量评价督导任务 REST 接口规范

## 通用约定
- 基础路径：`/api/universities/{universityId}/teaching-supervisory-tasks`
- 响应格式：`{ code: "0" | string; message: string; data: T | null }`
- 时间：`startDate`/`endDate` 采用 `YYYY-MM-DD`，`createdAt`/`updatedAt` 采用 ISO8601 UTC（由后端生成）
- 发布范围：`publishNodes[]` 项 `{ nodeId: Long; nodeType: "university" | "department" | "major" | "course"; nodeName?: string }`
- 状态枚举：`status ∈ {"not_started","in_progress","completed"}`，`archived` 默认为 `false`
- ID 字段均为 Long（64 位整型，自增主键）

## 数据模型
### TeachingSupervisoryTask
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Long | 任务主键，由后端生成 |
| universityId | Long | 所属学校ID（URL参数） |
| title | string | 1~100字标题 |
| description | string | ≤2000字描述，可选 |
| startDate/endDate | string | YYYY-MM-DD，要求 startDate ≤ endDate |
| status | string | `not_started`/`in_progress`/`completed` |
| creator | string | 创建人，≤50字 |
| scoringType | string | `percentage`(百分制) / `five_level`(五级制)，默认百分制 |
| publishNodes | PublishNode[] | 发布范围，可为空数组 |
| archived | boolean | 是否归档，默认 false |
| createdAt | string | ISO8601，后端生成 |
| updatedAt | string | ISO8601，后端生成 |
| evaluationCriteria | TaskEvaluationCriteria | 可选，当前任务的评价标准集合 |

### PublishNode
`{ nodeId: Long; nodeType: "university" | "department" | "major" | "course"; nodeName?: string }`

### EvaluationCriterion
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Long | 指标ID（自增主键，新增时由后端生成；前端可临时使用时间戳） |
| sequence | number | 序号(1基)，保持升序 |
| type | "business" \/ "system" | 指标类型 |
| indicator | string | 业务指标名称（type=business时必填） |
| systemIndicator | string | 系统指标枚举（type=system时必填） |
| fullScore | number | 满分，默认100 |
| weight | number | 权重0~1，可选 |
| evidenceRequirement | string | 佐证材料说明，可选 |
| levels | EvaluationLevel[] | 等级定义，至少1项 |

### EvaluationLevel
`{ level: "A" | "B" | "C" | "D"; description: string; coefficient: number (0.1~1); condition?: { operator: ">" | "<" | ">=" | "<=" | "=" | "contains" | "not_contains"; threshold: number } }`

### TaskEvaluationCriteria
`{ taskId: Long; universityId: Long; items: EvaluationCriterion[]; updatedAt?: string }`
> 说明：`items` 中的每个标准都会与任务一同在数据库事务内保存，避免出现“任务已建、标准未保存”的中间状态。

## 教学督导任务接口
### 1. 获取任务列表
- `GET /universities/{universityId}/teaching-supervisory-tasks`
- Query：`status`(可选)，`includeArchived`(默认 false)，`includeCriteria`(可选)
- 响应：`data: TeachingSupervisoryTask[]`；当 `includeCriteria=true` 时，`evaluationCriteria` 字段包含完整的 `TaskEvaluationCriteria`

### 2. 获取单个任务
- `GET /universities/{universityId}/teaching-supervisory-tasks/{taskId}`
- Query：`includeCriteria` 可选
- 响应：`data: TeachingSupervisoryTask`

### 3. 新增任务
- `POST /universities/{universityId}/teaching-supervisory-tasks`
- Body：
```json
{
  "title": "2025秋季教学档案专项督导",
  "description": "...",
  "startDate": "2025-09-01",
  "endDate": "2025-10-10",
  "status": "not_started",
  "creator": "质量评价办公室",
  "scoringType": "percentage",
  "publishNodes": [{ "nodeId": 1001, "nodeType": "department", "nodeName": "信息学院" }],
  "evaluationCriteria": {
    "universityId": 86,
    "items": [
      {
        "id": 9001,
        "sequence": 1,
        "type": "business",
        "indicator": "教学文件完整率",
        "fullScore": 100,
        "levels": [
          { "level": "A", "description": "材料完整且规范", "coefficient": 1 },
          { "level": "B", "description": "材料完整但有轻微缺陷", "coefficient": 0.8 }
        ]
      }
    ]
  }
}
```
- 行为：任务信息与 `evaluationCriteria.items` 在同一事务内写入；返回完整 `TeachingSupervisoryTask`（含后端生成的 `id`、`createdAt`、`updatedAt`）

### 4. 更新/自动保存任务
- `PUT /universities/{universityId}/teaching-supervisory-tasks/{taskId}`
- Body：除 `id`、`createdAt` 由后端覆盖外，其余字段（含 `evaluationCriteria.items`）需全量发送，用于编辑和自动保存的幂等更新
- 返回：最新 `TeachingSupervisoryTask`

### 5. 更新任务状态
- `PATCH /universities/{universityId}/teaching-supervisory-tasks/{taskId}/status`
- Body：`{ "status": "in_progress" }`
- 返回：更新后的任务

### 6. 归档/取消归档
- `POST /universities/{universityId}/teaching-supervisory-tasks/{taskId}/archive`
- Body：`{ "archived": true }`（或 false）
- 返回：更新后的任务

### 7. 复制并新增任务
- `POST /universities/{universityId}/teaching-supervisory-tasks/{taskId}/copy`
- Body：`{ "titleSuffix": "（副本）" }` 可选
- 行为：复制任务及其评价标准，返回新任务

## 错误码建议
| code | http | 说明 |
| --- | --- | --- |
| "TEACHING_TASK_NOT_FOUND" | 404 | 任务不存在 |
| "INVALID_STATUS_TRANSITION" | 400 | 状态切换非法 |
| "VALIDATION_FAILED" | 422 | 字段校验失败，建议附 `details` |
| "INTERNAL_ERROR" | 500 | 服务端异常 |
