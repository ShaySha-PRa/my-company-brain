# My Company Brain 服务边界

本文记录当前运行时的 HTTP、Agent、MCP 和数据所有权边界。验证状态见 [docs/CURRENT_STATUS.md](CURRENT_STATUS.md)。

## 1. 服务拓扑

~~~text
Web :3000
  ├─ /api/platform/* ─────► API :3101
  └─ /api/agent/* ────────► Agent Gateway :3002

API :3101
  ├─ /auth/*
  ├─ /platform/* ─────────► packages/platform ─► mcb_core_db
  ├─ /nano/* ─────────────► Nano Brain :8100
  ├─ /traditional/* ──────► Traditional RAG :8101
  └─ /graph/* ────────────► GraphRAG :8102

Agent Gateway :3002
  ├─ global profile ──────► 平台全域知识工具
  └─ module profile ──────► 受保护模块 HTTP Tools
~~~

主栈 Compose 服务为 postgres、neo4j、migrate、nano-brain、traditional-rag、graph-rag、api、agent-gateway、web；migrate 是一次性服务，其余八个是长期运行服务。

## 2. API 边界

apps/api 只承担统一入口职责：

- 校验 Bearer 会话并生成 UserContext；
- 处理平台路由和基础请求归一化；
- 通过 packages/gateway 转发模块 HTTP；
- 返回模块响应和统一基础错误；
- 提供健康、模块清单和模块健康查询。

API 不 import Nano Brain、Traditional RAG 或 GraphRAG core，也不连接这些模块数据库。/platform/* 调用的是平台 store，平台 store 的数据库归属是 mcb_core_db。

packages/gateway 维护模块注册信息、默认地址和 MCP 描述：

~~~text
nano-brain       http://127.0.0.1:8100   /nano/*
traditional-rag  http://127.0.0.1:8101   /traditional/*
graph-rag        http://127.0.0.1:8102   /graph/*
~~~

部署时可用 NANO_BRAIN_HTTP_URL、TRADITIONAL_RAG_HTTP_URL、GRAPH_RAG_HTTP_URL 覆盖地址。模块调用注入：

~~~text
x-mcb-internal-token
x-mcb-user-id
x-mcb-username
x-mcb-is-admin
~~~

multipart body 原样转发，JSON 请求由 Gateway 序列化。领域错误由模块 adapter 映射，Gateway 只处理基础网络和 JSON 响应。

## 3. 模块边界

| 模块 | HTTP | MCP | 数据 |
| --- | --- | --- | --- |
| Nano Brain | modules/nano-brain/src/http，/nano/* | modules/nano-brain/src/mcp，nano_* | mcb_nano_db |
| Traditional RAG | modules/traditional-rag/src/traditional_rag/http，/traditional/* | traditional_rag/mcp/server.py，traditional_* | mcb_traditional_db + traditional_files |
| GraphRAG | modules/graph-rag/src/graph_rag/http，/graph/* | graph_rag/mcp/server.py，graph_* | mcb_graph_db + graph_workdir + Neo4j |

HTTP 与 MCP 适配器复用模块 core 的读写和权限判断。模块内部 source/document/page/entity 权限不能由 API 或前端替代。

## 4. Agent 边界

Agent Gateway 监听 :3002，使用 mcb_agent_db 保存会话、run、tool call 和 LangGraph checkpoint。它支持 nano-brain、traditional-rag、graph-rag、global。

- 三个模块 profile：Gateway 使用原生 LangChain Tools 调用模块受保护 HTTP，并把当前用户上下文固定在 Tool session 中。
- global profile：使用平台全域检索工具，按 scope 聚合三链路结果、引用和上下文追踪。
- MCP：三个模块提供可独立运行的 stdio MCP Server，供外部 Agent 或显式 MCP 适配路径使用。
- 管理员审核：审核辅助仅允许管理员的 Nano Brain 会话；最终事实审核由管理员显式调用模块审核接口。

公开 run 详情会按 global scope 隔离原始工具输出；内部 projection 端点只接受 x-mcb-internal-token，供 API 在断流恢复时读取。

## 5. 数据所有权

~~~text
packages/identity       ── mcb_identity_db
packages/platform       ── mcb_core_db
apps/agent-gateway      ── mcb_agent_db
modules/nano-brain      ── mcb_nano_db
modules/traditional-rag ── mcb_traditional_db
modules/graph-rag       ── mcb_graph_db + Neo4j
~~~

迁移和运行账号按数据库分离，没有跨模块 SQL；平台通过模块公开 HTTP/MCP 契约访问能力。GraphRAG 的 Neo4j 访问只在 GraphRAG 模块内发生。

## 6. 启动与健康

本地开发可按模块启动：

~~~sh
bun run dev:nano-http
bun run dev:api
bun run dev:traditional-rag
bun run dev:graph-rag
bun run dev:nano-mcp
~~~

完整栈：

~~~sh
cp deploy/compose/.env.example deploy/compose/.env
deploy/compose/start.sh
~~~

健康检查地址是 Web http://127.0.0.1:3000/api/health、API :3101/health、Agent :3002/health、三个模块 :8100/:8101/:8102/health。健康检查只表示 HTTP/依赖就绪；模型、检索、权限和浏览器流程仍需按状态页命令核验。
