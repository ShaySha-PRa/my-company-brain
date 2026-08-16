# My Company Brain API

本文记录当前统一 API、Agent Gateway 和三条知识链路的 HTTP 边界。实现证据和真实环境验收状态见 [docs/CURRENT_STATUS.md](CURRENT_STATUS.md)；模块细节参阅 [Nano Brain API](../modules/nano-brain/docs/API.md) 和 [GraphRAG API](../modules/graph-rag/docs/API.md)。

## 1. 入口和认证

统一 API 默认 http://127.0.0.1:3101；Agent Gateway 默认 http://127.0.0.1:3002。浏览器通常使用：

~~~text
/api/platform/*  → API /platform/*（/auth/* 除外）
/api/agent/*     → Agent Gateway /*
/api/health      → Web 自身健康响应
~~~

除健康检查、GET /auth/registration-teams、POST /auth/register 和 POST /auth/login 外，统一 API 路由需要：

~~~http
Authorization: Bearer <token>
Content-Type: application/json
~~~

模块代理不接受浏览器直接携带模块内部头，内部头由 API Gateway 注入。

## 2. 统一 API

### 系统

~~~http
GET /health
GET /modules
GET /modules/health
~~~

/health 返回 status、service、version；/modules 返回三模块注册信息和 HTTP 地址；/modules/health 查询三模块健康状态。

### 身份

~~~http
GET  /auth/registration-teams
POST /auth/register
POST /auth/login
GET  /auth/me
POST /auth/logout
~~~

注册请求允许 username、password 和可选 team_id，禁止客户端设置 organization_id、team_ids、is_admin。注册后 API 通过三个模块内部初始化接口创建默认私有 source。

登录响应包含：

~~~json
{
  "token": "bearer-token",
  "token_type": "Bearer",
  "user": { "id": "user-id", "username": "alice", "is_admin": false }
}
~~~

登出只撤销当前 Bearer 会话。常见状态码：400 输入错误、401 认证失败、403 无权限、404 资源不存在、502 模块不可用。

### 平台业务

平台路径由 API 的平台 store 处理：

~~~text
GET/POST /platform/scenarios
GET      /platform/scenarios/:scenarioId/workbench
POST     /platform/scenarios/:scenarioId/ask
POST     /platform/scenarios/:scenarioId/data-request
GET/POST /platform/scenarios/:scenarioId/sessions
GET      /platform/scenarios/:scenarioId/sessions/:sessionId
POST     /platform/scenarios/:scenarioId/sessions/:sessionId/messages

GET      /platform/tasks
GET      /platform/knowledge-objects
GET/POST /platform/chat-sessions
GET/PATCH/DELETE /platform/chat-sessions/:sessionId
POST     /platform/chat-sessions/:sessionId/messages
GET      /platform/notifications
GET      /platform/notifications/unread-count
POST     /platform/notifications/mark-read
POST     /platform/traces/:traceId/feedback
~~~

场景创建支持 JSON template_id、name、description、visibility、processing_goal、uploaded_files，也支持 multipart。全域 chat-sessions 创建后绑定 Agent Gateway 的 global conversation；消息支持 idempotency_key 并转发 Agent SSE。

管理员路径统一位于 /platform/admin/*，非管理员返回 403：

~~~text
GET  /platform/admin/requests
PATCH /platform/admin/requests/:requestId
GET  /platform/admin/dashboard
GET  /platform/admin/llm-usage
GET  /platform/admin/settings
GET  /platform/admin/audit
GET  /platform/admin/strategies
GET  /platform/admin/evaluations
GET  /platform/admin/monitoring
GET  /platform/admin/monitoring/:traceId
GET  /platform/admin/ingest-queue
GET  /platform/admin/knowledge-assets
GET  /platform/admin/knowledge-assets/export
POST /platform/admin/integrations/test
POST /platform/admin/runtime-config
POST /platform/admin/engine-retrieval-config
POST /platform/admin/recall-verify
POST /platform/admin/batch-review
GET/POST/PATCH/DELETE /platform/admin/templates[/:templateId]
PATCH /platform/admin/scenarios/:scenarioId/description-card
GET/POST /platform/admin/graph-curation/*
GET/POST /platform/admin/doc-curation/*
GET/POST /platform/admin/page-curation/*
GET /platform/admin/files/:fileId/preview
~~~

平台列表和管理员结果仍受平台 store 及模块权限边界约束。

### 模块代理

API 注入内部用户上下文并转发：

~~~text
/nano/*
/traditional/*
/graph/*
~~~

模块公共 health 端点可直接访问模块端口；通过 API 的模块路径仍属于受保护代理。

## 3. Nano Brain HTTP API

默认模块地址 http://127.0.0.1:8100。业务端点要求 API 注入的内部头：

~~~text
GET/PATCH/POST /nano/sources[/:sourceId]
POST            /nano/pages
GET             /nano/sources/:sourceId/pages
GET/PUT/DELETE  /nano/pages/:sourceId/:slug
GET             /nano/pages/:sourceId/:slug/chunks
POST            /nano/capture
POST            /nano/raw-documents
GET             /nano/raw-documents/:id/compile-state
POST            /nano/search
POST            /nano/ask
GET             /nano/links[/:sourceId/:slug]
GET             /nano/backlinks[/:slug]
POST            /nano/graph/query
POST/GET        /nano/fact-submissions
GET             /nano/fact-submissions/:submissionId
POST            /nano/fact-submissions/:submissionId/candidates
POST            /nano/fact-submissions/:submissionId/review
GET             /nano/facts[/:factId]
GET             /nano/entities/:entitySlug/facts
POST            /nano/dream/runs
GET             /nano/dream/runs[/:runId]
GET             /nano/dream/status
~~~

search/ask 接受 query、limit、可选 source_id；场景调用还可传 page_ids。ask 返回 answer、citations、llm_used、degraded、no_evidence 等字段。最终事实审核仅管理员可用，Agent 不自动执行最终审核。

## 4. Traditional RAG HTTP API

默认模块地址 http://127.0.0.1:8101。上传使用 multipart/form-data：

~~~text
GET/POST/PATCH /traditional/sources[/:sourceId]
POST            /traditional/documents
GET             /traditional/documents[/:documentId]
DELETE          /traditional/documents/:documentId
GET             /traditional/documents/:documentId/chunks
DELETE          /traditional/documents/:documentId/chunks/:chunkId
GET             /traditional/documents/:documentId/tables
GET             /traditional/tables
POST            /traditional/tables/query
POST            /traditional/structured/search
GET             /traditional/chunks/search?q=...
GET             /traditional/jobs[/:jobId]
POST            /traditional/search
~~~

文档上传字段是 source_id、file，可选 chunk_size、chunk_overlap；响应返回 document 和后台 job。删除默认归档，purge=true 才硬删。search 支持 query、limit、source_id/source_ids、document_id、file_types 和可选 min_score。表格路径提供只读结构化查询。

## 5. GraphRAG HTTP API

默认模块地址 http://127.0.0.1:8102。GraphRAG health 还会检查 Neo4j readiness：

~~~text
GET/POST/PATCH/DELETE /graph/sources[/:sourceId]
POST                   /graph/documents/text
POST                   /graph/documents/upload
GET                    /graph/documents[/:documentId]
DELETE                 /graph/documents/:documentId
POST                   /graph/search
POST                   /graph/ask
GET                    /graph/graph-stats
GET                    /graph/curation/detail
GET                    /graph/curation/subgraph
GET                    /graph/curation/entities/portrait
POST                   /graph/curation/entities/merge
POST                   /graph/curation/entities/edit
POST                   /graph/curation/entities/delete
POST                   /graph/curation/entities/create
POST                   /graph/curation/entities/batch-delete
POST                   /graph/curation/relations/edit
POST                   /graph/curation/relations/delete
POST                   /graph/curation/relations/create
POST                   /graph/curation/export
~~~

search/ask 支持 query、limit、source_id、mode（auto/local/global/hybrid/Traditional/mix）以及可选 chunk/token/rerank 参数。文本入库使用 source_id、text、title、metadata；文件入库使用 source_id 和 file。删除默认归档，purge=true 才清理图实体关系。

## 6. Agent Gateway HTTP API

默认地址 http://127.0.0.1:3002：

~~~text
GET    /health
POST   /agent/conversations
GET    /agent/conversations
GET    /agent/conversations/:conversationId
POST   /agent/conversations/:conversationId/stream
DELETE /agent/conversations/:conversationId
GET    /agent/conversations/:conversationId/runs/:runId
~~~

active_module 可为 nano-brain、traditional-rag、graph-rag 或 global。创建会话示例：

~~~json
{ "active_module": "global", "title": "可选标题", "metadata": { "scope": "company" } }
~~~

流式请求体为 { "message": "问题文本", "mode": "default" }，响应是 text/event-stream，事件包括 run_started、tool_call_started、tool_call_finished、message_delta、message_completed、run_completed、error。mode=admin_review 仅管理员且仅 Nano Brain 会话可用。高风险事实审核工具不会暴露给 Agent。

公开 conversation 读取 checkpoint 消息和 run 摘要；公开 global run 会隐藏原始工具输出。内部 projection 端点 /internal/agent/conversations/:conversationId/runs/:runId/projection 只接受 x-mcb-internal-token，供 API 断流恢复使用，不是前端 API。

## 7. 内部头与错误

模块 HTTP 只接受 API/Gateway 注入的 x-mcb-internal-token、x-mcb-user-id、x-mcb-username、x-mcb-is-admin。模块按用户、组织、团队、source kind 和 owner 执行过滤。网络不可用通常返回 502；认证失败 401；权限不足 403；输入错误 400；资源缺失 404。领域响应细节以模块 adapter 为准，不能仅凭本文件推断真实模型或数据库已经可用。
