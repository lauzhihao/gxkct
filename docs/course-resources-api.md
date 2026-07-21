# 课程资源接口规范（OSS资源管理）

## 1. 通用说明
- 本文档描述课程详情页“课程资源”标签所需的 REST 接口，页面仅作为 OSS 资源管理器，提供目录浏览、对象列表、对象详情、上传、下载、批量选择（复制/剪切/删除）能力。
- 基础路径：`/api/v5/courses/{courseId}`，`courseId` 为课程主键（Long 或 UUID）。
- 响应统一为：
```json
{
  "code": "0",
  "message": "success",
  "data": { ... }
}
```
- 出错时 `code` 为业务错误码（如 `RESOURCE_FOLDER_NOT_FOUND`），`message` 为错误描述，`data` 为 `null`。
- 所有时间字段使用 ISO8601（UTC）格式；大小单位为字节（前端负责格式化），`downloadUrl`/`uploadUrl` 可为直链或带有效期的签名地址。
- 鉴权依赖 `authToken` Header，后端据此判断用户是否具有查看、上传、复制、移动（剪切）、删除权限。

## 2. 数据模型
### 2.1 ResourceFolder
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 目录 ID，由后端生成或预置（例如 `syllabus`、`courseware`） |
| name | string | 目录名称 |
| filesCount | number | 目录下对象数量 |
| latestUploadedAt | string \| null | 最近一次上传时间 |

### 2.2 ResourceObjectSummary
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 对象 ID（后端生成，等同于 OSS Object Key 或数据库主键） |
| folderId | string | 所属目录 ID |
| objectKey | string | OSS 对象 Key，用于直连访问/调试 |
| displayName | string | 展示名称（通常为原始文件名） |
| size | number | 对象大小（字节） |
| mimeType | string | MIME 类型 |
| uploader | { id: string; name: string } | 上传者信息 |
| version | string \| null | 版本号 |
| uploadedAt | string | 上传时间 |
| downloadUrl | string | 下载链接或签名 URL |

### 2.3 ResourceObjectDetail
在 `ResourceObjectSummary` 基础上新增：
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| etag | string | OSS ETag 或文件哈希 |
| checksum | string \| null | 校验值（如 MD5/SHA1） |
| storageClass | string \| null | OSS 存储类型（如 `STANDARD`、`IA`） |
| metadata | Record<string,string> | 自定义元数据（章节、标签、备注等） |

## 3. REST 接口
### 3.1 获取资源目录列表
- **URL**：`GET /api/v5/courses/{courseId}/resource-folders`
- **Query**：`includeEmpty` (boolean，可选，默认 true)
- **响应**：`data: ResourceFolder[]`

### 3.2 获取目录下对象列表
- **URL**：`GET /api/v5/courses/{courseId}/resource-objects`
- **Query 参数**：
  - `folderId` (string, 必填)
  - `keyword` (string, 可选，模糊搜索 `displayName` / `metadata` 标签)
  - `offset` (number, 可选，默认 0) —— 与 `limit` 搭配，用于数据库式分页
  - `limit` (number, 可选，默认 24，最大 100) —— 默认匹配网格视图 3x8
  - `continuationToken` (string, 可选) —— 若直连 OSS，可透传上一页返回的 token
  - `sortField` ("uploadedAt" | "displayName" | "size" | "objectKey" | "version" | "uploader"，默认 `uploadedAt`)
  - `sortOrder` ("asc" | "desc"，默认 `desc`)
  - `viewMode` ("grid" | "list"，可选，仅用于日志分析，默认 `grid`)
- **分页响应**：
```json
{
  "code": "0",
  "message": "success",
  "data": {
    "items": [ { ...ResourceObjectSummary } ],
    "pagination": {
      "offset": 0,
      "limit": 24,
      "total": 136,
      "nextOffset": 24,
      "continuationToken": null,
      "nextContinuationToken": "CAIQAA..."
    }
  }
}
```
> 若使用 offset/limit，`continuationToken` 字段可为 `null`；若走 OSS token 分页，`total` 可能不可得，可返回 `-1`，前端据 `nextContinuationToken` 判断是否还有下一页。

### 3.3 获取对象详情
- **URL**：`GET /api/v5/courses/{courseId}/resource-objects/{objectId}`
- **响应**：`data: ResourceObjectDetail`

### 3.4 上传对象
- **URL**：`POST /api/v5/courses/{courseId}/resource-folders/{folderId}/objects`
- **Content-Type**：`multipart/form-data`
- **Body 字段**：`files[]`（必填，多文件）、`version`、`metadata[*]`
- **响应**：成功上传的 `ResourceObjectSummary[]`
- **说明**：若采用 OSS 直传，可通过 `POST /resource-upload/presign` 获取临时凭证并在上传完成后调用 `POST /resource-folders/{folderId}/objects/confirm` 进行回调。

### 3.5 删除对象
- **URL**：`DELETE /api/v5/courses/{courseId}/resource-objects/{objectId}`
- **响应**：`{ "code": "0", "message": "success", "data": null }`

### 3.6 批量操作（复制/剪切/删除）
- **URL**：`POST /api/v5/courses/{courseId}/resource-objects/batch-action`
- **Body**：
```json
{
  "action": "copy" | "move" | "delete",
  "sourceFolderId": "courseware",
  "targetFolderId": "syllabus",  // action=copy/move 时必填
  "objectIds": ["obj-101", "obj-102"]
}
```
- **约束**：`objectIds` 必须来自同一目录（当前 UI 的批量选择限制），`move` 表示剪切操作。
- **响应**：
```json
{
  "code": "0",
  "message": "success",
  "data": {
    "succeeded": ["obj-101"],
    "failed": [
      { "objectId": "obj-102", "errorCode": "RESOURCE_OBJECT_NOT_FOUND", "message": "文件不存在" }
    ]
  }
}
```
> 复制/剪切操作内部应调用 OSS `CopyObject`/`DeleteObject` 或同效逻辑，并更新数据库中的 `folderId`、`objectKey`、`latestUploadedAt` 等字段。

### 3.7 批量删除（历史接口，等价于 batch-action delete）
- **URL**：`POST /api/v5/courses/{courseId}/resource-objects/batch-delete`
- **Body**：`{ "objectIds": ["obj-101", "obj-102"] }`
- **响应**：`{ "code": "0", "message": "success", "data": { "deleted": 2 } }`
> 可逐步被 3.6 的通用批量操作替代，保留仅为兼容已有调用。

### 3.8 批量下载任务（可选）
- **URL**：`POST /api/v5/courses/{courseId}/resource-objects/batch-download`
- **Body**：`{ "objectIds": ["obj-101", "obj-102"] }`
- **响应**：`{ "code": "0", "message": "success", "data": { "taskId": "zip-9001", "status": "pending", "downloadUrl": null } }`

### 3.9 新建文件夹
- **URL**：`POST /api/v5/courses/{courseId}/resource-folders/{parentId}`
- **Path 参数**：
  - `courseId` - 课程 ID
  - `parentId` - 目标父级目录 ID，根目录写 `root`
- **Body**：
```json
{
  "name": "课堂资料"
}
```
- **响应**：`data: ResourceFolder`（包含新目录 ID、名称、`filesCount=0`、`latestUploadedAt=null`）
- **说明**：若同层已存在同名目录，请返回 `RESOURCE_FOLDER_ALREADY_EXISTS`。

### 3.10 文件上传签名（预签名直传）
- **URL**：`POST /api/v5/courses/{courseId}/resource-folders/{parentId}/objects/presign`
- **Body**：
```json
{
  "fileName": "第1章-绪论.pdf",
  "mimeType": "application/pdf",
  "size": 1048576
}
```
- **响应**：
```json
{
  "code": "0",
  "message": "success",
  "data": {
    "uploadPath": "courses/10001/root/2024/第1章-绪论.pdf",
    "uploadUrl": "https://oss.example.com/...",
    "uploadHeaders": {
      "Authorization": "OSS ...",
      "x-oss-security-token": "..."
    },
    "expiresIn": 900
  }
}
```
- **说明**：后端根据 `parentId`、`fileName` 创建唯一存储路径并返回签名 URL/Headers；前端使用该信息通过浏览器直传，完成后需调用 3.11 进行确认。

### 3.11 上传确认（持久化目录结构）
- **URL**：`POST /api/v5/courses/{courseId}/resource-folders/{parentId}/objects/confirm`
- **Body**：
```json
{
  "fileName": "第1章-绪论.pdf",
  "uploadPath": "courses/10001/root/2024/第1章-绪论.pdf",
  "size": 1048576,
  "mimeType": "application/pdf",
  "checksum": "d41d8cd98f00b204e9800998ecf8427e"
}
```
- **响应**：`data: ResourceObjectSummary`
- **说明**：后端校验上传完成（可对比 OSS ETag/MD5），将对象写入数据库并更新父目录 `filesCount`/`latestUploadedAt`，前端据此刷新列表。

## 4. 返回码建议
| code | http | 描述 |
| --- | --- | --- |
| `RESOURCE_FOLDER_NOT_FOUND` | 404 | 目录不存在或无访问权限 |
| `RESOURCE_OBJECT_NOT_FOUND` | 404 | 对象不存在或已被删除 |
| `RESOURCE_ACTION_NOT_ALLOWED` | 403 | 用户无权执行复制/移动/删除 |
| `RESOURCE_UPLOAD_LIMIT_EXCEEDED` | 413 | 超出文件大小/数量限制 |
| `RESOURCE_STORAGE_ERROR` | 500 | 访问 OSS/存储服务异常 |
| `RESOURCE_VALIDATION_FAILED` | 422 | 参数校验失败（如缺少 folderId、objectIds 不同目录） |

## 5. 业务流程
1. **默认网格视图**：进入“课程资源”时，先调用 `GET /resource-folders`；首次加载对象列表将使用 `viewMode=grid`、`limit=24`（3x8），展示目录内对象网格。
2. **列表视图切换**：用户切换到列表视图时，前端可将 `viewMode=list` 并设置更大的 `limit` 或基于 `offset` 分页，接口无需额外改动。
3. **排序与搜索**：通过 `sortField` + `sortOrder` 控制展示顺序，`keyword` 支持模糊搜索。
4. **批量选择 & 操作**：在同一目录下桥接多选，调用 `POST /resource-objects/batch-action` 执行复制/剪切/删除。剪切（move）完成后需刷新源、目标目录的计数与最近更新时间。
5. **上传/下载**：上传完成后刷新当前目录列表和 `filesCount`；下载使用 `ResourceObjectSummary/Detail` 中的 `downloadUrl`，批量下载可触发压缩任务。
6. **兼容 OSS 分页**：若目录文件量巨大，可在前端传入 `continuationToken` 以利用 OSS 原生列举能力；接口响应提供 `nextContinuationToken` 以便继续拉取。

通过上述接口，课程资源页即可满足 OSS 风格的目录/对象管理、批量复制/剪切/删除及视图切换需求，彻底摆脱 mock 数据。
